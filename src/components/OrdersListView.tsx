import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  ChefHat,
  Utensils,
  Truck,
  ShoppingBag,
  Eye,
  DollarSign
} from 'lucide-react';
import { usePOSStore } from '../store';
import type { Order, OrderStatus, OrderType } from '../types';
import { ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from '../types';
import { clsx } from 'clsx';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const statusColors: Record<OrderStatus, { bg: string; text: string; icon: typeof Clock }> = {
  open: { bg: 'bg-gold-500/20', text: 'text-gold-400', icon: Clock },
  sent: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: ChefHat },
  preparing: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: ChefHat },
  ready: { bg: 'bg-jade-500/20', text: 'text-jade-400', icon: CheckCircle },
  served: { bg: 'bg-jade-500/20', text: 'text-jade-400', icon: CheckCircle },
  paid: { bg: 'bg-ink-600/20', text: 'text-ink-400', icon: DollarSign },
  voided: { bg: 'bg-dragon-500/20', text: 'text-dragon-400', icon: XCircle },
};

const typeIcons: Record<OrderType, typeof Utensils> = {
  'dine-in': Utensils,
  'takeout': ShoppingBag,
  'delivery': Truck,
};

export function OrdersListView() {
  const navigate = useNavigate();
  const orders = usePOSStore(state => state.orders);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<OrderType | 'all'>('all');

  const filteredOrders = orders
    .filter(order => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (typeFilter !== 'all' && order.type !== typeFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (
          !order.orderNumber.toString().includes(search) &&
          !order.serverName.toLowerCase().includes(search) &&
          !(order.tableLabel?.toLowerCase().includes(search))
        ) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const activeOrders = orders.filter(o => !['paid', 'voided'].includes(o.status));
  const todayOrders = orders.filter(o => {
    const today = new Date().toDateString();
    return new Date(o.createdAt).toDateString() === today;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-ink-800/50 bg-ink-900/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-ink-100">Orders</h1>
            <p className="text-ink-500 text-sm mt-1">
              {activeOrders.length} active • {todayOrders.length} today
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
            <input
              type="text"
              placeholder="Search by order #, server, table..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-ink-500" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as OrderStatus | 'all')}
              className="select"
            >
              <option value="all">All Status</option>
              {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as OrderType | 'all')}
              className="select"
            >
              <option value="all">All Types</option>
              {Object.entries(ORDER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredOrders.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <ChefHat className="w-16 h-16 text-ink-700 mx-auto mb-4" />
              <p className="text-ink-400 text-lg">No orders found</p>
              <p className="text-ink-600 text-sm">Try adjusting your filters</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order, i) => {
              const StatusIcon = statusColors[order.status].icon;
              const TypeIcon = typeIcons[order.type];
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => navigate(`/order/${order.id}`)}
                  className="card p-4 cursor-pointer hover:border-dragon-500/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Order Number */}
                      <div className="w-16 h-16 rounded-xl bg-ink-800 flex flex-col items-center justify-center">
                        <span className="text-xs text-ink-500">ORDER</span>
                        <span className="text-xl font-bold text-ink-100">#{order.orderNumber}</span>
                      </div>

                      {/* Order Details */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={clsx(
                            'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium',
                            statusColors[order.status].bg,
                            statusColors[order.status].text
                          )}>
                            <StatusIcon className="w-3 h-3" />
                            {ORDER_STATUS_LABELS[order.status]}
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-ink-800 text-xs text-ink-400">
                            <TypeIcon className="w-3 h-3" />
                            {ORDER_TYPE_LABELS[order.type]}
                          </div>
                        </div>
                        <p className="text-ink-300">
                          {order.type === 'dine-in' && `Table ${order.tableLabel}`}
                          {order.type === 'takeout' && 'Takeout'}
                          {order.type === 'delivery' && 'Delivery'}
                          {' • '}{order.serverName}
                        </p>
                        <p className="text-sm text-ink-500">
                          {format(new Date(order.createdAt), 'MMM d, h:mm a')}
                          {' • '}{order.items.length} items
                        </p>
                      </div>
                    </div>

                    {/* Total & Actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-dragon-400">
                          {formatCurrency(order.total)}
                        </p>
                        {order.tip > 0 && (
                          <p className="text-xs text-ink-500">
                            +{formatCurrency(order.tip)} tip
                          </p>
                        )}
                      </div>
                      <button className="btn-ghost p-3">
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Items Preview */}
                  {order.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-ink-800/50">
                      <div className="flex flex-wrap gap-2">
                        {order.items.slice(0, 5).map(item => (
                          <span key={item.id} className="badge-ink">
                            {item.quantity}× {item.name}
                          </span>
                        ))}
                        {order.items.length > 5 && (
                          <span className="badge-ink">+{order.items.length - 5} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

