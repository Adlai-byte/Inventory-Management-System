import { NextRequest, NextResponse } from "next/server";
import { execute, queryOne, type SqlValue } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { requireAuth } from "@/lib/route-auth";
import { updateProductSchema } from "@/lib/validations/product";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    
    const product = await queryOne(
      `SELECT p.*, 
        c.name as category_name, 
        s.name as supplier_name,
        w.name as warehouse_name
       FROM inv_products p
       LEFT JOIN inv_categories c ON p.category_id = c.id
       LEFT JOIN inv_suppliers s ON p.supplier_id = s.id
       LEFT JOIN inv_warehouses w ON p.warehouse_id = w.id
       WHERE p.id = ?`,
      [id]
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ data: product });
  } catch (error: unknown) {
    console.error("Product GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);
    
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json({ error: firstError?.message || "Validation error" }, { status: 400 });
    }

    const data = parsed.data;
    const fields: string[] = [];
    const values: SqlValue[] = [];

    const allowedFields = [
      "name", "sku", "description", "category_id", "supplier_id", 
      "cost_price", "min_stock_level", "max_stock_level",
      "reorder_point", "barcode", "expiry_date", "manufacture_date", 
      "lot_number", "unit", "warehouse_id", "status"
    ];
    
    for (const [key, value] of Object.entries(data)) {
      if (!allowedFields.includes(key)) continue;
      
      fields.push(`${key} = ?`);
      values.push(value as SqlValue);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);

    await execute(
      `UPDATE inv_products SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    await logActivity({
      entity_type: "product",
      action: "updated",
      details: `Updated product: ${data.name || "ID " + id}`,
      entity_id: parseInt(id),
    });

    return NextResponse.json({ message: "Product updated successfully" });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ER_DUP_ENTRY"
    ) {
      return NextResponse.json({ error: "SKU or barcode already exists" }, { status: 400 });
    }
    console.error("Product update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(["admin"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    const product = await queryOne<{ name: string }>("SELECT name FROM inv_products WHERE id = ?", [id]);
    const productName = product?.name || "Unknown";

    await execute("DELETE FROM inv_products WHERE id = ?", [id]);

    await logActivity({
      entity_type: "product",
      action: "deleted",
      details: `Deleted product: ${productName}`,
      entity_id: parseInt(id),
    });

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error: unknown) {
    console.error("Product delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
