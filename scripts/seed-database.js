/**
 * Database seed script - Populates the database with sample data for testing.
 * Run with: node scripts/seed-database.js
 *
 * IMPORTANT: This will add sample data to your database.
 * Make sure you have run the inventory_schema.sql first.
 */

const mysql = require("mysql2/promise");

require("dotenv").config({ path: ".env.local" });

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: parseInt(process.env.MYSQL_PORT || "3306"),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "bmm_db",
  multipleStatements: true,
});

const sampleData = `
-- Categories
INSERT IGNORE INTO inv_categories (id, name, description) VALUES
  (1, 'Snacks', 'Chips, biscuits, and snack items'),
  (2, 'Beverages', 'Soft drinks, juices, and water'),
  (3, 'Dairy', 'Milk, cheese, and yogurt'),
  (4, 'Bakery', 'Bread, pastries, and cakes'),
  (5, 'Cleaning', 'Household cleaning products'),
  (6, 'Personal Care', 'Soap, shampoo, and hygiene products'),
  (7, 'Canned Goods', 'Canned vegetables, meats, and soups'),
  (8, 'Condiments', 'Sauces, spices, and seasonings');

-- Reset auto-increment
ALTER TABLE inv_categories AUTO_INCREMENT = 100;

-- Suppliers
INSERT IGNORE INTO inv_suppliers (id, name, email, phone, address) VALUES
  (1, 'Fresh Foods Supply', 'contact@freshfoods.com', '555-0101', '123 Market Street'),
  (2, 'Beverage World Dist.', 'orders@beverageworld.com', '555-0102', '456 Industrial Ave'),
  (3, 'CleanCo Products', 'sales@cleanco.com', '555-0103', '789 Warehouse Blvd'),
  (4, 'Daily Essentials Inc.', 'info@dailyessentials.com', '555-0104', '321 Commerce Road');

ALTER TABLE inv_suppliers AUTO_INCREMENT = 100;

-- Warehouses
INSERT IGNORE INTO inv_warehouses (id, name, address) VALUES
  (1, 'Main Store', 'BASTISTIL Mini Mart - Ground Floor'),
  (2, 'Storage Room A', 'Back storage - Section A'),
  (3, 'Storage Room B', 'Back storage - Section B');

ALTER TABLE inv_warehouses AUTO_INCREMENT = 100;

-- Products
INSERT IGNORE INTO inv_products (id, name, sku, description, category_id, supplier_id, unit_price, cost_price, quantity, min_stock_level, warehouse_id, barcode, expiry_date, status) VALUES
  -- Snacks
  (1, 'Lays Classic Chips', 'SNK-001', 'Classic potato chips 200g', 1, 1, 3.50, 2.00, 45, 10, 1, '8901058012345', '2026-12-31', 'active'),
  (2, 'Oreo Biscuits', 'SNK-002', 'Chocolate sandwich cookies 300g', 1, 1, 4.00, 2.50, 30, 10, 1, '8901058012346', '2027-06-30', 'active'),
  (3, 'Pringles Original', 'SNK-003', 'Stackable potato crisps 165g', 1, 1, 5.50, 3.50, 25, 10, 1, '8901058012347', '2026-09-30', 'active'),
  -- Beverages
  (4, 'Coca-Cola 1.5L', 'BEV-001', 'Coca-Cola classic 1.5 liter bottle', 2, 2, 2.00, 1.20, 60, 20, 1, '8901058012348', '2027-03-15', 'active'),
  (5, 'Nestle Pure Water 500ml', 'BEV-002', 'Purified drinking water 500ml', 2, 2, 1.00, 0.50, 100, 30, 1, '8901058012349', '2027-12-31', 'active'),
  (6, 'Minute Maid Orange 1L', 'BEV-003', 'Orange juice 1 liter', 2, 2, 3.00, 1.80, 35, 15, 1, '8901058012350', '2026-08-20', 'active'),
  -- Dairy
  (7, 'Fresh Milk 1L', 'DRY-001', 'Whole milk 1 liter', 3, 4, 2.50, 1.50, 20, 10, 1, '8901058012351', '2026-05-01', 'active'),
  (8, 'Cheddar Cheese 200g', 'DRY-002', 'Block cheddar cheese 200g', 3, 4, 4.50, 3.00, 15, 5, 1, '8901058012352', '2026-06-15', 'active'),
  -- Bakery
  (9, 'White Bread Loaf', 'BKR-001', 'Sliced white bread', 4, 4, 1.50, 0.80, 40, 15, 1, '8901058012353', '2026-04-25', 'active'),
  (10, 'Chocolate Croissant', 'BKR-002', 'Butter chocolate croissant', 4, 4, 2.00, 1.20, 25, 10, 1, '8901058012354', '2026-04-22', 'active'),
  -- Cleaning
  (11, 'Bleach Cleaner 1L', 'CLN-001', 'Multi-surface bleach cleaner', 5, 3, 3.00, 1.80, 18, 8, 2, '8901058012355', NULL, 'active'),
  (12, 'Dish Soap 500ml', 'CLN-002', 'Liquid dishwashing soap', 5, 3, 2.50, 1.50, 22, 10, 2, '8901058012356', NULL, 'active'),
  -- Personal Care
  (13, 'Dove Soap Bar', 'PRC-001', 'Moisturizing soap bar 100g', 6, 3, 1.50, 0.90, 50, 20, 2, '8901058012357', NULL, 'active'),
  (14, 'Head & Shoulders 200ml', 'PRC-002', 'Anti-dandruff shampoo 200ml', 6, 3, 6.00, 4.00, 12, 5, 2, '8901058012358', NULL, 'active'),
  -- Canned Goods
  (15, 'Spam Classic 340g', 'CAN-001', 'Canned luncheon meat', 7, 1, 4.50, 3.00, 30, 10, 3, '8901058012359', '2028-01-15', 'active'),
  (16, 'Campbells Tomato Soup', 'CAN-002', 'Tomato soup 400g can', 7, 1, 2.50, 1.50, 25, 10, 3, '8901058012360', '2027-09-30', 'active'),
  -- Condiments
  (17, 'Heinz Ketchup 500g', 'CND-001', 'Tomato ketchup 500g bottle', 8, 1, 3.50, 2.20, 20, 8, 3, '8901058012361', '2027-06-30', 'active'),
  (18, 'Mama Sita Sinigang Mix', 'CND-002', 'Sour soup mix 50g', 8, 1, 1.00, 0.60, 5, 10, 3, '8901058012362', '2026-12-31', 'active'),
  -- Low stock item (triggers alert)
  (19, 'Red Bull 250ml', 'BEV-004', 'Energy drink 250ml can', 2, 2, 2.50, 1.50, 3, 10, 1, '8901058012363', '2027-01-01', 'active'),
  -- Expired item (for testing alerts)
  (20, 'Expired Yogurt Sample', 'DRY-003', 'This item is expired for testing', 3, 4, 1.50, 0.80, 10, 5, 1, '8901058012364', '2025-01-01', 'active');

ALTER TABLE inv_products AUTO_INCREMENT = 100;

-- Stock Movements (sample history)
INSERT IGNORE INTO inv_stock_movements (product_id, type, quantity, reference, notes, created_by, created_at) VALUES
  (1, 'inbound', 50, 'PO-001', 'Initial stock delivery', 1, DATE_SUB(NOW(), INTERVAL 30 DAY)),
  (4, 'inbound', 80, 'PO-002', 'Beverage restock', 1, DATE_SUB(NOW(), INTERVAL 28 DAY)),
  (5, 'inbound', 120, 'PO-002', 'Beverage restock', 1, DATE_SUB(NOW(), INTERVAL 28 DAY)),
  (1, 'outbound', 5, 'SALE-001', 'Daily sales', 3, DATE_SUB(NOW(), INTERVAL 25 DAY)),
  (4, 'outbound', 20, 'SALE-002', 'Daily sales', 3, DATE_SUB(NOW(), INTERVAL 20 DAY)),
  (7, 'inbound', 30, 'PO-003', 'Dairy delivery', 1, DATE_SUB(NOW(), INTERVAL 15 DAY)),
  (9, 'inbound', 50, 'PO-004', 'Bakery delivery', 1, DATE_SUB(NOW(), INTERVAL 10 DAY)),
  (4, 'outbound', 10, 'SALE-003', 'Weekend sales', 3, DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (1, 'outbound', 8, 'SALE-004', 'Weekend sales', 3, DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (19, 'adjustment', -5, 'ADJ-001', 'Damaged units removed', 2, DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (18, 'outbound', 5, 'SALE-005', 'Daily sales', 3, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (15, 'inbound', 30, 'PO-005', 'Canned goods restock', 1, NOW()),
  (11, 'inbound', 20, 'PO-006', 'Cleaning supplies delivery', 1, NOW());

-- Purchase Orders (sample)
INSERT IGNORE INTO inv_purchase_orders (id, supplier_id, status, total_amount, notes, created_by, created_at) VALUES
  (1, 1, 'received', 150.00, 'Initial snack delivery', 1, DATE_SUB(NOW(), INTERVAL 30 DAY)),
  (2, 2, 'received', 280.00, 'Beverage bulk order', 1, DATE_SUB(NOW(), INTERVAL 28 DAY)),
  (3, 4, 'received', 75.00, 'Dairy weekly order', 2, DATE_SUB(NOW(), INTERVAL 15 DAY)),
  (4, 1, 'pending', 200.00, 'Snack restock pending', 2, NOW());

ALTER TABLE inv_purchase_orders AUTO_INCREMENT = 100;

-- Purchase Order Items
INSERT IGNORE INTO inv_purchase_order_items (order_id, product_id, quantity, unit_price) VALUES
  (1, 1, 50, 2.00),
  (1, 2, 30, 2.50),
  (2, 4, 80, 1.20),
  (2, 5, 120, 0.50),
  (3, 7, 30, 1.50),
  (3, 8, 15, 3.00),
  (4, 1, 40, 2.00),
  (4, 3, 25, 3.50);
`;

async function seed() {
  console.log("🌱 Seeding database with sample data...");
  console.log(`   Database: ${process.env.MYSQL_DATABASE || "bmm_db"}`);
  console.log(`   Host: ${process.env.MYSQL_HOST || "localhost"}:${process.env.MYSQL_PORT || "3306"}`);
  console.log("");

  try {
    const [connection] = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(sampleData);
      await connection.commit();
      console.log("✅ Database seeded successfully!");
      console.log("");
      console.log("Sample data includes:");
      console.log("  - 8 categories");
      console.log("  - 4 suppliers");
      console.log("  - 3 warehouses");
      console.log("  - 20 products (including low-stock and expired samples)");
      console.log("  - 13 stock movements");
      console.log("  - 4 purchase orders");
      console.log("");
      console.log("Login with: admin / admin123");
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("❌ Error seeding database:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
