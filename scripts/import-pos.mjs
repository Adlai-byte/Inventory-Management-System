import fs from 'fs';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple .env.local parser
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, ...value] = line.split('=');
      if (key && value) process.env[key.trim().toUpperCase()] = value.join('=').trim();
    });
  }
}
loadEnv();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'bmm_db',
};

async function runImport() {
  const connection = await mysql.createConnection(dbConfig);
  console.log('Connected to database.');

  await connection.execute('SET FOREIGN_KEY_CHECKS = 0;');
  console.log('Foreign key checks disabled.');

  const sqlFile = path.join(__dirname, '../import_subset.sql');
  const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
  
  const statements = sqlContent.split(/;[\r\n]+/);
  
  function parseRows(text) {
    const valuesIdx = text.toLowerCase().indexOf('values');
    if (valuesIdx === -1) return [];
    const dataPart = text.substring(valuesIdx + 6).trim();
    
    const rows = [];
    let bracketLevel = 0;
    let inString = false;
    let escaped = false;
    let start = 0;

    for (let i = 0; i < dataPart.length; i++) {
      const char = dataPart[i];
      if (char === "'" && !escaped) inString = !inString;
      if (char === "\\" && !escaped) escaped = true; else escaped = false;
      
      if (!inString) {
        if (char === '(') {
          if (bracketLevel === 0) start = i + 1;
          bracketLevel++;
        } else if (char === ')') {
          bracketLevel--;
          if (bracketLevel === 0) {
            rows.push(dataPart.substring(start, i));
          }
        }
      }
    }
    return rows.map(r => {
      const parts = [];
      let pin = false, pesc = false, pstart = 0;
      for (let j = 0; j <= r.length; j++) {
        const pc = r[j] || ',';
        if (pc === "'" && !pesc) pin = !pin;
        if (pc === "\\" && !pesc) pesc = true; else pesc = false;
        if (pc === ',' && !pin) {
          let val = r.substring(pstart, j).trim();
          if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, "\\");
          if (val.toUpperCase() === 'NULL' || val === '') val = null;
          parts.push(val);
          pstart = j + 1;
        }
      }
      return parts;
    });
  }

  for (const stmt of statements) {
    if (!stmt.trim()) continue;
    
    const tableMatch = stmt.match(/into\s+`([^`]+)`/i);
    if (!tableMatch) continue;
    const table = tableMatch[1];
    console.log(`Processing table: ${table}`);

    const rows = parseRows(stmt);
    console.log(`Found ${rows.length} rows.`);

    let errorCount = 0;
    for (const v of rows) {
      if (v.length < 2) continue;
      try {
        if (table === 'product_category') {
          await connection.execute(
            'INSERT INTO inv_categories (id, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
            [v[0], v[1], null]
          );
        } else if (table === 'supplier') {
          await connection.execute(
            'INSERT INTO inv_suppliers (id, name, email, phone, address) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
            [v[0], v[1], v[4]?.trim() || null, v[2] || v[3] || null, v[5]?.trim() || null]
          );
        } else if (table === 'products') {
          await connection.execute(
            `INSERT INTO inv_products 
             (id, name, sku, barcode, description, category_id, supplier_id, cost_price, quantity, min_stock_level, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active') 
             ON DUPLICATE KEY UPDATE name=VALUES(name)`,
            [v[0], v[5], v[1] || `POS-${v[0]}`, v[1] || null, v[6], v[3] || null, v[4] || null, parseFloat(v[11]) || 0, Math.round(parseFloat(v[12])) || 0, parseInt(v[14]) || 0]
          );
        } else if (table === 'product_prices') {
          if (v[2] == '1') { // Retail price
            await connection.execute(
              'UPDATE inv_products SET unit_price = ? WHERE id = ?',
              [v[3], v[1]]
            );
          }
        }
      } catch (e) {
        if (errorCount < 5) {
          console.error(`Error in ${table} (row ${v[0]}): ${e.message}`);
          errorCount++;
        }
      }
    }
  }

  await connection.execute('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('Foreign key checks re-enabled.');
  console.log('Import finished.');
  await connection.end();
}

runImport().catch(console.error);
