import { NextRequest, NextResponse } from "next/server";
import { execute, queryOne } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { requireAuth } from "@/lib/route-auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const { name, description } = await request.json();
    await execute("UPDATE inv_categories SET name=?, description=? WHERE id=?", [name, description || null, id]);

    await logActivity({
      entity_type: "category",
      action: "updated",
      details: `Updated category: ${name}`,
      entity_id: parseInt(id),
    });

    return NextResponse.json({ message: "Category updated" });
  } catch (error: unknown) {
    console.error("Category PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    const category = await queryOne<{ name: string }>("SELECT name FROM inv_categories WHERE id = ?", [id]);
    const categoryName = category?.name || "Unknown";

    await execute("DELETE FROM inv_categories WHERE id = ?", [id]);

    await logActivity({
      entity_type: "category",
      action: "deleted",
      details: `Deleted category: ${categoryName}`,
      entity_id: parseInt(id),
    });

    return NextResponse.json({ message: "Category deleted" });
  } catch (error: unknown) {
    console.error("Category DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
