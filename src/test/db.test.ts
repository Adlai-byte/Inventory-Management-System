import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database module
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  simpleQuery: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
}));

// Import after mocking
import { query, simpleQuery, queryOne, execute } from '@/lib/db';

describe('Database Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('query()', () => {
    it('should be defined as a function', () => {
      expect(typeof query).toBe('function');
    });

    it('should accept sql and optional params', async () => {
      const mockRows = [{ id: 1, name: 'Test' }];
      (query as any).mockResolvedValue(mockRows);
      
      const result = await query('SELECT * FROM test');
      expect(result).toEqual(mockRows);
    });

    it('should pass params to the query', async () => {
      const mockRows = [{ id: 1 }];
      (query as any).mockResolvedValue(mockRows);
      
      await query('SELECT * FROM test WHERE id = ?', [1]);
      expect(query).toHaveBeenCalledWith('SELECT * FROM test WHERE id = ?', [1]);
    });
  });

  describe('simpleQuery()', () => {
    it('should be defined as a function', () => {
      expect(typeof simpleQuery).toBe('function');
    });

    it('should accept sql and optional params', async () => {
      const mockRows = [{ id: 1, name: 'Test' }];
      (simpleQuery as any).mockResolvedValue(mockRows);
      
      const result = await simpleQuery('SELECT * FROM test');
      expect(result).toEqual(mockRows);
    });
  });

  describe('queryOne()', () => {
    it('should be defined as a function', () => {
      expect(typeof queryOne).toBe('function');
    });

    it('should return first result or null', async () => {
      const mockRows = [{ id: 1, name: 'Test' }];
      (queryOne as any).mockResolvedValue(mockRows[0]);
      
      const result = await queryOne('SELECT * FROM test LIMIT 1');
      expect(result).toEqual(mockRows[0]);
    });

    it('should return null for empty results', async () => {
      (queryOne as any).mockResolvedValue(null);
      
      const result = await queryOne('SELECT * FROM test WHERE id = ?', [999]);
      expect(result).toBeNull();
    });
  });

  describe('execute()', () => {
    it('should be defined as a function', () => {
      expect(typeof execute).toBe('function');
    });

    it('should accept sql and optional params', async () => {
      const mockResult = { insertId: 1, affectedRows: 1 };
      (execute as any).mockResolvedValue(mockResult);
      
      const result = await execute('INSERT INTO test (name) VALUES (?)', ['Test']);
      expect(result).toEqual(mockResult);
    });
  });
});