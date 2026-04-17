// =======================================
// Product Export Utilities
// BIR-Compliant — Cost Price Only, No Sales Data
// =======================================

import type { Product } from "@/lib/types";

// Re-export from canonical source (validations)
export { UNITS_OF_MEASURE } from "@/lib/validations/product";
export type UnitOfMeasure = (typeof import("@/lib/validations/product").UNITS_OF_MEASURE)[number];

export const ALL_EXPORT_HEADERS = [
  "Name", "SKU", "Description", "Category", "Supplier", "Warehouse",
  "Cost Price", "Quantity", "Min Stock Level", "Max Stock Level",
  "Reorder Point", "Unit", "Barcode", "Expiry Date",
  "Manufacture Date", "Lot Number", "Status",
];

/**
 * Formats a single product into a CSV row array.
 * All monetary values are at cost price (purchase price from suppliers).
 */
export function formatProductRow(product: Product): string[] {
  return [
    product.name || "",
    product.sku || "",
    product.description || "",
    product.category?.name || product.category_name || "",
    product.supplier?.name || product.supplier_name || "",
    product.warehouse?.name || product.warehouse_name || "",
    product.cost_price?.toString() || "0",
    product.quantity?.toString() || "0",
    product.min_stock_level?.toString() || "10",
    product.max_stock_level?.toString() || "100",
    product.reorder_point?.toString() || "15",
    product.unit || "pcs",
    product.barcode || "",
    product.expiry_date || "",
    product.manufacture_date || "",
    product.lot_number || "",
    product.status || "active",
  ];
}

/**
 * Escapes a CSV field value (handles quotes and commas).
 */
export function escapeCSVField(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generates a complete CSV string from an array of products.
 * Includes all inventory columns — cost price only, no sales data.
 */
export function generateCSV(products: Product[]): string {
  const headers = ALL_EXPORT_HEADERS.map(escapeCSVField).join(",");
  const rows = products.map((p) =>
    formatProductRow(p).map((v) => escapeCSVField(v)).join(",")
  );
  return [headers, ...rows].join("\n");
}

/**
 * Triggers a CSV file download in the browser.
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generates a timestamped filename for exports.
 */
export function getExportFilename(prefix: string = "products"): string {
  return `${prefix}-${new Date().toISOString().split("T")[0]}.csv`;
}
