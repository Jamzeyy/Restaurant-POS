import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Eye,
  EyeOff,
  Flame
} from 'lucide-react';
import { usePOSStore } from '../store';
import type { MenuItem, MenuCategory } from '../types';
import { MENU_CATEGORY_LABELS } from '../types';
import { clsx } from 'clsx';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export function MenuView() {
  const menuItems = usePOSStore(state => state.menuItems);
  const currentUser = usePOSStore(state => state.currentUser);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MenuCategory | 'all'>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const canEdit = currentUser?.permissions.includes('menu:write');

  const filteredItems = menuItems.filter(item => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !item.name.toLowerCase().includes(search) &&
        !item.description.toLowerCase().includes(search) &&
        !item.sku.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    return true;
  });

  const categories: (MenuCategory | 'all')[] = ['all', 'dimsum', 'lunch', 'dinner', 'drinks', 'desserts'];

  const itemsByCategory = categories.slice(1).reduce((acc, cat) => {
    acc[cat] = filteredItems.filter(item => item.category === cat);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const handleEditItem = (item: MenuItem) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-ink-800/50 bg-ink-900/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-ink-100">Menu Management</h1>
            <p className="text-ink-500 text-sm mt-1">
              {menuItems.length} items • {menuItems.filter(i => i.isAvailable).length} available
            </p>
          </div>
          {canEdit && (
            <button className="btn-primary">
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  categoryFilter === cat
                    ? 'bg-dragon-600 text-white'
                    : 'bg-ink-800 text-ink-400 hover:text-ink-200'
                )}
              >
                {cat === 'all' ? 'All' : MENU_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto p-6">
        {categoryFilter === 'all' ? (
          // Grouped by category
          Object.entries(itemsByCategory).map(([cat, items]) => {
            if (items.length === 0) return null;
            return (
              <div key={cat} className="mb-8">
                <h2 className="text-lg font-display font-semibold text-ink-200 mb-4">
                  {MENU_CATEGORY_LABELS[cat as MenuCategory]}
                  <span className="text-ink-500 text-sm font-normal ml-2">({items.length})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item, i) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      index={i}
                      canEdit={canEdit}
                      onEdit={() => handleEditItem(item)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          // Flat list for single category
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item, i) => (
              <MenuItemCard
                key={item.id}
                item={item}
                index={i}
                canEdit={canEdit}
                onEdit={() => handleEditItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-semibold text-ink-100">
                  Edit Menu Item
                </h2>
                <button onClick={() => setShowEditModal(false)} className="btn-ghost p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">Name</label>
                  <input type="text" value={selectedItem.name} className="input" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">Chinese Name</label>
                  <input type="text" value={selectedItem.nameChinese || ''} className="input" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">SKU</label>
                  <input type="text" value={selectedItem.sku} className="input" readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">Price</label>
                  <input type="number" value={selectedItem.price} className="input" readOnly />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-ink-300 mb-2">Description</label>
                  <textarea value={selectedItem.description} className="input resize-none" rows={3} readOnly />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">Category</label>
                  <select value={selectedItem.category} className="select" disabled>
                    {Object.entries(MENU_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">Spice Level</label>
                  <select value={selectedItem.spiceLevel || 0} className="select" disabled>
                    <option value={0}>Not Spicy</option>
                    <option value={1}>Mild 🌶️</option>
                    <option value={2}>Medium 🌶️🌶️</option>
                    <option value={3}>Hot 🌶️🌶️🌶️</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-ink-800/50 rounded-xl mb-6">
                <div className="flex items-center gap-3">
                  {selectedItem.isAvailable ? (
                    <Eye className="w-5 h-5 text-jade-400" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-ink-500" />
                  )}
                  <div>
                    <p className="font-medium text-ink-100">
                      {selectedItem.isAvailable ? 'Available' : 'Unavailable'}
                    </p>
                    <p className="text-sm text-ink-500">
                      {selectedItem.isAvailable 
                        ? 'Item is visible on the menu' 
                        : 'Item is hidden from the menu'}
                    </p>
                  </div>
                </div>
                <button className={clsx(
                  'btn',
                  selectedItem.isAvailable ? 'btn-secondary' : 'btn-jade'
                )}>
                  {selectedItem.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                </button>
              </div>

              <div className="flex gap-3">
                <button className="btn-ghost text-dragon-400 hover:bg-dragon-500/10">
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
                <button onClick={() => setShowEditModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button className="btn-primary flex-1">
                  <Check className="w-4 h-4" />
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

function MenuItemCard({ 
  item, 
  index,
  canEdit,
  onEdit 
}: { 
  item: MenuItem; 
  index: number;
  canEdit?: boolean;
  onEdit: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className={clsx(
        'card p-4 transition-all',
        !item.isAvailable && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-ink-100 truncate">{item.name}</h3>
            {!item.isAvailable && (
              <span className="badge-dragon text-[10px]">Unavailable</span>
            )}
          </div>
          {item.nameChinese && (
            <p className="text-sm text-ink-500">{item.nameChinese}</p>
          )}
        </div>
        <span className="text-dragon-400 font-bold ml-2">
          {formatCurrency(item.price)}
        </span>
      </div>

      <p className="text-xs text-ink-500 line-clamp-2 mb-3">{item.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-ink-600 font-mono">{item.sku}</span>
          {item.spiceLevel && item.spiceLevel > 0 && (
            <span className="flex items-center gap-0.5 text-dragon-400">
              <Flame className="w-3 h-3" />
              <span className="text-[10px]">{item.spiceLevel}</span>
            </span>
          )}
          {item.tags.slice(0, 2).map(tag => (
            <span key={tag} className="badge-ink text-[10px]">{tag}</span>
          ))}
        </div>
        {canEdit && (
          <button onClick={onEdit} className="btn-ghost p-2">
            <Edit3 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

