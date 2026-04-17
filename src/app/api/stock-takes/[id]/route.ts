import { NextRequest, NextResponse } from "next/server";
import { simpleQuery, withTransaction } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { requireAuth } from "@/lib/route-auth";
import { generateMovementReference } from "@/lib/movement-reference";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    const stockTake = await simpleQuery(
      `SELECT st.*, w.name as warehouse_name, u.full_name as created_by_name
       FROM inv_stock_takes st
       LEFT JOIN inv_warehouses w ON st.warehouse_id = w.id
       LEFT JOIN inv_users u ON st.created_by = u.id
       WHERE st.id = ?`,
      [id]
    );

    if (!stockTake.length) {
      return NextResponse.json({ error: "Stock take not found" }, { status: 404 });
    }

    const items = await simpleQuery(
      `SELECT sti.*, 
              (sti.counted_quantity - sti.system_quantity) AS difference,
              p.name as product_name, p.sku as product_sku, p.unit, p.cost_price
       FROM inv_stock_take_items sti
       JOIN inv_products p ON sti.product_id = p.id
       WHERE sti.stock_take_id = ?
       ORDER BY p.name`,
      [id]
    );

    return NextResponse.json({
      data: { ...(stockTake[0] as Record<string, unknown>), items },
    });
  } catch (error) {
    console.error("Stock take GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { action, items, notes } = body;

    if (action === "update_counts") {
      // Update individual counted quantities
      if (!items?.length) {
        return NextResponse.json({ error: "No items to update" }, { status: 400 });
      }

      for (const item of items) {
        if (item.id && item.id > 0) {
          // Update by stock take item ID (from stock takes page)
          await simpleQuery(
            `UPDATE inv_stock_take_items 
             SET counted_quantity = ?, notes = ?, counted_by = ?, counted_at = NOW()
             WHERE id = ? AND stock_take_id = ?`,
            [item.counted_quantity, item.notes || null, auth.id, item.id, id]
          );
        } else if (item.product_id) {
          // Update by product_id (from scanner)
          await simpleQuery(
            `UPDATE inv_stock_take_items 
             SET counted_quantity = ?, notes = ?, counted_by = ?, counted_at = NOW()
             WHERE product_id = ? AND stock_take_id = ?`,
            [item.counted_quantity, item.notes || null, auth.id, item.product_id, id]
          );
        }
      }

      return NextResponse.json({ message: "Counts updated" });
    }

    if (action === "complete") {
      // Complete stock take: auto-generate adjustment movements for variances
      const result = await withTransaction(async (connection) => {
        // Get all items with variance
        const [varianceItems] = await connection.execute(
          `SELECT sti.*, 
                  (sti.counted_quantity - sti.system_quantity) AS difference,
                  p.name as product_name, p.quantity as current_qty, p.cost_price
           FROM inv_stock_take_items sti
           JOIN inv_products p ON sti.product_id = p.id
           WHERE sti.stock_take_id = ? AND (sti.counted_quantity != sti.system_quantity)`,
          [id]
        );

        // Generate movement reference
        const [countResult] = await connection.execute(
          "SELECT COUNT(*) as cnt FROM inv_stock_movements WHERE DATE(created_at) = CURDATE()"
        );
        const todayCount = (countResult as [{ cnt: number }])[0]?.cnt || 0;
        const ref = generateMovementReference(todayCount + 1);

        let adjustmentsCount = 0;

        for (const item of varianceItems as {
          product_id: number;
          product_name: string;
          system_quantity: number;
          counted_quantity: number;
          difference: number;
          current_qty: number;
          cost_price: number;
        }[]) {
          // Update product quantity
          await connection.execute(
            "UPDATE inv_products SET quantity = ? WHERE id = ?",
            [item.counted_quantity, item.product_id]
          );

          // Create adjustment movement
          await connection.execute(
            `INSERT INTO inv_stock_movements 
             (product_id, type, reference, quantity, reason, previous_quantity, new_quantity, unit_cost, notes, created_by)
             VALUES (?, 'adjustment', ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.product_id, ref, Math.abs(item.difference),
              `Stock take adjustment (ID: ${id})`,
              item.current_qty, item.counted_quantity,
              item.cost_price, `Variance: ${item.difference > 0 ? "+" : ""}${item.difference}`,
              auth.id,
            ]
          );

          adjustmentsCount++;
        }

        // Mark stock take as completed
        await connection.execute(
          "UPDATE inv_stock_takes SET status = 'completed', completed_at = NOW(), notes = ? WHERE id = ?",
          [notes || null, id]
        );

        return { adjustmentsCount, ref };
      });

      await logActivity({
        entity_type: "stock_take",
        action: "completed",
        details: `Completed stock take #${id}: ${result.adjustmentsCount} adjustments (${result.ref})`,
        entity_id: parseInt(id),
      });

      return NextResponse.json({
        message: `Stock take completed. ${result.adjustmentsCount} stock adjustments recorded (${result.ref}).`,
        adjustments_count: result.adjustmentsCount,
        reference: result.ref,
      });
    }

    if (action === "cancel") {
      await simpleQuery(
        "UPDATE inv_stock_takes SET status = 'cancelled', notes = ? WHERE id = ?",
        [notes || "Cancelled", id]
      );

      await logActivity({
        entity_type: "stock_take",
        action: "cancelled",
        details: `Cancelled stock take #${id}`,
        entity_id: parseInt(id),
      });

      return NextResponse.json({ message: "Stock take cancelled" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Stock take PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
