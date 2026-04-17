import { describe, it, expect } from "vitest";
import { getDaysUntilExpiry, getExpiryStatus, formatDaysUntilExpiry } from "../expiry";

describe("Expiry Date Utilities", () => {
  const today = new Date().toISOString().split("T")[0];
  const todayDate = new Date(today);

  function setDateDaysFromToday(days: number): string {
    const date = new Date(todayDate);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  }

  describe("getDaysUntilExpiry", () => {
    it("should return null for null", () => {
      expect(getDaysUntilExpiry(null)).toBeNull();
    });

    it("should return null for undefined", () => {
      expect(getDaysUntilExpiry(undefined)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(getDaysUntilExpiry("")).toBeNull();
    });

    it("should return 0 for today", () => {
      expect(getDaysUntilExpiry(today)).toBe(0);
    });

    it("should return positive days for future", () => {
      expect(getDaysUntilExpiry(setDateDaysFromToday(10))).toBe(10);
    });

    it("should return negative days for past", () => {
      expect(getDaysUntilExpiry(setDateDaysFromToday(-5))).toBe(-5);
    });
  });

  describe("getExpiryStatus", () => {
    it("should return none when no expiry date", () => {
      expect(getExpiryStatus(null)).toBe("none");
      expect(getExpiryStatus(undefined)).toBe("none");
      expect(getExpiryStatus("")).toBe("none");
    });

    it("should return expired for past dates", () => {
      expect(getExpiryStatus(setDateDaysFromToday(-1))).toBe("expired");
    });

    it("should return critical for expiry within 7 days", () => {
      expect(getExpiryStatus(setDateDaysFromToday(7))).toBe("critical");
      expect(getExpiryStatus(setDateDaysFromToday(1))).toBe("critical");
    });

    it("should return warning for expiry within 30 days", () => {
      expect(getExpiryStatus(setDateDaysFromToday(8))).toBe("warning");
      expect(getExpiryStatus(setDateDaysFromToday(30))).toBe("warning");
    });

    it("should return safe for expiry beyond 30 days", () => {
      expect(getExpiryStatus(setDateDaysFromToday(31))).toBe("safe");
      expect(getExpiryStatus(setDateDaysFromToday(365))).toBe("safe");
    });
  });

  describe("formatDaysUntilExpiry", () => {
    it("should return — for no expiry", () => {
      expect(formatDaysUntilExpiry(null)).toBe("—");
    });

    it("should return days ago for expired", () => {
      expect(formatDaysUntilExpiry(setDateDaysFromToday(-5))).toBe("5d ago");
    });

    it("should return Today for today", () => {
      expect(formatDaysUntilExpiry(today)).toBe("Today");
    });

    it("should return Tomorrow for tomorrow", () => {
      expect(formatDaysUntilExpiry(setDateDaysFromToday(1))).toBe("Tomorrow");
    });

    it("should return days for future", () => {
      expect(formatDaysUntilExpiry(setDateDaysFromToday(10))).toBe("10d");
    });
  });
});