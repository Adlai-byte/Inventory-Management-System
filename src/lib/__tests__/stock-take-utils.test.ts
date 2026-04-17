import { describe, it, expect } from "vitest";
import {
  calculateVariance,
  generateStockTakeName,
  getStockTakeStatusColor,
} from "../stock-take-utils";

describe("calculateVariance", () => {
  it("should return positive variance when counted > system", () => {
    expect(calculateVariance(50, 55)).toBe(5);
  });

  it("should return negative variance when counted < system", () => {
    expect(calculateVariance(50, 45)).toBe(-5);
  });

  it("should return zero when quantities match", () => {
    expect(calculateVariance(50, 50)).toBe(0);
  });

  it("should handle zero system quantity", () => {
    expect(calculateVariance(0, 10)).toBe(10);
  });

  it("should handle zero counted quantity", () => {
    expect(calculateVariance(10, 0)).toBe(-10);
  });

  it("should handle both zero", () => {
    expect(calculateVariance(0, 0)).toBe(0);
  });
});

describe("generateStockTakeName", () => {
  it("should generate name with today's date", () => {
    const name = generateStockTakeName();
    const today = new Date().toISOString().split("T")[0];
    expect(name).toContain(today);
  });

  it("should start with 'Stock Take'", () => {
    const name = generateStockTakeName();
    expect(name).toMatch(/^Stock Take/);
  });

  it("should use custom prefix when provided", () => {
    const name = generateStockTakeName("Weekly Count");
    expect(name).toMatch(/^Weekly Count/);
  });
});

describe("getStockTakeStatusColor", () => {
  it("should return correct colors for each status", () => {
    expect(getStockTakeStatusColor("draft")).toBe("secondary");
    expect(getStockTakeStatusColor("in_progress")).toBe("default");
    expect(getStockTakeStatusColor("completed")).toBe("success");
    expect(getStockTakeStatusColor("cancelled")).toBe("destructive");
  });
});
