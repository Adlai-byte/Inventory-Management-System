const mysql = require('mysql2/promise');

async function addSampleNotifications() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'bmm_db'
  });

  const notifications = [
    { user_id: 1, title: 'Low Stock Alert', message: 'Product "Coca Cola 500ml" is running low (5 remaining)', type: 'warning' },
    { user_id: 1, title: 'New Purchase Order', message: 'PO-001 from Demo Supplier has been received', type: 'success' },
    { user_id: 1, title: 'Stock Movement', message: '50 units added to inventory via PO-002', type: 'info' },
    { user_id: 1, title: 'System Update', message: 'System has been updated to version 2.0', type: 'info' },
    { user_id: 1, title: 'Low Stock Alert', message: '3 products are below minimum stock level', type: 'warning' },
  ];

  for (const n of notifications) {
    await conn.query(
      'INSERT INTO inv_notifications (user_id, title, message, type, is_read, created_at) VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))',
      [n.user_id, n.title, n.message, n.type, Math.random() > 0.5 ? 1 : 0, Math.floor(Math.random() * 24)]
    );
  }

  const [rows] = await conn.query('SELECT COUNT(*) as cnt FROM inv_notifications');
  console.log('Sample notifications added:', rows[0].cnt);
  
  // Show notifications
  const [notifs] = await conn.query('SELECT * FROM inv_notifications ORDER BY created_at DESC LIMIT 5');
  console.log('\nRecent notifications:');
  notifs.forEach(n => console.log(`  [${n.type}] ${n.title} - ${n.is_read ? 'Read' : 'Unread'}`));
  
  await conn.end();
}

addSampleNotifications().catch(console.error);