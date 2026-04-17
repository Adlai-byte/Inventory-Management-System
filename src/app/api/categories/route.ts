import { NextRequest, NextResponse } from "next/server";
import { simpleQuery, execute, type SqlValue } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { requireAuth } from "@/lib/route-auth";
import { createCategorySchema } from "@/lib/validations/category";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "100")); // Higher default for categories
    const search = searchParams.get("search") || "";
    
    const offset = (page - 1) * limit;
    
    let whereClause = "";
    const params: SqlValue[] = [];
    
    if (search) {
      whereClause = "WHERE name LIKE ? OR description LIKE ?";
      params.push(`%${search}%`, `%${search}%`);
    }

    const countResult = await simpleQuery<{ total: number }>(
      `SELECT COUNT(*) as total FROM inv_categories ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    const categories = await simpleQuery(
      `SELECT * FROM inv_categories 
       ${whereClause} 
       ORDER BY name 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: categories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: unknown) {
    console.error("Categories API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);
    
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json({ error: firstError?.message || "Validation error" }, { status: 400 });
    }

    const { name, description } = parsed.data;

    const result = await execute(
      "INSERT INTO inv_categories (name, description) VALUES (?, ?)",
      [name, description || null]
    );

    await logActivity({
      entity_type: "category",
      action: "created",
      details: `Created category: ${name}`,
      entity_id: result.insertId,
    });

    return NextResponse.json({ id: result.insertId, message: "Category created successfully" });
  } catch (error: unknown) {
    console.error("Categories API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
