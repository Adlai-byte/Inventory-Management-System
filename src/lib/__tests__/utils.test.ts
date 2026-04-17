import { describe, it, expect } from 'vitest';
import { formatCurrency, generateSKU } from '../utils';

describe('utils', () => {
  describe('formatCurrency', () => {
    it('should format numbers as PHP currency', () => {
      expect(formatCurrency(100)).toContain('₱100.00');
      expect(formatCurrency(1234.56)).toContain('₱1,234.56');
    });
  });

  describe('generateSKU', () => {
    it('should generate a string starting with the prefix', () => {
      const sku = generateSKU('TEST');
      expect(sku).toMatch(/^TEST-/);
    });

    it('should be unique enough', () => {
      const sku1 = generateSKU();
      const sku2 = generateSKU();
      expect(sku1).not.toBe(sku2);
    });
  });
});
