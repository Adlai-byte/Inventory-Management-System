export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "admin" | "manager" | "staff";
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category_id: string | null;
  supplier_id: string | null;
  unit_price: number;
  cost_price: number;
  quantity: number;
  min_stock_level: number;
  warehouse_id: string | null;
  image_url: string | null;
  barcode: string | null;
  status: "active" | "inactive" | "discontinued";
  created_at: string;
  updated_at: string;
  // Joined fields
  category?: Category;
  supplier?: Supplier;
  warehouse?: Warehouse;
}

export interface StockMovement {
  id: string;
  product_id: string;
  type: "inbound" | "outbound" | "adjustment";
  quantity: number;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // Joined fields
  product?: Product;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  status: "draft" | "pending" | "approved" | "received" | "cancelled";
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  // Joined fields
  product?: Product;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  created_at: string;
  // Joined fields
  profile?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
  created_at: string;
}
