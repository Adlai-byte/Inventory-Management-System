import { query } from "./db";
import { getSession } from "./auth";

export type EntityType =
  | "product"
  | "category"
  | "supplier"
  | "warehouse"
  | "stock_movement"
  | "stock_take"
  | "purchase_order"
  | "user"
  | "auth"
  | "system";

export type ActionType =
  | "created"
  | "updated"
  | "deleted"
  | "viewed"
  | "logged_in"
  | "logged_out"
  | "scanned"
  | "approved"
  | "rejected"
  | "received"
  | "cancelled"
  | "completed"
  // Stock movement types
  | "restock"
  | "transfer_in"
  | "transfer_out"
  | "damage"
  | "expired"
  | "loss"
  | "adjustment"
  | "sample"
  | "return_out"
  | "initial"
  | string;

export interface LogParams {
  entity_type: EntityType;
  action: ActionType;
  details: string;
  entity_id?: number | null;
}

export async function logActivity(params: LogParams): Promise<void> {
  try {
    const session = await getSession();
    const userId = session?.id ?? null;

    await query(
      `INSERT INTO inv_activity_log (user_id, entity_type, action, details, entity_id)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, params.entity_type, params.action, params.details, params.entity_id ?? null]
    );
  } catch (error) {
    // Never throw — logging is non-critical
    console.error("Failed to log activity:", error);
  }
}

export function formatLogDetails(action: ActionType, entity: string, name: string, details?: string): string {
  const actionText: Record<string, string> = {
    created: `Created ${entity}: ${name}`,
    updated: `Updated ${entity}: ${name}`,
    deleted: `Deleted ${entity}: ${name}`,
    restock: `Restocked ${entity}: ${name}`,
    damage: `Recorded damage for ${entity}: ${name}`,
    expired: `Marked expired ${entity}: ${name}`,
    loss: `Recorded loss for ${entity}: ${name}`,
    adjustment: `Adjusted stock for ${entity}: ${name}`,
    transfer_in: `Transferred in ${entity}: ${name}`,
    transfer_out: `Transferred out ${entity}: ${name}`,
    sample: `Recorded sample for ${entity}: ${name}`,
    return_out: `Returned ${entity}: ${name}`,
  };

  const baseText = actionText[action] || `${action} ${entity}: ${name}`;
  if (details) {
    return `${baseText} - ${details}`;
  }
  return baseText;
}
