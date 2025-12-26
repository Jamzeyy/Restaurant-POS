import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  Printer,
  DollarSign,
  Store,
  Bell,
  Shield,
  Database,
  Wifi,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { usePOSStore } from '../store';
import { clsx } from 'clsx';

export function SettingsView() {
  const restaurantName = usePOSStore(state => state.restaurantName);
  const setRestaurantName = usePOSStore(state => state.setRestaurantName);
  const taxRate = usePOSStore(state => state.taxRate);
  const setTaxRate = usePOSStore(state => state.setTaxRate);
  
  const [localName, setLocalName] = useState(restaurantName);
  const [localTaxRate, setLocalTaxRate] = useState((taxRate * 100).toFixed(2));
  const [saved, setSaved] = useState(false);

  // Mock printer data
  const [printers, setPrinters] = useState([
    { id: '1', name: 'Kitchen Printer', type: 'kitchen', ip: '192.168.1.100', status: 'online' },
    { id: '2', name: 'Receipt Printer', type: 'receipt', ip: '192.168.1.101', status: 'online' },
    { id: '3', name: 'Bar Printer', type: 'bar', ip: '192.168.1.102', status: 'offline' },
  ]);

  const handleSave = () => {
    setRestaurantName(localName);
    setTaxRate(parseFloat(localTaxRate) / 100);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sections = [
    { id: 'general', label: 'General', icon: Store },
    { id: 'printers', label: 'Printers', icon: Printer },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'data', label: 'Data', icon: Database },
  ];

  const [activeSection, setActiveSection] = useState('general');

  return (
    <div className="h-full flex">
      {/* Settings Navigation */}
      <nav className="w-64 border-r border-ink-800/50 p-4">
        <h2 className="text-lg font-display font-semibold text-ink-100 px-4 mb-4">Settings</h2>
        <div className="space-y-1">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={clsx(
                'w-full sidebar-link',
                activeSection === section.id && 'active'
              )}
            >
              <section.icon className="w-5 h-5" />
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeSection === 'general' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="max-w-2xl">
              <h1 className="text-2xl font-display font-bold text-ink-100 mb-6">General Settings</h1>
              
              <div className="card p-6 mb-6">
                <h3 className="font-semibold text-ink-100 mb-4">Restaurant Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-300 mb-2">
                      Restaurant Name
                    </label>
                    <input
                      type="text"
                      value={localName}
                      onChange={e => setLocalName(e.target.value)}
                      className="input"
                      placeholder="Dragon Palace"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-300 mb-2">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      value={localTaxRate}
                      onChange={e => setLocalTaxRate(e.target.value)}
                      className="input"
                      placeholder="8.25"
                      step="0.01"
                    />
                    <p className="text-sm text-ink-500 mt-1">
                      Applied to all orders automatically
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-6 mb-6">
                <h3 className="font-semibold text-ink-100 mb-4">Order Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink-200">Auto-print kitchen tickets</p>
                      <p className="text-sm text-ink-500">Print tickets when orders are sent to kitchen</p>
                    </div>
                    <button className="w-12 h-7 rounded-full bg-jade-500 relative">
                      <span className="absolute right-1 top-1 w-5 h-5 rounded-full bg-white shadow" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink-200">Auto-print receipts</p>
                      <p className="text-sm text-ink-500">Print receipt after payment is processed</p>
                    </div>
                    <button className="w-12 h-7 rounded-full bg-jade-500 relative">
                      <span className="absolute right-1 top-1 w-5 h-5 rounded-full bg-white shadow" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink-200">Require table for dine-in</p>
                      <p className="text-sm text-ink-500">Force table selection for dine-in orders</p>
                    </div>
                    <button className="w-12 h-7 rounded-full bg-jade-500 relative">
                      <span className="absolute right-1 top-1 w-5 h-5 rounded-full bg-white shadow" />
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSave}
                className={clsx(
                  'btn-primary',
                  saved && 'bg-jade-600 hover:bg-jade-500'
                )}
              >
                {saved ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {activeSection === 'printers' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="max-w-3xl">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-display font-bold text-ink-100">Printer Configuration</h1>
                <button className="btn-primary">
                  <Plus className="w-4 h-4" />
                  Add Printer
                </button>
              </div>

              <div className="space-y-4">
                {printers.map((printer) => (
                  <div key={printer.id} className="card p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={clsx(
                          'w-12 h-12 rounded-xl flex items-center justify-center',
                          printer.status === 'online' ? 'bg-jade-500/20' : 'bg-dragon-500/20'
                        )}>
                          <Printer className={clsx(
                            'w-6 h-6',
                            printer.status === 'online' ? 'text-jade-400' : 'text-dragon-400'
                          )} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-ink-100">{printer.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-ink-500 font-mono">{printer.ip}</span>
                            <span className="text-ink-600">•</span>
                            <span className="text-sm text-ink-500 capitalize">{printer.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                          printer.status === 'online' 
                            ? 'bg-jade-500/20 text-jade-400' 
                            : 'bg-dragon-500/20 text-dragon-400'
                        )}>
                          {printer.status === 'online' ? (
                            <Wifi className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          {printer.status === 'online' ? 'Online' : 'Offline'}
                        </div>
                        <button className="btn-ghost p-2">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button className="btn-ghost p-2 text-dragon-400 hover:bg-dragon-500/10">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card p-6 mt-6">
                <h3 className="font-semibold text-ink-100 mb-4">Print Routing</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-300 mb-2">
                      Kitchen Tickets
                    </label>
                    <select className="select">
                      <option value="1">Kitchen Printer</option>
                      <option value="">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-300 mb-2">
                      Customer Receipts
                    </label>
                    <select className="select">
                      <option value="2">Receipt Printer</option>
                      <option value="">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink-300 mb-2">
                      Bar Orders
                    </label>
                    <select className="select">
                      <option value="3">Bar Printer</option>
                      <option value="">None</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'payments' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="max-w-2xl">
              <h1 className="text-2xl font-display font-bold text-ink-100 mb-6">Payment Settings</h1>
              
              <div className="card p-6 mb-6">
                <h3 className="font-semibold text-ink-100 mb-4">Payment Methods</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink-200">Cash Payments</p>
                      <p className="text-sm text-ink-500">Accept cash at register</p>
                    </div>
                    <button className="w-12 h-7 rounded-full bg-jade-500 relative">
                      <span className="absolute right-1 top-1 w-5 h-5 rounded-full bg-white shadow" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink-200">Credit/Debit Cards</p>
                      <p className="text-sm text-ink-500">Accept card payments via terminal</p>
                    </div>
                    <button className="w-12 h-7 rounded-full bg-jade-500 relative">
                      <span className="absolute right-1 top-1 w-5 h-5 rounded-full bg-white shadow" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink-200">Gift Cards</p>
                      <p className="text-sm text-ink-500">Accept restaurant gift cards</p>
                    </div>
                    <button className="w-12 h-7 rounded-full bg-ink-700 relative">
                      <span className="absolute left-1 top-1 w-5 h-5 rounded-full bg-ink-500 shadow" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="card p-6 mb-6">
                <h3 className="font-semibold text-ink-100 mb-4">Card Terminal</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-300 mb-2">
                      Payment Processor
                    </label>
                    <select className="select">
                      <option>Stripe Terminal</option>
                      <option>Square</option>
                      <option>Clover</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-jade-500/10 border border-jade-500/30 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-jade-400" />
                    <div>
                      <p className="font-medium text-jade-400">Terminal Connected</p>
                      <p className="text-sm text-ink-400">Stripe BBPOS WisePad 3</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="font-semibold text-ink-100 mb-4">Tip Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-300 mb-2">
                      Suggested Tip Amounts
                    </label>
                    <div className="flex gap-2">
                      <input type="text" className="input" defaultValue="15" />
                      <input type="text" className="input" defaultValue="18" />
                      <input type="text" className="input" defaultValue="20" />
                      <input type="text" className="input" defaultValue="25" />
                    </div>
                    <p className="text-sm text-ink-500 mt-1">
                      Percentages shown to customers
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'data' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="max-w-2xl">
              <h1 className="text-2xl font-display font-bold text-ink-100 mb-6">Data Management</h1>
              
              <div className="card p-6 mb-6">
                <h3 className="font-semibold text-ink-100 mb-4">Export Data</h3>
                <p className="text-ink-400 mb-4">
                  Export your restaurant data for backup or analysis purposes.
                </p>
                <div className="flex gap-3">
                  <button className="btn-secondary">
                    Export Orders (CSV)
                  </button>
                  <button className="btn-secondary">
                    Export Menu (JSON)
                  </button>
                  <button className="btn-secondary">
                    Full Backup
                  </button>
                </div>
              </div>

              <div className="card p-6 border-dragon-500/30">
                <h3 className="font-semibold text-dragon-400 mb-4">Danger Zone</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink-200">Clear Order History</p>
                      <p className="text-sm text-ink-500">Remove all completed orders older than 90 days</p>
                    </div>
                    <button className="btn-ghost text-dragon-400 hover:bg-dragon-500/10">
                      Clear History
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink-200">Reset Audit Logs</p>
                      <p className="text-sm text-ink-500">Clear all activity logs</p>
                    </div>
                    <button className="btn-ghost text-dragon-400 hover:bg-dragon-500/10">
                      Reset Logs
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-ink-200">Factory Reset</p>
                      <p className="text-sm text-ink-500">Reset all data and settings to default</p>
                    </div>
                    <button className="btn-ghost text-dragon-400 hover:bg-dragon-500/10">
                      Reset All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {(activeSection === 'notifications' || activeSection === 'security') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center h-full"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-ink-800 flex items-center justify-center mx-auto mb-4">
                {activeSection === 'notifications' ? (
                  <Bell className="w-8 h-8 text-ink-500" />
                ) : (
                  <Shield className="w-8 h-8 text-ink-500" />
                )}
              </div>
              <h2 className="text-xl font-display font-semibold text-ink-300 mb-2">
                {activeSection === 'notifications' ? 'Notification Settings' : 'Security Settings'}
              </h2>
              <p className="text-ink-500">Coming soon in a future update</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

