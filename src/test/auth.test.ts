import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth utilities (these mirror functionality from @/lib/auth)
export function parseAuthToken(token: string): { userId: number; username: string; role: string } | null {
  try {
    const decoded = JSON.parse(atob(token));
    if (decoded.userId && decoded.username && decoded.role) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

export function isValidRole(role: string): boolean {
  return ['staff', 'manager', 'admin'].includes(role);
}

export function hasPermission(userRole: string, requiredRole: string): boolean {
  if (!isValidRole(userRole) || !isValidRole(requiredRole)) return false;
  
  const roleHierarchy: Record<string, number> = {
    staff: 1,
    manager: 2,
    admin: 3,
  };
  
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
}

export function sanitizeUsername(username: string): string {
  return username.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function isValidUsername(username: string): boolean {
  if (!username || username.length < 3 || username.length > 30) return false;
  return /^[a-z0-9_-]+$/.test(username);
}

export function hashPassword(password: string): string {
  // Simple hash for testing (not for production use)
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export function comparePassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generateToken(userId: number, username: string, role: string): string {
  const payload = { userId, username, role, exp: Date.now() + 86400000 };
  return btoa(JSON.stringify(payload));
}

export function isTokenExpired(token: string): boolean {
  try {
    const decoded = JSON.parse(atob(token));
    return Date.now() > decoded.exp;
  } catch {
    return true;
  }
}

describe('Auth Utilities', () => {
  describe('parseAuthToken()', () => {
    it('should parse valid token', () => {
      const token = btoa(JSON.stringify({ userId: 1, username: 'test', role: 'admin' }));
      const result = parseAuthToken(token);
      expect(result?.userId).toBe(1);
      expect(result?.username).toBe('test');
      expect(result?.role).toBe('admin');
    });

    it('should return null for invalid token', () => {
      expect(parseAuthToken('invalid')).toBeNull();
    });

    it('should return null for empty token', () => {
      expect(parseAuthToken('')).toBeNull();
    });

    it('should return null for token missing required fields', () => {
      const token = btoa(JSON.stringify({ userId: 1 }));
      expect(parseAuthToken(token)).toBeNull();
    });
  });

  describe('isValidRole()', () => {
    it('should return true for valid roles', () => {
      expect(isValidRole('staff')).toBe(true);
      expect(isValidRole('manager')).toBe(true);
      expect(isValidRole('admin')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(isValidRole('superadmin')).toBe(false);
      expect(isValidRole('')).toBe(false);
      expect(isValidRole('user')).toBe(false);
    });
  });

  describe('hasPermission()', () => {
    it('should allow admin to do everything', () => {
      expect(hasPermission('admin', 'staff')).toBe(true);
      expect(hasPermission('admin', 'manager')).toBe(true);
      expect(hasPermission('admin', 'admin')).toBe(true);
    });

    it('should allow manager to do staff and manager actions', () => {
      expect(hasPermission('manager', 'staff')).toBe(true);
      expect(hasPermission('manager', 'manager')).toBe(true);
      expect(hasPermission('manager', 'admin')).toBe(false);
    });

    it('should only allow staff to do staff actions', () => {
      expect(hasPermission('staff', 'staff')).toBe(true);
      expect(hasPermission('staff', 'manager')).toBe(false);
      expect(hasPermission('staff', 'admin')).toBe(false);
    });

    it('should return false for invalid roles', () => {
      expect(hasPermission('invalid', 'staff')).toBe(false);
    });
  });

  describe('sanitizeUsername()', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeUsername('TEST')).toBe('test');
    });

    it('should trim whitespace', () => {
      expect(sanitizeUsername('  test  ')).toBe('test');
    });

    it('should remove special characters', () => {
      expect(sanitizeUsername('test@#$user')).toBe('testuser');
    });

    it('should keep allowed characters', () => {
      expect(sanitizeUsername('test_user-123')).toBe('test_user-123');
    });
  });

  describe('sanitizeEmail()', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
    });
  });

  describe('isValidUsername()', () => {
    it('should return true for valid usernames', () => {
      expect(isValidUsername('admin')).toBe(true);
      expect(isValidUsername('user123')).toBe(true);
      expect(isValidUsername('test_user')).toBe(true);
    });

    it('should return false for too short', () => {
      expect(isValidUsername('ab')).toBe(false);
    });

    it('should return false for too long', () => {
      expect(isValidUsername('a'.repeat(31))).toBe(false);
    });

    it('should return false for invalid characters', () => {
      expect(isValidUsername('test@user')).toBe(false);
      expect(isValidUsername('test user')).toBe(false);
    });

    it('should return false for empty', () => {
      expect(isValidUsername('')).toBe(false);
    });
  });

  describe('hashPassword()', () => {
    it('should return consistent hash for same password', () => {
      expect(hashPassword('password123')).toBe(hashPassword('password123'));
    });

    it('should return different hash for different passwords', () => {
      expect(hashPassword('password123')).not.toBe(hashPassword('password124'));
    });

    it('should return hex string', () => {
      expect(hashPassword('test')).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('comparePassword()', () => {
    it('should return true for matching password', () => {
      const hash = hashPassword('password123');
      expect(comparePassword('password123', hash)).toBe(true);
    });

    it('should return false for non-matching password', () => {
      const hash = hashPassword('password123');
      expect(comparePassword('wrongpass', hash)).toBe(false);
    });
  });

  describe('generateToken()', () => {
    it('should generate valid token', () => {
      const token = generateToken(1, 'admin', 'admin');
      expect(token).toBeTruthy();
      expect(parseAuthToken(token)).toBeTruthy();
    });

    it('should include user data in token', () => {
      const token = generateToken(1, 'testuser', 'staff');
      const parsed = parseAuthToken(token);
      expect(parsed?.userId).toBe(1);
      expect(parsed?.username).toBe('testuser');
      expect(parsed?.role).toBe('staff');
    });
  });

  describe('isTokenExpired()', () => {
    it('should return false for non-expired token', () => {
      const token = generateToken(1, 'admin', 'admin');
      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for invalid token', () => {
      expect(isTokenExpired('invalid')).toBe(true);
    });
  });
});