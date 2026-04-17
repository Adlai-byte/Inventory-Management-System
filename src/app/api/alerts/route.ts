import { NextResponse } from "next/server";
import { simpleQuery } from "@/lib/db";
import { requireAuth } from "@/lib/route-auth";

export async function GET() {
  const auth = await requireAuth(["admin", "manager", "staff"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const lowStockProducts = await simpleQuery(
      `SELECT 
        p.id, p.name, p.sku, p.quantity, p.min_stock_level, 
        p.barcode, p.cost_price as unit_price, p.cost_price,
        c.name as category_name,
        s.name as supplier_name
       FROM inv_products p
       LEFT JOIN inv_categories c ON p.category_id = c.id
       LEFT JOIN inv_suppliers s ON p.supplier_id = s.id
       WHERE p.quantity <= p.min_stock_level AND p.quantity > 0 AND p.status = 'active'
       ORDER BY (p.quantity * 1.0 / p.min_stock_level) ASC
       LIMIT 20`
    );

    const outOfStockProducts = await simpleQuery(
      `SELECT 
        p.id, p.name, p.sku, p.quantity, p.min_stock_level,
        c.name as category_name,
        s.name as supplier_name
       FROM inv_products p
       LEFT JOIN inv_categories c ON p.category_id = c.id
       LEFT JOIN inv_suppliers s ON p.supplier_id = s.id
       WHERE p.quantity = 0 AND p.status = 'active'
       ORDER BY p.updated_at DESC
       LIMIT 10`
    );

    const expiredProducts = await simpleQuery(
      `SELECT 
        p.id, p.name, p.sku, p.quantity, p.expiry_date,
        c.name as category_name,
        s.name as supplier_name
       FROM inv_products p
       LEFT JOIN inv_categories c ON p.category_id = c.id
       LEFT JOIN inv_suppliers s ON p.supplier_id = s.id
       WHERE p.expiry_date IS NOT NULL AND p.expiry_date < CURDATE() AND p.status = 'active'
       ORDER BY p.expiry_date ASC
       LIMIT 10`
    );

    const expiringProducts = await simpleQuery(
      `SELECT 
        p.id, p.name, p.sku, p.quantity, p.expiry_date,
        c.name as category_name,
        s.name as supplier_name
       FROM inv_products p
       LEFT JOIN inv_categories c ON p.category_id = c.id
       LEFT JOIN inv_suppliers s ON p.supplier_id = s.id
       WHERE p.expiry_date IS NOT NULL AND p.expiry_date >= CURDATE() 
         AND p.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND p.status = 'active'
       ORDER BY p.expiry_date ASC
       LIMIT 20`
    );

    return NextResponse.json({
      lowStock: lowStockProducts,
      outOfStock: outOfStockProducts,
      expired: expiredProducts,
      expiring: expiringProducts,
      summary: {
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        expiredCount: expiredProducts.length,
        expiringCount: expiringProducts.length,
      }
    });
  } catch (error: unknown) {
    console.error("Alerts API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
