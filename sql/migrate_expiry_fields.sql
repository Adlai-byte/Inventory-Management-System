-- Migration: Add expiry tracking to existing products table
-- Run this to add expiry fields to existing database

ALTER TABLE `inv_products` 
  ADD COLUMN `expiry_date` DATE DEFAULT NULL AFTER `barcode`,
  ADD COLUMN `manufacture_date` DATE DEFAULT NULL AFTER `expiry_date`,
  ADD COLUMN `lot_number` VARCHAR(100) DEFAULT NULL AFTER `manufacture_date`,
  ADD INDEX `idx_products_expiry` (`expiry_date`);