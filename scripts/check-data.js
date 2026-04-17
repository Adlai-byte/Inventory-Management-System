const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'bmm_db'
  });

  const [products] = await conn.query('SELECT COUNT(*) as cnt FROM inv_products');
  console.log('Products:', products[0].cnt);

  const [movements] = await conn.query('SELECT COUNT(*) as cnt FROM inv_stock_movements');
  console.log('Stock Movements:', movements[0].cnt);

  await conn.end();
}

main().catch(console.error);