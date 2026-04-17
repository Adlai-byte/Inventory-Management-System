const mysql = require('mysql2/promise');
const fs = require('fs');

async function importPrices() {
  console.log('🔄 Starting price import...\n');

  // Load prices from import_subset.sql
  console.log('Loading prices...');
  const priceContent = fs.readFileSync('import_subset.sql', 'utf8');
  const prices = {};
  
  const priceLines = priceContent.match(/\(\d+,\s*\d+,\s*1,\s*[\d.]+,\s*[\d.]+\)/g) || [];
  console.log(`Found ${priceLines.length} price lines`);
  
  for (const line of priceLines) {
    const match = line.match(/\((\d+),\s*(\d+),\s*1,\s*([\d.]+)/);
    if (match) {
      const productId = parseInt(match[2]);
      const price = parseFloat(match[3]);
      if (price > 0) prices[productId] = price;
    }
  }
  console.log(`Loaded ${Object.keys(prices).length} prices\n`);

  // Load products from backup SQL - read line by line
  console.log('Loading products...');
  const products = {};
  
  // Find where products insert starts
  const content = fs.readFileSync('sql/03_31_2026 Backup.sql', 'utf8');
  const insertIdx = content.indexOf("insert  into `products`");
  
  // Find the next INSERT statement to know where products data ends
  const nextInsertIdx = content.indexOf("insert  into `", insertIdx + 20);
  
  // Extract just the products data section
  const productsSection = content.substring(insertIdx, nextInsertIdx);
  console.log(`Products section: ${productsSection.length} chars`);
  
  // Parse each product line (each tuple is on its own line)
  const lines = productsSection.split('\n');
  
  for (const line of lines) {
    // Each line is like: (4,'giftcard',0,60,0,'Gift Card',...
    const tupleMatch = line.match(/^\((\d+),'([^']*)',\d+,\d+,\d+,'([^']*)'/);
    if (tupleMatch) {
      const id = parseInt(tupleMatch[1]);
      const code = tupleMatch[2];
      const name = tupleMatch[3].replace(/&amp;/g, '&');
      
      // Skip non-product entries
      if (code && name && 
          !name.includes('CHARGE') && !name.includes('RELOAD') && 
          !name.includes('GIFT') && !name.includes('SERVICE') && 
          !name.includes('Prepayment') && !name.includes('Item Setup')) {
        products[id] = { code, name };
      }
    }
  }

  console.log(`Loaded ${Object.keys(products).length} valid products\n`);

  // Show sample
  const sampleProducts = Object.entries(products).slice(0, 5);
  console.log('Sample products:');
  for (const [id, p] of sampleProducts) {
    console.log(`  ${id}: ${p.code} - ${p.name.substring(0, 30)} (price: ${prices[id] || 'N/A'})`);
  }
  console.log('');

  // Connect to database
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'bmm_db',
  });

  // Get current products
  const [invProducts] = await pool.query('SELECT id, name, sku, barcode FROM inv_products');
  console.log(`Found ${invProducts.length} products in inventory`);

  let updated = 0;
  let sampleUpdated = [];

  for (const p of invProducts) {
    let newPrice = null;

    // Try barcode match first
    if (p.barcode) {
      for (const [pid, prod] of Object.entries(products)) {
        if (prod.code === p.barcode && prices[pid]) {
          newPrice = prices[pid];
          break;
        }
      }
    }

    // Try name match
    if (!newPrice) {
      const invName = p.name.toUpperCase().trim();
      for (const [pid, prod] of Object.entries(products)) {
        const prodName = prod.name.toUpperCase().trim();
        if (prodName === invName && prices[pid]) {
          newPrice = prices[pid];
          break;
        }
      }
    }

    if (newPrice) {
      await pool.query('UPDATE inv_products SET unit_price = ? WHERE id = ?', [newPrice, p.id]);
      updated++;
      if (sampleUpdated.length < 5) {
        sampleUpdated.push({ name: p.name.substring(0, 25), price: newPrice });
      }
    }

    if (updated > 0 && updated % 500 === 0) {
      console.log(`  Updated ${updated} products...`);
    }
  }

  console.log(`\n✅ Update complete!`);
  console.log(`   Updated: ${updated} products`);
  
  if (sampleUpdated.length > 0) {
    console.log('\n📦 Sample updates:');
    sampleUpdated.forEach(p => console.log(`   ${p.name.padEnd(25)} -> ₱${p.price}`));
  }

  // Verify
  const [stats] = await pool.query('SELECT COUNT(*) as total, SUM(unit_price > 0) as with_price FROM inv_products');
  console.log('\n📊 Final Statistics:');
  console.log(`   Total products: ${stats[0].total}`);
  console.log(`   With price: ${stats[0].with_price}`);

  await pool.end();
  console.log('\n✨ Done!');
}

importPrices().catch(console.error);
