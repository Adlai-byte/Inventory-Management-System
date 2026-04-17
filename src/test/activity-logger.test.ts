import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth and db
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn().mockResolvedValue({ id: 1, username: 'testuser', role: 'admin' }),
}));

vi.mock('@/lib/db', () => ({
  query: vi.fn().mockResolvedValue([]),
}));

import { logActivity, formatLogDetails } from '@/lib/activity-logger';
import { query } from '@/lib/db';

describe('Activity Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logActivity()', () => {
    it('should be defined as a function', () => {
      expect(typeof logActivity).toBe('function');
    });

    it('should call query with correct parameters', async () => {
      await logActivity({
        entity_type: 'product',
        action: 'created',
        details: 'Created product: Test Product',
        entity_id: 123,
      });

      expect(query).toHaveBeenCalled();
      const callArgs = (query as any).mock.calls[0];
      expect(callArgs[0]).toContain('INSERT INTO inv_activity_log');
      expect(callArgs[1]).toContain(1); // user_id
      expect(callArgs[1]).toContain('product'); // entity_type
      expect(callArgs[1]).toContain('created'); // action
      expect(callArgs[1]).toContain('Created product: Test Product'); // details
    });

    it('should handle optional entity_id', async () => {
      await logActivity({
        entity_type: 'category',
        action: 'deleted',
        details: 'Deleted category: Test Category',
      });

      expect(query).toHaveBeenCalled();
    });
  });

  describe('formatLogDetails()', () => {
    it('should format created action correctly', () => {
      const result = formatLogDetails('created', 'product', 'Test Product');
      expect(result).toBe('Created product: Test Product');
    });

    it('should format updated action correctly', () => {
      const result = formatLogDetails('updated', 'supplier', 'Test Supplier');
      expect(result).toBe('Updated supplier: Test Supplier');
    });

    it('should format deleted action correctly', () => {
      const result = formatLogDetails('deleted', 'category', 'Test Category');
      expect(result).toBe('Deleted category: Test Category');
    });

    it('should include additional details', () => {
      const result = formatLogDetails('updated', 'product', 'Test', 'price changed');
      expect(result).toBe('Updated product: Test - price changed');
    });
  });

  describe('Entity Types', () => {
    it('should support product entity', async () => {
      await logActivity({ entity_type: 'product', action: 'created', details: 'Test' });
      const callArgs = (query as any).mock.calls[0];
      expect(callArgs[1]).toContain('product');
    });

    it('should support category entity', async () => {
      await logActivity({ entity_type: 'category', action: 'created', details: 'Test' });
      const callArgs = (query as any).mock.calls[0];
      expect(callArgs[1]).toContain('category');
    });

    it('should support supplier entity', async () => {
      await logActivity({ entity_type: 'supplier', action: 'created', details: 'Test' });
      const callArgs = (query as any).mock.calls[0];
      expect(callArgs[1]).toContain('supplier');
    });

    it('should support stock_movement entity', async () => {
      await logActivity({ entity_type: 'stock_movement', action: 'created', details: 'Test' });
      const callArgs = (query as any).mock.calls[0];
      expect(callArgs[1]).toContain('stock_movement');
    });

    it('should support purchase_order entity', async () => {
      await logActivity({ entity_type: 'purchase_order', action: 'created', details: 'Test' });
      const callArgs = (query as any).mock.calls[0];
      expect(callArgs[1]).toContain('purchase_order');
    });
  });
});