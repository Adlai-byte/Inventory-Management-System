import { NextRequest, NextResponse } from "next/server";
import { simpleQuery, queryOne, execute, withTransaction } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { requireAuth } from "@/lib/route-auth";

interface PoItem {
  id: number;
  product_id: number;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
}

interface ReceiveItemInput {
  item_id: number;
  quantity_to_receive: number;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    const order = await queryOne(
      `SELECT po.*, s.name as supplier_name
       FROM inv_purchase_orders po
       LEFT JOIN inv_suppliers s ON po.supplier_id = s.id
       WHERE po.id = ?`,
      [id]
    );

    if (!order) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const items = await simpleQuery(
      `SELECT poi.*, p.name as product_name, p.sku as product_sku
       FROM inv_purchase_order_items poi
       LEFT JOIN inv_products p ON poi.product_id = p.id
       WHERE poi.order_id = ?`,
      [id]
    );

    return NextResponse.json({
      data: { ...order, items },
    });
  } catch (error: unknown) {
    console.error("Purchase order GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, receive_items } = body as {
      status?: string;
      receive_items?: ReceiveItemInput[];
    };

    // Check current order
    const order = await queryOne<{ status: string; po_number: string }>(
      "SELECT status, po_number FROM inv_purchase_orders WHERE id = ?",
      [id]
    );

    if (!order) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    if (order.status === "cancelled") {
      return NextResponse.json({ error: "Cannot modify a cancelled purchase order" }, { status: 400 });
    }

    // -------------------------------------------------------
    // PARTIAL / SELECTIVE RECEIPT: receive_items[] provided
    // -------------------------------------------------------
    if (receive_items && receive_items.length > 0) {
      // Validate
      for (const ri of receive_items) {
        if (!ri.item_id || ri.quantity_to_receive <= 0) {
          return NextResponse.json(
            { error: "Each receive_item must have a valid item_id and quantity_to_receive > 0" },
            { status: 400 }
          );
        }
      }

      // Fetch all PO items
      const allItems = await simpleQuery<PoItem>(
        "SELECT id, product_id, quantity_ordered, quantity_received, unit_cost FROM inv_purchase_order_items WHERE order_id = ?",
        [id]
      );

      const itemMap = new Map(allItems.map((i) => [i.id, i]));

      // Validate inputs against actual items
      for (const ri of receive_items) {
        const poItem = itemMap.get(ri.item_id);
        if (!poItem) {
          return NextResponse.json(
            { error: `PO item ${ri.item_id} not found in this order` },
            { status: 404 }
          );
        }
        const remaining = poItem.quantity_ordered - poItem.quantity_received;
        if (ri.quantity_to_receive > remaining) {
          return NextResponse.json(
            {
              error: `Cannot receive ${ri.quantity_to_receive} for item ${ri.item_id}. Only ${remaining} remaining.`,
            },
            { status: 400 }
          );
        }
      }

      await withTransaction(async (connection) => {
        for (const ri of receive_items) {
          const poItem = itemMap.get(ri.item_id)!;

          // Lock and fetch product
          const [productRows] = await connection.execute(
            "SELECT id, name, quantity, cost_price FROM inv_products WHERE id = ? FOR UPDATE",
            [poItem.product_id]
          );
          const products = productRows as { id: number; name: string; quantity: number; cost_price: number }[];
          const product = products[0];
          if (!product) continue;

          const newProductQty = product.quantity + ri.quantity_to_receive;

          // Update product stock
          await connection.execute(
            "UPDATE inv_products SET quantity = ? WHERE id = ?",
            [newProductQty, poItem.product_id]
          );

          // Update PO item received quantity (use poi.id not product_id — bug fix)
          await connection.execute(
            "UPDATE inv_purchase_order_items SET quantity_received = quantity_received + ? WHERE id = ?",
            [ri.quantity_to_receive, poItem.id]
          );

          // Record stock movement
          await connection.execute(
            `INSERT INTO inv_stock_movements 
             (product_id, type, quantity, reason, previous_quantity, new_quantity, unit_cost, notes, created_by)
             VALUES (?, 'restock', ?, ?, ?, ?, ?, ?, ?)`,
            [
              poItem.product_id,
              ri.quantity_to_receive,
              `Purchase order ${order.po_number}`,
              product.quantity,
              newProductQty,
              poItem.unit_cost,
              `Partial receipt from PO ${order.po_number}`,
              auth.id,
            ]
          );
        }

        // Re-fetch items to determine new order status
        const [updatedRows] = await connection.execute(
          "SELECT quantity_ordered, quantity_received FROM inv_purchase_order_items WHERE order_id = ?",
          [id]
        );
        const updatedItems = updatedRows as { quantity_ordered: number; quantity_received: number }[];
        const allFullyReceived = updatedItems.every(
          (i) => i.quantity_received >= i.quantity_ordered
        );
        const newStatus = allFullyReceived ? "received" : "partial";

        await connection.execute(
          "UPDATE inv_purchase_orders SET status = ?, received_date = CASE WHEN ? = 'received' THEN CURDATE() ELSE received_date END WHERE id = ?",
          [newStatus, newStatus, id]
        );
      });

      const receiveItemsCount = receive_items.reduce((s, r) => s + r.quantity_to_receive, 0);

      await logActivity({
        entity_type: "purchase_order",
        action: "partial_received",
        details: `Received ${receiveItemsCount} unit(s) against PO ${order.po_number}`,
        entity_id: parseInt(id),
      });

      return NextResponse.json({ message: "Items received, stock updated" });
    }

    // -------------------------------------------------------
    // FULL RECEIPT: status = "received"
    // -------------------------------------------------------
    const validStatuses = ["draft", "pending", "approved", "ordered", "partial", "received", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (status === "received" && order.status !== "received") {
      const items = await simpleQuery<PoItem>(
        "SELECT id, product_id, quantity_ordered, quantity_received, unit_cost FROM inv_purchase_order_items WHERE order_id = ?",
        [id]
      );

      await withTransaction(async (connection) => {
        // Update PO status
        await connection.execute(
          "UPDATE inv_purchase_orders SET status = ?, received_date = CURDATE() WHERE id = ?",
          [status, id]
        );

        for (const item of items) {
          const qtyToReceive = item.quantity_ordered - item.quantity_received;
          if (qtyToReceive <= 0) continue;

          const [productRows] = await connection.execute(
            "SELECT id, name, quantity, cost_price FROM inv_products WHERE id = ? FOR UPDATE",
            [item.product_id]
          );
          const products = productRows as { id: number; name: string; quantity: number; cost_price: number }[];
          const product = products[0];
          if (!product) continue;

          const newProductQty = product.quantity + qtyToReceive;

          await connection.execute(
            "UPDATE inv_products SET quantity = ? WHERE id = ?",
            [newProductQty, item.product_id]
          );

          // Fix: use poi.id not product_id
          await connection.execute(
            "UPDATE inv_purchase_order_items SET quantity_received = quantity_ordered WHERE id = ?",
            [item.id]
          );

          await connection.execute(
            `INSERT INTO inv_stock_movements 
             (product_id, type, quantity, reason, previous_quantity, new_quantity, unit_cost, notes, created_by)
             VALUES (?, 'restock', ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.product_id,
              qtyToReceive,
              `Purchase order ${order.po_number}`,
              product.quantity,
              newProductQty,
              item.unit_cost,
              `Received from PO ${order.po_number}`,
              auth.id,
            ]
          );
        }
      });

      await logActivity({
        entity_type: "purchase_order",
        action: "received",
        details: `Received purchase order ${order.po_number}`,
        entity_id: parseInt(id),
      });

      return NextResponse.json({ message: "Purchase order received, stock updated" });
    }

    // Simple status update
    await execute(
      "UPDATE inv_purchase_orders SET status = ? WHERE id = ?",
      [status, id]
    );

    await logActivity({
      entity_type: "purchase_order",
      action: "updated",
      details: `Updated PO ${order.po_number} status to ${status}`,
      entity_id: parseInt(id),
    });

    return NextResponse.json({ message: "Purchase order updated" });
  } catch (error: unknown) {
    console.error("Purchase order PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(["admin"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;

    const order = await queryOne<{ po_number: string; status: string }>(
      "SELECT po_number, status FROM inv_purchase_orders WHERE id = ?",
      [id]
    );

    if (!order) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    if (order.status === "received") {
      return NextResponse.json({ error: "Cannot delete a received purchase order" }, { status: 400 });
    }

    await execute("DELETE FROM inv_purchase_orders WHERE id = ?", [parseInt(id)]);

    await logActivity({
      entity_type: "purchase_order",
      action: "deleted",
      details: `Deleted PO ${order.po_number}`,
      entity_id: parseInt(id),
    });

    return NextResponse.json({ message: "Purchase order deleted" });
  } catch (error: unknown) {
    console.error("Purchase order DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
