const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'root',
    database: process.env.MYSQL_DATABASE || 'bmm_db',
    multipleStatements: true
  });

  try {
    console.log('Starting Batch Tracking Migration...');

    // 1. Create inv_batches table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`inv_batches\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`product_id\` INT NOT NULL,
        \`batch_number\` VARCHAR(100) NOT NULL,
        \`quantity\` INT NOT NULL DEFAULT 0,
        \`initial_quantity\` INT NOT NULL DEFAULT 0,
        \`manufacture_date\` DATE DEFAULT NULL,
        \`expiry_date\` DATE DEFAULT NULL,
        \`cost_price\` DECIMAL(12,2) DEFAULT 0.00,
        \`warehouse_id\` INT DEFAULT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        FOREIGN KEY (\`product_id\`) REFERENCES \`inv_products\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`warehouse_id\`) REFERENCES \`inv_warehouses\`(\`id\`) ON DELETE SET NULL,
        INDEX \`idx_batches_expiry\` (\`expiry_date\`),
        INDEX \`idx_batches_product\` (\`product_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Created inv_batches table');

    // 2. Add batch_id to stock movements
    // Check if column exists first to avoid errors
    const [cols] = await connection.query('SHOW COLUMNS FROM inv_stock_movements LIKE "batch_id"');
    if (cols.length === 0) {
      await connection.query('ALTER TABLE inv_stock_movements ADD COLUMN batch_id INT DEFAULT NULL');
      await connection.query('ALTER TABLE inv_stock_movements ADD CONSTRAINT fk_stock_movements_batch FOREIGN KEY (batch_id) REFERENCES inv_batches(id) ON DELETE SET NULL');
      console.log('✓ Added batch_id to inv_stock_movements');
    } else {
      console.log('- batch_id already exists in inv_stock_movements');
    }

    // 3. Migrate existing data
    // We only migrate products that have stock or dates and aren't already migrated
    const [existingBatches] = await connection.query('SELECT COUNT(*) as count FROM inv_batches');
    if (existingBatches[0].count === 0) {
      await connection.query(`
        INSERT INTO \`inv_batches\` (product_id, batch_number, quantity, initial_quantity, manufacture_date, expiry_date, cost_price, warehouse_id)
        SELECT id, COALESCE(lot_number, 'INITIAL-STOCK'), quantity, quantity, manufacture_date, expiry_date, cost_price, warehouse_id
        FROM \`inv_products\`
        WHERE quantity > 0 OR expiry_date IS NOT NULL OR manufacture_date IS NOT NULL;
      `);
      console.log('✓ Migrated existing product data to initial batches');
    } else {
      console.log('- Skipping migration (batches table already has data)');
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await connection.end();
  }
}

migrate();
