import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireAuth } from "@/lib/route-auth";

interface CountRow {
  count: number;
}

interface TotalRow {
  total: number;
}

export const revalidate = 60; // Cache dashboard data for 60 seconds

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    // Total products
    const productsCount = await queryOne<CountRow>("SELECT COUNT(*) as count FROM inv_products WHERE status = 'active'");

    // Low stock count
    const lowStock = await queryOne<CountRow>(
      "SELECT COUNT(*) as count FROM inv_products WHERE quantity > 0 AND quantity <= min_stock_level AND status = 'active'"
    );

    // Out of stock count
    const outOfStock = await queryOne<CountRow>(
      "SELECT COUNT(*) as count FROM inv_products WHERE quantity = 0 AND status = 'active'"
    );

    // Total inventory value at cost
    const totalCostValue = await queryOne<TotalRow>(
      "SELECT COALESCE(SUM(quantity * cost_price), 0) as total FROM inv_products WHERE quantity > 0"
    );

    // Pending purchase orders
    const pendingOrders = await queryOne<CountRow>(
      "SELECT COUNT(*) as count FROM inv_purchase_orders WHERE status IN ('draft', 'pending', 'approved', 'ordered')"
    );

    // Category distribution
    const categories = await query(
      `SELECT COALESCE(c.name, 'Uncategorized') as name, COUNT(*) as count
       FROM inv_products p
       LEFT JOIN inv_categories c ON p.category_id = c.id
       WHERE p.status = 'active'
       GROUP BY c.name
       ORDER BY count DESC
       LIMIT 10`
    );

    // Stock movement activity (last 30 days) - by type, no sales
    const movements = await query(
      `SELECT 
        DATE_FORMAT(created_at, '%b %d') as date,
        SUM(CASE WHEN type IN ('restock', 'transfer_in', 'initial') THEN quantity ELSE 0 END) as incoming,
        SUM(CASE WHEN type IN ('transfer_out', 'damage', 'expired', 'loss', 'sample', 'return_out') THEN quantity ELSE 0 END) as outgoing
       FROM inv_stock_movements
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at), DATE_FORMAT(created_at, '%b %d')
       ORDER BY DATE(created_at) ASC
       LIMIT 30`
    );

    // Movement breakdown by type
    const movementTypes = await query(
      `SELECT type, COUNT(*) as count, SUM(quantity) as quantity
       FROM inv_stock_movements
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY type
       ORDER BY count DESC`
    );

    // Recent activity
    const activity = await query(
      `SELECT al.*, u.full_name as user_name
       FROM inv_activity_log al
       LEFT JOIN inv_users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 10`
    );

    // Expiry alerts count (from batches)
    const expiringCount = await queryOne<CountRow>(
      `SELECT COUNT(*) as count FROM inv_batches b 
       JOIN inv_products p ON b.product_id = p.id
       WHERE b.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) 
       AND b.quantity > 0 AND p.status = 'active'`
    );

    const expiredCount = await queryOne<CountRow>(
      `SELECT COUNT(*) as count FROM inv_batches b 
       JOIN inv_products p ON b.product_id = p.id
       WHERE b.expiry_date < CURDATE() AND b.quantity > 0 AND p.status = 'active'`
    );

    return NextResponse.json({
      totalProducts: productsCount?.count || 0,
      lowStockCount: lowStock?.count || 0,
      outOfStockCount: outOfStock?.count || 0,
      totalCostValue: Number(totalCostValue?.total ?? 0),
      pendingOrdersCount: pendingOrders?.count || 0,
      expiringCount: expiringCount?.count || 0,
      expiredCount: expiredCount?.count || 0,
      categories,
      movements,
      movementTypes,
      activity,
    });
  } catch (error: unknown) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
