import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Settings, 
  Users, 
  Clock, 
  ChefHat,
  Utensils,
  SprayCan,
  CalendarClock,
  Edit3,
  Trash2,
  X,
  Save
} from 'lucide-react';
import { usePOSStore } from '../store';
import type { Table, TableStatus, OrderType } from '../types';
import { TABLE_STATUS_LABELS } from '../types';
import { clsx } from 'clsx';

const statusColors: Record<TableStatus, { bg: string; border: string; text: string; icon: typeof Users }> = {
  available: { bg: 'bg-jade-500/20', border: 'border-jade-500/40', text: 'text-jade-400', icon: Users },
  occupied: { bg: 'bg-dragon-500/20', border: 'border-dragon-500/40', text: 'text-dragon-400', icon: Utensils },
  reserved: { bg: 'bg-gold-500/20', border: 'border-gold-500/40', text: 'text-gold-400', icon: CalendarClock },
  cleaning: { bg: 'bg-ink-600/20', border: 'border-ink-500/40', text: 'text-ink-400', icon: SprayCan },
};

export function FloorPlanView() {
  const navigate = useNavigate();
  const tables = usePOSStore(state => state.tables);
  const updateTablePosition = usePOSStore(state => state.updateTablePosition);
  const updateTableStatus = usePOSStore(state => state.updateTableStatus);
  const createOrder = usePOSStore(state => state.createOrder);
  const getOrdersByTable = usePOSStore(state => state.getOrdersByTable);
  const currentUser = usePOSStore(state => state.currentUser);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType>('dine-in');
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canEditLayout = currentUser?.permissions.includes('tables:layout');

  const handleTableClick = (table: Table) => {
    if (isEditMode) {
      setSelectedTable(table);
      return;
    }

    if (table.status === 'occupied' && table.currentOrderId) {
      navigate(`/order/${table.currentOrderId}`);
    } else if (table.status === 'available') {
      setSelectedTable(table);
      setShowNewOrderModal(true);
    } else if (table.status === 'cleaning') {
      updateTableStatus(table.id, 'available');
    } else if (table.status === 'reserved') {
      setSelectedTable(table);
      setShowNewOrderModal(true);
    }
  };

  const handleStartOrder = () => {
    if (!selectedTable) return;
    
    const order = createOrder(selectedOrderType, selectedOrderType === 'dine-in' ? selectedTable.id : undefined);
    setShowNewOrderModal(false);
    setSelectedTable(null);
    navigate(`/order/${order.id}`);
  };

  const handleNewTakeoutDelivery = (type: OrderType) => {
    const order = createOrder(type);
    navigate(`/order/${order.id}`);
  };

  const handleDragStart = (e: React.MouseEvent, table: Table) => {
    if (!isEditMode) return;
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDraggedTable(table.id);
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!draggedTable || !isEditMode) return;
    
    const container = document.getElementById('floor-plan-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    
    updateTablePosition(draggedTable, { 
      x: Math.max(0, Math.min(x, rect.width - 80)),
      y: Math.max(0, Math.min(y, rect.height - 80))
    });
  };

  const handleDragEnd = () => {
    setDraggedTable(null);
  };

  const getTableStatusIcon = (status: TableStatus) => {
    const Icon = statusColors[status].icon;
    return <Icon className="w-4 h-4" />;
  };

  const sections = [...new Set(tables.map(t => t.section).filter(Boolean))];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-ink-800/50 bg-ink-900/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-ink-100">Floor Plan</h1>
            <p className="text-ink-500 text-sm mt-1">
              Click a table to view or start an order
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Quick Actions */}
            <button 
              onClick={() => handleNewTakeoutDelivery('takeout')}
              className="btn-secondary"
            >
              <ChefHat className="w-4 h-4" />
              New Takeout
            </button>
            <button 
              onClick={() => handleNewTakeoutDelivery('delivery')}
              className="btn-secondary"
            >
              <Clock className="w-4 h-4" />
              New Delivery
            </button>
            
            {canEditLayout && (
              <button 
                onClick={() => setIsEditMode(!isEditMode)}
                className={clsx(
                  'btn',
                  isEditMode ? 'btn-gold' : 'btn-ghost'
                )}
              >
                {isEditMode ? <Save className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                {isEditMode ? 'Save Layout' : 'Edit Layout'}
              </button>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4">
          {Object.entries(TABLE_STATUS_LABELS).map(([status, label]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={clsx(
                'w-3 h-3 rounded-full',
                statusColors[status as TableStatus].bg,
                'border',
                statusColors[status as TableStatus].border
              )} />
              <span className="text-sm text-ink-400">{label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* Floor Plan Container */}
      <div 
        id="floor-plan-container"
        className="flex-1 relative overflow-auto p-6 pattern-grid"
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {/* Section Labels */}
        {sections.map(section => (
          <div 
            key={section}
            className="absolute text-xs uppercase tracking-wider text-ink-600 font-medium"
            style={{
              left: section === 'vip' ? 620 : section === 'bar' ? 40 : 40,
              top: section === 'vip' ? 60 : section === 'bar' ? 400 : 30,
            }}
          >
            {section === 'vip' ? '✦ VIP Room' : section === 'bar' ? '🍸 Bar Area' : '🍽️ Main Dining'}
          </div>
        ))}

        {/* Tables */}
        {tables.map((table) => {
          const colors = statusColors[table.status];
          const tableOrders = getOrdersByTable(table.id);
          const activeOrder = tableOrders[0];
          
          return (
            <motion.div
              key={table.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: draggedTable === table.id ? 1.05 : 1, 
                opacity: 1,
                x: table.position.x,
                y: table.position.y
              }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={clsx(
                'absolute cursor-pointer transition-all duration-200',
                'flex flex-col items-center justify-center gap-1',
                'border-2',
                colors.bg,
                colors.border,
                colors.text,
                table.shape === 'round' && 'rounded-full',
                table.shape === 'square' && 'rounded-xl',
                table.shape === 'rectangle' && 'rounded-xl',
                draggedTable === table.id && 'shadow-glow z-50',
                isEditMode && 'ring-2 ring-gold-500/30 ring-offset-2 ring-offset-ink-950'
              )}
              style={{
                width: table.size.width,
                height: table.size.height,
                transform: table.rotation ? `rotate(${table.rotation}deg)` : undefined,
              }}
              onClick={() => handleTableClick(table)}
              onMouseDown={(e) => handleDragStart(e, table)}
            >
              <span className="font-bold text-lg">{table.label}</span>
              <div className="flex items-center gap-1 text-xs opacity-75">
                {getTableStatusIcon(table.status)}
                <span>{table.seats}</span>
              </div>
              {activeOrder && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-dragon-600 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                  ${activeOrder.total.toFixed(0)}
                </div>
              )}
              
              {isEditMode && (
                <div className="absolute -top-2 -right-2 flex gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedTable(table); }}
                    className="w-6 h-6 rounded-full bg-gold-500 text-ink-950 flex items-center justify-center hover:bg-gold-400"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Add Table Button (Edit Mode) */}
        {isEditMode && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-dragon-500 to-dragon-700 text-white shadow-glow flex items-center justify-center hover:from-dragon-400 hover:to-dragon-600 transition-all"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        )}
      </div>

      {/* New Order Modal */}
      <AnimatePresence>
        {showNewOrderModal && selectedTable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowNewOrderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-semibold text-ink-100">
                  Start Order - {selectedTable.label}
                </h2>
                <button 
                  onClick={() => setShowNewOrderModal(false)}
                  className="btn-ghost p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {(['dine-in', 'takeout', 'delivery'] as OrderType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedOrderType(type)}
                    className={clsx(
                      'w-full p-4 rounded-xl border-2 text-left transition-all',
                      selectedOrderType === type
                        ? 'border-dragon-500 bg-dragon-500/10'
                        : 'border-ink-700 hover:border-ink-600'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {type === 'dine-in' && <Utensils className="w-5 h-5 text-jade-400" />}
                      {type === 'takeout' && <ChefHat className="w-5 h-5 text-gold-400" />}
                      {type === 'delivery' && <Clock className="w-5 h-5 text-dragon-400" />}
                      <div>
                        <p className="font-medium text-ink-100 capitalize">{type.replace('-', ' ')}</p>
                        <p className="text-sm text-ink-500">
                          {type === 'dine-in' && `Seat guests at ${selectedTable.label}`}
                          {type === 'takeout' && 'Customer picks up order'}
                          {type === 'delivery' && 'Order delivered to customer'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowNewOrderModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleStartOrder}
                  className="btn-primary flex-1"
                >
                  Start Order
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Table Modal */}
      <AnimatePresence>
        {isEditMode && selectedTable && !showNewOrderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setSelectedTable(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-semibold text-ink-100">
                  Edit Table {selectedTable.label}
                </h2>
                <button 
                  onClick={() => setSelectedTable(null)}
                  className="btn-ghost p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">Table Label</label>
                  <input 
                    type="text" 
                    value={selectedTable.label}
                    className="input"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">Seats</label>
                  <input 
                    type="number" 
                    value={selectedTable.seats}
                    className="input"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">Status</label>
                  <select className="select" value={selectedTable.status}>
                    {Object.entries(TABLE_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="btn-ghost text-dragon-400 hover:bg-dragon-500/10">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
                <button 
                  onClick={() => setSelectedTable(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setSelectedTable(null)}
                  className="btn-primary flex-1"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

