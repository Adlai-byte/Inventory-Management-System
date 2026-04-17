import { query } from "./db";

interface LowStockItem {
  id: number;
  name: string;
  quantity: number;
  min_stock_level: number;
}

export async function checkLowStockAlerts(): Promise<void> {
  try {
    const lowStockItems = await query<LowStockItem>(
      `SELECT id, name, quantity, min_stock_level FROM inv_products 
       WHERE quantity <= min_stock_level AND status = 'active'`
    );

    for (const item of lowStockItems) {
      const critical = item.quantity === 0;
      const title = critical 
        ? `Out of Stock: ${item.name}` 
        : `Low Stock: ${item.name}`;
      const message = critical
        ? `${item.name} is out of stock. Immediate restocking required.`
        : `${item.name} has only ${item.quantity} units (min: ${item.min_stock_level}). Consider restocking.`;

      await query(
        `INSERT INTO inv_notifications (user_id, title, message, type, is_read)
         SELECT id, ?, ?, ?, 0 FROM inv_users WHERE role = 'admin'
         LIMIT 1`,
        [title, message, critical ? "error" : "warning"]
      );
    }
  } catch (error) {
    console.error("Low stock alert check failed:", error);
  }
}
