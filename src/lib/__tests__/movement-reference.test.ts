import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateMovementReference } from "../movement-reference";

describe("generateMovementReference", () => {
  beforeEach(() => {
    // Mock Date to a fixed date for consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T10:30:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should generate reference in MV-YYYYMMDD-NNNN format", () => {
    const ref = generateMovementReference(1);
    expect(ref).toMatch(/^MV-\d{8}-\d{4}$/);
  });

  it("should include today's date in the reference", () => {
    const ref = generateMovementReference(1);
    expect(ref).toContain("20260416");
  });

  it("should pad sequence number to 4 digits", () => {
    const ref = generateMovementReference(5);
    expect(ref).toBe("MV-20260416-0005");
  });

  it("should handle sequence number 1", () => {
    const ref = generateMovementReference(1);
    expect(ref).toBe("MV-20260416-0001");
  });

  it("should handle large sequence numbers", () => {
    const ref = generateMovementReference(9999);
    expect(ref).toBe("MV-20260416-9999");
  });

  it("should handle sequence number beyond 4 digits", () => {
    const ref = generateMovementReference(10000);
    expect(ref).toBe("MV-20260416-10000");
  });

  it("should produce different references for different dates", () => {
    vi.setSystemTime(new Date("2026-12-25T00:00:00Z"));
    const ref = generateMovementReference(1);
    expect(ref).toBe("MV-20261225-0001");
  });

  it("should produce unique references when sequence differs", () => {
    const ref1 = generateMovementReference(1);
    const ref2 = generateMovementReference(2);
    expect(ref1).not.toBe(ref2);
  });
});
