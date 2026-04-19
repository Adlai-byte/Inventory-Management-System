// =======================================
// BATISTIL Inventory System Types
// BIR-Compliant - No Sales Tracking
// =======================================

// =======================================
// User Types
// =======================================
export interface Profile {
  id: number;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  role: "admin" | "manager" | "staff";
  created_at: string;
}

// =======================================
// Category Types
// =======================================
export interface Category {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

// =======================================
// Supplier Types
// =======================================
export interface Supplier {
  id: number;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

// =======================================
// Warehouse Types
// =======================================
export interface Warehouse {
  id: number;
  name: string;
  location: string | null;
  is_active: boolean;
  created_at: string;
}

// =======================================
// Product Types
// =======================================
export interface Product {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  category_id: number | null;
  supplier_id: number | null;
  cost_price: number;        // Purchase price from supplier
  quantity: number;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  warehouse_id: number | null;
  image_url: string | null;
  barcode: string | null;
  expiry_date: string | null;
  manufacture_date: string | null;
  lot_number: string | null;
  unit: string;
  status: "active" | "inactive" | "discontinued";
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
  supplier?: Supplier;
  warehouse?: Warehouse;
  category_name?: string;
  supplier_name?: string;
  warehouse_name?: string;
  // Computed
  days_until_expiry?: number | null;
  stock_status?: "out_of_stock" | "low_stock" | "in_stock" | "overstocked";
}

// =======================================
// Batch Types
// =======================================
export interface Batch {
  id: number;
  product_id: number;
  batch_number: string;
  quantity: number;
  initial_quantity: number;
  manufacture_date: string | null;
  expiry_date: string | null;
  cost_price: number;
  warehouse_id: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  product_name?: string;
  product_sku?: string;
}

// =======================================
// Stock Movement Types (BIR-Compliant)
// =======================================
export type MovementType =
  | "restock"        // Items received from supplier
  | "transfer_in"    // Items received from another location
  | "transfer_out"   // Items sent to another location
  | "write_off"      // Items written off (damaged/expired/lost)
  | "damage"         // Items damaged/broken (legacy)
  | "expired"        // Items expired and disposed (legacy)
  | "loss"           // Items lost/stolen (legacy)
  | "adjustment"     // Count correction from stock take
  | "sample"         // Items used as samples
  | "return_out"     // Items returned to supplier
  | "initial";       // Initial stock when creating product

// Types that increase stock
export const INBOUND_TYPES: MovementType[] = ["restock", "transfer_in", "initial"];
// Types that decrease stock
export const OUTBOUND_TYPES: MovementType[] = ["transfer_out", "write_off", "damage", "expired", "loss", "sample", "return_out"];
// Types that set absolute quantity
export const ADJUSTMENT_TYPES: MovementType[] = ["adjustment"];

export interface StockMovement {
  id: number;
  product_id: number;
  type: MovementType;
  quantity: number;
  reason: string | null;
  previous_quantity: number | null;
  new_quantity: number | null;
  unit_cost: number | null;
  notes: string | null;
  batch_id: number | null;
  created_by: number | null;
  created_at: string;
  // Joined fields
  product?: Product;
  batch?: Batch;
  product_name?: string;
  product_sku?: string;
  created_by_name?: string;
}

// =======================================
// Purchase Order Types
// =======================================
export type PurchaseOrderStatus = "draft" | "pending" | "approved" | "ordered" | "partial" | "received" | "cancelled";

export interface PurchaseOrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  // Joined fields
  product?: Product;
  product_name?: string;
  product_sku?: string;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  status: PurchaseOrderStatus;
  total_cost: number;
  order_date: string | null;
  expected_date: string | null;
  received_date: string | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  supplier?: Supplier;
  supplier_name?: string;
  items?: PurchaseOrderItem[];
}

// =======================================
// Stock Take Types
// =======================================
export type StockTakeStatus = "draft" | "in_progress" | "completed" | "cancelled";

export interface StockTakeItem {
  id: number;
  stock_take_id: number;
  product_id: number;
  system_quantity: number;
  counted_quantity: number;
  difference: number;
  notes: string | null;
  counted_by: number | null;
  counted_at: string | null;
  // Joined fields
  product?: Product;
  product_name?: string;
  product_sku?: string;
}

export interface StockTake {
  id: number;
  name: string;
  warehouse_id: number | null;
  status: StockTakeStatus;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: number;
  created_at: string;
  // Joined fields
  warehouse?: Warehouse;
  warehouse_name?: string;
  items?: StockTakeItem[];
  // Computed
  total_items?: number;
  matched_count?: number;
  variance_count?: number;
}

// =======================================
// Activity Log Types
// =======================================
export interface ActivityLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string | null;
  created_at: string;
  // Joined fields
  profile?: Profile;
  user_name?: string;
}

// =======================================
// Notification Types
// =======================================
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  is_read: boolean;
  created_at: string;
}

// =======================================
// Report Types (No Sales Data)
// =======================================
export interface InventorySummary {
  total_products: number;
  active_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_soon_count: number;
  expired_count: number;
  total_cost_value: number;  // At purchase price only
}

export interface ShrinkageSummary {
  total_items_lost: number;
  total_cost_lost: number;
  loss_rate_percentage: number;
  by_type: {
    type: MovementType;
    count: number;
    cost_value: number;
  }[];
}

export interface CategoryBreakdown {
  category: string;
  product_count: number;
  total_quantity: number;
  cost_value: number;
}

export interface StockMovementSummary {
  total_movements: number;
  by_type: {
    type: MovementType;
    count: number;
    quantity: number;
  }[];
  recent_movements: StockMovement[];
}
