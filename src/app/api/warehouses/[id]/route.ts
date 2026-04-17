import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/route-auth";
import { logActivity } from "@/lib/activity-logger";
import { sanitizeId } from "@/lib/sanitize";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const warehouseId = sanitizeId(id);
    if (!warehouseId) {
      return NextResponse.json({ error: "Invalid warehouse ID" }, { status: 400 });
    }

    const warehouse = await query(
      "SELECT * FROM inv_warehouses WHERE id = ?",
      [warehouseId]
    );

    if (warehouse.length === 0) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    return NextResponse.json({ data: warehouse[0] });
  } catch (error: unknown) {
    console.error("Warehouse [id] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const warehouseId = sanitizeId(id);
    if (!warehouseId) {
      return NextResponse.json({ error: "Invalid warehouse ID" }, { status: 400 });
    }

    const { name, location } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Warehouse name is required" }, { status: 400 });
    }

    const existing = await query("SELECT * FROM inv_warehouses WHERE id = ?", [warehouseId]);
    if (existing.length === 0) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    await execute(
      "UPDATE inv_warehouses SET name = ?, location = ? WHERE id = ?",
      [name.trim().slice(0, 255), location?.trim().slice(0, 500) || null, warehouseId]
    );

    await execute(
      "UPDATE inv_warehouses SET name = ?, location = ? WHERE id = ?",
      [name.trim().slice(0, 255), location?.trim().slice(0, 500) || null, warehouseId]
    );

    await logActivity({
      entity_type: "warehouse",
      action: "updated",
      details: `Updated warehouse: ${name}`,
      entity_id: warehouseId,
    });

    return NextResponse.json({ message: "Warehouse updated successfully" });
  } catch (error: unknown) {
    console.error("Warehouse [id] PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const warehouseId = sanitizeId(id);
    if (!warehouseId) {
      return NextResponse.json({ error: "Invalid warehouse ID" }, { status: 400 });
    }

    const existing = await query("SELECT name FROM inv_warehouses WHERE id = ?", [warehouseId]);
    if (existing.length === 0) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    // Check if any products are using this warehouse
    const productCount = await query(
      "SELECT COUNT(*) as count FROM inv_products WHERE warehouse_id = ?",
      [warehouseId]
    );
    if ((productCount[0] as { count: number })?.count > 0) {
      return NextResponse.json(
        { error: "Cannot delete warehouse: products are still assigned to it" },
        { status: 400 }
      );
    }

    await execute("DELETE FROM inv_warehouses WHERE id = ?", [warehouseId]);

    await logActivity({
      entity_type: "warehouse",
      action: "deleted",
      details: `Deleted warehouse: ${(existing[0] as { name: string }).name}`,
      entity_id: warehouseId,
    });

    return NextResponse.json({ message: "Warehouse deleted successfully" });
  } catch (error: unknown) {
    console.error("Warehouse [id] DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
