const mysql = require('mysql2/promise');

async function insertSample() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'bmm_db'
  });

  const activities = [
    { user_id: 1, action: 'created', entity_type: 'product', details: 'Created product: SAN MIGUEL MANGO YUZU', created_at: 'DATE_SUB(NOW(), INTERVAL 1 HOUR)' },
    { user_id: 1, action: 'created', entity_type: 'product', details: 'Created product: DOWNY SPRING BLOSSOM 75ML', created_at: 'DATE_SUB(NOW(), INTERVAL 2 HOUR)' },
    { user_id: 1, action: 'updated', entity_type: 'product', details: 'Updated price for Gift Card', created_at: 'DATE_SUB(NOW(), INTERVAL 3 HOUR)' },
    { user_id: 1, action: 'created', entity_type: 'purchase_order', details: 'Created PO-001 for supplier: Demo Supplier', created_at: 'DATE_SUB(NOW(), INTERVAL 4 HOUR)' },
    { user_id: 1, action: 'updated', entity_type: 'stock_movement', details: 'Recorded inbound stock: +50 units', created_at: 'DATE_SUB(NOW(), INTERVAL 5 HOUR)' },
    { user_id: 1, action: 'created', entity_type: 'category', details: 'Created category: Beverages', created_at: 'DATE_SUB(NOW(), INTERVAL 6 HOUR)' },
    { user_id: 1, action: 'deleted', entity_type: 'product', details: 'Deleted product: Old Item', created_at: 'DATE_SUB(NOW(), INTERVAL 7 HOUR)' },
    { user_id: 1, action: 'updated', entity_type: 'supplier', details: 'Updated supplier contact info', created_at: 'DATE_SUB(NOW(), INTERVAL 8 HOUR)' },
  ];

  for (const a of activities) {
    await conn.query(
      'INSERT INTO inv_activity_log (user_id, action, entity_type, details, created_at) VALUES (?, ?, ?, ?, ' + a.created_at + ')',
      [a.user_id, a.action, a.entity_type, a.details]
    );
  }

  const [rows] = await conn.query('SELECT COUNT(*) as cnt FROM inv_activity_log');
  console.log('Activity Log count:', rows[0].cnt);
  
  await conn.end();
}

insertSample().catch(console.error);