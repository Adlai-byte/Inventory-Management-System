const mysql = require('mysql2/promise');

async function verify() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'bmm_db'
  });

  console.log('=== STOCK MOVEMENTS (last 10 days) ===');
  const [movements] = await conn.query(`
    SELECT 
      DATE_FORMAT(created_at, '%b %d') as date,
      SUM(CASE WHEN type = 'inbound' THEN quantity ELSE 0 END) as inbound,
      SUM(CASE WHEN type = 'outbound' THEN quantity ELSE 0 END) as outbound
    FROM inv_stock_movements
    GROUP BY DATE(created_at), DATE_FORMAT(created_at, '%b %d')
    ORDER BY DATE(created_at) DESC
    LIMIT 10
  `);
  console.log(movements);

  console.log('\n=== CATEGORIES ===');
  const [cats] = await conn.query(`
    SELECT COALESCE(c.name, 'Uncategorized') as name, COUNT(*) as count 
    FROM inv_products p 
    LEFT JOIN inv_categories c ON p.category_id = c.id 
    GROUP BY c.name 
    ORDER BY count DESC 
    LIMIT 5
  `);
  console.log(cats);

  console.log('\n=== DASHBOARD SUMMARY ===');
  const [summary] = await conn.query(`
    SELECT 
      (SELECT COUNT(*) FROM inv_products) as totalProducts,
      (SELECT COUNT(*) FROM inv_products WHERE quantity <= min_stock_level AND status = 'active') as lowStock,
      (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM inv_products) as totalValue,
      (SELECT COUNT(*) FROM inv_purchase_orders WHERE status IN ('draft', 'pending')) as pendingOrders
  `);
  console.log(summary[0]);

  await conn.end();
}

verify().catch(console.error);