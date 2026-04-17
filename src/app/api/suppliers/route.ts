import { NextRequest, NextResponse } from "next/server";
import { simpleQuery, execute, type SqlValue } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { requireAuth } from "@/lib/route-auth";
import { createSupplierSchema } from "@/lib/validations/supplier";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "100"));
    const search = searchParams.get("search") || "";
    
    const offset = (page - 1) * limit;
    
    let whereClause = "";
    const params: SqlValue[] = [];
    
    if (search) {
      whereClause = "WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countResult = await simpleQuery<{ total: number }>(
      `SELECT COUNT(*) as total FROM inv_suppliers ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    const suppliers = await simpleQuery(
      `SELECT * FROM inv_suppliers 
       ${whereClause} 
       ORDER BY name 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: suppliers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: unknown) {
    console.error("Suppliers API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = createSupplierSchema.safeParse(body);
    
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json({ error: firstError?.message || "Validation error" }, { status: 400 });
    }

    const { name, email, phone, address } = parsed.data;

    const result = await execute(
      "INSERT INTO inv_suppliers (name, email, phone, address) VALUES (?, ?, ?, ?)",
      [name, email || null, phone || null, address || null]
    );

    await logActivity({
      entity_type: "supplier",
      action: "created",
      details: `Created supplier: ${name}`,
      entity_id: result.insertId,
    });

    return NextResponse.json({ id: result.insertId, message: "Supplier created successfully" });
  } catch (error: unknown) {
    console.error("Suppliers API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
