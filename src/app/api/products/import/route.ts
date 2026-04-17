import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/route-auth";
import { query, execute } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";

interface CsvRow {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  category_name: string;
  supplier_name: string;
  cost_price: string;
  quantity: string;
  min_stock_level: string;
  unit: string;
  status: string;
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "")
  );

  const rows = lines.slice(1).map((line) => parseCsvLine(line));
  return { headers, rows };
}

function rowToCsvRow(headers: string[], row: string[]): CsvRow {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h] = row[i] || "";
  });
  return {
    name: obj.name || "",
    sku: obj.sku || "",
    barcode: obj.barcode || "",
    description: obj.description || "",
    category_name: obj.category_name || obj.category || "",
    supplier_name: obj.supplier_name || obj.supplier || "",
    cost_price: obj.cost_price || obj.cost || "0",
    quantity: obj.quantity || obj.qty || "0",
    min_stock_level: obj.min_stock_level || obj.min_stock || "10",
    unit: obj.unit || "pcs",
    status: obj.status || "active",
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(["admin", "manager"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "File must be a .csv file" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 10MB" }, { status: 400 });
    }

    const text = await file.text();
    const { headers, rows } = parseCsv(text);

    if (headers.length === 0 || rows.length === 0) {
      return NextResponse.json({ error: "CSV file is empty or invalid" }, { status: 400 });
    }

    // Require at least 'name' and 'sku' columns
    if (!headers.includes("name") || !headers.includes("sku")) {
      return NextResponse.json(
        { error: "CSV must have 'name' and 'sku' columns" },
        { status: 400 }
      );
    }

    const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

    // Preload categories and suppliers for resolution
    const categories = await query<{ id: number; name: string }>("SELECT id, name FROM inv_categories");
    const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

    const suppliers = await query<{ id: number; name: string }>("SELECT id, name FROM inv_suppliers");
    const supplierMap = new Map(suppliers.map((s) => [s.name.toLowerCase(), s.id]));

    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i++) {
      const csvRow = rowToCsvRow(headers, rows[i]);

      if (!csvRow.name || !csvRow.sku) {
        result.errors.push(`Row ${i + 2}: Missing name or sku`);
        result.skipped++;
        continue;
      }

      try {
        // Resolve category
        let categoryId: number | null = null;
        if (csvRow.category_name) {
          categoryId = categoryMap.get(csvRow.category_name.toLowerCase()) ?? null;
          if (!categoryId) {
            // Auto-create category
            const catResult = await execute(
              "INSERT INTO inv_categories (name) VALUES (?)",
              [csvRow.category_name.trim().slice(0, 255)]
            );
            categoryId = catResult.insertId;
            categoryMap.set(csvRow.category_name.toLowerCase(), categoryId);
          }
        }

        // Resolve supplier
        let supplierId: number | null = null;
        if (csvRow.supplier_name) {
          supplierId = supplierMap.get(csvRow.supplier_name.toLowerCase()) ?? null;
        }

        const costPrice = parseFloat(csvRow.cost_price) || 0;
        const quantity = parseInt(csvRow.quantity, 10) || 0;
        const minStock = parseInt(csvRow.min_stock_level, 10) || 10;
        const status = ["active", "inactive", "discontinued"].includes(csvRow.status.toLowerCase())
          ? csvRow.status.toLowerCase()
          : "active";
        const unit = csvRow.unit || "pcs";
        const barcode = csvRow.barcode || csvRow.sku;

        // Upsert by SKU
        const existing = await query<{ id: number }>(
          "SELECT id FROM inv_products WHERE sku = ?",
          [csvRow.sku.trim()]
        );

        if (existing.length > 0) {
          // Update existing product
          await execute(
            `UPDATE inv_products SET
              name = ?, description = ?, barcode = ?,
              category_id = ?, supplier_id = ?,
              cost_price = ?,
              min_stock_level = ?, unit = ?, status = ?,
              updated_at = NOW()
            WHERE id = ?`,
            [
              csvRow.name.trim().slice(0, 255),
              csvRow.description.trim() || null,
              barcode,
              categoryId,
              supplierId,
              costPrice,
              minStock,
              unit,
              status,
              existing[0].id,
            ]
          );
          result.updated++;
        } else {
          // Insert new product
          await execute(
            `INSERT INTO inv_products
              (name, sku, barcode, description, category_id, supplier_id,
               cost_price, quantity, min_stock_level, max_stock_level,
               reorder_point, unit, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 100, 15, ?, ?)`,
            [
              csvRow.name.trim().slice(0, 255),
              csvRow.sku.trim().slice(0, 100),
              barcode,
              csvRow.description.trim() || null,
              categoryId,
              supplierId,
              costPrice,
              quantity,
              minStock,
              unit,
              status,
            ]
          );
          result.imported++;
        }
      } catch (rowError: unknown) {
        const msg = rowError instanceof Error ? rowError.message : "Unknown error";
        result.errors.push(`Row ${i + 2}: ${msg}`);
        result.skipped++;
      }

      // Log progress every batch
      if ((i + 1) % BATCH_SIZE === 0) {
        console.log(`Import progress: ${i + 1}/${rows.length}`);
      }
    }

    await logActivity({
      entity_type: "product",
      action: "import_csv",
      details: `CSV import: ${result.imported} new, ${result.updated} updated, ${result.skipped} skipped`,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("CSV import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
