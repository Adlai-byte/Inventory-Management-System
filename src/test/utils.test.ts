import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime, generateSKU, cn } from '@/lib/utils';

// Mock date-fns to avoid time-dependent tests
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    format: vi.fn((date: Date, formatStr: string) => {
      const d = new Date(date);
      if (formatStr === 'MMM dd, yyyy') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
      }
      if (formatStr === 'MMM dd, yyyy HH:mm') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
      return '';
    }),
    formatDistanceToNow: vi.fn((date: Date) => {
      const now = new Date();
      const diff = now.getTime() - new Date(date).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return 'just now';
      if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }),
  };
});

describe('utils.ts', () => {
  describe('cn() - Class Name Merger', () => {
    it('should merge class names', () => {
      const result = cn('foo', 'bar');
      expect(result).toContain('foo');
      expect(result).toContain('bar');
    });

    it('should handle conditional classes', () => {
      const result = cn('foo', false && 'bar', 'baz');
      expect(result).toContain('foo');
      expect(result).toContain('baz');
      expect(result).not.toContain('bar');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle array input', () => {
      const result = cn(['foo', 'bar']);
      expect(result).toContain('foo');
      expect(result).toContain('bar');
    });
  });

  describe('formatCurrency()', () => {
    it('should format positive number as PHP currency', () => {
      const result = formatCurrency(1000);
      expect(result).toContain('₱');
      expect(result).toContain('1,000');
    });

    it('should format zero correctly', () => {
      const result = formatCurrency(0);
      expect(result).toContain('₱');
      expect(result).toContain('0');
    });

    it('should format negative number correctly', () => {
      const result = formatCurrency(-500);
      expect(result).toContain('₱');
      expect(result).toContain('500');
    });

    it('should format decimal values correctly', () => {
      const result = formatCurrency(99.99);
      expect(result).toContain('99.99');
    });

    it('should format large numbers with commas', () => {
      const result = formatCurrency(1000000);
      expect(result).toContain('1,000,000');
    });
  });

  describe('formatDate()', () => {
    it('should format date string correctly', () => {
      const result = formatDate('2026-04-10');
      expect(result).toContain('Apr');
      expect(result).toContain('10');
      expect(result).toContain('2026');
    });

    it('should format Date object correctly', () => {
      const result = formatDate(new Date('2026-04-10'));
      expect(result).toContain('Apr');
      expect(result).toContain('10');
      expect(result).toContain('2026');
    });

    it('should handle ISO format', () => {
      const result = formatDate('2026-01-01T00:00:00.000Z');
      expect(result).toContain('Jan');
      expect(result).toContain('01');
      expect(result).toContain('2026');
    });
  });

  describe('formatDateTime()', () => {
    it('should format date with time', () => {
      const result = formatDateTime('2026-04-10T14:30:00');
      expect(result).toContain('Apr');
      expect(result).toContain('10');
      expect(result).toContain('2026');
      expect(result).toContain('14');
      expect(result).toContain('30');
    });
  });

  describe('formatRelativeTime()', () => {
    it('should return relative time string', () => {
      const result = formatRelativeTime(new Date().toISOString());
      expect(result).toBeTruthy();
    });

    it('should add suffix', () => {
      const result = formatRelativeTime('2026-04-01');
      expect(result).toContain('ago');
    });
  });

  describe('generateSKU()', () => {
    it('should generate SKU with default prefix', () => {
      const result = generateSKU();
      expect(result).toMatch(/^PRD-/);
    });

    it('should generate SKU with custom prefix', () => {
      const result = generateSKU('SKU');
      expect(result).toMatch(/^SKU-/);
    });

    it('should generate unique SKUs', () => {
      const sku1 = generateSKU();
      const sku2 = generateSKU();
      expect(sku1).not.toBe(sku2);
    });

    it('should include timestamp', () => {
      const result = generateSKU();
      const parts = result.split('-');
      expect(parts.length).toBe(3);
    });

    it('should include random component', () => {
      const result = generateSKU();
      const parts = result.split('-');
      expect(parts[2].length).toBeGreaterThan(0);
    });
  });
});