import { NextRequest, NextResponse } from "next/server";
import { simpleQuery } from "@/lib/db";
import { requireAuth } from "@/lib/route-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "summary";

    switch (type) {
      // =======================================
      // INVENTORY SUMMARY
      // =======================================
      case "summary": {
        const [products, lowStock, outOfStock, expiring, expired, inventoryValue] = await Promise.all([
          simpleQuery<{total: number}>("SELECT COUNT(*) as total FROM inv_products"),
          simpleQuery<{low_stock: number}>(`
            SELECT COUNT(*) as low_stock FROM inv_products 
            WHERE quantity > 0 AND quantity <= min_stock_level AND status = 'active'
          `),
          simpleQuery<{out_of_stock: number}>(`
            SELECT COUNT(*) as out_of_stock FROM inv_products 
            WHERE quantity = 0 AND status = 'active'
          `),
          simpleQuery<{expiring: number}>(`
            SELECT COUNT(*) as expiring FROM inv_products 
            WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND status = 'active'
          `),
          simpleQuery<{expired: number}>(`
            SELECT COUNT(*) as expired FROM inv_products 
            WHERE expiry_date < CURDATE() AND status = 'active'
          `),
          simpleQuery<{cost_value: number}>(`
            SELECT COALESCE(SUM(quantity * cost_price), 0) as cost_value
            FROM inv_products WHERE quantity > 0
          `),
        ]);

        return NextResponse.json({
          totalProducts: (products[0] as {total: number})?.total || 0,
          activeProducts: (products[0] as {total: number})?.total || 0,
          lowStockCount: (lowStock[0] as {low_stock: number})?.low_stock || 0,
          outOfStockCount: (outOfStock[0] as {out_of_stock: number})?.out_of_stock || 0,
          expiringSoonCount: (expiring[0] as {expiring: number})?.expiring || 0,
          expiredCount: (expired[0] as {expired: number})?.expired || 0,
          totalCostValue: (inventoryValue[0] as {cost_value: number})?.cost_value || 0,
        });
      }

      // =======================================
      // LOW STOCK ALERTS
      // =======================================
      case "lowstock": {
        const lowStockProducts = await simpleQuery(`
          SELECT p.id, p.name, p.sku, p.quantity, p.min_stock_level, p.reorder_point,
                 p.cost_price, p.supplier_id, s.name as supplier_name
          FROM inv_products p
          LEFT JOIN inv_suppliers s ON p.supplier_id = s.id
          WHERE p.quantity <= p.min_stock_level AND p.status = 'active'
          ORDER BY (p.min_stock_level - p.quantity) DESC
          LIMIT 100
        `);
        return NextResponse.json({ data: lowStockProducts });
      }

      // =======================================
      // CATEGORY BREAKDOWN
      // =======================================
      case "category": {
        const categoryData = await simpleQuery(`
          SELECT 
            COALESCE(c.name, 'Uncategorized') as category,
            COUNT(*) as product_count,
            SUM(p.quantity) as total_quantity,
            COALESCE(SUM(p.quantity * p.cost_price), 0) as total_value
          FROM inv_products p
          LEFT JOIN inv_categories c ON p.category_id = c.id
          WHERE p.quantity > 0
          GROUP BY COALESCE(c.name, 'Uncategorized')
          ORDER BY total_value DESC
        `);
        return NextResponse.json({ data: categoryData });
      }

      // =======================================
      // STOCK MOVEMENTS SUMMARY (No Sales)
      // =======================================
      case "movements": {
        const period = searchParams.get("period") || "30";
        const days = Math.min(365, Math.max(1, parseInt(period)));

        const [byType, recentMovements] = await Promise.all([
          simpleQuery(`
            SELECT type, COUNT(*) as count, SUM(quantity) as quantity
            FROM inv_stock_movements
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY type
            ORDER BY count DESC
          `, [days]),
          simpleQuery(`
            SELECT sm.*, p.name as product_name, p.sku as product_sku
            FROM inv_stock_movements sm
            LEFT JOIN inv_products p ON sm.product_id = p.id
            ORDER BY sm.created_at DESC
            LIMIT 50
          `),
        ]);

        return NextResponse.json({
          period_days: days,
          by_type: byType,
          recent_movements: recentMovements,
        });
      }

      // =======================================
      // SHRINKAGE REPORT (Loss, Damage, Expired)
      // =======================================
      case "shrinkage": {
        const period = searchParams.get("period") || "30";
        const days = Math.min(365, Math.max(1, parseInt(period)));

        const [summary, byType, topProducts] = await Promise.all([
          simpleQuery(`
            SELECT 
              COUNT(*) as total_movements,
              SUM(quantity) as total_items,
              COALESCE(SUM(quantity * unit_cost), 0) as total_cost_lost
            FROM inv_stock_movements
            WHERE type IN ('damage', 'expired', 'loss')
            AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          `, [days]),
          simpleQuery(`
            SELECT 
              type,
              COUNT(*) as count,
              SUM(quantity) as total_quantity,
              COALESCE(SUM(quantity * unit_cost), 0) as cost_value
            FROM inv_stock_movements
            WHERE type IN ('damage', 'expired', 'loss')
            AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY type
            ORDER BY cost_value DESC
          `, [days]),
          simpleQuery(`
            SELECT 
              p.id, p.name, p.sku,
              SUM(sm.quantity) as total_lost,
              COALESCE(SUM(sm.quantity * sm.unit_cost), 0) as cost_value,
              sm.type
            FROM inv_stock_movements sm
            JOIN inv_products p ON sm.product_id = p.id
            WHERE sm.type IN ('damage', 'expired', 'loss')
            AND sm.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY p.id, p.name, p.sku, sm.type
            ORDER BY cost_value DESC
            LIMIT 20
          `, [days]),
        ]);

        // Calculate loss rate
        const totalInventoryResult = await simpleQuery<{total: number}>(`
          SELECT SUM(quantity) as total FROM inv_products WHERE status = 'active'
        `);
        const totalInventory = totalInventoryResult[0]?.total || 0;
        const totalLost = (summary[0] as {total_items?: number})?.total_items || 0;
        const lossRate = totalInventory > 0 ? (totalLost / totalInventory * 100) : 0;

        return NextResponse.json({
          period_days: days,
          summary: {
            total_items_lost: totalLost,
            total_cost_lost: (summary[0] as {total_cost_lost?: number})?.total_cost_lost || 0,
            loss_rate_percentage: Math.round(lossRate * 100) / 100,
          },
          by_type: byType,
          top_products: topProducts,
        });
      }

      // =======================================
      // INVENTORY VALUATION (Cost Price Only)
      // =======================================
      case "valuation": {
        const [totalValuation, byCategory, bySupplier] = await Promise.all([
          simpleQuery(`
            SELECT 
              COUNT(*) as total_skus,
              SUM(quantity) as total_units,
              COALESCE(SUM(quantity * cost_price), 0) as total_cost_value,
              AVG(cost_price) as avg_cost_per_unit
            FROM inv_products
            WHERE quantity > 0 AND status = 'active'
          `),
          simpleQuery(`
            SELECT 
              COALESCE(c.name, 'Uncategorized') as category,
              COUNT(*) as product_count,
              SUM(p.quantity) as total_quantity,
              COALESCE(SUM(p.quantity * p.cost_price), 0) as cost_value
            FROM inv_products p
            LEFT JOIN inv_categories c ON p.category_id = c.id
            WHERE p.quantity > 0 AND p.status = 'active'
            GROUP BY COALESCE(c.name, 'Uncategorized')
            ORDER BY cost_value DESC
          `),
          simpleQuery(`
            SELECT 
              COALESCE(s.name, 'No Supplier') as supplier,
              COUNT(*) as product_count,
              SUM(p.quantity) as total_quantity,
              COALESCE(SUM(p.quantity * p.cost_price), 0) as cost_value
            FROM inv_products p
            LEFT JOIN inv_suppliers s ON p.supplier_id = s.id
            WHERE p.quantity > 0 AND p.status = 'active'
            GROUP BY COALESCE(s.name, 'No Supplier')
            ORDER BY cost_value DESC
            LIMIT 10
          `),
        ]);

        return NextResponse.json({
          total: totalValuation[0] || {},
          by_category: byCategory,
          by_supplier: bySupplier,
          generated_at: new Date().toISOString(),
          note: "Values are at cost price (purchase price from suppliers)",
        });
      }

      // =======================================
      // TOP PRODUCTS BY VALUE
      // =======================================
      case "topproducts": {
        const topProductsData = await simpleQuery(`
          SELECT 
            p.id, p.name, p.sku, p.quantity, p.cost_price as unit_price,
            (p.quantity * p.cost_price) as total_value,
            c.name as category_name,
            0 as margin
          FROM inv_products p
          LEFT JOIN inv_categories c ON p.category_id = c.id
          WHERE p.quantity > 0 AND p.status = 'active'
          ORDER BY total_value DESC
          LIMIT 50
        `);
        return NextResponse.json({ data: topProductsData });
      }

      // =======================================
      // EXPIRY REPORT
      // =======================================
      case "expiry": {
        const days = Math.min(365, Math.max(1, parseInt(searchParams.get("days") || "30")));

        const [expired, expiring, summary] = await Promise.all([
          simpleQuery(`
            SELECT p.id, p.name, p.sku, p.quantity, p.expiry_date, 
                   p.cost_price, c.name as category_name
            FROM inv_products p
            LEFT JOIN inv_categories c ON p.category_id = c.id
            WHERE p.expiry_date < CURDATE() AND p.status = 'active'
            ORDER BY p.expiry_date ASC
          `),
          simpleQuery(`
            SELECT p.id, p.name, p.sku, p.quantity, p.expiry_date,
                   p.cost_price, c.name as category_name,
                   DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
            FROM inv_products p
            LEFT JOIN inv_categories c ON p.category_id = c.id
            WHERE p.expiry_date >= CURDATE() 
              AND p.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
              AND p.status = 'active'
            ORDER BY p.expiry_date ASC
          `, [days]),
          simpleQuery(`
            SELECT 
              SUM(CASE WHEN expiry_date < CURDATE() THEN quantity ELSE 0 END) as expired_units,
              SUM(CASE WHEN expiry_date < CURDATE() THEN quantity * cost_price ELSE 0 END) as expired_cost,
              SUM(CASE WHEN expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY) 
                THEN quantity ELSE 0 END) as expiring_units,
              SUM(CASE WHEN expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY) 
                THEN quantity * cost_price ELSE 0 END) as expiring_cost
            FROM inv_products WHERE status = 'active'
          `, [days, days]),
        ]);

        return NextResponse.json({
          expired,
          expiring,
          summary: {
            expired_count: expired.length,
            expiring_count: expiring.length,
            expired_units: (summary[0] as {expired_units?: number})?.expired_units || 0,
            expired_cost: (summary[0] as {expired_cost?: number})?.expired_cost || 0,
            expiring_units: (summary[0] as {expiring_units?: number})?.expiring_units || 0,
            expiring_cost: (summary[0] as {expiring_cost?: number})?.expiring_cost || 0,
          },
          filters: { days }
        });
      }

      // =======================================
      // OUTBOUND TRENDS
      // =======================================
      case "outbound_trends": {
        const period = searchParams.get("period") || "daily";
        // Use client-supplied date; fallback to MySQL CURDATE() to avoid UTC offset issues
        const date = searchParams.get("date");
        const month = searchParams.get("month");

        let dateFilter: string;
        let param: string | null;
        let groupByExpr: string;
        let selectFormat: string;

        // The database is already in PH local time, so we use the column directly.
        const localConv = (col: string) => col;

        if (period === "monthly") {
          const monthParam = month || new Date().toLocaleDateString("sv-SE").slice(0, 7);
          dateFilter = `DATE_FORMAT(${localConv("sm.created_at")}, '%Y-%m') = ?`;
          param = monthParam;
          groupByExpr = `DATE(${localConv("sm.created_at")}), DAY(${localConv("sm.created_at")})`;
          selectFormat = `DATE(${localConv("sm.created_at")}) as period, DAY(${localConv("sm.created_at")}) as day`;
        } else if (period === "yearly") {
          const yearParam = (date || new Date().toLocaleDateString("sv-SE")).slice(0, 4);
          dateFilter = `YEAR(${localConv("sm.created_at")}) = ?`;
          param = yearParam;
          groupByExpr = `DATE_FORMAT(${localConv("sm.created_at")}, '%Y-%m'), MONTH(${localConv("sm.created_at")})`;
          selectFormat = `DATE_FORMAT(${localConv("sm.created_at")}, '%Y-%m') as period, MONTH(${localConv("sm.created_at")}) as month`;
        } else {
          const localDateParam = date || new Date().toLocaleDateString("sv-SE");
          dateFilter = `DATE(${localConv("sm.created_at")}) = ?`;
          param = localDateParam;
          groupByExpr = `HOUR(${localConv("sm.created_at")})`;
          selectFormat = `HOUR(${localConv("sm.created_at")}) as hour`;
        }

        const queryParams = [param] as string[];

        const [outbound, summaryData, topProducts] = await Promise.all([
          simpleQuery<Record<string, unknown>>(`
            SELECT 
              ${selectFormat},
              COUNT(*) as transfer_count,
              SUM(quantity) as total_items
            FROM inv_stock_movements sm
            WHERE sm.type = 'transfer_out' AND ${dateFilter}
            GROUP BY ${groupByExpr}
            ORDER BY ${groupByExpr} ASC
          `, queryParams),
          simpleQuery<Record<string, unknown>>(`
            SELECT 
              COUNT(*) as total_transfers,
              COALESCE(SUM(quantity), 0) as total_items_dispatched
            FROM inv_stock_movements sm
            WHERE sm.type = 'transfer_out' AND ${dateFilter}
          `, queryParams),
          simpleQuery<Record<string, unknown>>(`
            SELECT 
              p.id,
              p.name,
              p.sku,
              c.name as category_name,
              SUM(sm.quantity) as quantity_dispatched
            FROM inv_stock_movements sm
            JOIN inv_products p ON sm.product_id = p.id
            LEFT JOIN inv_categories c ON p.category_id = c.id
            WHERE sm.type = 'transfer_out' AND ${dateFilter}
            GROUP BY p.id, p.name, p.sku, c.name
            ORDER BY quantity_dispatched DESC
            LIMIT 10
          `, queryParams)
        ]);


        // Cast numeric results to numbers to avoid string values from SUM/COUNT
        const formattedOutbound = outbound.map((d: Record<string, unknown>) => ({
          ...d,
          transfer_count: Number(d.transfer_count || 0),
          total_items: Number(d.total_items || 0),
        }));

        const summaryRaw = summaryData[0] || { total_transfers: 0, total_items_dispatched: 0 };
        const summary = {
          total_transfers: Number(summaryRaw.total_transfers || 0),
          total_items_dispatched: Number(summaryRaw.total_items_dispatched || 0),
        };

        const formattedTopProducts = topProducts.map((p: Record<string, unknown>) => ({
          ...p,
          quantity_dispatched: Number(p.quantity_dispatched || 0),
        }));

        return NextResponse.json({
          outbound: formattedOutbound,
          summary,
          topProducts: formattedTopProducts
        });
      }



      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("Reports API error:", error);
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ 
      error: "Internal server error",
      message,
      stack: process.env.NODE_ENV === "development" ? stack : undefined
    }, { status: 500 });
  }
}
