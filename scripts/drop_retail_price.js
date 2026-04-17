import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'bmm_db'
  });

  try {
    console.log("Dropping retail_price column...");
    await connection.execute('ALTER TABLE inv_products DROP COLUMN retail_price;');
    console.log("Success!");
  } catch (err) {
    console.error("Error executing query:", err);
  } finally {
    await connection.end();
  }
}

run();
