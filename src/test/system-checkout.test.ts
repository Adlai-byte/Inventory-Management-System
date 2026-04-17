import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock product for testing
interface MockProduct {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  category_name: string;
}

// Mock stock movement response
interface StockMovementResponse {
  success: boolean;
  message: string;
  remainingStock?: number;
}

// ============================================
// SCANNER / BARCODE LOOKUP TESTS
// ============================================

describe('Scanner - Barcode Lookup', () => {
  let mockProducts: MockProduct[] = [];

  beforeEach(() => {
    mockProducts = [
      { id: 1, name: 'Coca Cola 500ml', sku: 'CC500', barcode: '4801234567890', quantity: 100, unit_price: 25, category_name: 'Beverages' },
      { id: 2, name: 'Pepsi 500ml', sku: 'PP500', barcode: '4801234567891', quantity: 50, unit_price: 25, category_name: 'Beverages' },
      { id: 3, name: 'Lay\'s Chips', sku: 'LAYS100', barcode: '4801234567892', quantity: 30, unit_price: 45, category_name: 'Snacks' },
    ];
  });

  const lookupProductByBarcode = (barcode: string): MockProduct | null => {
    return mockProducts.find(p => p.barcode === barcode || p.sku === barcode) || null;
  };

  const lookupProductBySku = (sku: string): MockProduct | null => {
    return mockProducts.find(p => p.sku === sku) || null;
  };

  it('should find product by exact barcode', () => {
    const product = lookupProductByBarcode('4801234567890');
    expect(product).not.toBeNull();
    expect(product?.name).toBe('Coca Cola 500ml');
  });

  it('should find product by SKU', () => {
    const product = lookupProductBySku('CC500');
    expect(product).not.toBeNull();
    expect(product?.name).toBe('Coca Cola 500ml');
  });

  it('should return null for non-existent barcode', () => {
    const product = lookupProductByBarcode('9999999999999');
    expect(product).toBeNull();
  });

  it('should return null for empty barcode', () => {
    const product = lookupProductByBarcode('');
    expect(product).toBeNull();
  });
});

// ============================================
// PRODUCT CALCULATION TESTS
// ============================================

describe('Product Calculations', () => {
  interface CartItem {
    productId: number;
    name: string;
    unitPrice: number;
    quantity: number;
  }

  const calculateCartTotal = (items: CartItem[]): number => {
    return items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const calculateCartItemTotal = (unitPrice: number, quantity: number): number => {
    return unitPrice * quantity;
  };

  const calculateChange = (amountPaid: number, total: number): number => {
    return Math.max(0, amountPaid - total);
  };

  const calculateTax = (subtotal: number, taxRate: number = 0.12): number => {
    return subtotal * taxRate;
  };

  const calculateGrandTotal = (subtotal: number, taxRate: number = 0.12): number => {
    return subtotal + calculateTax(subtotal, taxRate);
  };

  it('should calculate cart total correctly', () => {
    const cart: CartItem[] = [
      { productId: 1, name: 'Item 1', unitPrice: 25, quantity: 2 },
      { productId: 2, name: 'Item 2', unitPrice: 30, quantity: 3 },
    ];
    expect(calculateCartTotal(cart)).toBe(140); // (25*2) + (30*3) = 50 + 90 = 140
  });

  it('should calculate single item total', () => {
    expect(calculateCartItemTotal(25, 4)).toBe(100);
  });

  it('should calculate change correctly', () => {
    expect(calculateChange(100, 75)).toBe(25);
    expect(calculateChange(50, 75)).toBe(0);
    expect(calculateChange(75, 75)).toBe(0);
  });

  it('should calculate tax correctly (12%)', () => {
    expect(calculateTax(100)).toBe(12);
    expect(calculateTax(1000)).toBe(120);
    expect(calculateTax(0)).toBe(0);
  });

  it('should calculate grand total with tax', () => {
    expect(calculateGrandTotal(100)).toBe(112);
    expect(calculateGrandTotal(1000)).toBe(1120);
  });

  it('should handle empty cart total', () => {
    expect(calculateCartTotal([])).toBe(0);
  });
});

// ============================================
// STOCK DEDUCTION TESTS
// ============================================

describe('Stock Deduction', () => {
  let productInventory: Map<number, number>;

  beforeEach(() => {
    productInventory = new Map([
      [1, 100],
      [2, 50],
      [3, 30],
    ]);
  });

  const deductStock = (productId: number, quantity: number): { success: boolean; remaining?: number; error?: string } => {
    const currentStock = productInventory.get(productId) || 0;
    
    if (quantity <= 0) {
      return { success: false, error: 'Quantity must be positive' };
    }
    
    if (currentStock < quantity) {
      return { success: false, error: `Insufficient stock. Available: ${currentStock}` };
    }
    
    const newStock = currentStock - quantity;
    productInventory.set(productId, newStock);
    return { success: true, remaining: newStock };
  };

  const addStock = (productId: number, quantity: number): { success: boolean; newStock?: number } => {
    const currentStock = productInventory.get(productId) || 0;
    const newStock = currentStock + quantity;
    productInventory.set(productId, newStock);
    return { success: true, newStock };
  };

  const getStock = (productId: number): number => {
    return productInventory.get(productId) || 0;
  };

  it('should deduct stock successfully', () => {
    const result = deductStock(1, 10);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(90);
  });

  it('should prevent negative stock', () => {
    const result = deductStock(1, 150);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient stock');
  });

  it('should prevent zero or negative quantity deduction', () => {
    expect(deductStock(1, 0).success).toBe(false);
    expect(deductStock(1, -5).success).toBe(false);
  });

  it('should add stock successfully', () => {
    const result = addStock(1, 50);
    expect(result.success).toBe(true);
    expect(result.newStock).toBe(150);
  });

  it('should get current stock level', () => {
    expect(getStock(1)).toBe(100);
    expect(getStock(2)).toBe(50);
    expect(getStock(999)).toBe(0); // Non-existent product
  });

  it('should track multiple deductions', () => {
    deductStock(1, 10);
    deductStock(1, 20);
    expect(getStock(1)).toBe(70);
  });
});

// ============================================
// COMPLETE CHECKOUT FLOW TEST
// ============================================

describe('Complete Checkout Flow', () => {
  interface CheckoutState {
    cart: { productId: number; name: string; quantity: number; price: number }[];
    inventory: Map<number, number>;
    stockMovements: { productId: number; quantity: number; type: string; timestamp: Date }[];
    notifications: string[];
  }

  let checkoutState: CheckoutState;

  beforeEach(() => {
    checkoutState = {
      cart: [],
      inventory: new Map([
        [1, 100],
        [2, 50],
        [3, 30],
      ]),
      stockMovements: [],
      notifications: [],
    };
  });

  const addToCart = (productId: number, name: string, quantity: number, price: number) => {
    const existing = checkoutState.cart.find(item => item.productId === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      checkoutState.cart.push({ productId, name, quantity, price });
    }
  };

  const removeFromCart = (productId: number) => {
    checkoutState.cart = checkoutState.cart.filter(item => item.productId !== productId);
  };

  const updateCartQuantity = (productId: number, quantity: number) => {
    const item = checkoutState.cart.find(item => item.productId === productId);
    if (item) {
      if (quantity <= 0) {
        removeFromCart(productId);
      } else {
        item.quantity = quantity;
      }
    }
  };

  const calculateTotal = () => {
    return checkoutState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const processSale = (): { success: boolean; message: string; failedItems: string[] } => {
    const failedItems: string[] = [];
    
    for (const item of checkoutState.cart) {
      const currentStock = checkoutState.inventory.get(item.productId) || 0;
      
      if (currentStock < item.quantity) {
        failedItems.push(`${item.name} (insufficient stock)`);
        continue;
      }
      
      // Deduct stock
      const newStock = currentStock - item.quantity;
      checkoutState.inventory.set(item.productId, newStock);
      
      // Record stock movement
      checkoutState.stockMovements.push({
        productId: item.productId,
        quantity: item.quantity,
        type: 'outbound',
        timestamp: new Date(),
      });
      
      // Create notification
      checkoutState.notifications.push(`Sold ${item.quantity} x ${item.name}`);
    }
    
    if (failedItems.length > 0) {
      return { success: false, message: 'Some items failed', failedItems };
    }
    
    // Clear cart after successful sale
    const totalItems = checkoutState.cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = calculateTotal();
    checkoutState.cart = [];
    
    return { 
      success: true, 
      message: `Sale recorded! ${totalItems} items, ${totalAmount.toFixed(2)}`,
      failedItems: []
    };
  };

  it('should add items to cart', () => {
    addToCart(1, 'Product 1', 2, 25);
    expect(checkoutState.cart.length).toBe(1);
    expect(checkoutState.cart[0].quantity).toBe(2);
  });

  it('should increase quantity for existing cart items', () => {
    addToCart(1, 'Product 1', 2, 25);
    addToCart(1, 'Product 1', 3, 25);
    expect(checkoutState.cart.length).toBe(1);
    expect(checkoutState.cart[0].quantity).toBe(5);
  });

  it('should remove items from cart', () => {
    addToCart(1, 'Product 1', 2, 25);
    addToCart(2, 'Product 2', 1, 30);
    removeFromCart(1);
    expect(checkoutState.cart.length).toBe(1);
    expect(checkoutState.cart[0].productId).toBe(2);
  });

  it('should update cart quantity', () => {
    addToCart(1, 'Product 1', 2, 25);
    updateCartQuantity(1, 5);
    expect(checkoutState.cart[0].quantity).toBe(5);
  });

  it('should remove item when quantity set to zero', () => {
    addToCart(1, 'Product 1', 2, 25);
    updateCartQuantity(1, 0);
    expect(checkoutState.cart.length).toBe(0);
  });

  it('should calculate cart total correctly', () => {
    addToCart(1, 'Product 1', 2, 25);  // 50
    addToCart(2, 'Product 2', 3, 30);  // 90
    expect(calculateTotal()).toBe(140);
  });

  it('should process complete sale flow', () => {
    addToCart(1, 'Product 1', 2, 25);
    addToCart(2, 'Product 2', 1, 30);
    
    const result = processSale();
    
    expect(result.success).toBe(true);
    expect(checkoutState.cart.length).toBe(0); // Cart cleared
    expect(checkoutState.inventory.get(1)).toBe(98); // 100 - 2
    expect(checkoutState.inventory.get(2)).toBe(49); // 50 - 1
    expect(checkoutState.stockMovements.length).toBe(2);
    expect(checkoutState.notifications.length).toBe(2);
  });

  it('should handle insufficient stock during sale', () => {
    addToCart(1, 'Product 1', 150, 25); // Only 100 in stock
    
    const result = processSale();
    
    expect(result.success).toBe(false);
    expect(result.failedItems.length).toBe(1);
    expect(result.failedItems[0]).toContain('insufficient stock');
  });

  it('should not deduct stock for failed items but succeed for others', () => {
    addToCart(1, 'Product 1', 50, 25);  // Can succeed (100 available)
    addToCart(2, 'Product 2', 100, 30); // Will fail (only 50 available)
    
    const result = processSale();
    
    expect(result.success).toBe(false);
    expect(checkoutState.inventory.get(1)).toBe(50); // Deducted
    expect(checkoutState.inventory.get(2)).toBe(50); // Not deducted
  });

  it('should handle empty cart', () => {
    const result = processSale();
    expect(result.message).toContain('0 items');
    expect(checkoutState.stockMovements.length).toBe(0);
  });
});

// ============================================
// NOTIFICATION SYSTEM TESTS
// ============================================

describe('Notification System', () => {
  interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: Date;
    read: boolean;
  }

  let notifications: Notification[] = [];

  const addNotification = (type: Notification['type'], message: string) => {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
      read: false,
    };
    notifications.push(notification);
  };

  const markAsRead = (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
    }
  };

  const markAllAsRead = () => {
    notifications.forEach(n => n.read = true);
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  const clearNotifications = () => {
    notifications = [];
  };

  beforeEach(() => {
    notifications = [];
  });

  it('should add success notification', () => {
    addNotification('success', 'Sale recorded successfully');
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe('success');
  });

  it('should add error notification', () => {
    addNotification('error', 'Failed to process sale');
    expect(notifications[0].type).toBe('error');
  });

  it('should mark notification as read', () => {
    addNotification('success', 'Test');
    markAsRead(notifications[0].id);
    expect(notifications[0].read).toBe(true);
  });

  it('should mark all notifications as read', () => {
    addNotification('success', 'Test 1');
    addNotification('info', 'Test 2');
    markAllAsRead();
    expect(getUnreadCount()).toBe(0);
  });

  it('should count unread notifications', () => {
    addNotification('success', 'Test 1');
    addNotification('info', 'Test 2');
    markAsRead(notifications[0].id);
    expect(getUnreadCount()).toBe(1);
  });

  it('should clear all notifications', () => {
    addNotification('success', 'Test');
    clearNotifications();
    expect(notifications.length).toBe(0);
  });
});