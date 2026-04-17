// =======================================
// Movement Reference Generator
// Generates date-based sequential reference numbers
// Format: MV-YYYYMMDD-NNNN
// =======================================

/**
 * Generates a movement reference number.
 * @param sequenceNumber - The sequential number for the day (from DB count)
 * @returns Reference string in format MV-YYYYMMDD-NNNN
 */
export function generateMovementReference(sequenceNumber: number): string {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const seqPart = String(sequenceNumber).padStart(4, "0");

  return `MV-${datePart}-${seqPart}`;
}
