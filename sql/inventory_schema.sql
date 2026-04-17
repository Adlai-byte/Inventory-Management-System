-- =======================================
-- BATISTIL MINIMART INVENTORY SYSTEM
-- MySQL Schema (separate from POS tables)
-- =======================================

-- =======================================
-- USERS (replaces Supabase Auth)
-- =======================================
CREATE TABLE IF NOT EXISTS `inv_users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(255) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `avatar_url` TEXT DEFAULT NULL,
  `role` ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default admin account (password: admin123, username: admin)
INSERT INTO `inv_users` (`username`, `password_hash`, `full_name`, `role`)
VALUES ('admin', '$2b$10$ngDMbg6ggOhHo7OMJhmG0eDRFJYTLJVmCTSNulp1SWKiwBfn56WG6', 'Admin', 'admin')
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
  INDEX `idx_products_expiry` (`expiry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================
-- STOCK MOVEMENTS
-- =======================================
CREATE TABLE IF NOT EXISTS `inv_stock_movements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_id` INT NOT NULL,
  `type` ENUM('inbound', 'outbound', 'adjustment') NOT NULL,
  `quantity` INT NOT NULL,
  `reference` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`product_id`) REFERENCES `inv_products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `inv_users`(`id`) ON DELETE SET NULL
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
  FOREIGN KEY (`created_by`) REFERENCES `inv_users`(`id`) ON DELETE SET NULL
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
  FOREIGN KEY (`user_id`) REFERENCES `inv_users`(`id`) ON DELETE SET NULL
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
  FOREIGN KEY (`user_id`) REFERENCES `inv_users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================
-- INDEXES
-- =======================================
CREATE INDEX `idx_inv_products_category` ON `inv_products`(`category_id`);
CREATE INDEX `idx_inv_products_supplier` ON `inv_products`(`supplier_id`);
CREATE INDEX `idx_inv_products_warehouse` ON `inv_products`(`warehouse_id`);
CREATE INDEX `idx_inv_products_sku` ON `inv_products`(`sku`);
CREATE INDEX `idx_inv_products_barcode` ON `inv_products`(`barcode`);
CREATE INDEX `idx_inv_stock_movements_product` ON `inv_stock_movements`(`product_id`);
CREATE INDEX `idx_inv_stock_movements_type` ON `inv_stock_movements`(`type`);
CREATE INDEX `idx_inv_purchase_orders_supplier` ON `inv_purchase_orders`(`supplier_id`);
CREATE INDEX `idx_inv_purchase_orders_status` ON `inv_purchase_orders`(`status`);
CREATE INDEX `idx_inv_activity_log_entity` ON `inv_activity_log`(`entity_type`, `entity_id`);
CREATE INDEX `idx_inv_notifications_user` ON `inv_notifications`(`user_id`, `is_read`);
