const mysql = require('mysql2/promise');

async function debug() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'bmm_db'
  });

  console.log('=== Check stock movements with product prices ===');
  const [data] = await conn.query(`
    SELECT sm.id, sm.type, sm.quantity, sm.created_at, p.id as product_id, p.name, p.unit_price
    FROM inv_stock_movements sm
    LEFT JOIN inv_products p ON sm.product_id = p.id
    WHERE sm.type = 'outbound'
    ORDER BY sm.created_at DESC
    LIMIT 10
  `);
  console.log(data);

  console.log('\n=== Test Sales Query ===');
  const today = new Date().toISOString().split("T")[0];
  console.log('Today:', today);
  
  const [sales] = await conn.query(`
    SELECT 
      DATE_FORMAT(sm.created_at, '%H:00') as period,
      COUNT(*) as transaction_count,
      COALESCE(SUM(sm.quantity), 0) as total_items,
      COALESCE(SUM(sm.quantity * p.unit_price), 0) as total_sales
    FROM inv_stock_movements sm
    LEFT JOIN inv_products p ON sm.product_id = p.id
    WHERE sm.type = 'outbound' AND DATE(sm.created_at) = ?
    GROUP BY HOUR(sm.created_at)
    ORDER BY period ASC
  `, [today]);
  console.log('Sales:', sales);

  await conn.end();
}

debug().catch(console.error);