import { z } from "zod";
import type { MovementType } from "@/lib/types";

// =======================================
// Units of Measure (Minimart)
// =======================================
export const UNITS_OF_MEASURE = [
  "pcs", "pack", "box", "bottle", "can", "roll", "bundle",
  "kg", "liters", "sachet", "pouch", "bag", "dozen", "pair", "set",
] as const;

// =======================================
// Product Validations
// =======================================
export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  sku: z.string().min(1, "SKU is required").max(100),
  description: z.string().optional().nullable().or(z.literal("")),
  category_id: z.number().int().positive().optional().nullable(),
  supplier_id: z.number().int().positive().optional().nullable(),
  cost_price: z.number().min(0, "Cost price must be non-negative").default(0),
  quantity: z.number().int().min(0, "Quantity must be non-negative").default(0),
  min_stock_level: z.number().int().min(0).default(10),
  max_stock_level: z.number().int().min(0).default(100),
  reorder_point: z.number().int().min(0).default(15),
  barcode: z.string().max(255).optional().nullable().or(z.literal("")),
  expiry_date: z.string().optional().nullable().or(z.literal("")),
  manufacture_date: z.string().optional().nullable().or(z.literal("")),
  lot_number: z.string().max(100).optional().nullable().or(z.literal("")),
  unit: z.enum(UNITS_OF_MEASURE).default("pcs"),
  warehouse_id: z.number().int().positive().optional().nullable(),
  status: z.enum(["active", "inactive", "discontinued"]).default("active"),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  expiry_filter: z.enum(["all", "expired", "expiring", "none"]).optional().default("all"),
  stock_filter: z.enum(["all", "low", "out", "overstocked"]).optional().default("all"),
});

export const expiryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  category: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type ExpiryQueryInput = z.infer<typeof expiryQuerySchema>;

// =======================================
// Stock Movement Validations
// =======================================
const MOVEMENT_TYPES: MovementType[] = [
  "restock",
  "transfer_in", 
  "transfer_out",
  "damage",
  "expired",
  "loss",
  "adjustment",
  "sample",
  "return_out",
  "initial"
];

export const createMovementSchema = z.object({
  product_id: z.number().int().positive("Product ID is required"),
  type: z.enum(MOVEMENT_TYPES as [string, ...string[]], { message: "Invalid movement type" }),
  quantity: z.number().int().positive("Quantity must be positive"),
  reason: z.string().max(500).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const batchMovementSchema = z.object({
  items: z.array(z.object({
    product_id: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })).min(1, "At least one item is required"),
  type: z.enum(MOVEMENT_TYPES as [string, ...string[]], { message: "Invalid movement type" }),
  reason: z.string().max(500).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const movementQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  type: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export type CreateMovementInput = z.infer<typeof createMovementSchema>;
export type BatchMovementInput = z.infer<typeof batchMovementSchema>;
export type MovementQueryInput = z.infer<typeof movementQuerySchema>;
