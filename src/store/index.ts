import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  User, Table, Order, OrderItem, MenuItem, 
  Payment, AuditLog, FloorPlan, DailySummary,
  OrderType, TableStatus, MenuCategory
} from '../types';
import { MENU_ITEMS, SAMPLE_TABLES, SAMPLE_USERS } from '../data/sampleData';

interface POSState {
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (pin: string) => boolean;
  logout: () => void;
  
  // Menu
  menuItems: MenuItem[];
  menuSearchTerm: string;
  activeCategory: MenuCategory | 'all';
  activeTags: string[];
  setMenuSearchTerm: (term: string) => void;
  setActiveCategory: (category: MenuCategory | 'all') => void;
  toggleTag: (tag: string) => void;
  clearFilters: () => void;
  getFilteredMenuItems: () => MenuItem[];
  
  // Tables & Floor Plan
  tables: Table[];
  floorPlan: FloorPlan | null;
  selectedTableId: string | null;
  updateTable: (id: string, updates: Partial<Table>) => void;
  selectTable: (id: string | null) => void;
  updateTablePosition: (id: string, position: { x: number; y: number }) => void;
  updateTableStatus: (id: string, status: TableStatus) => void;
  addTable: (table: Omit<Table, 'id'>) => void;
  removeTable: (id: string) => void;
  
  // Orders
  orders: Order[];
  currentOrder: Order | null;
  orderCounter: number;
  createOrder: (type: OrderType, tableId?: string) => Order;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  setCurrentOrder: (order: Order | null) => void;
  addItemToOrder: (orderId: string, menuItem: MenuItem, quantity?: number, notes?: string) => void;
  updateOrderItem: (orderId: string, itemId: string, updates: Partial<OrderItem>) => void;
  removeOrderItem: (orderId: string, itemId: string) => void;
  sendOrderToKitchen: (orderId: string) => void;
  voidOrder: (orderId: string, reason: string) => void;
  completeOrder: (orderId: string) => void;
  getActiveOrders: () => Order[];
  getOrdersByTable: (tableId: string) => Order[];
  
  // Payments
  payments: Payment[];
  processPayment: (orderId: string, method: Payment['method'], amount: number, tip?: number, cashTendered?: number) => Payment;
  refundPayment: (paymentId: string, reason: string) => void;
  
  // Audit Log
  auditLogs: AuditLog[];
  addAuditLog: (log: Omit<AuditLog, 'id' | 'createdAt'>) => void;
  
  // Users (Admin)
  users: User[];
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  
  // Analytics
  getDailySummary: (date: string) => DailySummary;
  
  // Settings
  taxRate: number;
  restaurantName: string;
  setTaxRate: (rate: number) => void;
  setRestaurantName: (name: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      // Auth State
      currentUser: null,
      isAuthenticated: false,
      
      login: (pin: string) => {
        const user = get().users.find(u => u.pin === pin && u.isActive);
        if (user) {
          set({ currentUser: user, isAuthenticated: true });
          get().addAuditLog({
            actorId: user.id,
            actorName: user.fullName,
            action: 'login',
            entityType: 'session',
            entityId: user.id,
            metadata: {}
          });
          return true;
        }
        return false;
      },
      
      logout: () => {
        const user = get().currentUser;
        if (user) {
          get().addAuditLog({
            actorId: user.id,
            actorName: user.fullName,
            action: 'logout',
            entityType: 'session',
            entityId: user.id,
            metadata: {}
          });
        }
        set({ currentUser: null, isAuthenticated: false, currentOrder: null });
      },
      
      // Menu State
      menuItems: MENU_ITEMS,
      menuSearchTerm: '',
      activeCategory: 'all',
      activeTags: [],
      
      setMenuSearchTerm: (term) => set({ menuSearchTerm: term }),
      setActiveCategory: (category) => set({ activeCategory: category }),
      toggleTag: (tag) => set(state => ({
        activeTags: state.activeTags.includes(tag)
          ? state.activeTags.filter(t => t !== tag)
          : [...state.activeTags, tag]
      })),
      clearFilters: () => set({ menuSearchTerm: '', activeCategory: 'all', activeTags: [] }),
      
      getFilteredMenuItems: () => {
        const { menuItems, menuSearchTerm, activeCategory, activeTags } = get();
        return menuItems.filter(item => {
          if (!item.isAvailable) return false;
          if (activeCategory !== 'all' && item.category !== activeCategory) return false;
          if (menuSearchTerm) {
            const search = menuSearchTerm.toLowerCase();
            if (!item.name.toLowerCase().includes(search) && 
                !item.description.toLowerCase().includes(search) &&
                !(item.nameChinese?.includes(menuSearchTerm))) {
              return false;
            }
          }
          if (activeTags.length > 0 && !activeTags.some(tag => item.tags.includes(tag))) {
            return false;
          }
          return true;
        });
      },
      
      // Tables State
      tables: SAMPLE_TABLES,
      floorPlan: null,
      selectedTableId: null,
      
      updateTable: (id, updates) => set(state => ({
        tables: state.tables.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      
      selectTable: (id) => set({ selectedTableId: id }),
      
      updateTablePosition: (id, position) => set(state => ({
        tables: state.tables.map(t => t.id === id ? { ...t, position } : t)
      })),
      
      updateTableStatus: (id, status) => {
        const user = get().currentUser;
        set(state => ({
          tables: state.tables.map(t => t.id === id ? { ...t, status } : t)
        }));
        if (user) {
          get().addAuditLog({
            actorId: user.id,
            actorName: user.fullName,
            action: status === 'available' ? 'table_clear' : 'table_assign',
            entityType: 'table',
            entityId: id,
            metadata: { status }
          });
        }
      },
      
      addTable: (table) => {
        const id = generateId();
        set(state => ({
          tables: [...state.tables, { ...table, id }]
        }));
      },
      
      removeTable: (id) => set(state => ({
        tables: state.tables.filter(t => t.id !== id)
      })),
      
      // Orders State
      orders: [],
      currentOrder: null,
      orderCounter: 1000,
      
      createOrder: (type, tableId) => {
        const user = get().currentUser;
        const table = tableId ? get().tables.find(t => t.id === tableId) : undefined;
        const orderNumber = get().orderCounter + 1;
        
        const order: Order = {
          id: generateId(),
          orderNumber,
          type,
          status: 'open',
          tableId,
          tableLabel: table?.label,
          serverId: user?.id || 'unknown',
          serverName: user?.fullName || 'Unknown',
          items: [],
          subtotal: 0,
          tax: 0,
          tip: 0,
          discount: 0,
          total: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        set(state => ({
          orders: [...state.orders, order],
          orderCounter: orderNumber,
          currentOrder: order
        }));
        
        if (tableId) {
          get().updateTableStatus(tableId, 'occupied');
          get().updateTable(tableId, { currentOrderId: order.id });
        }
        
        return order;
      },
      
      updateOrder: (id, updates) => {
        set(state => ({
          orders: state.orders.map(o => o.id === id ? { ...o, ...updates, updatedAt: new Date().toISOString() } : o),
          currentOrder: state.currentOrder?.id === id 
            ? { ...state.currentOrder, ...updates, updatedAt: new Date().toISOString() } 
            : state.currentOrder
        }));
      },
      
      setCurrentOrder: (order) => set({ currentOrder: order }),
      
      addItemToOrder: (orderId, menuItem, quantity = 1, notes) => {
        const order = get().orders.find(o => o.id === orderId);
        if (!order) return;
        
        const user = get().currentUser;
        const taxRate = get().taxRate;
        
        const newItem: OrderItem = {
          id: generateId(),
          menuItemId: menuItem.id,
          name: menuItem.name,
          nameChinese: menuItem.nameChinese,
          quantity,
          price: menuItem.price,
          notes,
          status: 'pending'
        };
        
        const newItems = [...order.items, newItem];
        const subtotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * taxRate;
        const total = subtotal + tax + order.tip - order.discount;
        
        get().updateOrder(orderId, { items: newItems, subtotal, tax, total });
        
        if (user) {
          get().addAuditLog({
            actorId: user.id,
            actorName: user.fullName,
            action: 'item_add',
            entityType: 'order_item',
            entityId: newItem.id,
            metadata: { orderId, menuItemId: menuItem.id, quantity, name: menuItem.name }
          });
        }
      },
      
      updateOrderItem: (orderId, itemId, updates) => {
        const order = get().orders.find(o => o.id === orderId);
        if (!order) return;
        
        const user = get().currentUser;
        const taxRate = get().taxRate;
        
        const newItems = order.items.map(item => 
          item.id === itemId ? { ...item, ...updates } : item
        );
        const subtotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * taxRate;
        const total = subtotal + tax + order.tip - order.discount;
        
        get().updateOrder(orderId, { items: newItems, subtotal, tax, total });
        
        if (user) {
          get().addAuditLog({
            actorId: user.id,
            actorName: user.fullName,
            action: 'item_modify',
            entityType: 'order_item',
            entityId: itemId,
            metadata: { orderId, updates }
          });
        }
      },
      
      removeOrderItem: (orderId, itemId) => {
        const order = get().orders.find(o => o.id === orderId);
        if (!order) return;
        
        const user = get().currentUser;
        const taxRate = get().taxRate;
        const removedItem = order.items.find(i => i.id === itemId);
        
        const newItems = order.items.filter(item => item.id !== itemId);
        const subtotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * taxRate;
        const total = subtotal + tax + order.tip - order.discount;
        
        get().updateOrder(orderId, { items: newItems, subtotal, tax, total });
        
        if (user && removedItem) {
          get().addAuditLog({
            actorId: user.id,
            actorName: user.fullName,
            action: 'item_remove',
            entityType: 'order_item',
            entityId: itemId,
            metadata: { orderId, name: removedItem.name, quantity: removedItem.quantity }
          });
        }
      },
      
      sendOrderToKitchen: (orderId) => {
        const order = get().orders.find(o => o.id === orderId);
        if (!order) return;
        
        const user = get().currentUser;
        const now = new Date().toISOString();
        
        const newItems = order.items.map(item => 
          item.status === 'pending' ? { ...item, status: 'sent' as const, sentAt: now } : item
        );
        
        get().updateOrder(orderId, { items: newItems, status: 'sent' });
        
        if (user) {
          get().addAuditLog({
            actorId: user.id,
            actorName: user.fullName,
            action: 'order_send',
            entityType: 'order',
            entityId: orderId,
            metadata: { itemCount: order.items.filter(i => i.status === 'pending').length }
          });
        }
      },
      
      voidOrder: (orderId, reason) => {
        const user = get().currentUser;
        const order = get().orders.find(o => o.id === orderId);
        
        get().updateOrder(orderId, { status: 'voided' });
        
        if (order?.tableId) {
          get().updateTableStatus(order.tableId, 'available');
          get().updateTable(order.tableId, { currentOrderId: undefined });
        }
        
        if (user) {
          get().addAuditLog({
            actorId: user.id,
            actorName: user.fullName,
            action: 'order_void',
            entityType: 'order',
            entityId: orderId,
            metadata: { reason, total: order?.total }
          });
        }
      },
      
      completeOrder: (orderId) => {
        const order = get().orders.find(o => o.id === orderId);
        
        get().updateOrder(orderId, { status: 'paid', paidAt: new Date().toISOString() });
        
        if (order?.tableId) {
          get().updateTableStatus(order.tableId, 'cleaning');
          get().updateTable(order.tableId, { currentOrderId: undefined });
        }
      },
      
      getActiveOrders: () => {
        return get().orders.filter(o => !['paid', 'voided'].includes(o.status));
      },
      
      getOrdersByTable: (tableId) => {
        return get().orders.filter(o => o.tableId === tableId && !['paid', 'voided'].includes(o.status));
      },
      
      // Payments State
      payments: [],
      
      processPayment: (orderId, method, amount, tip = 0, cashTendered) => {
        const user = get().currentUser;
        const order = get().orders.find(o => o.id === orderId);
        
        const payment: Payment = {
          id: generateId(),
          orderId,
          method,
          amount,
          tip,
          status: 'approved',
          reference: `PAY-${Date.now()}`,
          cashTendered: method === 'cash' ? cashTendered : undefined,
          changeDue: method === 'cash' && cashTendered ? cashTendered - amount : undefined,
          createdAt: new Date().toISOString(),
          processedBy: user?.fullName || 'Unknown'
        };
        
        set(state => ({
          payments: [...state.payments, payment]
        }));
        
        // Update order with tip
        if (order) {
          const newTotal = order.subtotal + order.tax + tip - order.discount;
          get().updateOrder(orderId, { tip, total: newTotal });
        }
        
        get().completeOrder(orderId);
        
        if (user) {
          get().addAuditLog({
            actorId: user.id,
            actorName: user.fullName,
            action: 'payment_process',
            entityType: 'payment',
            entityId: payment.id,
            metadata: { orderId, method, amount, tip }
          });
        }
        
        return payment;
      },
      
      refundPayment: (paymentId, reason) => {
        const user = get().currentUser;
        
        set(state => ({
          payments: state.payments.map(p => 
            p.id === paymentId ? { ...p, status: 'refunded' } : p
          )
        }));
        
        if (user) {
          get().addAuditLog({
            actorId: user.id,
            actorName: user.fullName,
            action: 'payment_refund',
            entityType: 'payment',
            entityId: paymentId,
            metadata: { reason }
          });
        }
      },
      
      // Audit Logs
      auditLogs: [],
      
      addAuditLog: (log) => {
        const auditLog: AuditLog = {
          ...log,
          id: generateId(),
          createdAt: new Date().toISOString()
        };
        set(state => ({
          auditLogs: [auditLog, ...state.auditLogs].slice(0, 1000) // Keep last 1000 logs
        }));
      },
      
      // Users
      users: SAMPLE_USERS,
      
      addUser: (user) => {
        const id = generateId();
        const newUser: User = {
          ...user,
          id,
          createdAt: new Date().toISOString()
        };
        set(state => ({
          users: [...state.users, newUser]
        }));
      },
      
      updateUser: (id, updates) => set(state => ({
        users: state.users.map(u => u.id === id ? { ...u, ...updates } : u)
      })),
      
      deleteUser: (id) => set(state => ({
        users: state.users.map(u => u.id === id ? { ...u, isActive: false } : u)
      })),
      
      // Analytics
      getDailySummary: (date) => {
        const orders = get().orders.filter(o => 
          o.paidAt?.startsWith(date) && o.status === 'paid'
        );
        const payments = get().payments.filter(p => 
          p.createdAt.startsWith(date) && p.status === 'approved'
        );
        
        const itemCounts: Record<string, { name: string; quantity: number; revenue: number }> = {};
        orders.forEach(order => {
          order.items.forEach(item => {
            if (!itemCounts[item.menuItemId]) {
              itemCounts[item.menuItemId] = { name: item.name, quantity: 0, revenue: 0 };
            }
            itemCounts[item.menuItemId].quantity += item.quantity;
            itemCounts[item.menuItemId].revenue += item.price * item.quantity;
          });
        });
        
        const topItems = Object.values(itemCounts)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);
        
        return {
          date,
          totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
          orderCount: orders.length,
          averageOrderValue: orders.length > 0 
            ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length 
            : 0,
          tipTotal: orders.reduce((sum, o) => sum + o.tip, 0),
          discountTotal: orders.reduce((sum, o) => sum + o.discount, 0),
          taxTotal: orders.reduce((sum, o) => sum + o.tax, 0),
          cashPayments: payments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0),
          cardPayments: payments.filter(p => ['credit', 'debit'].includes(p.method)).reduce((sum, p) => sum + p.amount, 0),
          dineInOrders: orders.filter(o => o.type === 'dine-in').length,
          takeoutOrders: orders.filter(o => o.type === 'takeout').length,
          deliveryOrders: orders.filter(o => o.type === 'delivery').length,
          topItems
        };
      },
      
      // Settings
      taxRate: 0.0825, // 8.25%
      restaurantName: 'Dragon Palace',
      
      setTaxRate: (rate) => set({ taxRate: rate }),
      setRestaurantName: (name) => set({ restaurantName: name })
    }),
    {
      name: 'dragon-palace-pos',
      partialize: (state) => ({
        orders: state.orders,
        payments: state.payments,
        auditLogs: state.auditLogs,
        users: state.users,
        tables: state.tables,
        orderCounter: state.orderCounter,
        taxRate: state.taxRate,
        restaurantName: state.restaurantName
      })
    }
  )
);

