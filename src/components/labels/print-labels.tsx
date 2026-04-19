"use client";

import { useEffect, useRef, useCallback } from "react";
import JsBarcode from "jsbarcode";
import type { Product } from "@/lib/types";

interface LabelProduct extends Pick<Product, "id" | "name" | "sku" | "barcode" | "cost_price" | "unit"> {
  category_name?: string;
}

interface PrintLabelsProps {
  products: LabelProduct[];
  labelType: "shelf" | "price" | "small";
  onClose: () => void;
}

function formatCurrency(amount: number): string {
  return "PHP " + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BarcodeSVG({ value, width = 1.5, height = 35 }: { value: string; width?: number; height?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue: true,
          fontSize: 10,
          margin: 2,
          font: "monospace",
        });
      } catch {
        // Barcode generation failed - show text fallback
        if (svgRef.current) {
          svgRef.current.innerHTML = `<text x="50%" y="50%" text-anchor="middle" font-size="12">${value}</text>`;
        }
      }
    }
  }, [value, width, height]);

  return <svg ref={svgRef} />;
}

function ShelfLabel({ product }: { product: LabelProduct }) {
  return (
    <div className="label-shelf" style={{
      width: "2.5in",
      height: "1.5in",
      padding: "6px 8px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      border: "1px dashed #ccc",
      borderRadius: "4px",
      overflow: "hidden",
      boxSizing: "border-box",
      pageBreakInside: "avoid",
    }}>
      <div style={{ fontSize: "9px", fontWeight: 600, lineHeight: 1.2, maxHeight: "24px", overflow: "hidden", textOverflow: "ellipsis" }}>
        {product.name}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "4px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <BarcodeSVG value={product.barcode || product.sku} width={1.2} height={28} />
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#111" }}>
            {formatCurrency(product.cost_price)}
          </div>
          <div style={{ fontSize: "7px", color: "#666" }}>
            per {product.unit || "pc"}
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceLabel({ product }: { product: LabelProduct }) {
  return (
    <div className="label-price" style={{
      width: "2in",
      height: "1in",
      padding: "4px 6px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      border: "1px dashed #ccc",
      borderRadius: "4px",
      overflow: "hidden",
      boxSizing: "border-box",
      pageBreakInside: "avoid",
    }}>
      <div style={{ fontSize: "8px", fontWeight: 600, lineHeight: 1.1, textAlign: "center", maxHeight: "18px", overflow: "hidden", width: "100%" }}>
        {product.name}
      </div>
      <div style={{ fontSize: "18px", fontWeight: 800, color: "#111", margin: "2px 0" }}>
        {formatCurrency(product.cost_price)}
      </div>
      <div style={{ transform: "scale(0.8)", transformOrigin: "center" }}>
        <BarcodeSVG value={product.barcode || product.sku} width={1} height={18} />
      </div>
    </div>
  );
}

function SmallLabel({ product }: { product: LabelProduct }) {
  return (
    <div className="label-small" style={{
      width: "1.5in",
      height: "0.5in",
      padding: "2px 4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      border: "1px dashed #ccc",
      borderRadius: "2px",
      overflow: "hidden",
      boxSizing: "border-box",
      pageBreakInside: "avoid",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "7px", fontWeight: 600, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {product.name}
        </div>
        <div style={{ fontSize: "7px", color: "#999", fontFamily: "monospace" }}>
          {product.sku}
        </div>
      </div>
      <div style={{ fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>
        {formatCurrency(product.cost_price)}
      </div>
    </div>
  );
}

export default function PrintLabels({ products, labelType, onClose }: PrintLabelsProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      alert("Please allow popups to print labels");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Labels - BATISTIL</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            display: flex;
            flex-wrap: wrap;
            gap: 2mm;
            padding: 5mm;
          }
          @media print {
            body { padding: 0; gap: 0; }
            .no-print { display: none !important; }
          }
          svg { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();

    // Wait for SVGs to render, then print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  }, []);

  useEffect(() => {
    // Auto-trigger print after mount
    const timer = setTimeout(handlePrint, 300);
    return () => clearTimeout(timer);
  }, [handlePrint]);

  const LabelComponent = labelType === "shelf" ? ShelfLabel : labelType === "price" ? PriceLabel : SmallLabel;
  const labelName = labelType === "shelf" ? "Shelf Labels" : labelType === "price" ? "Price Tags" : "Small Labels";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Print {labelName}</h2>
            <p className="text-sm text-muted-foreground">{products.length} label(s) · {products.length > 1 ? "one per product" : "1 product"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              Print Again
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-accent"
            >
              Close
            </button>
          </div>
        </div>
        <div className="overflow-y-auto p-6">
          <div ref={printRef} className="flex flex-wrap gap-2">
            {products.map((product) => (
              <LabelComponent key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export type { LabelProduct, PrintLabelsProps };
