const mysql = require('mysql2/promise');

async function test() {
  const c = await mysql.createConnection({
    host: 'localhost', user: 'root', password: 'root', database: 'bmm_db'
  });

  const month = '2026-04';
  const TZ = "'+00:00', '+08:00'";
  const localConv = (col) => `CONVERT_TZ(${col}, ${TZ})`;

  const mainSQL = `
    SELECT 
      DATE(${localConv("created_at")}) as period, 
      DAY(${localConv("created_at")}) as day,
      COUNT(*) as transfer_count,
      SUM(quantity) as total_items
    FROM inv_stock_movements
    WHERE type = 'transfer_out'
      AND DATE_FORMAT(${localConv("created_at")}, '%Y-%m') = ?
    GROUP BY DATE(${localConv("created_at")}), DAY(${localConv("created_at")})
    ORDER BY DATE(${localConv("created_at")}), DAY(${localConv("created_at")}) ASC
  `;

  try {
    const [r1] = await c.query(mainSQL, [month]);
    console.log('✅ Monthly main query OK:', JSON.stringify(r1));
  } catch(e) { console.error('❌ Monthly main query FAILED:', e.sqlMessage || e.message); }

  await c.end();
}
test().catch(console.error);
