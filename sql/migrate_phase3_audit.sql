-- =======================================
-- Phase 3: Audit Trail Enhancements
-- BIR-Compliant Movement References
-- =======================================

-- Add reference column to stock movements for BIR traceability
ALTER TABLE `inv_stock_movements` 
  ADD COLUMN `reference` VARCHAR(50) DEFAULT NULL COMMENT 'Date-based sequential reference: MV-YYYYMMDD-NNNN' AFTER `type`;

CREATE INDEX `idx_inv_stock_movements_ref` ON `inv_stock_movements`(`reference`);

-- Add delivery receipt reference to purchase orders
-- (Supplier provides delivery receipts, NOT sales invoices)
ALTER TABLE `inv_purchase_orders` 
  ADD COLUMN `delivery_receipt_no` VARCHAR(100) DEFAULT NULL COMMENT 'Delivery receipt number from supplier' AFTER `supplier_id`;

-- Drop retail_price column (POS remnant)
-- Run manually if column exists: ALTER TABLE `inv_products` DROP COLUMN `retail_price`;
