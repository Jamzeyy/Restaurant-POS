// User & Auth Types
export interface User {
  id: string;
  email: string;
  fullName: string;
  pin: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  createdAt: string;
}

export type UserRole = 'admin' | 'manager' | 'server' | 'cashier' | 'host';

export type Permission = 
  | 'menu:read' | 'menu:write'
  | 'orders:read' | 'orders:write' | 'orders:void'
  | 'payments:read' | 'payments:write' | 'payments:refund'
  | 'tables:read' | 'tables:write' | 'tables:layout'
  | 'reports:read' | 'reports:export'
  | 'users:read' | 'users:write'
  | 'settings:read' | 'settings:write'
  | 'audit:read';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'menu:read', 'menu:write',
    'orders:read', 'orders:write', 'orders:void',
    'payments:read', 'payments:write', 'payments:refund',
    'tables:read', 'tables:write', 'tables:layout',
    'reports:read', 'reports:export',
    'users:read', 'users:write',
    'settings:read', 'settings:write',
    'audit:read'
  ],
  manager: [
    'menu:read', 'menu:write',
    'orders:read', 'orders:write', 'orders:void',
    'payments:read', 'payments:write', 'payments:refund',
    'tables:read', 'tables:write', 'tables:layout',
    'reports:read', 'reports:export',
    'users:read',
    'settings:read',
    'audit:read'
  ],
  server: [
    'menu:read',
    'orders:read', 'orders:write',
    'tables:read', 'tables:write',
  ],
  cashier: [
    'menu:read',
    'orders:read', 'orders:write',
    'payments:read', 'payments:write',
    'tables:read',
  ],
  host: [
    'menu:read',
    'orders:read',
    'tables:read', 'tables:write',
  ],
};

// Menu Types
export interface MenuItem {
  id: string;
  sku: string;
  name: string;
  nameChinese?: string;
  description: string;
  price: number;
  category: MenuCategory;
  subcategory?: string;
  tags: string[];
  isAvailable: boolean;
  imageUrl?: string;
  spiceLevel?: 0 | 1 | 2 | 3;
  allergens?: string[];
}

export type MenuCategory = 'dimsum' | 'lunch' | 'dinner' | 'drinks' | 'desserts';

export const MENU_CATEGORY_LABELS: Record<MenuCategory, string> = {
  dimsum: 'Dim Sum',
  lunch: 'Lunch Specials',
  dinner: 'Dinner',
  drinks: 'Beverages',
  desserts: 'Desserts'
};

// Table Types
export interface Table {
  id: string;
  label: string;
  seats: number;
  status: TableStatus;
  shape: 'round' | 'square' | 'rectangle';
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation?: number;
  currentOrderId?: string;
  section?: string;
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  cleaning: 'Cleaning'
};

// Order Types
export interface Order {
  id: string;
  orderNumber: number;
  type: OrderType;
  status: OrderStatus;
  tableId?: string;
  tableLabel?: string;
  serverId: string;
  serverName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
  guestCount?: number;
  notes?: string;
  deliveryAddress?: string;
  deliveryContact?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export type OrderType = 'dine-in' | 'takeout' | 'delivery';
export type OrderStatus = 'open' | 'sent' | 'preparing' | 'ready' | 'served' | 'paid' | 'voided';

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  'dine-in': 'Dine In',
  'takeout': 'Takeout',
  'delivery': 'Delivery'
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  open: 'Open',
  sent: 'Sent to Kitchen',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  paid: 'Paid',
  voided: 'Voided'
};

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  nameChinese?: string;
  quantity: number;
  price: number;
  modifiers?: OrderItemModifier[];
  notes?: string;
  status: 'pending' | 'sent' | 'preparing' | 'ready' | 'served';
  sentAt?: string;
}

export interface OrderItemModifier {
  name: string;
  price: number;
}

// Payment Types
export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  tip: number;
  status: PaymentStatus;
  reference?: string;
  cardLast4?: string;
  cashTendered?: number;
  changeDue?: number;
  createdAt: string;
  processedBy: string;
}

export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'gift_card';
export type PaymentStatus = 'pending' | 'approved' | 'declined' | 'refunded';

// Audit Log Types
export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type AuditAction = 
  | 'create' | 'update' | 'delete' | 'void'
  | 'login' | 'logout'
  | 'payment_process' | 'payment_refund'
  | 'table_assign' | 'table_clear'
  | 'order_send' | 'order_modify' | 'order_void'
  | 'item_add' | 'item_remove' | 'item_modify';

// Printer Types
export interface Printer {
  id: string;
  name: string;
  type: 'kitchen' | 'receipt' | 'bar';
  connectionType: 'usb' | 'network' | 'bluetooth';
  address: string;
  isOnline: boolean;
}

// Analytics Types
export interface DailySummary {
  date: string;
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  tipTotal: number;
  discountTotal: number;
  taxTotal: number;
  cashPayments: number;
  cardPayments: number;
  dineInOrders: number;
  takeoutOrders: number;
  deliveryOrders: number;
  topItems: { name: string; quantity: number; revenue: number }[];
}

// Floor Plan Types
export interface FloorPlan {
  id: string;
  name: string;
  tables: Table[];
  width: number;
  height: number;
  isActive: boolean;
}

