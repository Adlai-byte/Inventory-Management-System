import { NextRequest, NextResponse } from "next/server";
import { execute, queryOne } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { requireAuth } from "@/lib/route-auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const { name, email, phone, address } = await request.json();
    await execute("UPDATE inv_suppliers SET name=?, email=?, phone=?, address=? WHERE id=?", [name, email || null, phone || null, address || null, id]);

    await logActivity({
      entity_type: "supplier",
      action: "updated",
      details: `Updated supplier: ${name}`,
      entity_id: parseInt(id),
    });

    return NextResponse.json({ message: "Supplier updated" });
  } catch (error: unknown) {
    console.error("Supplier update/delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    const supplier = await queryOne<{ name: string }>("SELECT name FROM inv_suppliers WHERE id = ?", [id]);
    const supplierName = supplier?.name || "Unknown";

    await execute("DELETE FROM inv_suppliers WHERE id = ?", [id]);

    await logActivity({
      entity_type: "supplier",
      action: "deleted",
      details: `Deleted supplier: ${supplierName}`,
      entity_id: parseInt(id),
    });

    return NextResponse.json({ message: "Supplier deleted" });
  } catch (error: unknown) {
    console.error("Supplier DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
