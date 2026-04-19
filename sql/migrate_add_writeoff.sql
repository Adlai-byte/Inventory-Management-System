-- Add write_off to stock movements type ENUM
-- Run this to fix the write_off movement type

ALTER TABLE inv_stock_movements MODIFY COLUMN type ENUM(
  'restock',
  'transfer_in',
  'transfer_out',
  'write_off',
  'damage',
  'expired',
  'loss',
  'adjustment',
  'sample',
  'return_out',
  'initial'
) NOT NULL;