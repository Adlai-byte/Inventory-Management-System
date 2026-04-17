import { NextRequest, NextResponse } from "next/server";
import { simpleQuery, withTransaction, type SqlValue } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { requireAuth } from "@/lib/route-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "25"));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: SqlValue[] = [];

    if (search) {
      conditions.push("st.name LIKE ?");
      params.push(`%${search}%`);
    }
    if (status !== "all") {
      conditions.push("st.status = ?");
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countResult, stockTakes] = await Promise.all([
      simpleQuery<{ total: number }>(
        `SELECT COUNT(*) as total FROM inv_stock_takes st ${whereClause}`,
        params
      ),
      simpleQuery(
        `SELECT st.*, w.name as warehouse_name, u.full_name as created_by_name,
          (SELECT COUNT(*) FROM inv_stock_take_items WHERE stock_take_id = st.id) as total_items,
          (SELECT COUNT(*) FROM inv_stock_take_items WHERE stock_take_id = st.id AND (counted_quantity - system_quantity) = 0) as matched_count,
          (SELECT COUNT(*) FROM inv_stock_take_items WHERE stock_take_id = st.id AND (counted_quantity - system_quantity) != 0) as variance_count
         FROM inv_stock_takes st
         LEFT JOIN inv_warehouses w ON st.warehouse_id = w.id
         LEFT JOIN inv_users u ON st.created_by = u.id
         ${whereClause}
         ORDER BY st.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
    ]);

    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      data: stockTakes,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Stock takes GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { name, warehouse_id, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Stock take name is required" }, { status: 400 });
    }

    const [result] = await withTransaction(async (connection) => {
      // Create stock take header
      const [insertResult] = await connection.execute(
        `INSERT INTO inv_stock_takes (name, warehouse_id, status, notes, started_at, created_by)
         VALUES (?, ?, 'in_progress', ?, NOW(), ?)`,
        [name.trim(), warehouse_id || null, notes || null, auth.id]
      );
      const headerResult = insertResult as { insertId: number };
      const stockTakeId = headerResult.insertId;

      // Only auto-populate items if NOT coming from scanner (scanner sends its own items)
      const { items: bodyItems } = body as { items?: Array<{ product_id: number; counted_quantity: number }> };
      
      if (bodyItems && bodyItems.length > 0) {
        // Scanner flow: only insert the scanned products
        for (const item of bodyItems) {
          await connection.execute(
            `INSERT INTO inv_stock_take_items (stock_take_id, product_id, system_quantity, counted_quantity)
             SELECT ?, ?, quantity, ? FROM inv_products WHERE id = ?`,
            [stockTakeId, item.product_id, item.counted_quantity, item.product_id]
          );
        }
      } else {
        // Manual stock take: auto-populate all active products
        const [products] = await connection.execute(
          `SELECT id, quantity FROM inv_products WHERE status = 'active' ORDER BY name`
        );

        for (const product of products as { id: number; quantity: number }[]) {
          await connection.execute(
            `INSERT INTO inv_stock_take_items (stock_take_id, product_id, system_quantity, counted_quantity)
             VALUES (?, ?, ?, 0)`,
            [stockTakeId, product.id, product.quantity]
          );
        }
      }

      return [{ insertId: stockTakeId }];
    });

    const stockTakeId = (result as unknown as { insertId: number }).insertId;

    await logActivity({
      entity_type: "stock_take",
      action: "created",
      details: `Created stock take: ${name}`,
      entity_id: stockTakeId,
    });

    return NextResponse.json({
      id: stockTakeId,
      message: "Stock take created. Start counting items.",
    });
  } catch (error) {
    console.error("Stock takes POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
