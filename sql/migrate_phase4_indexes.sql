-- =======================================
-- Phase 4: Performance & Feature Indexes
-- =======================================

-- Composite index for low-stock dashboard query
CREATE INDEX idx_products_low_stock ON inv_products(status, quantity, min_stock_level);

-- Composite index for out-of-stock dashboard query  
CREATE INDEX idx_products_out_of_stock ON inv_products(status, quantity);

-- Composite index for inventory valuation
CREATE INDEX idx_products_valuation ON inv_products(quantity, cost_price);

-- Composite index for expiry alerts
CREATE INDEX idx_products_expiry_status ON inv_products(status, expiry_date);

-- Composite index for stock movements date range queries
CREATE INDEX idx_movements_date_type ON inv_stock_movements(created_at, type, quantity);

-- Composite index for activity log ordering
CREATE INDEX idx_activity_log_recent ON inv_activity_log(created_at DESC);

-- Index for stock take items lookups
CREATE INDEX idx_stock_take_items_product ON inv_stock_take_items(product_id);

-- Index for purchase order items product lookups
CREATE INDEX idx_purchase_order_items_lookup ON inv_purchase_order_items(product_id, quantity_received);
