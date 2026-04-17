-- =======================================
-- BASTISTIL MINIMART INVENTORY SYSTEM
-- MySQL Schema v2.0 (BIR-Compliant)
-- Pure Inventory Management - No Sales Tracking
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
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default admin account (password: admin123, username: admin)
-- CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN
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
  `contact_person` VARCHAR(255) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================
-- WAREHOUSES / LOCATIONS
-- =======================================
CREATE TABLE IF NOT EXISTS `inv_warehouses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `location` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default warehouse
INSERT INTO `inv_warehouses` (`name`, `location`)
VALUES ('Main Store', 'Primary storage location')
ON DUPLICATE KEY UPDATE `id`=`id`;

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
  `cost_price` DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Purchase price from supplier',
  `retail_price` DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Display price only - NOT for sales tracking',
  `quantity` INT DEFAULT 0,
  `min_stock_level` INT DEFAULT 10,
  `max_stock_level` INT DEFAULT 100,
  `reorder_point` INT DEFAULT 15,
  `warehouse_id` INT DEFAULT NULL,
  `image_url` TEXT DEFAULT NULL,
  `barcode` VARCHAR(255) DEFAULT NULL,
  `expiry_date` DATE DEFAULT NULL,
  `manufacture_date` DATE DEFAULT NULL,
  `lot_number` VARCHAR(100) DEFAULT NULL,
  `unit` VARCHAR(50) DEFAULT 'pcs' COMMENT 'Unit of measure: pcs, kg, liters, etc.',
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
-- STOCK MOVEMENTS (BIR-COMPLIANT)
-- No sales tracking - only inventory changes
-- =======================================
CREATE TABLE IF NOT EXISTS `inv_stock_movements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_id` INT NOT NULL,
  `type` ENUM(
    'restock',        -- Items received from supplier
    'transfer_in',    -- Items received from another location
    'transfer_out',   -- Items sent to another location
    'damage',         -- Items damaged/broken
    'expired',        -- Items expired and disposed
    'loss',           -- Items lost/stolen
    'adjustment',     -- Count correction from stock take
    'sample',         -- Items used as samples
    'return_out',     -- Items returned to supplier
    'initial'         -- Initial stock when creating product
  ) NOT NULL,
  `quantity` INT NOT NULL,
  `reason` VARCHAR(500) DEFAULT NULL COMMENT 'Required for reductions',
  `previous_quantity` INT DEFAULT NULL COMMENT 'Stock level before this movement',
  `new_quantity` INT DEFAULT NULL COMMENT 'Stock level after this movement',
  `unit_cost` DECIMAL(12,2) DEFAULT NULL COMMENT 'Cost per unit at time of movement',
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
  `po_number` VARCHAR(50) NOT NULL UNIQUE,
  `supplier_id` INT NOT NULL,
  `status` ENUM('draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'cancelled') DEFAULT 'draft',
  `total_cost` DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Total at cost price',
  `order_date` DATE DEFAULT NULL,
  `expected_date` DATE DEFAULT NULL,
  `received_date` DATE DEFAULT NULL,
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
  `quantity_ordered` INT NOT NULL DEFAULT 1,
  `quantity_received` INT NOT NULL DEFAULT 0,
  `unit_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`order_id`) REFERENCES `inv_purchase_orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `inv_products`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================
-- STOCK TAKES (Physical Inventory Counts)
-- =======================================
CREATE TABLE IF NOT EXISTS `inv_stock_takes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `warehouse_id` INT DEFAULT NULL,
  `status` ENUM('draft', 'in_progress', 'completed', 'cancelled') DEFAULT 'draft',
  `notes` TEXT DEFAULT NULL,
  `started_at` DATETIME DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `created_by` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`warehouse_id`) REFERENCES `inv_warehouses`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `inv_users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inv_stock_take_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `stock_take_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `system_quantity` INT NOT NULL COMMENT 'Quantity in system before count',
  `counted_quantity` INT NOT NULL COMMENT 'Actual counted quantity',
  `difference` INT GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  `notes` TEXT DEFAULT NULL,
  `counted_by` INT DEFAULT NULL,
  `counted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`stock_take_id`) REFERENCES `inv_stock_takes`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `inv_products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`counted_by`) REFERENCES `inv_users`(`id`),
  UNIQUE KEY `unique_stock_take_product` (`stock_take_id`, `product_id`)
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
-- INDEXES FOR PERFORMANCE
-- =======================================
CREATE INDEX `idx_inv_products_category` ON `inv_products`(`category_id`);
CREATE INDEX `idx_inv_products_supplier` ON `inv_products`(`supplier_id`);
CREATE INDEX `idx_inv_products_warehouse` ON `inv_products`(`warehouse_id`);
CREATE INDEX `idx_inv_products_sku` ON `inv_products`(`sku`);
CREATE INDEX `idx_inv_products_barcode` ON `inv_products`(`barcode`);
CREATE INDEX `idx_inv_products_status` ON `inv_products`(`status`);
CREATE INDEX `idx_inv_stock_movements_product` ON `inv_stock_movements`(`product_id`);
CREATE INDEX `idx_inv_stock_movements_type` ON `inv_stock_movements`(`type`);
CREATE INDEX `idx_inv_stock_movements_created` ON `inv_stock_movements`(`created_at`);
CREATE INDEX `idx_inv_purchase_orders_supplier` ON `inv_purchase_orders`(`supplier_id`);
CREATE INDEX `idx_inv_purchase_orders_status` ON `inv_purchase_orders`(`status`);
CREATE INDEX `idx_inv_activity_log_entity` ON `inv_activity_log`(`entity_type`, `entity_id`);
CREATE INDEX `idx_inv_activity_log_created` ON `inv_activity_log`(`created_at`);
CREATE INDEX `idx_inv_notifications_user` ON `inv_notifications`(`user_id`, `is_read`);
CREATE INDEX `idx_inv_stock_takes_status` ON `inv_stock_takes`(`status`);
