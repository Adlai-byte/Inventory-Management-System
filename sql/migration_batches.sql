-- Migration: Add Batch Tracking
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

-- Add batch_id to stock movements
ALTER TABLE `inv_stock_movements` ADD COLUMN `batch_id` INT DEFAULT NULL;
ALTER TABLE `inv_stock_movements` ADD CONSTRAINT `fk_stock_movements_batch` FOREIGN KEY (`batch_id`) REFERENCES `inv_batches`(`id`) ON DELETE SET NULL;

-- Migrate existing product data to initial batches
-- We create one batch per product that has current stock or expiry info
INSERT INTO `inv_batches` (product_id, batch_number, quantity, initial_quantity, manufacture_date, expiry_date, cost_price, warehouse_id)
SELECT id, COALESCE(lot_number, 'INITIAL-STOCK'), quantity, quantity, manufacture_date, expiry_date, cost_price, warehouse_id
FROM `inv_products`
WHERE quantity > 0 OR expiry_date IS NOT NULL OR manufacture_date IS NOT NULL;
