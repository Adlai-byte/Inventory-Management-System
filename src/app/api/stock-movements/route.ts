import { NextRequest, NextResponse } from "next/server";
import { simpleQuery, withTransaction, type SqlValue } from "@/lib/db";
import { logActivity } from "@/lib/activity-logger";
import { requireAuth } from "@/lib/route-auth";
import { 
  movementQuerySchema
} from "@/lib/validations/product";
import type { MovementType } from "@/lib/types";
import { generateMovementReference } from "@/lib/movement-reference";

// Movement type categories
const INBOUND_TYPES: MovementType[] = ["restock", "transfer_in", "initial"];
const OUTBOUND_TYPES: MovementType[] = ["transfer_out", "damage", "expired", "loss", "sample", "return_out"];

interface ProductRow {
  id: number;
  name: string;
  quantity: number;
  cost_price: number;
}

interface CreateMovementBody {
  product_id?: string | number;
  type: string;
  quantity?: string | number;
  items?: Array<{
    product_id: string | number;
    quantity: string | number;
  }>;
  reason?: string | null;
  notes?: string | null;
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function parsePositiveInt(value: string | number, fieldName: string): number {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive integer`);
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = movementQuerySchema.safeParse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      search: searchParams.get("search"),
      type: searchParams.get("type"),
      date_from: searchParams.get("date_from"),
      date_to: searchParams.get("date_to"),
    });

    const params = parsed.success ? parsed.data : { page: 1, limit: 25 };
    const { page, limit, search, type, date_from, date_to } = params;

    const offset = (page - 1) * limit;

    let whereClause = "WHERE (p.name LIKE ? OR p.sku LIKE ? OR sm.reason LIKE ?)";
    const queryParams: SqlValue[] = [`%${search || ""}%`, `%${search || ""}%`, `%${search || ""}%`];

    if (type && type !== "all") {
      whereClause += " AND sm.type = ?";
      queryParams.push(type);
    }

    if (date_from) {
      whereClause += " AND DATE(sm.created_at) >= ?";
      queryParams.push(date_from);
    }

    if (date_to) {
      whereClause += " AND DATE(sm.created_at) <= ?";
      queryParams.push(date_to);
    }

    // Get total count for pagination
    const countResult = await simpleQuery<{ total: number }>(
      `SELECT COUNT(*) as total 
       FROM inv_stock_movements sm 
       LEFT JOIN inv_products p ON sm.product_id = p.id
       ${whereClause}`,
      queryParams
    );
    const total = countResult[0]?.total || 0;

    // Get paginated data
    const movements = await simpleQuery(
      `SELECT sm.*, 
        p.name as product_name, 
        p.sku as product_sku,
        u.full_name as created_by_name
       FROM inv_stock_movements sm
       LEFT JOIN inv_products p ON sm.product_id = p.id
       LEFT JOIN inv_users u ON sm.created_by = u.id
       ${whereClause}
       ORDER BY sm.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    return NextResponse.json({
      data: movements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Stock movements GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as CreateMovementBody;
    const { product_id, type, quantity, items, reason, notes } = body;

    // Validate movement type
    const validatedType = type as MovementType;
    
    // Build items array
    let normalizedItems: { productId: number; qty: number }[] = [];

    if (items && items.length > 0) {
      normalizedItems = items.map((item, index) => ({
        productId: parsePositiveInt(item.product_id, `Product ID ${index + 1}`),
        qty: parsePositiveInt(item.quantity, `Quantity ${index + 1}`),
      }));
    } else if (product_id !== undefined && quantity !== undefined) {
      normalizedItems = [{
        productId: parsePositiveInt(product_id, "Product ID"),
        qty: parsePositiveInt(quantity, "Quantity"),
      }];
    }

    if (normalizedItems.length === 0) {
      return NextResponse.json({ error: "At least one product and quantity are required" }, { status: 400 });
    }

    // Require reason for ALL stock reductions (BIR compliance)
    if (OUTBOUND_TYPES.includes(validatedType) && !reason?.trim()) {
      return NextResponse.json({ 
        error: "A reason is required for all stock reductions (damage, loss, expired, transfer out, etc.)" 
      }, { status: 400 });
    }

    const result = await withTransaction(async (connection) => {
      const createdIds: number[] = [];
      const productNames: string[] = [];
      const references: string[] = [];

      // Generate a movement reference for this batch
      const [countResult] = await connection.execute(
        "SELECT COUNT(*) as cnt FROM inv_stock_movements WHERE DATE(created_at) = CURDATE()"
      );
      const todayCount = (countResult as [{ cnt: number }])[0]?.cnt || 0;
      const movementRef = generateMovementReference(todayCount + 1);

      for (const item of normalizedItems) {
        // Get product with lock
        const [productRows] = await connection.execute(
          "SELECT id, name, quantity, cost_price FROM inv_products WHERE id = ? FOR UPDATE",
          [item.productId]
        );
        const products = productRows as ProductRow[];
        const product = products[0];

        if (!product) {
          throw new HttpError(404, "Product not found");
        }

        const previousQuantity = product.quantity;
        let newQuantity: number;

        // Calculate new quantity based on movement type
        if (INBOUND_TYPES.includes(validatedType)) {
          newQuantity = previousQuantity + item.qty;
        } else if (OUTBOUND_TYPES.includes(validatedType)) {
          if (previousQuantity < item.qty) {
            throw new HttpError(400, `Insufficient stock for ${product.name}. Current: ${previousQuantity}`);
          }
          newQuantity = previousQuantity - item.qty;
        } else {
          // Adjustment - set absolute quantity
          newQuantity = item.qty;
        }

        // Update product quantity
        await connection.execute(
          "UPDATE inv_products SET quantity = ? WHERE id = ?",
          [newQuantity, item.productId]
        );

        // Record movement with reference
        const [insertResult] = await connection.execute(
          `INSERT INTO inv_stock_movements 
           (product_id, type, reference, quantity, reason, previous_quantity, new_quantity, unit_cost, notes, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.productId, 
            validatedType, 
            movementRef,
            item.qty, 
            reason || null, 
            previousQuantity, 
            newQuantity, 
            product.cost_price, 
            notes || null, 
            auth.id
          ]
        );

        const resultHeader = insertResult as { insertId: number };
        createdIds.push(resultHeader.insertId);
        productNames.push(product.name);
        references.push(movementRef);
      }

      return {
        createdIds,
        productNames,
        references,
        count: normalizedItems.length,
      };
    });

    // Log activity
    await logActivity({
      entity_type: "stock_movement",
      action: validatedType,
      details: result.count === 1
        ? `Recorded ${validatedType} of ${normalizedItems[0].qty} units for ${result.productNames[0]}`
        : `Recorded ${validatedType} batch for ${result.count} products`,
      entity_id: result.createdIds[0],
    });

    return NextResponse.json({
      ids: result.createdIds,
      references: result.references,
      message: result.count === 1 ? `Stock movement recorded (${result.references[0]})` : `${result.count} stock movements recorded (${result.references[0]})`,
    });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Stock movements POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
