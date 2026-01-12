import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  DollarSign,
  Printer,
  X,
  ChefHat,
  Flame,
  Leaf,
  Fish,
  AlertCircle,
  CreditCard,
  Banknote,
  Check,
  Gift
} from 'lucide-react';
import { usePOSStore } from '../store';
import type { MenuItem, MenuCategory, PaymentMethod } from '../types';
import { MENU_CATEGORY_LABELS } from '../types';
import { QUICK_TAGS } from '../data/sampleData';
import { clsx } from 'clsx';

const tagIcons: Record<string, typeof Flame> = {
  spicy: Flame,
  vegetarian: Leaf,
  seafood: Fish,
};

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export function OrderView() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  
  const orders = usePOSStore(state => state.orders);
  const currentOrder = usePOSStore(state => state.currentOrder);
  const setCurrentOrder = usePOSStore(state => state.setCurrentOrder);
  const addItemToOrder = usePOSStore(state => state.addItemToOrder);
  const updateOrderItem = usePOSStore(state => state.updateOrderItem);
  const removeOrderItem = usePOSStore(state => state.removeOrderItem);
  const sendOrderToKitchen = usePOSStore(state => state.sendOrderToKitchen);
  const updateOrder = usePOSStore(state => state.updateOrder);
  const processPayment = usePOSStore(state => state.processPayment);
  const voidOrder = usePOSStore(state => state.voidOrder);
  const taxRate = usePOSStore(state => state.taxRate);
  
  const menuSearchTerm = usePOSStore(state => state.menuSearchTerm);
  const setMenuSearchTerm = usePOSStore(state => state.setMenuSearchTerm);
  const activeCategory = usePOSStore(state => state.activeCategory);
  const setActiveCategory = usePOSStore(state => state.setActiveCategory);
  const activeTags = usePOSStore(state => state.activeTags);
  const toggleTag = usePOSStore(state => state.toggleTag);
  const getFilteredMenuItems = usePOSStore(state => state.getFilteredMenuItems);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  // Load order from URL param
  useEffect(() => {
    if (orderId) {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        setCurrentOrder(order);
      } else {
        navigate('/floor');
      }
    }
  }, [orderId, orders, setCurrentOrder, navigate]);

  // Keep current order in sync
  useEffect(() => {
    if (currentOrder) {
      const updated = orders.find(o => o.id === currentOrder.id);
      if (updated && updated !== currentOrder) {
        setCurrentOrder(updated);
      }
    }
  }, [orders, currentOrder, setCurrentOrder]);

  if (!currentOrder) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-ink-600 mx-auto mb-4" />
          <p className="text-ink-400">No order selected</p>
          <button onClick={() => navigate('/floor')} className="btn-primary mt-4">
            Go to Floor Plan
          </button>
        </div>
      </div>
    );
  }

  const menuItems = getFilteredMenuItems();
  const categories: (MenuCategory | 'all')[] = ['all', 'dimsum', 'lunch', 'dinner', 'drinks', 'desserts'];
  
  const pendingItems = currentOrder.items.filter(i => i.status === 'pending');
  const sentItems = currentOrder.items.filter(i => i.status !== 'pending');

  const handleAddItem = (item: MenuItem) => {
    addItemToOrder(currentOrder.id, item);
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    const item = currentOrder.items.find(i => i.id === itemId);
    if (!item) return;
    
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeOrderItem(currentOrder.id, itemId);
    } else {
      updateOrderItem(currentOrder.id, itemId, { quantity: newQty });
    }
  };

  const handleSendToKitchen = () => {
    if (pendingItems.length === 0) return;
    sendOrderToKitchen(currentOrder.id);
  };

  const handleProcessPayment = () => {
    const tip = parseFloat(tipAmount) || 0;
    const cash = parseFloat(cashTendered) || 0;
    
    processPayment(
      currentOrder.id,
      paymentMethod,
      currentOrder.total + tip,
      tip,
      paymentMethod === 'cash' ? cash : undefined
    );
    
    setShowPaymentModal(false);
    navigate('/floor');
  };

  const handleVoidOrder = () => {
    if (!voidReason.trim()) return;
    voidOrder(currentOrder.id, voidReason);
    setShowVoidModal(false);
    navigate('/floor');
  };

  const tipPresets = [0, 15, 18, 20, 25];
  const calculateTip = (percent: number) => (currentOrder.subtotal * percent / 100).toFixed(2);
  const changeDue = paymentMethod === 'cash' 
    ? Math.max(0, parseFloat(cashTendered || '0') - (currentOrder.total + parseFloat(tipAmount || '0')))
    : 0;

  return (
    <div className="h-full flex">
      {/* Menu Section */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-ink-800/50">
        {/* Menu Header */}
        <div className="flex-shrink-0 p-4 border-b border-ink-800/50 bg-ink-900/30">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => navigate('/floor')} className="btn-ghost p-2">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-display font-bold text-ink-100">
                Order #{currentOrder.orderNumber}
              </h1>
              <p className="text-sm text-ink-500">
                {currentOrder.type === 'dine-in' && `Table ${currentOrder.tableLabel}`}
                {currentOrder.type === 'takeout' && 'Takeout Order'}
                {currentOrder.type === 'delivery' && 'Delivery Order'}
                {' • '}{currentOrder.serverName}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
            <input
              type="text"
              placeholder="Search menu..."
              value={menuSearchTerm}
              onChange={e => setMenuSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                  activeCategory === cat
                    ? 'bg-dragon-600 text-white'
                    : 'bg-ink-800 text-ink-400 hover:text-ink-200'
                )}
              >
                {cat === 'all' ? 'All Items' : MENU_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2 mt-3">
            {QUICK_TAGS.map(tag => {
              const Icon = tagIcons[tag];
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all',
                    activeTags.includes(tag)
                      ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                      : 'bg-ink-800 text-ink-500 hover:text-ink-300'
                  )}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  <span className="capitalize">{tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {menuItems.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => handleAddItem(item)}
                className="card p-4 cursor-pointer hover:border-dragon-500/50 transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-ink-100 truncate group-hover:text-dragon-400 transition-colors">
                      {item.name}
                    </h3>
                    {item.nameChinese && (
                      <p className="text-sm text-ink-500">{item.nameChinese}</p>
                    )}
                  </div>
                  <span className="text-dragon-400 font-semibold ml-2">
                    {formatCurrency(item.price)}
                  </span>
                </div>
                <p className="text-xs text-ink-500 line-clamp-2 mb-2">{item.description}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.spiceLevel && item.spiceLevel > 0 && (
                    <span className="badge-dragon">
                      {Array(item.spiceLevel).fill('🌶️').join('')}
                    </span>
                  )}
                  {item.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="badge-ink text-[10px]">{tag}</span>
                  ))}
                </div>
                <div className="absolute inset-0 bg-dragon-500/5 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity flex items-center justify-center">
                  <Plus className="w-8 h-8 text-dragon-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Ticket Section */}
      <div className="w-96 flex flex-col bg-ink-900/50">
        {/* Ticket Header */}
        <div className="flex-shrink-0 p-4 border-b border-ink-800/50">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-ink-100">Order Ticket</h2>
            <span className="badge-dragon">{currentOrder.items.length} items</span>
          </div>
        </div>

        {/* Order Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {currentOrder.items.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <ChefHat className="w-12 h-12 text-ink-700 mx-auto mb-3" />
                <p className="text-ink-500">No items yet</p>
                <p className="text-sm text-ink-600">Click menu items to add</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pending Items */}
              {pendingItems.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-gold-500 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
                    Pending ({pendingItems.length})
                  </p>
                  {pendingItems.map(item => (
                    <div key={item.id} className="bg-ink-800/50 rounded-xl p-3 mb-2 border border-gold-500/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-ink-100 truncate">{item.name}</p>
                          {item.nameChinese && (
                            <p className="text-xs text-ink-500">{item.nameChinese}</p>
                          )}
                          <p className="text-sm text-ink-400">
                            {formatCurrency(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="w-8 h-8 rounded-lg bg-ink-700 text-ink-300 hover:bg-ink-600 flex items-center justify-center"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="w-8 h-8 rounded-lg bg-ink-700 text-ink-300 hover:bg-ink-600 flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeOrderItem(currentOrder.id, item.id)}
                            className="w-8 h-8 rounded-lg text-dragon-400 hover:bg-dragon-500/10 flex items-center justify-center ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sent Items */}
              {sentItems.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-jade-500 mb-2 flex items-center gap-2">
                    <Check className="w-3 h-3" />
                    Sent to Kitchen ({sentItems.length})
                  </p>
                  {sentItems.map(item => (
                    <div key={item.id} className="bg-ink-800/30 rounded-xl p-3 mb-2 opacity-75">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-ink-300 truncate">{item.name}</p>
                          <p className="text-sm text-ink-500">
                            {formatCurrency(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <p className="font-medium text-ink-400">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Order Totals */}
        <div className="flex-shrink-0 border-t border-ink-800/50 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">Subtotal</span>
            <span className="text-ink-300">{formatCurrency(currentOrder.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-500">Tax ({(taxRate * 100).toFixed(2)}%)</span>
            <span className="text-ink-300">{formatCurrency(currentOrder.tax)}</span>
          </div>
          {currentOrder.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-ink-500">Discount</span>
              <span className="text-jade-400">-{formatCurrency(currentOrder.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-ink-700">
            <span className="text-ink-100">Total</span>
            <span className="text-dragon-400">{formatCurrency(currentOrder.total)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 p-4 border-t border-ink-800/50 space-y-3">
          {pendingItems.length > 0 && (
            <button
              onClick={handleSendToKitchen}
              className="w-full btn-gold py-3"
            >
              <Send className="w-5 h-5" />
              Send to Kitchen ({pendingItems.length} items)
            </button>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowVoidModal(true)}
              className="btn-ghost text-dragon-400 hover:bg-dragon-500/10"
            >
              <Trash2 className="w-4 h-4" />
              Void
            </button>
            <button className="btn-secondary flex-1">
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={currentOrder.items.length === 0}
              className="btn-primary flex-1"
            >
              <DollarSign className="w-4 h-4" />
              Pay
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card p-6 w-full max-w-lg"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-semibold text-ink-100">
                  Process Payment
                </h2>
                <button onClick={() => setShowPaymentModal(false)} className="btn-ghost p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order Summary */}
              <div className="bg-ink-800/50 rounded-xl p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-ink-400">Subtotal</span>
                  <span>{formatCurrency(currentOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-ink-400">Tax</span>
                  <span>{formatCurrency(currentOrder.tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-ink-700 pt-2 mt-2">
                  <span>Total</span>
                  <span className="text-dragon-400">{formatCurrency(currentOrder.total)}</span>
                </div>
              </div>

              {/* Tip Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-ink-300 mb-3">Add Tip</label>
                <div className="flex gap-2 mb-3">
                  {tipPresets.map(percent => (
                    <button
                      key={percent}
                      onClick={() => setTipAmount(calculateTip(percent))}
                      className={clsx(
                        'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                        tipAmount === calculateTip(percent)
                          ? 'bg-jade-500/20 text-jade-400 border border-jade-500/30'
                          : 'bg-ink-800 text-ink-400 hover:text-ink-200'
                      )}
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Custom tip amount"
                  value={tipAmount}
                  onChange={e => setTipAmount(e.target.value)}
                  className="input"
                />
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-ink-300 mb-3">Payment Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { method: 'cash', icon: Banknote, label: 'Cash' },
                    { method: 'credit', icon: CreditCard, label: 'Credit' },
                    { method: 'debit', icon: CreditCard, label: 'Debit' },
                    { method: 'gift_card', icon: Gift, label: 'Gift' },
                  ].map(({ method, icon: Icon, label }) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method as PaymentMethod)}
                      className={clsx(
                        'p-3 rounded-xl border-2 text-center transition-all',
                        paymentMethod === method
                          ? 'border-dragon-500 bg-dragon-500/10'
                          : 'border-ink-700 hover:border-ink-600'
                      )}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Tendered */}
              {paymentMethod === 'cash' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-ink-300 mb-2">
                    Cash Tendered
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)}
                    className="input text-2xl font-mono"
                  />
                  {changeDue > 0 && (
                    <p className="mt-2 text-jade-400 font-medium">
                      Change Due: {formatCurrency(changeDue)}
                    </p>
                  )}
                </div>
              )}

              {/* Final Total */}
              <div className="bg-dragon-500/10 border border-dragon-500/30 rounded-xl p-4 mb-6">
                <div className="flex justify-between text-xl font-bold">
                  <span>Final Total</span>
                  <span className="text-dragon-400">
                    {formatCurrency(currentOrder.total + parseFloat(tipAmount || '0'))}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => setShowPaymentModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleProcessPayment}
                  disabled={paymentMethod === 'cash' && parseFloat(cashTendered || '0') < currentOrder.total + parseFloat(tipAmount || '0')}
                  className="btn-primary flex-1"
                >
                  <Check className="w-5 h-5" />
                  Complete Payment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Void Order Modal */}
      <AnimatePresence>
        {showVoidModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowVoidModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-dragon-500/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-dragon-400" />
                </div>
                <div>
                  <h2 className="text-xl font-display font-semibold text-ink-100">Void Order</h2>
                  <p className="text-sm text-ink-500">This action cannot be undone</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-ink-300 mb-2">
                  Reason for voiding <span className="text-dragon-400">*</span>
                </label>
                <textarea
                  value={voidReason}
                  onChange={e => setVoidReason(e.target.value)}
                  placeholder="Enter reason..."
                  rows={3}
                  className="input resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowVoidModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleVoidOrder}
                  disabled={!voidReason.trim()}
                  className="btn-primary bg-dragon-600 hover:bg-dragon-500 flex-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Void Order
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

