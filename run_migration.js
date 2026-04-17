/* eslint-disable @typescript-eslint/no-require-imports */
const mysql = require('mysql2/promise');

async function migrate() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'bmm_db',
    waitForConnections: true,
    connectionLimit: 10,
  });

  try {
    await pool.query("ALTER TABLE inv_products ADD COLUMN expiry_date DATE DEFAULT NULL");
    console.log("Added expiry_date column");
    await pool.query("ALTER TABLE inv_products ADD COLUMN manufacture_date DATE DEFAULT NULL");
    console.log("Added manufacture_date column");
    await pool.query("ALTER TABLE inv_products ADD COLUMN lot_number VARCHAR(100) DEFAULT NULL");
    console.log("Added lot_number column");
    await pool.query("ALTER TABLE inv_products ADD INDEX idx_products_expiry (expiry_date)");
    console.log("Added index");
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration error:", error.message);
  } finally {
    await pool.end();
  }
}

migrate();