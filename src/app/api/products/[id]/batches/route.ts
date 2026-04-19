import { NextRequest, NextResponse } from "next/server";
import { simpleQuery } from "@/lib/db";
import { requireAuth } from "@/lib/route-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const batches = await simpleQuery(
      `SELECT * FROM inv_batches 
       WHERE product_id = ? AND quantity > 0
       ORDER BY 
         CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END, 
         expiry_date ASC, 
         id ASC`,
      [productId]
    );

    return NextResponse.json(batches);
  } catch (error: unknown) {
    console.error("Product batches GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
