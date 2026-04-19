import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-auth";
import { query, queryOne } from "@/lib/db";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SummaryRow {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalCostValue: string;
}

interface ProductRow {
  name: string;
  sku: string;
  quantity: number;
  cost_price: string;
  category_name: string;
  stock_status?: string;
}

function formatCurrency(amount: number): string {
  return "₱" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function addReportHeader(doc: jsPDF, title: string): void {
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text("BATISTIL Minimart", 14, 20);
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(title, 14, 28);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`, 14, 35);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 38, doc.internal.pageSize.getWidth() - 14, 38);
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "summary";

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    switch (reportType) {
      case "summary": {
        addReportHeader(doc, "Inventory Summary Report");

        const summary = await queryOne<SummaryRow>(
          `SELECT
            COUNT(*) as totalProducts,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as activeProducts,
            COUNT(CASE WHEN quantity > 0 AND quantity <= min_stock_level AND status = 'active' THEN 1 END) as lowStockCount,
            COUNT(CASE WHEN quantity = 0 AND status = 'active' THEN 1 END) as outOfStockCount,
            COALESCE(SUM(CASE WHEN quantity > 0 THEN quantity * cost_price ELSE 0 END), 0) as totalCostValue
          FROM inv_products`
        );

        const s = summary ?? { totalProducts: 0, activeProducts: 0, lowStockCount: 0, outOfStockCount: 0, totalCostValue: "0" };

        autoTable(doc, {
          startY: 45,
          head: [["Metric", "Value"]],
          body: [
            ["Total Products", s.totalProducts.toString()],
            ["Active Products", s.activeProducts.toString()],
            ["Low Stock Items", s.lowStockCount.toString()],
            ["Out of Stock", s.outOfStockCount.toString()],
            ["Total Inventory Value", formatCurrency(Number(s.totalCostValue))],
          ],
          theme: "grid",
          headStyles: { fillColor: [16, 185, 129] },
          margin: { left: 14 },
        });
        break;
      }

      case "low_stock": {
        addReportHeader(doc, "Low Stock Report");

        const products = await query<ProductRow>(
          `SELECT p.name, p.sku, p.quantity, p.cost_price,
            COALESCE(c.name, 'Uncategorized') as category_name
          FROM inv_products p
          LEFT JOIN inv_categories c ON p.category_id = c.id
          WHERE p.quantity <= p.min_stock_level AND p.status = 'active'
          ORDER BY p.quantity ASC
          LIMIT 500`
        );

        autoTable(doc, {
          startY: 45,
          head: [["Product", "SKU", "Category", "Qty", "Cost Price"]],
          body: products.map((p) => [
            p.name, p.sku, p.category_name,
            p.quantity.toString(),
            formatCurrency(Number(p.cost_price)),
          ]),
          theme: "striped",
          headStyles: { fillColor: [245, 158, 11] },
          margin: { left: 14 },
        });
        break;
      }

      case "inventory_valuation": {
        addReportHeader(doc, "Inventory Valuation Report");

        const products = await query<ProductRow & { total_value: string }>(
          `SELECT p.name, p.sku, p.quantity, p.cost_price,
            COALESCE(c.name, 'Uncategorized') as category_name,
            (p.quantity * p.cost_price) as total_value
          FROM inv_products p
          LEFT JOIN inv_categories c ON p.category_id = c.id
          WHERE p.quantity > 0 AND p.status = 'active'
          ORDER BY total_value DESC
          LIMIT 500`
        );

        let grandTotal = 0;
        const body = products.map((p) => {
          const tv = Number(p.total_value);
          grandTotal += tv;
          return [
            p.name, p.sku, p.category_name,
            p.quantity.toString(),
            formatCurrency(Number(p.cost_price)),
            formatCurrency(tv),
          ];
        });

        autoTable(doc, {
          startY: 45,
          head: [["Product", "SKU", "Category", "Qty", "Unit Cost", "Total Value"]],
          body,
          foot: [["", "", "", "", "Grand Total", formatCurrency(grandTotal)]],
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
          footStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
          margin: { left: 14 },
        });
        break;
      }

      case "top_products": {
        addReportHeader(doc, "Top Products by Value");

        const products = await query<ProductRow & { total_value: string }>(
          `SELECT p.name, p.sku, p.quantity, p.cost_price,
            COALESCE(c.name, 'Uncategorized') as category_name,
            (p.quantity * p.cost_price) as total_value
          FROM inv_products p
          LEFT JOIN inv_categories c ON p.category_id = c.id
          WHERE p.quantity > 0 AND p.status = 'active'
          ORDER BY total_value DESC
          LIMIT 50`
        );

        autoTable(doc, {
          startY: 45,
          head: [["#", "Product", "SKU", "Category", "Qty", "Unit Cost", "Total Value"]],
          body: products.map((p, i) => [
            (i + 1).toString(), p.name, p.sku, p.category_name,
            p.quantity.toString(),
            formatCurrency(Number(p.cost_price)),
            formatCurrency(Number(p.total_value)),
          ]),
          theme: "striped",
          headStyles: { fillColor: [139, 92, 246] },
          margin: { left: 14 },
        });
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
    }

    const filename = `bastistil_${reportType}_report_${new Date().toISOString().slice(0, 10)}.pdf`;
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("PDF export error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
