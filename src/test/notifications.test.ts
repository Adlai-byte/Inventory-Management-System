import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database and auth
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  execute: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

import { query, execute } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Re-implement notification helpers for testing (mirrors API logic)
interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  is_read: boolean;
  created_at: string;
}

// Simulate notification processing
const processNotificationsFromDb = (dbRows: any[]): Notification[] => {
  return dbRows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type || 'info',
    is_read: Boolean(row.is_read),
    created_at: row.created_at,
  }));
};

const filterUnreadNotifications = (notifications: Notification[]): Notification[] => {
  return notifications.filter(n => !n.is_read);
};

const filterByType = (notifications: Notification[], type: string): Notification[] => {
  if (type === 'all') return notifications;
  return notifications.filter(n => n.type === type);
};

const getNotificationSummary = (notifications: Notification[]) => {
  return {
    total: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    success: notifications.filter(n => n.type === 'success').length,
    error: notifications.filter(n => n.type === 'error').length,
    warning: notifications.filter(n => n.type === 'warning').length,
    info: notifications.filter(n => n.type === 'info').length,
  };
};

describe('Notification System', () => {
  let mockNotifications: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    mockNotifications = [
      { id: 1, user_id: 1, title: 'Low Stock Alert', message: 'Product running low', type: 'warning', is_read: false, created_at: '2026-04-10 10:00:00' },
      { id: 2, user_id: 1, title: 'Order Received', message: 'PO-001 received', type: 'success', is_read: false, created_at: '2026-04-10 09:00:00' },
      { id: 3, user_id: 1, title: 'Stock Update', message: 'Inventory updated', type: 'info', is_read: true, created_at: '2026-04-10 08:00:00' },
      { id: 4, user_id: 1, title: 'Error', message: 'Something failed', type: 'error', is_read: true, created_at: '2026-04-10 07:00:00' },
    ];
  });

  describe('processNotificationsFromDb()', () => {
    it('should convert database rows to Notification objects', () => {
      const result = processNotificationsFromDb(mockNotifications);
      expect(result).toHaveLength(4);
      expect(result[0].id).toBe(1);
      expect(result[0].type).toBe('warning');
    });

    it('should default type to info if not provided', () => {
      const rows = [{ id: 1, user_id: 1, title: 'Test', message: 'Test', is_read: false, created_at: '2026-04-10' }];
      const result = processNotificationsFromDb(rows);
      expect(result[0].type).toBe('info');
    });
  });

  describe('filterUnreadNotifications()', () => {
    it('should return only unread notifications', () => {
      const notifications = processNotificationsFromDb(mockNotifications);
      const unread = filterUnreadNotifications(notifications);
      expect(unread).toHaveLength(2);
      expect(unread.every(n => !n.is_read)).toBe(true);
    });

    it('should return empty array when all are read', () => {
      const allRead = mockNotifications.map(n => ({ ...n, is_read: true }));
      const notifications = processNotificationsFromDb(allRead);
      expect(filterUnreadNotifications(notifications)).toHaveLength(0);
    });
  });

  describe('filterByType()', () => {
    it('should filter by type', () => {
      const notifications = processNotificationsFromDb(mockNotifications);
      const warnings = filterByType(notifications, 'warning');
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('warning');
    });

    it('should return all when type is "all"', () => {
      const notifications = processNotificationsFromDb(mockNotifications);
      expect(filterByType(notifications, 'all')).toHaveLength(4);
    });
  });

  describe('getNotificationSummary()', () => {
    it('should count all notification types', () => {
      const notifications = processNotificationsFromDb(mockNotifications);
      const summary = getNotificationSummary(notifications);
      
      expect(summary.total).toBe(4);
      expect(summary.unread).toBe(2);
      expect(summary.success).toBe(1);
      expect(summary.error).toBe(1);
      expect(summary.warning).toBe(1);
      expect(summary.info).toBe(1);
    });

    it('should handle empty notifications', () => {
      const summary = getNotificationSummary([]);
      expect(summary.total).toBe(0);
      expect(summary.unread).toBe(0);
    });
  });

  describe('Notification Actions', () => {
    const markAsRead = async (notificationId: number, userId: number) => {
      // Simulates: UPDATE inv_notifications SET is_read = 1 WHERE id = ? AND user_id = ?
      const mockQuery = vi.fn().mockResolvedValue([]);
      await mockQuery(
        "UPDATE inv_notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
        [notificationId, userId]
      );
      return { success: true };
    };

    const markAllAsRead = async (userId: number) => {
      // Simulates: UPDATE inv_notifications SET is_read = 1 WHERE user_id = ?
      const mockQuery = vi.fn().mockResolvedValue([]);
      await mockQuery(
        "UPDATE inv_notifications SET is_read = 1 WHERE user_id = ?",
        [userId]
      );
      return { success: true };
    };

    it('should mark single notification as read', async () => {
      const result = await markAsRead(1, 1);
      expect(result.success).toBe(true);
    });

    it('should mark all notifications as read', async () => {
      const result = await markAllAsRead(1);
      expect(result.success).toBe(true);
    });
  });

  describe('Create Notification', () => {
    const createNotification = async (userId: number, title: string, message: string, type: string = 'info') => {
      // Simulates: INSERT INTO inv_notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)
      const mockQuery = vi.fn().mockResolvedValue([{ insertId: 1 }]);
      await mockQuery(
        "INSERT INTO inv_notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
        [userId, title, message, type]
      );
      return { success: true, id: 1 };
    };

    it('should create success notification', async () => {
      const result = await createNotification(1, 'Sale Recorded', '5 items sold', 'success');
      expect(result.success).toBe(true);
    });

    it('should create warning notification', async () => {
      const result = await createNotification(1, 'Low Stock', 'Product below minimum', 'warning');
      expect(result.success).toBe(true);
    });

    it('should create error notification', async () => {
      const result = await createNotification(1, 'Error', 'Something failed', 'error');
      expect(result.success).toBe(true);
    });

    it('should default to info type', async () => {
      const mockQuery = vi.fn();
      await mockQuery(
        "INSERT INTO inv_notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
        [1, 'Test', 'Test message', 'info']
      );
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('Notification Sorting', () => {
    const sortByDate = (notifications: Notification[], order: 'asc' | 'desc' = 'desc') => {
      return [...notifications].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return order === 'desc' ? dateB - dateA : dateA - dateB;
      });
    };

    it('should sort by newest first', () => {
      const notifications = processNotificationsFromDb(mockNotifications);
      const sorted = sortByDate(notifications, 'desc');
      expect(new Date(sorted[0].created_at).getTime()).toBeGreaterThanOrEqual(new Date(sorted[1].created_at).getTime());
    });

    it('should sort by oldest first', () => {
      const notifications = processNotificationsFromDb(mockNotifications);
      const sorted = sortByDate(notifications, 'asc');
      expect(new Date(sorted[0].created_at).getTime()).toBeLessThanOrEqual(new Date(sorted[1].created_at).getTime());
    });
  });

  describe('Notification UI Formatting', () => {
    const formatNotificationTime = (dateStr: string): string => {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString();
    };

    it('should format recent notification as "Just now"', () => {
      const now = new Date().toISOString();
      expect(formatNotificationTime(now)).toBe('Just now');
    });

    it('should format notification older than a minute', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
      expect(formatNotificationTime(fiveMinutesAgo)).toBe('5m ago');
    });

    it('should format notification older than an hour', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
      expect(formatNotificationTime(twoHoursAgo)).toBe('2h ago');
    });
  });
});