import { useState, useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Users,
  CreditCard,
  Banknote,
  Utensils,
  Truck,
  ChefHat,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { usePOSStore } from '../store';
import { clsx } from 'clsx';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const COLORS = ['#dc2626', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'];

export function AnalyticsView() {
  const orders = usePOSStore(state => state.orders);
  const payments = usePOSStore(state => state.payments);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');

  const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
  const startDate = startOfDay(subDays(new Date(), daysBack - 1));
  const endDate = endOfDay(new Date());

  const analytics = useMemo(() => {
    const paidOrders = orders.filter(o => 
      o.status === 'paid' && 
      o.paidAt &&
      new Date(o.paidAt) >= startDate &&
      new Date(o.paidAt) <= endDate
    );

    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
    const totalTips = paidOrders.reduce((sum, o) => sum + o.tip, 0);
    const orderCount = paidOrders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Daily breakdown
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const dailyData = days.map(day => {
      const dayOrders = paidOrders.filter(o => 
        o.paidAt && format(new Date(o.paidAt), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );
      return {
        date: format(day, 'MMM d'),
        revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
        orders: dayOrders.length,
        tips: dayOrders.reduce((sum, o) => sum + o.tip, 0),
      };
    });

    // Order type breakdown
    const orderTypes = {
      dineIn: paidOrders.filter(o => o.type === 'dine-in').length,
      takeout: paidOrders.filter(o => o.type === 'takeout').length,
      delivery: paidOrders.filter(o => o.type === 'delivery').length,
    };

    // Payment method breakdown
    const periodPayments = payments.filter(p =>
      p.status === 'approved' &&
      new Date(p.createdAt) >= startDate &&
      new Date(p.createdAt) <= endDate
    );
    
    const paymentMethods = {
      cash: periodPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0),
      card: periodPayments.filter(p => ['credit', 'debit'].includes(p.method)).reduce((sum, p) => sum + p.amount, 0),
    };

    // Top items
    const itemCounts: Record<string, { name: string; quantity: number; revenue: number }> = {};
    paidOrders.forEach(order => {
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

    // Compare with previous period
    const prevStart = startOfDay(subDays(startDate, daysBack));
    const prevEnd = endOfDay(subDays(startDate, 1));
    const prevOrders = orders.filter(o =>
      o.status === 'paid' &&
      o.paidAt &&
      new Date(o.paidAt) >= prevStart &&
      new Date(o.paidAt) <= prevEnd
    );
    const prevRevenue = prevOrders.reduce((sum, o) => sum + o.total, 0);
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalTips,
      orderCount,
      avgOrderValue,
      dailyData,
      orderTypes,
      paymentMethods,
      topItems,
      revenueChange,
    };
  }, [orders, payments, startDate, endDate, daysBack]);

  const pieData = [
    { name: 'Dine In', value: analytics.orderTypes.dineIn },
    { name: 'Takeout', value: analytics.orderTypes.takeout },
    { name: 'Delivery', value: analytics.orderTypes.delivery },
  ].filter(d => d.value > 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-ink-800/50 bg-ink-900/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-ink-100">Analytics</h1>
            <p className="text-ink-500 text-sm mt-1">
              Revenue and performance insights
            </p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  dateRange === range
                    ? 'bg-dragon-600 text-white'
                    : 'bg-ink-800 text-ink-400 hover:text-ink-200'
                )}
              >
                {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-jade-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-jade-400" />
              </div>
              {analytics.revenueChange !== 0 && (
                <div className={clsx(
                  'flex items-center gap-1 text-xs font-medium',
                  analytics.revenueChange > 0 ? 'text-jade-400' : 'text-dragon-400'
                )}>
                  {analytics.revenueChange > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {Math.abs(analytics.revenueChange).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-ink-100">{formatCurrency(analytics.totalRevenue)}</p>
            <p className="text-sm text-ink-500">Total Revenue</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="card p-5"
          >
            <div className="w-10 h-10 rounded-xl bg-dragon-500/20 flex items-center justify-center mb-3">
              <ShoppingBag className="w-5 h-5 text-dragon-400" />
            </div>
            <p className="text-2xl font-bold text-ink-100">{analytics.orderCount}</p>
            <p className="text-sm text-ink-500">Total Orders</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-5"
          >
            <div className="w-10 h-10 rounded-xl bg-gold-500/20 flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-gold-400" />
            </div>
            <p className="text-2xl font-bold text-ink-100">{formatCurrency(analytics.avgOrderValue)}</p>
            <p className="text-sm text-ink-500">Avg Order Value</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-5"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-ink-100">{formatCurrency(analytics.totalTips)}</p>
            <p className="text-sm text-ink-500">Total Tips</p>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Revenue Chart */}
          <div className="col-span-2 card p-5">
            <h3 className="font-semibold text-ink-100 mb-4">Revenue Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={v => `$${v}`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#dc2626" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Order Types Pie */}
          <div className="card p-5">
            <h3 className="font-semibold text-ink-100 mb-4">Order Types</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs text-ink-400">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Payment Methods */}
          <div className="card p-5">
            <h3 className="font-semibold text-ink-100 mb-4">Payment Methods</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-jade-400" />
                    <span className="text-ink-300">Cash</span>
                  </div>
                  <span className="font-medium text-ink-100">{formatCurrency(analytics.paymentMethods.cash)}</span>
                </div>
                <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-jade-500 rounded-full"
                    style={{ 
                      width: `${(analytics.paymentMethods.cash / (analytics.paymentMethods.cash + analytics.paymentMethods.card || 1)) * 100}%` 
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <span className="text-ink-300">Card</span>
                  </div>
                  <span className="font-medium text-ink-100">{formatCurrency(analytics.paymentMethods.card)}</span>
                </div>
                <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ 
                      width: `${(analytics.paymentMethods.card / (analytics.paymentMethods.cash + analytics.paymentMethods.card || 1)) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Top Items */}
          <div className="card p-5">
            <h3 className="font-semibold text-ink-100 mb-4">Top Selling Items</h3>
            <div className="space-y-3">
              {analytics.topItems.slice(0, 5).map((item, i) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                      i === 0 ? 'bg-gold-500/20 text-gold-400' :
                      i === 1 ? 'bg-ink-600/50 text-ink-300' :
                      i === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-ink-800 text-ink-500'
                    )}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-ink-200 text-sm">{item.name}</p>
                      <p className="text-ink-500 text-xs">{item.quantity} sold</p>
                    </div>
                  </div>
                  <span className="font-medium text-dragon-400">{formatCurrency(item.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

