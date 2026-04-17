import { describe, it, expect, vi, beforeEach } from 'vitest';

// Validation functions
export function validateEmail(email: string): boolean {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  if (!phone) return true; // Phone is optional
  const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
  return phoneRegex.test(phone);
}

export function validateRequired(value: string | number | undefined | null): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return value >= 0;
  return value !== undefined && value !== null;
}

export function validatePositiveNumber(value: number): boolean {
  return typeof value === 'number' && value > 0;
}

export function validateQuantity(quantity: number, min: number = 0, max?: number): boolean {
  if (typeof quantity !== 'number' || quantity < min) return false;
  if (max !== undefined && quantity > max) return false;
  return true;
}

export function validatePrice(price: number): boolean {
  return typeof price === 'number' && price >= 0 && Number.isFinite(price);
}

export function validateSKU(sku: string): boolean {
  if (!sku) return false;
  return sku.length >= 3 && sku.length <= 50;
}

export function validateBarcode(barcode: string): boolean {
  if (!barcode) return true; // Barcode is optional
  return barcode.length >= 4 && barcode.length <= 50;
}

export function validateDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
}

export function validateStockMovementType(type: string): boolean {
  return ['inbound', 'outbound', 'adjustment'].includes(type);
}

export function validateProductStatus(status: string): boolean {
  return ['active', 'inactive', 'discontinued'].includes(status);
}

export function validateOrderStatus(status: string): boolean {
  return ['received'].includes(status);
}

describe('Validation Functions', () => {
  describe('validateEmail()', () => {
    it('should return true for valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    it('should return true for empty email (optional)', () => {
      expect(validateEmail('')).toBe(true);
    });

    it('should return true for null email (optional)', () => {
      expect(validateEmail(null as any)).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });

    it('should handle email with subdomain', () => {
      expect(validateEmail('test@mail.example.com')).toBe(true);
    });
  });

  describe('validatePhone()', () => {
    it('should return true for valid phone', () => {
      expect(validatePhone('1234567890')).toBe(true);
      expect(validatePhone('+1 234 567 8901')).toBe(true);
      expect(validatePhone('123-456-7890')).toBe(true);
    });

    it('should return true for empty phone (optional)', () => {
      expect(validatePhone('')).toBe(true);
    });

    it('should return false for too short phone', () => {
      expect(validatePhone('123')).toBe(false);
    });
  });

  describe('validateRequired()', () => {
    it('should return true for non-empty string', () => {
      expect(validateRequired('test')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(validateRequired('')).toBe(false);
    });

    it('should return false for whitespace only', () => {
      expect(validateRequired('   ')).toBe(false);
    });

    it('should return true for positive number', () => {
      expect(validateRequired(10)).toBe(true);
    });

    it('should return false for negative number', () => {
      expect(validateRequired(-1)).toBe(false);
    });

    it('should return false for null', () => {
      expect(validateRequired(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validateRequired(undefined)).toBe(false);
    });
  });

  describe('validatePositiveNumber()', () => {
    it('should return true for positive number', () => {
      expect(validatePositiveNumber(10)).toBe(true);
    });

    it('should return false for zero', () => {
      expect(validatePositiveNumber(0)).toBe(false);
    });

    it('should return false for negative number', () => {
      expect(validatePositiveNumber(-5)).toBe(false);
    });

    it('should return false for string', () => {
      expect(validatePositiveNumber('10' as any)).toBe(false);
    });
  });

  describe('validateQuantity()', () => {
    it('should validate quantity within range', () => {
      expect(validateQuantity(10, 0, 100)).toBe(true);
    });

    it('should return false for quantity below minimum', () => {
      expect(validateQuantity(-1, 0)).toBe(false);
    });

    it('should return false for quantity above maximum', () => {
      expect(validateQuantity(150, 0, 100)).toBe(false);
    });

    it('should handle no max constraint', () => {
      expect(validateQuantity(1000, 0)).toBe(true);
    });

    it('should validate at boundary values', () => {
      expect(validateQuantity(0, 0)).toBe(true);
      expect(validateQuantity(100, 0, 100)).toBe(true);
    });
  });

  describe('validatePrice()', () => {
    it('should return true for valid price', () => {
      expect(validatePrice(10.99)).toBe(true);
    });

    it('should return true for zero price', () => {
      expect(validatePrice(0)).toBe(true);
    });

    it('should return false for negative price', () => {
      expect(validatePrice(-10)).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(validatePrice(Infinity)).toBe(false);
    });

    it('should return false for NaN', () => {
      expect(validatePrice(NaN)).toBe(false);
    });
  });

  describe('validateSKU()', () => {
    it('should return true for valid SKU', () => {
      expect(validateSKU('PRD-001')).toBe(true);
      expect(validateSKU('ABC123')).toBe(true);
    });

    it('should return false for empty SKU', () => {
      expect(validateSKU('')).toBe(false);
    });

    it('should return false for too short SKU', () => {
      expect(validateSKU('AB')).toBe(false);
    });

    it('should return false for too long SKU', () => {
      expect(validateSKU('A'.repeat(51))).toBe(false);
    });
  });

  describe('validateBarcode()', () => {
    it('should return true for valid barcode', () => {
      expect(validateBarcode('1234567890')).toBe(true);
    });

    it('should return true for empty barcode (optional)', () => {
      expect(validateBarcode('')).toBe(true);
    });

    it('should return false for too short barcode', () => {
      expect(validateBarcode('123')).toBe(false);
    });
  });

  describe('validateDateRange()', () => {
    it('should return true for valid date range', () => {
      expect(validateDateRange('2026-01-01', '2026-12-31')).toBe(true);
    });

    it('should return false for invalid date range', () => {
      expect(validateDateRange('2026-12-31', '2026-01-01')).toBe(false);
    });

    it('should return true for same date', () => {
      expect(validateDateRange('2026-04-10', '2026-04-10')).toBe(true);
    });
  });

  describe('validateStockMovementType()', () => {
    it('should return true for valid types', () => {
      expect(validateStockMovementType('inbound')).toBe(true);
      expect(validateStockMovementType('outbound')).toBe(true);
      expect(validateStockMovementType('adjustment')).toBe(true);
    });

    it('should return false for invalid type', () => {
      expect(validateStockMovementType('invalid')).toBe(false);
      expect(validateStockMovementType('')).toBe(false);
    });
  });

  describe('validateProductStatus()', () => {
    it('should return true for valid status', () => {
      expect(validateProductStatus('active')).toBe(true);
      expect(validateProductStatus('inactive')).toBe(true);
      expect(validateProductStatus('discontinued')).toBe(true);
    });

    it('should return false for invalid status', () => {
      expect(validateProductStatus('invalid')).toBe(false);
    });
  });

  describe('validateOrderStatus()', () => {
    it('should return true for valid status', () => {
      expect(validateOrderStatus('received')).toBe(true);
    });

    it('should return false for invalid status', () => {
      expect(validateOrderStatus('invalid')).toBe(false);
    });
  });
});
