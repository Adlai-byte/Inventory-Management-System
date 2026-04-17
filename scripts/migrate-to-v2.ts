/**
 * Database Migration Script v2
 * Creates BIR-compliant inventory schema (no sales tracking)
 */

import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Load environment variables
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join("=").trim();
    }
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log("=".repeat(60));
  console.log("BASTISTIL Inventory - Database Migration v2");
  console.log("BIR-Compliant (No Sales Tracking)");
  console.log("=".repeat(60));
  console.log();

  const host = process.env.MYSQL_HOST || "localhost";
  const port = parseInt(process.env.MYSQL_PORT || "3306");
  const user = process.env.MYSQL_USER || "root";
  const password = process.env.MYSQL_PASSWORD || "";
  const database = process.env.MYSQL_DATABASE || "bmm_db";

  console.log("Configuration:");
  console.log(`  Host: ${host}:${port}`);
  console.log(`  Database: ${database}`);
  console.log();

  const confirm = await question("This will DROP ALL DATA. Continue? (yes/no): ");
  if (confirm.toLowerCase() !== "yes") {
    console.log("Cancelled.");
    rl.close();
    process.exit(0);
  }

  console.log("\nMigrating...\n");

  let connection: mysql.Connection;

  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });

    console.log("✓ Connected");

    // Drop and create database
    await connection.execute(`DROP DATABASE IF EXISTS \`${database}\``);
    await connection.execute(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.changeUser({ database });
    console.log("✓ Database recreated");

    // Disable foreign key checks
    await connection.execute("SET FOREIGN_KEY_CHECKS = 0");

    // Create tables in correct order
    const createStatements = [
      // Users table (no foreign keys)
      `CREATE TABLE IF NOT EXISTS inv_users (
        id INT NOT NULL AUTO_INCREMENT,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) DEFAULT NULL,
        email VARCHAR(255) DEFAULT NULL,
        avatar_url TEXT DEFAULT NULL,
        role ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Categories (no foreign keys)
      `CREATE TABLE IF NOT EXISTS inv_categories (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Suppliers (no foreign keys)
      `CREATE TABLE IF NOT EXISTS inv_suppliers (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255) DEFAULT NULL,
        email VARCHAR(255) DEFAULT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        address TEXT DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Warehouses (no foreign keys)
      `CREATE TABLE IF NOT EXISTS inv_warehouses (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        location TEXT DEFAULT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Products (references categories, suppliers, warehouses)
      `CREATE TABLE IF NOT EXISTS inv_products (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) NOT NULL UNIQUE,
        description TEXT DEFAULT NULL,
        category_id INT DEFAULT NULL,
        supplier_id INT DEFAULT NULL,
        cost_price DECIMAL(12,2) DEFAULT 0.00,
        retail_price DECIMAL(12,2) DEFAULT 0.00,
        quantity INT DEFAULT 0,
        min_stock_level INT DEFAULT 10,
        max_stock_level INT DEFAULT 100,
        reorder_point INT DEFAULT 15,
        warehouse_id INT DEFAULT NULL,
        image_url TEXT DEFAULT NULL,
        barcode VARCHAR(255) DEFAULT NULL,
        expiry_date DATE DEFAULT NULL,
        manufacture_date DATE DEFAULT NULL,
        lot_number VARCHAR(100) DEFAULT NULL,
        unit VARCHAR(50) DEFAULT 'pcs',
        status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_products_expiry (expiry_date),
        INDEX idx_products_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Stock movements (references products, users)
      `CREATE TABLE IF NOT EXISTS inv_stock_movements (
        id INT NOT NULL AUTO_INCREMENT,
        product_id INT NOT NULL,
        type ENUM('restock', 'transfer_in', 'transfer_out', 'damage', 'expired', 'loss', 'adjustment', 'sample', 'return_out', 'initial') NOT NULL,
        quantity INT NOT NULL,
        reason VARCHAR(500) DEFAULT NULL,
        previous_quantity INT DEFAULT NULL,
        new_quantity INT DEFAULT NULL,
        unit_cost DECIMAL(12,2) DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_movements_product (product_id),
        INDEX idx_movements_type (type),
        INDEX idx_movements_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Purchase orders (references suppliers, users)
      `CREATE TABLE IF NOT EXISTS inv_purchase_orders (
        id INT NOT NULL AUTO_INCREMENT,
        po_number VARCHAR(50) NOT NULL UNIQUE,
        supplier_id INT NOT NULL,
        status ENUM('draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'cancelled') DEFAULT 'draft',
        total_cost DECIMAL(12,2) DEFAULT 0.00,
        order_date DATE DEFAULT NULL,
        expected_date DATE DEFAULT NULL,
        received_date DATE DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_po_supplier (supplier_id),
        INDEX idx_po_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Purchase order items (references po, products)
      `CREATE TABLE IF NOT EXISTS inv_purchase_order_items (
        id INT NOT NULL AUTO_INCREMENT,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity_ordered INT NOT NULL DEFAULT 1,
        quantity_received INT NOT NULL DEFAULT 0,
        unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        PRIMARY KEY (id),
        INDEX idx_poi_order (order_id),
        INDEX idx_poi_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Stock takes (references warehouses, users)
      `CREATE TABLE IF NOT EXISTS inv_stock_takes (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        warehouse_id INT DEFAULT NULL,
        status ENUM('draft', 'in_progress', 'completed', 'cancelled') DEFAULT 'draft',
        notes TEXT DEFAULT NULL,
        started_at DATETIME DEFAULT NULL,
        completed_at DATETIME DEFAULT NULL,
        created_by INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_stocktake_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Stock take items (references stock_take, products, users)
      `CREATE TABLE IF NOT EXISTS inv_stock_take_items (
        id INT NOT NULL AUTO_INCREMENT,
        stock_take_id INT NOT NULL,
        product_id INT NOT NULL,
        system_quantity INT NOT NULL,
        counted_quantity INT NOT NULL,
        notes TEXT DEFAULT NULL,
        counted_by INT DEFAULT NULL,
        counted_at DATETIME DEFAULT NULL,
        PRIMARY KEY (id),
        INDEX idx_sti_stocktake (stock_take_id),
        INDEX idx_sti_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Activity log (references users)
      `CREATE TABLE IF NOT EXISTS inv_activity_log (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT DEFAULT NULL,
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id INT DEFAULT NULL,
        details TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_log_entity (entity_type, entity_id),
        INDEX idx_log_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Notifications (references users)
      `CREATE TABLE IF NOT EXISTS inv_notifications (
        id INT NOT NULL AUTO_INCREMENT,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
        is_read TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_notif_user (user_id, is_read)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ];

    for (const stmt of createStatements) {
      await connection.execute(stmt);
    }
    console.log("✓ Tables created");

    // Add foreign keys
    const foreignKeys = [
      "ALTER TABLE inv_products ADD FOREIGN KEY (category_id) REFERENCES inv_categories(id) ON DELETE SET NULL",
      "ALTER TABLE inv_products ADD FOREIGN KEY (supplier_id) REFERENCES inv_suppliers(id) ON DELETE SET NULL",
      "ALTER TABLE inv_products ADD FOREIGN KEY (warehouse_id) REFERENCES inv_warehouses(id) ON DELETE SET NULL",
      "ALTER TABLE inv_stock_movements ADD FOREIGN KEY (product_id) REFERENCES inv_products(id) ON DELETE CASCADE",
      "ALTER TABLE inv_stock_movements ADD FOREIGN KEY (created_by) REFERENCES inv_users(id) ON DELETE SET NULL",
      "ALTER TABLE inv_purchase_orders ADD FOREIGN KEY (supplier_id) REFERENCES inv_suppliers(id)",
      "ALTER TABLE inv_purchase_orders ADD FOREIGN KEY (created_by) REFERENCES inv_users(id) ON DELETE SET NULL",
      "ALTER TABLE inv_purchase_order_items ADD FOREIGN KEY (order_id) REFERENCES inv_purchase_orders(id) ON DELETE CASCADE",
      "ALTER TABLE inv_purchase_order_items ADD FOREIGN KEY (product_id) REFERENCES inv_products(id)",
      "ALTER TABLE inv_stock_takes ADD FOREIGN KEY (warehouse_id) REFERENCES inv_warehouses(id) ON DELETE SET NULL",
      "ALTER TABLE inv_stock_takes ADD FOREIGN KEY (created_by) REFERENCES inv_users(id)",
      "ALTER TABLE inv_stock_take_items ADD FOREIGN KEY (stock_take_id) REFERENCES inv_stock_takes(id) ON DELETE CASCADE",
      "ALTER TABLE inv_stock_take_items ADD FOREIGN KEY (product_id) REFERENCES inv_products(id) ON DELETE CASCADE",
      "ALTER TABLE inv_stock_take_items ADD FOREIGN KEY (counted_by) REFERENCES inv_users(id)",
      "ALTER TABLE inv_activity_log ADD FOREIGN KEY (user_id) REFERENCES inv_users(id) ON DELETE SET NULL",
      "ALTER TABLE inv_notifications ADD FOREIGN KEY (user_id) REFERENCES inv_users(id) ON DELETE CASCADE",
    ];

    for (const fk of foreignKeys) {
      try {
        await connection.execute(fk);
      } catch {
        // Foreign key might already exist or have issues
      }
    }
    console.log("✓ Foreign keys added");

    // Re-enable foreign key checks
    await connection.execute("SET FOREIGN_KEY_CHECKS = 1");

    // Insert default admin user
    await connection.execute(
      `INSERT INTO inv_users (username, password_hash, full_name, role) VALUES 
       ('admin', '$2b$10$ngDMbg6ggOhHo7OMJhmG0eDRFJYTLJVmCTSNulp1SWKiwBfn56WG6', 'Admin', 'admin')`
    );
    console.log("✓ Default admin created (admin / admin123)");

    // Insert default warehouse
    await connection.execute(
      `INSERT INTO inv_warehouses (name, location) VALUES ('Main Store', 'Primary storage location')`
    );
    console.log("✓ Default warehouse created");

    // Verify
    const [tables] = await connection.execute("SHOW TABLES");
    console.log(`\n✓ Migration complete! Created ${(tables as unknown[]).length} tables.`);

    await connection.end();

  } catch (error: unknown) {
    console.error("\n✗ Migration failed!");
    console.error(error);
    rl.close();
    process.exit(1);
  }

  rl.close();
  console.log("\n" + "=".repeat(60));
  console.log("Next steps:");
  console.log("  1. Start the dev server: npm run dev");
  console.log("  2. Login with: admin / admin123");
  console.log("  3. CHANGE THE ADMIN PASSWORD!");
  console.log("  4. Add categories, suppliers, and products");
  console.log("=".repeat(60));
}

main();
