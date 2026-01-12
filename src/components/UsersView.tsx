import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Shield,
  User,
  Mail,
  Key,
  Eye,
  EyeOff,
  Crown,
  Users,
  UserCheck,
  UserX
} from 'lucide-react';
import { usePOSStore } from '../store';
import type { User as UserType, UserRole, Permission } from '../types';
import { ROLE_PERMISSIONS } from '../types';
import { clsx } from 'clsx';
import { format } from 'date-fns';

const roleConfig: Record<UserRole, { icon: typeof Crown; color: string; label: string }> = {
  admin: { icon: Crown, color: 'text-dragon-400', label: 'Administrator' },
  manager: { icon: Shield, color: 'text-gold-400', label: 'Manager' },
  server: { icon: UserCheck, color: 'text-jade-400', label: 'Server' },
  cashier: { icon: Users, color: 'text-blue-400', label: 'Cashier' },
  host: { icon: User, color: 'text-purple-400', label: 'Host' },
};

const permissionGroups: Record<string, { label: string; permissions: Permission[] }> = {
  menu: {
    label: 'Menu',
    permissions: ['menu:read', 'menu:write']
  },
  orders: {
    label: 'Orders',
    permissions: ['orders:read', 'orders:write', 'orders:void']
  },
  payments: {
    label: 'Payments',
    permissions: ['payments:read', 'payments:write', 'payments:refund']
  },
  tables: {
    label: 'Tables',
    permissions: ['tables:read', 'tables:write', 'tables:layout']
  },
  reports: {
    label: 'Reports',
    permissions: ['reports:read', 'reports:export']
  },
  users: {
    label: 'Users',
    permissions: ['users:read', 'users:write']
  },
  settings: {
    label: 'Settings',
    permissions: ['settings:read', 'settings:write']
  },
  audit: {
    label: 'Audit',
    permissions: ['audit:read']
  }
};

export function UsersView() {
  const users = usePOSStore(state => state.users);
  const currentUser = usePOSStore(state => state.currentUser);
  const addUser = usePOSStore(state => state.addUser);
  const updateUser = usePOSStore(state => state.updateUser);
  const deleteUser = usePOSStore(state => state.deleteUser);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [showPin, setShowPin] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    pin: '',
    role: 'server' as UserRole,
    isActive: true
  });

  const filteredUsers = users.filter(user => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !user.fullName.toLowerCase().includes(search) &&
        !user.email.toLowerCase().includes(search) &&
        !user.role.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    return true;
  });

  const activeUsers = users.filter(u => u.isActive);

  const handleOpenAdd = () => {
    setFormData({
      fullName: '',
      email: '',
      pin: '',
      role: 'server',
      isActive: true
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (user: UserType) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      pin: user.pin,
      role: user.role,
      isActive: user.isActive
    });
    setShowEditModal(true);
  };

  const handleAddUser = () => {
    if (!formData.fullName || !formData.email || !formData.pin) return;
    
    addUser({
      fullName: formData.fullName,
      email: formData.email,
      pin: formData.pin,
      role: formData.role,
      permissions: ROLE_PERMISSIONS[formData.role],
      isActive: true
    });
    
    setShowAddModal(false);
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    
    updateUser(selectedUser.id, {
      fullName: formData.fullName,
      email: formData.email,
      pin: formData.pin,
      role: formData.role,
      permissions: ROLE_PERMISSIONS[formData.role],
      isActive: formData.isActive
    });
    
    setShowEditModal(false);
    setSelectedUser(null);
  };

  const handleDeactivateUser = (userId: string) => {
    if (userId === currentUser?.id) return;
    deleteUser(userId);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-ink-800/50 bg-ink-900/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-ink-100">User Management</h1>
            <p className="text-ink-500 text-sm mt-1">
              {activeUsers.length} active users • {users.length} total
            </p>
          </div>
          <button onClick={handleOpenAdd} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </header>

      {/* Users Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user, i) => {
            const config = roleConfig[user.role];
            const Icon = config.icon;
            const isCurrentUser = user.id === currentUser?.id;
            
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={clsx(
                  'card p-5 transition-all',
                  !user.isActive && 'opacity-60'
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      config.color.replace('text-', 'bg-').replace('-400', '-500/20')
                    )}>
                      <Icon className={clsx('w-6 h-6', config.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-ink-100">{user.fullName}</h3>
                        {isCurrentUser && (
                          <span className="badge-jade text-[10px]">You</span>
                        )}
                      </div>
                      <p className={clsx('text-sm', config.color)}>{config.label}</p>
                    </div>
                  </div>
                  {!user.isActive && (
                    <span className="badge-dragon">Inactive</span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-ink-400">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-ink-400">
                    <Key className="w-4 h-4" />
                    <span className="font-mono">PIN: ****</span>
                  </div>
                </div>

                {/* Permissions Preview */}
                <div className="mb-4">
                  <p className="text-xs text-ink-500 mb-2">Permissions</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(permissionGroups).slice(0, 4).map(([key, group]) => {
                      const hasAny = group.permissions.some(p => user.permissions.includes(p));
                      return (
                        <span 
                          key={key}
                          className={clsx(
                            'text-[10px] px-2 py-0.5 rounded',
                            hasAny ? 'bg-jade-500/20 text-jade-400' : 'bg-ink-800 text-ink-600'
                          )}
                        >
                          {group.label}
                        </span>
                      );
                    })}
                    {user.permissions.length > 8 && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-ink-800 text-ink-500">
                        +{user.permissions.length - 8}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-ink-800">
                  <p className="text-xs text-ink-600">
                    Created {format(new Date(user.createdAt), 'MMM d, yyyy')}
                  </p>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleOpenEdit(user)}
                      className="btn-ghost p-2"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {!isCurrentUser && (
                      <button 
                        onClick={() => handleDeactivateUser(user.id)}
                        className="btn-ghost p-2 text-dragon-400 hover:bg-dragon-500/10"
                      >
                        {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit User Modal */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
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
                  {showAddModal ? 'Add New User' : 'Edit User'}
                </h2>
                <button 
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                  className="btn-ghost p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.fullName}
                    onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="John Smith"
                    className="input" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">Email</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@restaurant.com"
                    className="input" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">PIN Code</label>
                  <div className="relative">
                    <input 
                      type={showPin ? 'text' : 'password'}
                      value={formData.pin}
                      onChange={e => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                      placeholder="4-digit PIN"
                      maxLength={4}
                      className="input pr-10 font-mono" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-300 mb-2">Role</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                    className="select"
                  >
                    {Object.entries(roleConfig).map(([value, config]) => (
                      <option key={value} value={value}>{config.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role Permissions Preview */}
              <div className="bg-ink-800/50 rounded-xl p-4 mb-6">
                <h3 className="font-medium text-ink-200 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Permissions for {roleConfig[formData.role].label}
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {Object.entries(permissionGroups).map(([key, group]) => {
                    const rolePerms = ROLE_PERMISSIONS[formData.role];
                    const hasPermissions = group.permissions.filter(p => rolePerms.includes(p));
                    
                    return (
                      <div key={key} className="text-sm">
                        <p className="text-ink-400 mb-1">{group.label}</p>
                        <div className="space-y-1">
                          {group.permissions.map(perm => {
                            const hasIt = hasPermissions.includes(perm);
                            const action = perm.split(':')[1];
                            return (
                              <div key={perm} className="flex items-center gap-1.5">
                                {hasIt ? (
                                  <Check className="w-3 h-3 text-jade-400" />
                                ) : (
                                  <X className="w-3 h-3 text-ink-600" />
                                )}
                                <span className={hasIt ? 'text-ink-300' : 'text-ink-600'}>
                                  {action}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {showEditModal && (
                <div className="flex items-center justify-between p-4 bg-ink-800/50 rounded-xl mb-6">
                  <div className="flex items-center gap-3">
                    {formData.isActive ? (
                      <UserCheck className="w-5 h-5 text-jade-400" />
                    ) : (
                      <UserX className="w-5 h-5 text-dragon-400" />
                    )}
                    <div>
                      <p className="font-medium text-ink-100">
                        {formData.isActive ? 'Active' : 'Inactive'}
                      </p>
                      <p className="text-sm text-ink-500">
                        {formData.isActive 
                          ? 'User can log in and access the system' 
                          : 'User cannot log in'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                    className={clsx(
                      'btn',
                      formData.isActive ? 'btn-secondary' : 'btn-jade'
                    )}
                  >
                    {formData.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={showAddModal ? handleAddUser : handleUpdateUser}
                  disabled={!formData.fullName || !formData.email || !formData.pin}
                  className="btn-primary flex-1"
                >
                  <Check className="w-4 h-4" />
                  {showAddModal ? 'Add User' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

