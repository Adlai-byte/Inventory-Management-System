import { describe, it, expect } from "vitest";
import {
  UNITS_OF_MEASURE,
  ALL_EXPORT_HEADERS,
  formatProductRow,
  escapeCSVField,
  generateCSV,
  getExportFilename,
} from "../product-export";
import type { Product } from "@/lib/types";

// =======================================
// Helper: Create a mock product for testing
// =======================================
function createMockProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: "Test Product",
    sku: "PRD-001",
    description: "A test product",
    category_id: 1,
    supplier_id: 1,
    cost_price: 25.5,
    quantity: 100,
    min_stock_level: 10,
    max_stock_level: 200,
    reorder_point: 15,
    warehouse_id: 1,
    image_url: null,
    barcode: "1234567890",
    expiry_date: "2026-12-31",
    manufacture_date: "2026-01-15",
    lot_number: "LOT-2026-001",
    unit: "pcs",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    category: { id: 1, name: "Beverages", description: null, created_at: "" },
    supplier: { id: 1, name: "Supplier Corp", contact_person: null, email: null, phone: null, address: null, notes: null, is_active: true, created_at: "" },
    warehouse: { id: 1, name: "Main Store", location: "Primary", is_active: true, created_at: "" },
    ...overrides,
  };
}

// =======================================
// UNITS_OF_MEASURE constant
// =======================================
describe("UNITS_OF_MEASURE", () => {
  it("should contain all expected minimart units", () => {
    const expected = [
      "pcs", "pack", "box", "bottle", "can", "roll", "bundle",
      "kg", "liters", "sachet", "pouch", "bag", "dozen", "pair", "set",
    ];
    expect(UNITS_OF_MEASURE).toEqual(expected);
  });

  it("should have 15 units", () => {
    expect(UNITS_OF_MEASURE).toHaveLength(15);
  });

  it("should include 'pcs' as the first unit (default)", () => {
    expect(UNITS_OF_MEASURE[0]).toBe("pcs");
  });
});

// =======================================
// ALL_EXPORT_HEADERS constant
// =======================================
describe("ALL_EXPORT_HEADERS", () => {
  it("should contain all 17 inventory columns", () => {
    expect(ALL_EXPORT_HEADERS).toHaveLength(17);
  });

  it("should include Name as first column", () => {
    expect(ALL_EXPORT_HEADERS[0]).toBe("Name");
  });

  it("should include all required columns", () => {
    const requiredColumns = [
      "Name", "SKU", "Description", "Category", "Supplier", "Warehouse",
      "Cost Price", "Quantity", "Min Stock Level", "Max Stock Level",
      "Reorder Point", "Unit", "Barcode", "Expiry Date",
      "Manufacture Date", "Lot Number", "Status",
    ];
    for (const col of requiredColumns) {
      expect(ALL_EXPORT_HEADERS).toContain(col);
    }
  });

  it("should NOT contain any sales-related columns", () => {
    const salesColumns = ["Selling Price", "Retail Price", "Sales", "Revenue", "Profit", "Margin", "VAT"];
    for (const col of salesColumns) {
      expect(ALL_EXPORT_HEADERS).not.toContain(col);
    }
  });
});

// =======================================
// escapeCSVField
// =======================================
describe("escapeCSVField", () => {
  it("should return plain values unchanged", () => {
    expect(escapeCSVField("hello")).toBe("hello");
    expect(escapeCSVField("123")).toBe("123");
  });

  it("should escape values containing commas", () => {
    expect(escapeCSVField("hello, world")).toBe('"hello, world"');
  });

  it("should escape values containing double quotes", () => {
    expect(escapeCSVField('say "hello"')).toBe('"say ""hello"""');
  });

  it("should escape values containing newlines", () => {
    expect(escapeCSVField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("should handle empty strings", () => {
    expect(escapeCSVField("")).toBe("");
  });
});

// =======================================
// formatProductRow
// =======================================
describe("formatProductRow", () => {
  it("should return 17 fields matching header count", () => {
    const product = createMockProduct();
    const row = formatProductRow(product);
    expect(row).toHaveLength(17);
  });

  it("should format a complete product correctly", () => {
    const product = createMockProduct();
    const row = formatProductRow(product);

    expect(row[0]).toBe("Test Product");      // Name
    expect(row[1]).toBe("PRD-001");            // SKU
    expect(row[2]).toBe("A test product");     // Description
    expect(row[3]).toBe("Beverages");          // Category
    expect(row[4]).toBe("Supplier Corp");      // Supplier
    expect(row[5]).toBe("Main Store");         // Warehouse
    expect(row[6]).toBe("25.5");              // Cost Price
    expect(row[7]).toBe("100");               // Quantity
    expect(row[8]).toBe("10");                // Min Stock Level
    expect(row[9]).toBe("200");               // Max Stock Level
    expect(row[10]).toBe("15");               // Reorder Point
    expect(row[11]).toBe("pcs");              // Unit
    expect(row[12]).toBe("1234567890");        // Barcode
    expect(row[13]).toBe("2026-12-31");        // Expiry Date
    expect(row[14]).toBe("2026-01-15");        // Manufacture Date
    expect(row[15]).toBe("LOT-2026-001");      // Lot Number
    expect(row[16]).toBe("active");            // Status
  });

  it("should handle null/undefined optional fields", () => {
    const product = createMockProduct({
      description: null,
      category: undefined,
      supplier: undefined,
      warehouse: undefined,
      barcode: null,
      expiry_date: null,
      manufacture_date: null,
      lot_number: null,
    });
    const row = formatProductRow(product);

    expect(row[2]).toBe("");       // Description
    expect(row[3]).toBe("");       // Category
    expect(row[4]).toBe("");       // Supplier
    expect(row[5]).toBe("");       // Warehouse
    expect(row[12]).toBe("");      // Barcode
    expect(row[13]).toBe("");      // Expiry Date
    expect(row[14]).toBe("");      // Manufacture Date
    expect(row[15]).toBe("");      // Lot Number
  });

  it("should use category_name when category object is missing", () => {
    const product = createMockProduct({ category: undefined, category_name: "Snacks" });
    expect(formatProductRow(product)[3]).toBe("Snacks");
  });

  it("should use supplier_name when supplier object is missing", () => {
    const product = createMockProduct({ supplier: undefined, supplier_name: "ABC Trading" });
    expect(formatProductRow(product)[4]).toBe("ABC Trading");
  });
});

// =======================================
// generateCSV
// =======================================
describe("generateCSV", () => {
  it("should generate valid CSV with header and data rows", () => {
    const products = [createMockProduct()];
    const csv = generateCSV(products);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(2); // header + 1 data row
    expect(lines[0]).toContain("Name");
    expect(lines[0]).toContain("SKU");
    expect(lines[0]).toContain("Cost Price");
  });

  it("should handle multiple products", () => {
    const products = [
      createMockProduct({ id: 1, name: "Product A" }),
      createMockProduct({ id: 2, name: "Product B" }),
      createMockProduct({ id: 3, name: "Product C" }),
    ];
    const csv = generateCSV(products);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(4); // header + 3 data rows
    expect(lines[1]).toContain("Product A");
    expect(lines[2]).toContain("Product B");
    expect(lines[3]).toContain("Product C");
  });

  it("should handle empty product array", () => {
    const csv = generateCSV([]);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(1); // header only
    expect(lines[0]).toContain("Name");
  });

  it("should escape fields containing commas in product data", () => {
    const product = createMockProduct({ name: 'Coffee, Hot' });
    const csv = generateCSV([product]);

    expect(csv).toContain('"Coffee, Hot"');
  });

  it("should escape fields containing quotes in product data", () => {
    const product = createMockProduct({ description: 'Product "Special" Edition' });
    const csv = generateCSV([product]);

    expect(csv).toContain('"Product ""Special"" Edition"');
  });

  it("should never include sales-related data", () => {
    const csv = generateCSV([createMockProduct()]);
    const lower = csv.toLowerCase();

    expect(lower).not.toContain("selling price");
    expect(lower).not.toContain("retail price");
    expect(lower).not.toContain("vat");
    expect(lower).not.toContain("revenue");
  });
});

// =======================================
// getExportFilename
// =======================================
describe("getExportFilename", () => {
  it("should generate filename with today's date", () => {
    const today = new Date().toISOString().split("T")[0];
    const filename = getExportFilename();

    expect(filename).toBe(`products-${today}.csv`);
  });

  it("should use custom prefix", () => {
    const today = new Date().toISOString().split("T")[0];
    const filename = getExportFilename("inventory");

    expect(filename).toBe(`inventory-${today}.csv`);
  });

  it("should always end with .csv", () => {
    const filename = getExportFilename("test");
    expect(filename.endsWith(".csv")).toBe(true);
  });
});
