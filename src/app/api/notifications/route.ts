import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/route-auth";

interface NotificationRow {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  is_read: number;
  created_at: Date | string;
}

interface LowStockProductRow {
  id: number;
  name: string;
  quantity: number;
  min_stock_level: number;
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const notifications = await query<NotificationRow>(
      "SELECT * FROM inv_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
      [auth.id]
    );

    const lowStockProducts = await query<LowStockProductRow>(
      `SELECT id, name, quantity, min_stock_level 
       FROM inv_products 
       WHERE quantity <= min_stock_level AND quantity > 0 AND status = 'active' 
       ORDER BY (quantity * 1.0 / min_stock_level) ASC LIMIT 5`
    );

    const outOfStockProducts = await query<LowStockProductRow>(
      `SELECT id, name, quantity, min_stock_level 
       FROM inv_products 
       WHERE quantity = 0 AND status = 'active' 
       ORDER BY updated_at DESC LIMIT 5`
    );

    const alertProducts = [...outOfStockProducts, ...lowStockProducts];

    const lowStockAlerts = alertProducts.map(p => ({
      id: -p.id,
      user_id: auth.id,
      title: p.quantity === 0 ? `Out of Stock: ${p.name}` : `Low Stock: ${p.name}`,
      message: p.quantity === 0 
        ? `${p.name} is out of stock. Restock required.` 
        : `${p.name} has ${p.quantity} units (min: ${p.min_stock_level})`,
      type: p.quantity === 0 ? "error" : "warning" as const,
      is_read: 0,
      created_at: new Date()
    }));

    const combined = [...lowStockAlerts, ...notifications];

    return NextResponse.json(combined.slice(0, 10));
  } catch (error: unknown) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { action, notification_id, title, message, type } = body;

    if (action === "mark_read") {
      if (notification_id) {
        await query(
          "UPDATE inv_notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
          [notification_id, auth.id]
        );
      } else {
        await query(
          "UPDATE inv_notifications SET is_read = 1 WHERE user_id = ?",
          [auth.id]
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "create") {
      await query(
        "INSERT INTO inv_notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
        [auth.id, title, message, type || "info"]
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Notifications POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
