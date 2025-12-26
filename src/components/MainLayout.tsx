import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutGrid, 
  ClipboardList, 
  UtensilsCrossed, 
  BarChart3, 
  ScrollText, 
  Users, 
  Settings, 
  LogOut,
  ShoppingBag,
  Truck
} from 'lucide-react';
import { usePOSStore } from '../store';
import { clsx } from 'clsx';

const navItems = [
  { to: '/floor', icon: LayoutGrid, label: 'Floor Plan' },
  { to: '/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin', 'manager'] },
  { to: '/audit', icon: ScrollText, label: 'Audit Log', roles: ['admin', 'manager'] },
  { to: '/users', icon: Users, label: 'Users', roles: ['admin'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['admin', 'manager'] },
];

export function MainLayout() {
  const navigate = useNavigate();
  const currentUser = usePOSStore(state => state.currentUser);
  const logout = usePOSStore(state => state.logout);
  const restaurantName = usePOSStore(state => state.restaurantName);
  const activeOrders = usePOSStore(state => state.getActiveOrders());

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter(item => {
    if (!item.roles) return true;
    return currentUser && item.roles.includes(currentUser.role);
  });

  const orderCounts = {
    dineIn: activeOrders.filter(o => o.type === 'dine-in').length,
    takeout: activeOrders.filter(o => o.type === 'takeout').length,
    delivery: activeOrders.filter(o => o.type === 'delivery').length,
  };

  return (
    <div className="flex h-screen bg-ink-950 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-64 bg-ink-900/50 border-r border-ink-800/50 flex flex-col"
      >
        {/* Logo */}
        <div className="p-6 border-b border-ink-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-dragon-500 to-dragon-700 flex items-center justify-center shadow-glow">
              <span className="text-xl">🐉</span>
            </div>
            <div>
              <h1 className="font-display font-semibold text-ink-100">{restaurantName}</h1>
              <p className="text-xs text-ink-500">Point of Sale</p>
            </div>
          </div>
        </div>

        {/* Active Orders Summary */}
        <div className="px-4 py-4 border-b border-ink-800/50">
          <p className="text-xs uppercase tracking-wider text-ink-500 mb-3 px-2">Active Orders</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-ink-800/50 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-jade-400 mb-1">
                <UtensilsCrossed className="w-3 h-3" />
                <span className="text-sm font-semibold">{orderCounts.dineIn}</span>
              </div>
              <span className="text-[10px] text-ink-500">Dine In</span>
            </div>
            <div className="bg-ink-800/50 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-gold-400 mb-1">
                <ShoppingBag className="w-3 h-3" />
                <span className="text-sm font-semibold">{orderCounts.takeout}</span>
              </div>
              <span className="text-[10px] text-ink-500">Takeout</span>
            </div>
            <div className="bg-ink-800/50 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-dragon-400 mb-1">
                <Truck className="w-3 h-3" />
                <span className="text-sm font-semibold">{orderCounts.delivery}</span>
              </div>
              <span className="text-[10px] text-ink-500">Delivery</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx('sidebar-link', isActive && 'active')
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-ink-800/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-dragon-600 to-gold-600 flex items-center justify-center">
              <span className="font-semibold text-white">
                {currentUser?.fullName.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink-100 truncate">{currentUser?.fullName}</p>
              <p className="text-xs text-ink-500 capitalize">{currentUser?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full btn-ghost text-ink-400 hover:text-dragon-400 justify-start"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

