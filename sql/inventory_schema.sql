-- =======================================
-- BATISTIL MINIMART INVENTORY SYSTEM
-- MySQL Schema v2 (canonical, Docker init)
-- =======================================

-- =======================================
-- USERS
-- =======================================
CREATE TABLE IF NOT EXISTS `inv_users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `avatar_url` TEXT DEFAULT NULL,
  `role` ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default admin (password: admin123) — MUST be changed on first login
INSERT INTO `inv_users` (`username`, `password_hash`, `full_name`, `role`, `must_change_password`)
VALUES ('admin', '$2b$10$ngDMbg6ggOhHo7OMJhmG0eDRFJYTLJVmCTSNulp1SWKiwBfn56WG6', 'Admin', 'admin', 1)
ON DUPLICATE KEY UPDATE `id`=`id`;

-- =======================================
-- CATEGORIES
-- =======================================
CREATE TABLE IF NOT EXISTS `inv_categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================
-- SUPPLIERS
-- =======================================
CREATE TABLE IF NOT EXISTS `inv_suppliers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================
-- WAREHOUSES
-- =======================================
CREATE TABLE IF NOT EXISTS `inv_warehouses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `address` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================
-- PRODUCTS
-- =======================================
CREATE TABLE IF NOT EXISTS `inv_products` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `sku` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT DEFAULT NULL,
  `category_id` INT DEFAULT NULL,
  `supplier_id` INT DEFAULT NULL,
  `unit_price` DECIMAL(12,2) DEFAULT 0.00,
  `cost_price` DECIMAL(12,2) DEFAULT 0.00,
  `quantity` INT DEFAULT 0,
  `min_stock_level` INT DEFAULT 10,
  `warehouse_id` INT DEFAULT NULL,
  `image_url` TEXT DEFAULT NULL,
  `barcode` VARCHAR(255) DEFAULT NULL,
  `expiry_date` DATE DEFAULT NULL,
  `manufacture_date` DATE DEFAULT NULL,
  `lot_number` VARCHAR(100) DEFAULT NULL,
  `status` ENUM('active', 'inactive', 'discontinued') DEFAULT 'active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`category_id`) REFERENCES `inv_categories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`supplier_id`) REFERENCES `inv_suppliers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouses`(`id`) ON DELETE SET NULL,
  INDEX `idx_products_expiry` (`expiry_date`),
  INDEX `idx_products_sku` (`sku`),
  INDEX `idx_products_barcode` (`barcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================
-- BATCH TRACKING (FEFO)
-- =======================================
CREATE TABLE IF NOT EXISTS `inv_batches` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_id` INT NOT NULL,
  `batch_number` VARCHAR(100) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `initial_quantity` INT NOT NULL DEFAULT 0,
  `manufacture_date` DATE DEFAULT NULL,
  `expiry_date` DATE DEFAULT NULL,
  `cost_price` DECIMAL(12,2) DEFAULT 0.00,
  `warehouse_id` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`product_id`) REFERENCES `inv_products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouses`(`id`) ON DELETE SET NULL,
  INDEX `idx_batches_expiry` (`expiry_date`),
  INDEX `idx_batches_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================
-- STOCK MOVEMENTS
-- =======================================
CREATE TABLE IF NOT EXISTS `inv_stock_movements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_id` INT NOT NULL,
  `batch_id` INT DEFAULT NULL,
  `type` ENUM(
    'restock', 'transfer_in', 'initial',
    'transfer_out', 'write_off', 'damage', 'expired', 'loss', 'sample', 'return_out',
    'adjustment'
  ) NOT NULL,
  `reference` VARCHAR(50) DEFAULT NULL,
  `quantity` INT NOT NULL,
  `reason` VARCHAR(500) DEFAULT NULL,
  `previous_quantity` INT DEFAULT NULL,
  `new_quantity` INT DEFAULT NULL,
  `unit_cost` DECIMAL(12,2) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`product_id`) REFERENCES `inv_products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`batch_id`) REFERENCES `inv_batches`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `inv_users`(`id`) ON DELETE SET NULL,
  INDEX `idx_sm_product` (`product_id`),
  INDEX `idx_sm_type` (`type`),
  INDEX `idx_sm_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================
-- PURCHASE ORDERS
-- =======================================
CREATE TABLE IF NOT EXISTS `inv_purchase_orders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `supplier_id` INT NOT NULL,
  `status` ENUM('draft', 'pending', 'approved', 'received', 'cancelled') DEFAULT 'draft',
  `total_amount` DECIMAL(12,2) DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`supplier_id`) REFERENCES `inv_suppliers`(`id`),
  FOREIGN KEY (`created_by`) REFERENCES `inv_users`(`id`) ON DELETE SET NULL,
  INDEX `idx_po_supplier` (`supplier_id`),
  INDEX `idx_po_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================
-- PURCHASE ORDER ITEMS
-- =======================================
CREATE TABLE IF NOT EXISTS `inv_purchase_order_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`order_id`) REFERENCES `inv_purchase_orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `inv_products`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================
-- ACTIVITY LOG
-- =======================================
CREATE TABLE IF NOT EXISTS `inv_activity_log` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT DEFAULT NULL,
  `action` VARCHAR(255) NOT NULL,
  `entity_type` VARCHAR(100) NOT NULL,
  `entity_id` INT DEFAULT NULL,
  `details` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `inv_users`(`id`) ON DELETE SET NULL,
  INDEX `idx_activity_entity` (`entity_type`, `entity_id`),
  INDEX `idx_activity_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================
-- NOTIFICATIONS
-- =======================================
CREATE TABLE IF NOT EXISTS `inv_notifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `inv_users`(`id`) ON DELETE CASCADE,
  INDEX `idx_notifications_user` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
