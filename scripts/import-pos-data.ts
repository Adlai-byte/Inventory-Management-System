/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Import products from old POS backup (03_31_2026 Backup.sql)
 * Uses streaming to handle the 338MB file efficiently.
 * 
 * Maps: product_category → inv_categories, supplier → inv_suppliers,
 *        products → inv_products, product_prices → retail_price
 * 
 * Usage: npx tsx scripts/import-pos-data.ts
 */

import mysql from "mysql2/promise";
import * as fs from "fs";
import * as readline from "readline";
import * as path from "path";

// Load .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
    const [key, ...val] = line.split("=");
    if (key && val.length > 0) process.env[key.trim()] = val.join("=").trim();
  });
}

const ask = (p: string) => new Promise<string>((r) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(p, (a) => { rl.close(); r(a); });
});

const autoYes = process.argv.includes("--yes");

async function question(p: string): Promise<string> {
  if (autoYes) { console.log(p + "yes"); return "yes"; }
  return ask(p);
}

function decodeHtml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#x27;/g, "'");
}

function clean(s: string | null | undefined): string {
  if (!s) return "";
  return decodeHtml(s.trim()).replace(/\s+/g, " ");
}

// Parse a single SQL value row into an array of string fields
// Handles quoted strings with escaped quotes inside
function parseSqlRow(line: string): string[] | null {
  const trimmed = line.trim().replace(/,\s*$/, "");
  if (!trimmed.startsWith("(") || !trimmed.endsWith(")")) return null;
  
  const inner = trimmed.slice(1, -1);
  const fields: string[] = [];
  let current = "";
  let inStr = false;
  let escaped = false;
  let depth = 0;

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (escaped) { current += ch; escaped = false; continue; }
    if (ch === "\\") { escaped = true; current += ch; continue; }
    if (ch === "'") { inStr = !inStr; continue; }
    if (ch === "(" && !inStr) { depth++; current += ch; continue; }
    if (ch === ")" && !inStr) { depth--; current += ch; continue; }
    if (ch === "," && !inStr && depth === 0) { fields.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

async function main() {
  console.log("=".repeat(60));
  console.log("POS Data Import → BIR-Compliant Inventory System");
  console.log("=".repeat(60));

  const backupFile = path.join(process.cwd(), "sql", "03_31_2026 Backup.sql");
  if (!fs.existsSync(backupFile)) {
    console.error("Backup file not found!");
    process.exit(1);
  }
  const fileSizeMB = (fs.statSync(backupFile).size / 1024 / 1024).toFixed(1);
  console.log(`\nBackup: ${fileSizeMB} MB`);

  const confirm = await question("\nImport POS data into current database? (yes/no): ");
  if (confirm !== "yes") { console.log("Cancelled."); process.exit(0); }

  // ── Phase 1: Parse data from backup file using streaming ──
  
  const categoryMap = new Map<number, string>();
  const supplierMap = new Map<number, { name: string; phone: string; email: string; address: string }>();
  const priceMap = new Map<number, number>();
  const products: Array<{
    id: number; code: string; category_id: number; supplier_id: number;
    name: string; description: string; cost_per_unit: number; quantity: number;
    alert_quantity: number; product_status_id: number; measurement: string;
    invisible: number; default_product: number;
  }> = [];

  let section = ""; // which table we're currently reading

  console.log("\nParsing backup file (streaming)...\n");

  await new Promise<void>((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(backupFile, { encoding: "latin1" }),
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      const trimmed = line.trim();

      // Detect table sections by their INSERT headers
      if (trimmed.startsWith("insert  into `product_category`")) { section = "category"; return; }
      if (trimmed.startsWith("insert  into `supplier`") && trimmed.includes("values")) { section = "supplier"; return; }
      if (trimmed.startsWith("insert  into `product_prices`")) { section = "prices"; return; }
      if (trimmed.startsWith("insert  into `products`(")) { section = "products"; return; }
      
      // End of insert block
      if (trimmed.startsWith("/*Table structure") || trimmed.startsWith("/*!")) { section = ""; return; }
      if (trimmed.endsWith(";")) {
        // Process last line of current section (strip the semicolon)
        const cleaned = trimmed.replace(/;\s*$/, "");
        if (section === "category") parseCategoryLine(cleaned);
        else if (section === "supplier") parseSupplierLine(cleaned);
        else if (section === "prices") parsePriceLine(cleaned);
        else if (section === "products") parseProductLine(cleaned);
        section = "";
        return;
      }

      // Process line in section
      if (!trimmed.startsWith("(")) return;
      if (section === "category") parseCategoryLine(trimmed);
      else if (section === "supplier") parseSupplierLine(trimmed);
      else if (section === "prices") parsePriceLine(trimmed);
      else if (section === "products") parseProductLine(trimmed);
    });

    rl.on("close", resolve);
    rl.on("error", reject);
  });

  function parseCategoryLine(line: string) {
    const fields = parseSqlRow(line);
    if (!fields || fields.length < 8) return;
    const id = parseInt(fields[0]);
    const name = clean(fields[1]);
    const active = parseInt(fields[7] || "1");
    if (name && active === 1 && name !== "Stocks") categoryMap.set(id, name);
  }

  function parseSupplierLine(line: string) {
    const fields = parseSqlRow(line);
    if (!fields || fields.length < 10) return;
    const id = parseInt(fields[0]);
    if (!id) return;
    supplierMap.set(id, {
      name: clean(fields[1]) || `Supplier ${id}`,
      phone: clean(fields[3] || fields[2] || ""),
      email: clean(fields[4] || ""),
      address: clean(fields[5] || "").replace(/\\n/g, " ").replace(/\s+/g, " "),
    });
  }

  function parsePriceLine(line: string) {
    const fields = parseSqlRow(line);
    if (!fields || fields.length < 5) return;
    const productId = parseInt(fields[1]);
    const priceTypeId = parseInt(fields[2]);
    const price = parseFloat(fields[3]);
    if (priceTypeId === 1 && productId > 0) priceMap.set(productId, price);
  }

  function parseProductLine(line: string) {
    const fields = parseSqlRow(line);
    if (!fields || fields.length < 20) return;

    const id = parseInt(fields[0]);
    const name = clean(fields[5]);
    if (!name) return;

    const productStatusId = parseInt(fields[17] || "1");
    const invisible = parseInt(fields[36] || "0");
    const defaultProduct = parseInt(fields[37] || "0");

    // Skip system/non-product items
    if (defaultProduct === 1 || invisible === 1) return;
    if (["Gift Card", "CHARGE PAYMENT", "RELOAD GIFT CARD", "SERVICE CHARGE", "Prepayment", "Item Setup"].includes(name)) return;

    products.push({
      id,
      code: clean(fields[1]),
      category_id: parseInt(fields[3] || "0"),
      supplier_id: parseInt(fields[4] || "0"),
      name,
      description: clean(fields[6]),
      cost_per_unit: parseFloat(fields[11] || "0"),
      quantity: Math.max(0, Math.round(parseFloat(fields[12] || "0"))),
      alert_quantity: Math.max(0, Math.round(parseFloat(fields[14] || "0"))),
      product_status_id: productStatusId,
      measurement: clean(fields[7] || "pcs") || "pcs",
      invisible,
      default_product: defaultProduct,
    });
  }

  const activeProducts = products.filter(p => p.product_status_id === 1);

  console.log(`  Categories:    ${categoryMap.size}`);
  console.log(`  Suppliers:     ${supplierMap.size}`);
  console.log(`  Retail prices: ${priceMap.size}`);
  console.log(`  Products:      ${activeProducts.length} active / ${products.length} total`);

  const go = await question("\nProceed with import? (yes/no): ");
  if (go !== "yes") { console.log("Cancelled."); process.exit(0); }

  // ── Phase 2: Import into database ──

  const host = process.env.MYSQL_HOST || "localhost";
  const port = parseInt(process.env.MYSQL_PORT || "3306");
  const user = process.env.MYSQL_USER || "root";
  const password = process.env.MYSQL_PASSWORD || "";
  const database = process.env.MYSQL_DATABASE || "bmm_db";

  const conn = await mysql.createConnection({ host, port, user, password, database });
  console.log("\n✓ Connected to database\n");
  await conn.execute("SET FOREIGN_KEY_CHECKS = 0");

  // Import categories
  console.log("Importing categories...");
  const categoryIdMap = new Map<number, number>();
  let catCount = 0;
  for (const [oldId, name] of categoryMap) {
    try {
      const [res] = await conn.execute("INSERT INTO inv_categories (name, description) VALUES (?, ?)", [name, `Migrated category`]);
      categoryIdMap.set(oldId, (res as mysql.ResultSetHeader).insertId);
      catCount++;
    } catch {}
  }
  console.log(`  ✓ ${catCount} categories`);

  // Import suppliers
  console.log("Importing suppliers...");
  const supplierIdMap = new Map<number, number>();
  let supCount = 0;
  for (const [oldId, sup] of supplierMap) {
    try {
      const [res] = await conn.execute(
        "INSERT INTO inv_suppliers (name, email, phone, address, notes) VALUES (?, ?, ?, ?, ?)",
        [sup.name, sup.email || null, sup.phone || null, sup.address || null, "Migrated from POS"]
      );
      supplierIdMap.set(oldId, (res as mysql.ResultSetHeader).insertId);
      supCount++;
    } catch {}
  }
  console.log(`  ✓ ${supCount} suppliers`);

  // Import products
  console.log("Importing products...");
  let prodCount = 0;
  let moveCount = 0;
  let skipped = 0;

  for (const product of activeProducts) {
    try {
      const retailPrice = priceMap.get(product.id) || Math.round(product.cost_per_unit * 1.5 * 100) / 100;
      const newCatId = categoryIdMap.get(product.category_id) || null;
      const newSupId = supplierIdMap.get(product.supplier_id) || null;
      const sku = product.code || `PRD-${String(product.id).padStart(5, "0")}`;
      const barcode = product.code && product.code.length > 3 ? product.code : null;

      const [res] = await conn.execute(
        `INSERT INTO inv_products 
         (name, sku, description, category_id, supplier_id, cost_price, 
          quantity, min_stock_level, max_stock_level, reorder_point, barcode, unit, status, warehouse_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.name, sku, product.description || null,
          newCatId, newSupId,
          product.cost_per_unit || 0,
          product.quantity,
          product.alert_quantity || 10, 1000,
          Math.ceil((product.alert_quantity || 10) * 1.5),
          barcode, product.measurement || "pcs",
          "active", 1,
        ]
      ) as any;

      const newId = (res as mysql.ResultSetHeader).insertId;

      // Record initial stock movement
      if (product.quantity > 0) {
        await conn.execute(
          `INSERT INTO inv_stock_movements 
           (product_id, type, quantity, reason, previous_quantity, new_quantity, unit_cost, notes, created_by)
           VALUES (?, 'initial', ?, 'Migrated from POS system', 0, ?, ?, ?, 1)`,
          [newId, product.quantity, product.quantity, product.cost_per_unit || 0, `Initial stock from POS migration`]
        );
        moveCount++;
      }

      prodCount++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("ER_DUP_ENTRY")) {
        skipped++;
      } else {
        console.log(`    Skipped "${product.name}": ${msg.substring(0, 80)}`);
        skipped++;
      }
    }

    if (prodCount % 500 === 0) {
      process.stdout.write(`\r  Progress: ${prodCount}/${activeProducts.length} imported`);
    }
  }

  console.log(`\n  ✓ ${prodCount} products imported`);
  console.log(`  ✓ ${moveCount} initial stock movements`);
  if (skipped > 0) console.log(`  ⚠ ${skipped} skipped (duplicates/errors)`);

  await conn.execute("SET FOREIGN_KEY_CHECKS = 1");

  // Verify
  console.log("\n" + "=".repeat(60));
  console.log("Verification:");

  const [[catV]] = (await conn.execute("SELECT COUNT(*) as c FROM inv_categories")) as any;
  console.log(`  Categories:        ${(catV as {c:number}).c}`);

  const [[supV]] = (await conn.execute("SELECT COUNT(*) as c FROM inv_suppliers")) as any;
  console.log(`  Suppliers:         ${(supV as {c:number}).c}`);

  const [[prodV]] = (await conn.execute("SELECT COUNT(*) as c FROM inv_products WHERE status='active'")) as any;
  console.log(`  Active products:   ${(prodV as {c:number}).c}`);

  const [[stockV]] = (await conn.execute("SELECT SUM(quantity) as c FROM inv_products")) as any;
  console.log(`  Total stock units: ${(stockV as {c:number}).c || 0}`);

  const [[valueV]] = (await conn.execute("SELECT SUM(quantity * cost_price) as c FROM inv_products")) as any;
  console.log(`  Cost value:        ₱${((valueV as {c:number}).c || 0).toLocaleString()}`);

  const [[moveV]] = (await conn.execute("SELECT COUNT(*) as c FROM inv_stock_movements")) as any;
  console.log(`  Stock movements:   ${(moveV as {c:number}).c}`);

  await conn.end();
  console.log("\n" + "=".repeat(60));
  console.log("✓ IMPORT COMPLETE!");
  console.log("=".repeat(60));
}

main().catch((err) => { console.error("Failed:", err); process.exit(1); });
