/**
 * Input sanitization utilities for security hardening.
 * These functions should be used to sanitize user input before
 * it reaches database queries or HTML output.
 */

/**
 * Sanitize a string for safe SQL parameter usage.
 * While parameterized queries prevent SQL injection, this adds
 * an extra layer by stripping dangerous characters.
 */
export function sanitizeSqlInput(input: string | null | undefined, maxLength = 1000): string {
  if (!input) return "";
  const trimmed = input.trim().slice(0, maxLength);
  // Remove null bytes and control characters except newlines/tabs
  return trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Sanitize a string for safe HTML output (basic XSS prevention).
 */
export function sanitizeHtmlInput(input: string | null | undefined, maxLength = 500): string {
  if (!input) return "";
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Validate and sanitize an integer within a range.
 */
export function sanitizeInt(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number | null {
  const num = Number(value);
  if (!Number.isInteger(num) || num < min || num > max) return null;
  return num;
}

/**
 * Validate and sanitize a positive integer (e.g. for IDs).
 */
export function sanitizeId(value: unknown): number | null {
  return sanitizeInt(value, 1, 2147483647);
}

/**
 * Sanitize a pagination page number.
 */
export function sanitizePage(value: unknown, defaultPage = 1): number {
  const num = sanitizeInt(value, 1, 10000);
  return num ?? defaultPage;
}

/**
 * Sanitize a pagination limit.
 */
export function sanitizeLimit(value: unknown, defaultLimit = 25): number {
  const num = sanitizeInt(value, 1, 100);
  return num ?? defaultLimit;
}

/**
 * Validate an enum value, returning a default if invalid.
 */
export function sanitizeEnum<T extends string>(
  value: unknown,
  allowedValues: T[],
  defaultValue: T
): T {
  if (typeof value !== "string") return defaultValue;
  return (allowedValues as string[]).includes(value) ? (value as T) : defaultValue;
}

/**
 * Sanitize a search query string.
 */
export function sanitizeSearch(value: unknown, maxLength = 100): string {
  if (typeof value !== "string") return "";
  return sanitizeSqlInput(value.trim(), maxLength);
}

/**
 * Validate an email address format.
 */
export function sanitizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().slice(0, 255);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email : null;
}
