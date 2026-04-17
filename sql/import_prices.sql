-- ============================================================================
-- Script to Import Prices from Old POS to New Inventory System
-- Run this in your MySQL database
-- ============================================================================

-- Preview: Check how many products will be updated
SELECT 
    COUNT(*) as products_to_update,
    SUM(CASE WHEN pp.price > 0 THEN 1 ELSE 0 END) as products_with_valid_price
FROM inv_products ip
LEFT JOIN products p ON p.code = ip.barcode OR p.product_name = ip.name
LEFT JOIN product_prices pp ON pp.product_id = p.product_id AND pp.price_type_id = 1
WHERE pp.price > 0;

-- Preview: Sample of products that will be updated
SELECT 
    ip.id,
    ip.name,
    ip.sku,
    ip.barcode,
    ip.unit_price as current_price,
    pp.price as new_price
FROM inv_products ip
LEFT JOIN products p ON p.code = ip.barcode OR p.product_name = ip.name
LEFT JOIN product_prices pp ON pp.product_id = p.product_id AND pp.price_type_id = 1
WHERE pp.price > 0
LIMIT 20;

-- ============================================================================
-- ACTUAL UPDATE (Uncomment when ready)
-- ============================================================================

-- Update prices by barcode match
UPDATE inv_products ip
INNER JOIN products p ON p.code = ip.barcode
INNER JOIN product_prices pp ON pp.product_id = p.product_id AND pp.price_type_id = 1
SET ip.unit_price = pp.price
WHERE pp.price > 0;

-- Update prices by name match (for products without barcode match)
UPDATE inv_products ip
INNER JOIN products p ON p.product_name = ip.name
INNER JOIN product_prices pp ON pp.product_id = p.product_id AND pp.price_type_id = 1
SET ip.unit_price = pp.price
WHERE pp.price > 0 
  AND ip.unit_price = 0;

-- Verify update
SELECT 
    COUNT(*) as total_products,
    SUM(CASE WHEN unit_price > 0 THEN 1 ELSE 0 END) as products_with_price,
    SUM(CASE WHEN unit_price = 0 THEN 1 ELSE 0 END) as products_without_price
FROM inv_products;
