import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { requireAuth } from "@/lib/route-auth";
import { logActivity } from "@/lib/activity-logger";

export async function GET() {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const warehouses = await query(
      "SELECT * FROM inv_warehouses ORDER BY name ASC"
    );
    return NextResponse.json({ data: warehouses });
  } catch (error: unknown) {
    console.error("Warehouses API GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["admin"]);
  if (auth instanceof NextResponse) return auth;

  try {


    const { name, location } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Warehouse name is required" }, { status: 400 });
    }

    const result = await execute(
      "INSERT INTO inv_warehouses (name, location) VALUES (?, ?)",
      [name.trim().slice(0, 255), location?.trim().slice(0, 500) || null]
    );

    await logActivity({
      entity_type: "warehouse",
      action: "created",
      details: `Created warehouse: ${name}`,
      entity_id: result.insertId,
    });

    return NextResponse.json({ id: result.insertId, message: "Warehouse created successfully" });
  } catch (error: unknown) {
    console.error("Warehouses API POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
