-- =======================================
-- Database Indexes for Performance
-- =======================================

-- Products indexes
CREATE INDEX idx_products_category ON inv_products(category_id);
CREATE INDEX idx_products_supplier ON inv_products(supplier_id);
CREATE INDEX idx_products_status ON inv_products(status);
CREATE INDEX idx_products_barcode ON inv_products(barcode);
CREATE INDEX idx_products_sku ON inv_products(sku);
CREATE INDEX idx_products_name ON inv_products(name);

-- Stock movements indexes
CREATE INDEX idx_stock_movements_product ON inv_stock_movements(product_id);
CREATE INDEX idx_stock_movements_type ON inv_stock_movements(type);
CREATE INDEX idx_stock_movements_created ON inv_stock_movements(created_at);

-- Purchase orders indexes
CREATE INDEX idx_purchase_orders_supplier ON inv_purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON inv_purchase_orders(status);
CREATE INDEX idx_purchase_orders_created ON inv_purchase_orders(created_at);

-- Purchase order items indexes
CREATE INDEX idx_purchase_order_items_order ON inv_purchase_order_items(order_id);
CREATE INDEX idx_purchase_order_items_product ON inv_purchase_order_items(product_id);

-- Activity log indexes
CREATE INDEX idx_activity_log_entity ON inv_activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_user ON inv_activity_log(user_id);
CREATE INDEX idx_activity_log_created ON inv_activity_log(created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON inv_notifications(user_id);
CREATE INDEX idx_notifications_read ON inv_notifications(user_id, is_read);