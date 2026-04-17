export interface SummaryData {
  totalProducts: number;
  lowStockCount: number;
  totalCostValue: number;
}

export interface OutboundData {
  period: string;
  hour?: number;
  day?: number;
  month?: number;
  transfer_count: number;
  total_items: number;
}

export interface OutboundSummary {
  total_transfers: number;
  total_items_dispatched: number;
}

export interface TopDispatchedProduct {
  id: number;
  name: string;
  sku: string;
  category_name: string;
  quantity_dispatched: number;
}

export interface TopProduct {
  id: number;
  name: string;
  sku: string;
  category_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  total_value: number;
  margin: number;
}

export interface LowStockProduct {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  min_stock_level: number;
  supplier_name: string;
}

export interface CategoryData {
  category: string;
  product_count: number;
  total_value: number;
}
