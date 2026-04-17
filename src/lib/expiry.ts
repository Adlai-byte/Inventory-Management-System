export function getDaysUntilExpiry(expiryDate: string | null | undefined): number | null {
  if (!expiryDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export type ExpiryStatus = "expired" | "critical" | "warning" | "safe" | "none";

export function getExpiryStatus(expiryDate: string | null | undefined): ExpiryStatus {
  const days = getDaysUntilExpiry(expiryDate);
  
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  return "safe";
}

export function formatDaysUntilExpiry(expiryDate: string | null | undefined): string {
  const days = getDaysUntilExpiry(expiryDate);
  
  if (days === null) return "—";
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days}d`;
}