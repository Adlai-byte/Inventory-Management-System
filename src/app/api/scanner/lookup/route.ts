import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { Product } from "@/lib/types";
import { requireAuth } from "@/lib/route-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const { success } = rateLimit(request, { limit: 30, window: 60 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "Missing search query" }, { status: 400 });
  }

  try {
    const base = `SELECT p.*, c.name as category_name
                  FROM inv_products p
                  LEFT JOIN inv_categories c ON p.category_id = c.id`;

    // 1. Exact barcode / SKU match
    const exact = await query<Product>(`${base} WHERE p.barcode = ? OR p.sku = ? LIMIT 1`, [q, q]);
    if (exact.length > 0) {
      return NextResponse.json({ data: exact[0] });
    }

    // 2. Partial name match fallback
    const byName = await query<Product>(
      `${base} WHERE p.name LIKE ? ORDER BY p.name LIMIT 10`,
      [`%${q}%`]
    );

    if (byName.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (byName.length === 1) {
      return NextResponse.json({ data: byName[0] });
    }

    return NextResponse.json({ matches: byName });
  } catch (error: unknown) {
    console.error("Scanner lookup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
