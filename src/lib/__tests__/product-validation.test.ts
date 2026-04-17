import { describe, it, expect } from "vitest";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  UNITS_OF_MEASURE,
} from "@/lib/validations/product";

// =======================================
// UNITS_OF_MEASURE in validations
// =======================================
describe("UNITS_OF_MEASURE (validations)", () => {
  it("should be the same array as in product-export", () => {
    expect(UNITS_OF_MEASURE).toBeDefined();
    expect(Array.isArray(UNITS_OF_MEASURE)).toBe(true);
    expect(UNITS_OF_MEASURE).toContain("pcs");
    expect(UNITS_OF_MEASURE).toContain("box");
    expect(UNITS_OF_MEASURE).toContain("kg");
    expect(UNITS_OF_MEASURE).toContain("sachet");
  });
});

// =======================================
// createProductSchema
// =======================================
describe("createProductSchema", () => {
  it("should accept valid product data with all fields", () => {
    const data = {
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
      barcode: "1234567890",
      expiry_date: "2026-12-31",
      manufacture_date: "2026-01-15",
      lot_number: "LOT-2026-001",
      unit: "pcs",
      warehouse_id: 1,
      status: "active" as const,
    };

    const result = createProductSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should accept minimal required data (name + sku)", () => {
    const data = {
      name: "Test Product",
      sku: "PRD-001",
    };

    const result = createProductSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should default unit to 'pcs'", () => {
    const result = createProductSchema.safeParse({
      name: "Test",
      sku: "SKU-001",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unit).toBe("pcs");
    }
  });

  it("should default max_stock_level to 100", () => {
    const result = createProductSchema.safeParse({
      name: "Test",
      sku: "SKU-001",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.max_stock_level).toBe(100);
    }
  });

  it("should default reorder_point to 15", () => {
    const result = createProductSchema.safeParse({
      name: "Test",
      sku: "SKU-001",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reorder_point).toBe(15);
    }
  });

  it("should default min_stock_level to 10", () => {
    const result = createProductSchema.safeParse({
      name: "Test",
      sku: "SKU-001",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.min_stock_level).toBe(10);
    }
  });

  it("should default quantity to 0", () => {
    const result = createProductSchema.safeParse({
      name: "Test",
      sku: "SKU-001",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(0);
    }
  });

  it("should default cost_price to 0", () => {
    const result = createProductSchema.safeParse({
      name: "Test",
      sku: "SKU-001",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cost_price).toBe(0);
    }
  });

  it("should reject empty name", () => {
    const result = createProductSchema.safeParse({
      name: "",
      sku: "SKU-001",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty SKU", () => {
    const result = createProductSchema.safeParse({
      name: "Test",
      sku: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject name longer than 255 characters", () => {
    const result = createProductSchema.safeParse({
      name: "A".repeat(256),
      sku: "SKU-001",
    });
    expect(result.success).toBe(false);
  });

  it("should reject SKU longer than 100 characters", () => {
    const result = createProductSchema.safeParse({
      name: "Test",
      sku: "S".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative cost_price", () => {
    const result = createProductSchema.safeParse({
      name: "Test",
      sku: "SKU-001",
      cost_price: -5,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative quantity", () => {
    const result = createProductSchema.safeParse({
      name: "Test",
      sku: "SKU-001",
      quantity: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should accept zero cost_price", () => {
    const result = createProductSchema.safeParse({
      name: "Test",
      sku: "SKU-001",
      cost_price: 0,
    });
    expect(result.success).toBe(true);
  });

  it("should accept all valid units", () => {
    for (const unit of UNITS_OF_MEASURE) {
      const result = createProductSchema.safeParse({
        name: "Test",
        sku: "SKU-001",
        unit,
      });
      expect(result.success, `Unit "${unit}" should be valid`).toBe(true);
    }
  });

  it("should accept all valid statuses", () => {
    const statuses = ["active", "inactive", "discontinued"] as const;
    for (const status of statuses) {
      const result = createProductSchema.safeParse({
        name: "Test",
        sku: "SKU-001",
        status,
      });
      expect(result.success, `Status "${status}" should be valid`).toBe(true);
    }
  });

  it("should reject invalid status", () => {
    const result = createProductSchema.safeParse({
      name: "Test",
      sku: "SKU-001",
      status: "unknown",
    });
    expect(result.success).toBe(false);
  });

  it("should accept nullable optional fields", () => {
    const result = createProductSchema.safeParse({
      name: "Test",
      sku: "SKU-001",
      description: null,
      category_id: null,
      supplier_id: null,
      barcode: null,
      expiry_date: null,
      manufacture_date: null,
      lot_number: null,
      warehouse_id: null,
    });
    expect(result.success).toBe(true);
  });
});

// =======================================
// updateProductSchema
// =======================================
describe("updateProductSchema", () => {
  it("should accept partial updates", () => {
    const result = updateProductSchema.safeParse({ name: "Updated Name" });
    expect(result.success).toBe(true);
  });

  it("should accept empty object", () => {
    const result = updateProductSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should still validate fields when provided", () => {
    const result = updateProductSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("should accept single field update for cost_price", () => {
    const result = updateProductSchema.safeParse({ cost_price: 50 });
    expect(result.success).toBe(true);
  });

  it("should accept single field update for unit", () => {
    const result = updateProductSchema.safeParse({ unit: "box" });
    expect(result.success).toBe(true);
  });
});

// =======================================
// productQuerySchema
// =======================================
describe("productQuerySchema", () => {
  it("should default page to 1", () => {
    const result = productQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
    }
  });

  it("should default limit to 25", () => {
    const result = productQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
    }
  });

  it("should accept stock_filter parameter", () => {
    const filters = ["all", "low", "out", "overstocked"];
    for (const stock_filter of filters) {
      const result = productQuerySchema.safeParse({ stock_filter });
      expect(result.success, `stock_filter "${stock_filter}" should be valid`).toBe(true);
    }
  });

  it("should default stock_filter to all", () => {
    const result = productQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stock_filter).toBe("all");
    }
  });

  it("should accept all expiry_filter values", () => {
    const filters = ["all", "expired", "expiring", "none"];
    for (const expiry_filter of filters) {
      const result = productQuerySchema.safeParse({ expiry_filter });
      expect(result.success, `expiry_filter "${expiry_filter}" should be valid`).toBe(true);
    }
  });

  it("should reject limit above 100", () => {
    const result = productQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it("should coerce string page to number", () => {
    const result = productQuerySchema.safeParse({ page: "3" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });
});
