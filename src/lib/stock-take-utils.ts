// =======================================
// Stock Take Utility Functions
// =======================================

/**
 * Calculates variance between system quantity and counted quantity.
 * Positive = surplus, Negative = shortage, Zero = matched.
 */
export function calculateVariance(systemQty: number, countedQty: number): number {
  return countedQty - systemQty;
}

/**
 * Generates a default name for a stock take session.
 * Format: "Stock Take YYYY-MM-DD"
 */
export function generateStockTakeName(prefix: string = "Stock Take"): string {
  const today = new Date().toISOString().split("T")[0];
  return `${prefix} ${today}`;
}

/**
 * Returns badge variant for stock take status.
 */
export function getStockTakeStatusColor(
  status: "draft" | "in_progress" | "completed" | "cancelled"
): "default" | "secondary" | "destructive" | "success" | "outline" {
  switch (status) {
    case "draft": return "secondary";
    case "in_progress": return "default";
    case "completed": return "success";
    case "cancelled": return "destructive";
    default: return "outline";
  }
}
