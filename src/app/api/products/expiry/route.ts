import { NextRequest, NextResponse } from "next/server";
import { simpleQuery } from "@/lib/db";
import { requireAuth } from "@/lib/route-auth";

interface ProductValue {
  quantity: number;
  cost_price: number;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get("days") || "30")));

    const expired = await simpleQuery(
      `SELECT p.*, c.name as category_name, DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
       FROM inv_products p
       LEFT JOIN inv_categories c ON p.category_id = c.id
       WHERE p.expiry_date < CURDATE()
       ORDER BY p.expiry_date ASC`,
      []
    );

    const expiring = await simpleQuery(
      `SELECT p.*, c.name as category_name, DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
       FROM inv_products p
       LEFT JOIN inv_categories c ON p.category_id = c.id
       WHERE p.expiry_date >= CURDATE() AND p.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY p.expiry_date ASC`,
      [days]
    );

    const summary = {
      expired_count: expired.length,
      expiring_count: expiring.length,
      expired_value: (expired as ProductValue[]).reduce((sum, p) => sum + (p.quantity * p.cost_price), 0),
      expiring_value: (expiring as ProductValue[]).reduce((sum, p) => sum + (p.quantity * p.cost_price), 0),
    };

    return NextResponse.json({
      expired,
      expiring,
      summary,
      filters: { days }
    });
  } catch (error: unknown) {
    console.error("Expiry API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}