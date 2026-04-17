import { describe, it, expect, vi, beforeEach } from 'vitest';

// Utility functions for calculations (these would typically be in a utils file but tested here)
export function calculateTotal(items: { quantity: number; price: number }[]): number {
  return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
}

export function calculateStockValue(quantity: number, unitPrice: number): number {
  return quantity * unitPrice;
}

export function calculateMargin(sellingPrice: number, costPrice: number): number {
  if (sellingPrice <= 0) return 0;
  return ((sellingPrice - costPrice) / sellingPrice) * 100;
}

export function calculateOrderTotal(items: { quantity: number; unit_price: number; discount?: number }[]): number {
  return items.reduce((sum, item) => {
    const subtotal = item.quantity * item.unit_price;
    const discount = item.discount || 0;
    return sum + (subtotal - discount);
  }, 0);
}

export function calculateLowStock(quantity: number, minStockLevel: number): boolean {
  return quantity <= minStockLevel;
}

export function calculateStockChange(currentQuantity: number, adjustment: number, type: 'add' | 'subtract' | 'set'): number {
  switch (type) {
    case 'add':
      return currentQuantity + adjustment;
    case 'subtract':
      return Math.max(0, currentQuantity - adjustment);
    case 'set':
      return Math.max(0, adjustment);
    default:
      return currentQuantity;
  }
}

export function formatInventoryValue(products: { quantity: number; unit_price: number }[]): number {
  return products.reduce((total, product) => total + (product.quantity * product.unit_price), 0);
}

export function getStockStatus(quantity: number, minStockLevel: number, maxStockLevel: number): 'low' | 'normal' | 'overstock' {
  if (quantity <= minStockLevel) return 'low';
  if (quantity >= maxStockLevel) return 'overstock';
  return 'normal';
}

describe('Calculation Functions', () => {
  describe('calculateTotal()', () => {
    it('should calculate total for single item', () => {
      const items = [{ quantity: 5, price: 10 }];
      expect(calculateTotal(items)).toBe(50);
    });

    it('should calculate total for multiple items', () => {
      const items = [
        { quantity: 2, price: 10 },
        { quantity: 3, price: 5 },
      ];
      expect(calculateTotal(items)).toBe(35);
    });

    it('should return 0 for empty array', () => {
      expect(calculateTotal([])).toBe(0);
    });

    it('should handle zero quantity', () => {
      const items = [{ quantity: 0, price: 10 }];
      expect(calculateTotal(items)).toBe(0);
    });

    it('should handle decimal prices', () => {
      const items = [{ quantity: 2, price: 10.50 }];
      expect(calculateTotal(items)).toBe(21);
    });
  });

  describe('calculateStockValue()', () => {
    it('should calculate stock value', () => {
      expect(calculateStockValue(100, 5)).toBe(500);
    });

    it('should return 0 for zero quantity', () => {
      expect(calculateStockValue(0, 10)).toBe(0);
    });

    it('should return 0 for zero price', () => {
      expect(calculateStockValue(100, 0)).toBe(0);
    });

    it('should handle decimal values', () => {
      expect(calculateStockValue(10, 9.99)).toBeCloseTo(99.9);
    });
  });

  describe('calculateMargin()', () => {
    it('should calculate margin percentage', () => {
      expect(calculateMargin(100, 70)).toBe(30);
    });

    it('should handle zero cost price', () => {
      expect(calculateMargin(100, 0)).toBe(100);
    });

    it('should return 0 for zero selling price', () => {
      expect(calculateMargin(0, 50)).toBe(0);
    });

    it('should handle negative margin (loss)', () => {
      expect(calculateMargin(80, 100)).toBe(-25);
    });

    it('should return integer percentage', () => {
      expect(calculateMargin(33.33, 25)).toBeCloseTo(24.99, 1);
    });
  });

  describe('calculateOrderTotal()', () => {
    it('should calculate order total without discounts', () => {
      const items = [
        { quantity: 2, unit_price: 10 },
        { quantity: 1, unit_price: 15 },
      ];
      expect(calculateOrderTotal(items)).toBe(35);
    });

    it('should apply discounts correctly', () => {
      const items = [
        { quantity: 2, unit_price: 10, discount: 5 },
        { quantity: 1, unit_price: 15, discount: 0 },
      ];
      expect(calculateOrderTotal(items)).toBe(30);
    });

    it('should handle items with no discount property', () => {
      const items = [
        { quantity: 1, unit_price: 10 },
      ];
      expect(calculateOrderTotal(items)).toBe(10);
    });
  });

  describe('calculateLowStock()', () => {
    it('should return true when quantity equals min stock', () => {
      expect(calculateLowStock(10, 10)).toBe(true);
    });

    it('should return true when quantity is below min stock', () => {
      expect(calculateLowStock(5, 10)).toBe(true);
    });

    it('should return false when quantity is above min stock', () => {
      expect(calculateLowStock(15, 10)).toBe(false);
    });
  });

  describe('calculateStockChange()', () => {
    it('should add to stock', () => {
      expect(calculateStockChange(100, 50, 'add')).toBe(150);
    });

    it('should subtract from stock', () => {
      expect(calculateStockChange(100, 30, 'subtract')).toBe(70);
    });

    it('should not go below zero when subtracting', () => {
      expect(calculateStockChange(10, 50, 'subtract')).toBe(0);
    });

    it('should set stock to exact value', () => {
      expect(calculateStockChange(100, 50, 'set')).toBe(50);
    });

    it('should not set negative stock', () => {
      expect(calculateStockChange(100, -10, 'set')).toBe(0);
    });
  });

  describe('formatInventoryValue()', () => {
    it('should calculate total inventory value', () => {
      const products = [
        { quantity: 10, unit_price: 100 },
        { quantity: 5, unit_price: 50 },
      ];
      expect(formatInventoryValue(products)).toBe(1250);
    });

    it('should return 0 for empty array', () => {
      expect(formatInventoryValue([])).toBe(0);
    });
  });

  describe('getStockStatus()', () => {
    it('should return low when below minimum', () => {
      expect(getStockStatus(5, 10, 100)).toBe('low');
    });

    it('should return normal when between min and max', () => {
      expect(getStockStatus(50, 10, 100)).toBe('normal');
    });

    it('should return overstock when above maximum', () => {
      expect(getStockStatus(150, 10, 100)).toBe('overstock');
    });

    it('should return low when at minimum', () => {
      expect(getStockStatus(10, 10, 100)).toBe('low');
    });

    it('should return overstock when at maximum', () => {
      expect(getStockStatus(100, 10, 100)).toBe('overstock');
    });
  });
});