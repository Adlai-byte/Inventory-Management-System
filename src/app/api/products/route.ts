import { NextRequest, NextResponse } from "next/server";
import { simpleQuery, execute, type SqlValue } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { requireAuth } from "@/lib/route-auth";
import { createProductSchema } from "@/lib/validations/product";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "25"));
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "all";
    const status = searchParams.get("status") || "all";
    const rawExpiryFilter = searchParams.get("expiry_filter") || "all";
    const stockFilter = searchParams.get("stock_filter") || "all";
    
    const allowedExpiryFilters = ["all", "expired", "expiring", "none"];
    const expiryFilter = allowedExpiryFilters.includes(rawExpiryFilter) ? rawExpiryFilter : "all";
    
    const offset = (page - 1) * limit;
    
    let whereClause = "WHERE (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)";
    const params: SqlValue[] = [`%${search}%`, `%${search}%`, `%${search}%`];
    
    if (category !== "all") {
      whereClause += " AND p.category_id = ?";
      params.push(parseInt(category));
    }
    
    if (status !== "all") {
      whereClause += " AND p.status = ?";
      params.push(status);
    }

    // Handle expiry filtering
    if (expiryFilter === "expired") {
      whereClause += " AND p.expiry_date IS NOT NULL AND p.expiry_date < CURDATE()";
    } else if (expiryFilter === "expiring") {
      whereClause += " AND p.expiry_date IS NOT NULL AND p.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)";
    } else if (expiryFilter === "none") {
      whereClause += " AND p.expiry_date IS NULL";
    }

    // Handle stock filtering
    if (stockFilter === "out") {
      whereClause += " AND p.quantity = 0";
    } else if (stockFilter === "low") {
      whereClause += " AND p.quantity > 0 AND p.quantity <= p.min_stock_level";
    } else if (stockFilter === "overstocked") {
      whereClause += " AND p.quantity > p.max_stock_level";
    }

    // Get total count for pagination
    const countResult = await simpleQuery<{ total: number }>(
      `SELECT COUNT(*) as total FROM inv_products p ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    // Get paginated data with computed stock status
    const products = await simpleQuery(
      `SELECT p.*, 
        c.name as category_name, 
        s.name as supplier_name,
        w.name as warehouse_name,
        CASE 
          WHEN p.quantity = 0 THEN 'out_of_stock'
          WHEN p.quantity <= p.min_stock_level THEN 'low_stock'
          WHEN p.quantity > p.max_stock_level THEN 'overstocked'
          ELSE 'in_stock'
        END as stock_status
      FROM inv_products p
      LEFT JOIN inv_categories c ON p.category_id = c.id
      LEFT JOIN inv_suppliers s ON p.supplier_id = s.id
      LEFT JOIN inv_warehouses w ON p.warehouse_id = w.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: unknown) {
    console.error("Products API GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);
    
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json({ error: firstError?.message || "Validation error" }, { status: 400 });
    }

    const { 
      name, sku, description, category_id, supplier_id, 
      cost_price, quantity, min_stock_level, 
      max_stock_level, reorder_point, barcode, expiry_date, 
      manufacture_date, lot_number, unit, warehouse_id, status 
    } = parsed.data;

    const result = await execute(
      `INSERT INTO inv_products 
        (name, sku, description, category_id, supplier_id, cost_price, 
         quantity, min_stock_level, max_stock_level, reorder_point, barcode, 
         expiry_date, manufacture_date, lot_number, unit, warehouse_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, sku, description || null, category_id || null, supplier_id || null, 
        cost_price, quantity, min_stock_level, max_stock_level, 
        reorder_point, barcode || null, expiry_date || null, manufacture_date || null, 
        lot_number || null, unit, warehouse_id || null, status
      ]
    );

    // Log initial stock if quantity > 0
    if (quantity > 0) {
      await execute(
        `INSERT INTO inv_stock_movements 
         (product_id, type, quantity, previous_quantity, new_quantity, unit_cost, notes, created_by)
         VALUES (?, 'initial', ?, 0, ?, ?, 'Initial stock on product creation', ?)`,
        [result.insertId, quantity, quantity, cost_price, auth.id]
      );
    }

    await logActivity({
      entity_type: "product",
      action: "created",
      details: `Created product: ${name} (SKU: ${sku})`,
      entity_id: result.insertId,
    });

    return NextResponse.json({ 
      id: result.insertId, 
      message: "Product created successfully" 
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ER_DUP_ENTRY"
    ) {
      return NextResponse.json({ error: "SKU or barcode already exists" }, { status: 400 });
    }
    console.error("Products API POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
