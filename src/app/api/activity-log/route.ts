import { NextRequest, NextResponse } from "next/server";
import { simpleQuery, type SqlValue } from "@/lib/db";
import { requireAuth } from "@/lib/route-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "25"));
    const entity = searchParams.get("entity") || "all";
    const search = searchParams.get("search") || "";
    
    const offset = (page - 1) * limit;

    let whereClause = "";
    const params: SqlValue[] = [];

    if (entity !== "all" || search) {
      whereClause = "WHERE ";
      const conditions: string[] = [];
      
      if (entity !== "all") {
        conditions.push("entity_type = ?");
        params.push(entity);
      }
      
      if (search) {
        conditions.push("(action LIKE ? OR details LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
      }
      
      whereClause += conditions.join(" AND ");
    }

    // Get total count
    const countResult = await simpleQuery<{ total: number }>(
      `SELECT COUNT(*) as total FROM inv_activity_log ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    // IMPORTANT: limit and offset must be numbers
    const activities = await simpleQuery(
      `SELECT * FROM inv_activity_log 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: activities,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: unknown) {
    console.error("Activity Log API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
