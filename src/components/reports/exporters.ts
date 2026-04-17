import { formatCurrency } from "@/lib/utils";
import type {
  CategoryData,
  LowStockProduct,
  OutboundData,
  OutboundSummary,
  SummaryData,
  TopProduct,
  TopDispatchedProduct,
} from "@/components/reports/types";

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getTodayIsoDate(): string {
  return new Date().toISOString().split("T")[0];
}

type PdfWithAutoTable = {
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  text: (text: string, x: number, y: number) => void;
  save: (filename: string) => void;
  lastAutoTable?: { finalY: number };
};

async function loadPdfTools() {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  return { jsPDF, autoTable };
}

export function exportDispatchCSV(outboundData: OutboundData[], selectedPeriod: string): void {
  if (outboundData.length === 0) return;
  const headers = ["Period", "Transfer Operations", "Items Dispatched"];
  const rows = outboundData.map((d) => [d.period, d.transfer_count, d.total_items]);
  downloadCsv(`dispatch-report-${selectedPeriod}-${getTodayIsoDate()}.csv`, headers, rows);
}

export function exportLowStockCSV(lowStockProducts: LowStockProduct[]): void {
  if (lowStockProducts.length === 0) return;
  const headers = ["Product", "SKU", "Current Qty", "Min Level", "Deficit", "Supplier"];
  const rows = lowStockProducts.map((p) => [
    p.name,
    p.sku,
    p.quantity,
    p.min_stock_level,
    p.min_stock_level - p.quantity,
    p.supplier_name || "",
  ]);
  downloadCsv("low-stock-report.csv", headers, rows);
}

export async function exportDispatchPDF(
  outboundData: OutboundData[],
  outboundSummary: OutboundSummary,
  topDispatchedProducts: TopDispatchedProduct[],
  selectedPeriod: string
): Promise<void> {
  const { jsPDF, autoTable } = await loadPdfTools();
  const doc = new jsPDF() as unknown as PdfWithAutoTable;

  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129);
  doc.text("BATISTIL MINI MART", 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text("Dispatch Report", 14, 28);
  doc.text(`Period: ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}`, 14, 34);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 40);
  doc.setFontSize(7);
  doc.text("Inventory Management System - Cost Price Only", 14, 45);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Items Dispatched: ${outboundSummary.total_items_dispatched.toLocaleString()}`, 14, 50);
  doc.text(`Transfer Operations: ${outboundSummary.total_transfers.toLocaleString()}`, 14, 56);

  if (outboundData.length > 0) {
    autoTable(doc as never, {
      startY: 65,
      head: [["Period", "Transfers", "Items Dispatched"]],
      body: outboundData.map((d) => [
        d.period || "N/A",
        d.transfer_count.toString(),
        d.total_items.toString(),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
  }

  if (topDispatchedProducts.length > 0) {
    const finalY = doc.lastAutoTable?.finalY || 65;
    autoTable(doc as never, {
      startY: finalY + 15,
      head: [["#", "Product", "Category", "Qty Dispatched"]],
      body: topDispatchedProducts.map((p, i) => [
        (i + 1).toString(),
        p.name,
        p.category_name || "-",
        p.quantity_dispatched.toString(),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
  }

  doc.save(`dispatch-report-${selectedPeriod}-${getTodayIsoDate()}.pdf`);
}

export async function exportInventoryPDF(topProducts: TopProduct[], summary: SummaryData | null): Promise<void> {
  const { jsPDF, autoTable } = await loadPdfTools();
  const doc = new jsPDF() as unknown as PdfWithAutoTable;

  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129);
  doc.text("BATISTIL MINI MART", 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text("Inventory Valuation Report", 14, 28);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34);
  doc.setFontSize(7);
  doc.text("Inventory Management System - Cost Price Only", 14, 39);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Total Products: ${summary?.totalProducts || 0}`, 14, 44);
  doc.text(`Total Cost Value: ${formatCurrency(summary?.totalCostValue || 0)}`, 14, 50);

  if (topProducts.length > 0) {
    autoTable(doc as never, {
      startY: 65,
      head: [["Product", "Category", "Qty", "Cost Price", "Total Cost Value"]],
      body: topProducts.map((p) => [
        p.name.length > 25 ? `${p.name.substring(0, 25)}...` : p.name,
        p.category_name || "-",
        p.quantity.toString(),
        formatCurrency(p.unit_price),
        formatCurrency(p.total_value),
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [16, 185, 129] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
  }

  doc.save(`inventory-report-${getTodayIsoDate()}.pdf`);
}

export async function exportLowStockPDF(lowStockProducts: LowStockProduct[]): Promise<void> {
  if (lowStockProducts.length === 0) return;
  const { jsPDF, autoTable } = await loadPdfTools();
  const doc = new jsPDF() as unknown as PdfWithAutoTable;

  doc.setFontSize(18);
  doc.setTextColor(245, 158, 11);
  doc.text("BATISTIL MINI MART", 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text("Low Stock Alert Report", 14, 28);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34);
  doc.setFontSize(7);
  doc.text("Inventory Management System - Cost Price Only", 14, 39);
  doc.text(`Total Low Stock Items: ${lowStockProducts.length}`, 14, 40);

  autoTable(doc as never, {
    startY: 48,
    head: [["Product", "SKU", "Current", "Min Level", "Deficit", "Supplier"]],
    body: lowStockProducts.map((p) => [
      p.name.length > 25 ? `${p.name.substring(0, 25)}...` : p.name,
      p.sku,
      p.quantity.toString(),
      p.min_stock_level.toString(),
      (p.min_stock_level - p.quantity).toString(),
      (p.supplier_name || "-").substring(0, 15),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [245, 158, 11] },
    alternateRowStyles: { fillColor: [255, 251, 235] },
  });

  doc.save(`low-stock-report-${getTodayIsoDate()}.pdf`);
}

export async function exportCategoryPDF(categoryData: CategoryData[]): Promise<void> {
  const { jsPDF, autoTable } = await loadPdfTools();
  const doc = new jsPDF() as unknown as PdfWithAutoTable;

  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129);
  doc.text("BATISTIL MINI MART", 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text("Category Summary Report", 14, 28);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 34);
  doc.setFontSize(7);
  doc.text("Inventory Management System - Cost Price Only", 14, 39);

  if (categoryData.length > 0) {
    autoTable(doc as never, {
      startY: 42,
      head: [["Category", "Products", "Total Value"]],
      body: categoryData.map((c) => [c.category, c.product_count.toString(), formatCurrency(c.total_value)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
  }

  doc.save(`category-report-${getTodayIsoDate()}.pdf`);
}
