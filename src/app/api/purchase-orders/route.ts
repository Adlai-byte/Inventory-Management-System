import { NextRequest, NextResponse } from "next/server";
import { simpleQuery, withTransaction, type SqlValue } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { requireAuth } from "@/lib/route-auth";

interface PurchaseOrderItemInput {
  product_id: number | string;
  quantity: number | string;
  unit_cost?: number | string;
  unit_price?: number | string;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "25"));
    const search = searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    const params: SqlValue[] = [];
    const conditions: string[] = [];
    
    if (search) {
      conditions.push("(s.name LIKE ? OR po.po_number LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await simpleQuery<{ total: number }>(
      `SELECT COUNT(*) as total 
       FROM inv_purchase_orders po
       LEFT JOIN inv_suppliers s ON po.supplier_id = s.id
       ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    const orders = await simpleQuery(
      `SELECT po.*, s.name as supplier_name
       FROM inv_purchase_orders po
       LEFT JOIN inv_suppliers s ON po.supplier_id = s.id
       ${whereClause}
       ORDER BY po.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: unknown) {
    console.error("Purchase orders GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { supplier_id, delivery_receipt_no, notes, items } = (await request.json()) as {
      supplier_id: number | string;
      delivery_receipt_no?: string | null;
      notes?: string | null;
      items?: PurchaseOrderItemInput[];
    };

    if (!supplier_id) {
      return NextResponse.json({ error: "Supplier is required" }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    const totalCost = items.reduce(
      (sum: number, i: PurchaseOrderItemInput) => {
        const cost = i.unit_cost !== undefined ? i.unit_cost : i.unit_price;
        return sum + (Number.parseFloat(String(cost)) || 0) * (Number.parseInt(String(i.quantity), 10) || 0);
      },
      0
    );

    // Generate PO number
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const poNumber = `PO-${stamp}`;

    const orderId = await withTransaction(async (connection) => {
      // Create purchase order as pending
      const [poInsert] = await connection.execute(
        `INSERT INTO inv_purchase_orders (po_number, supplier_id, delivery_receipt_no, status, total_cost, notes, created_by)
         VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
        [poNumber, supplier_id, delivery_receipt_no || null, totalCost, notes || null, auth.id]
      );
      const insertResult = poInsert as { insertId: number };

      // Create line items
      for (const item of items) {
        const productId = Number.parseInt(String(item.product_id), 10);
        const quantity = Number.parseInt(String(item.quantity), 10) || 1;
        const costVal = item.unit_cost !== undefined ? item.unit_cost : item.unit_price;
        const unitCost = Number.parseFloat(String(costVal)) || 0;

        await connection.execute(
          `INSERT INTO inv_purchase_order_items (order_id, product_id, quantity_ordered, quantity_received, unit_cost)
           VALUES (?, ?, ?, 0, ?)`,
          [insertResult.insertId, productId, quantity, unitCost]
        );
      }

      return insertResult.insertId;
    });

    await logActivity({
      entity_type: "purchase_order",
      action: "created",
      details: `Created purchase order ${poNumber} with ${items.length} items (₱${totalCost.toFixed(2)})`,
      entity_id: orderId,
    });

    return NextResponse.json({ 
      id: orderId, 
      po_number: poNumber,
      message: "Purchase order created successfully" 
    });
  } catch (error: unknown) {
    console.error("Purchase orders POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
