import { useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Clock,
  User,
  ShoppingBag,
  CreditCard,
  LayoutGrid,
  LogIn,
  LogOut,
  Plus,
  Minus,
  Edit3,
  Trash2,
  Send,
  AlertCircle,
  Download
} from 'lucide-react';
import { usePOSStore } from '../store';
import type { AuditAction } from '../types';
import { clsx } from 'clsx';

const actionConfig: Record<AuditAction, { icon: typeof Clock; color: string; label: string }> = {
  create: { icon: Plus, color: 'text-jade-400', label: 'Created' },
  update: { icon: Edit3, color: 'text-gold-400', label: 'Updated' },
  delete: { icon: Trash2, color: 'text-dragon-400', label: 'Deleted' },
  void: { icon: Trash2, color: 'text-dragon-400', label: 'Voided' },
  login: { icon: LogIn, color: 'text-jade-400', label: 'Logged In' },
  logout: { icon: LogOut, color: 'text-ink-400', label: 'Logged Out' },
  payment_process: { icon: CreditCard, color: 'text-jade-400', label: 'Payment Processed' },
  payment_refund: { icon: CreditCard, color: 'text-dragon-400', label: 'Payment Refunded' },
  table_assign: { icon: LayoutGrid, color: 'text-gold-400', label: 'Table Assigned' },
  table_clear: { icon: LayoutGrid, color: 'text-ink-400', label: 'Table Cleared' },
  order_send: { icon: Send, color: 'text-gold-400', label: 'Order Sent' },
  order_modify: { icon: Edit3, color: 'text-gold-400', label: 'Order Modified' },
  order_void: { icon: Trash2, color: 'text-dragon-400', label: 'Order Voided' },
  item_add: { icon: Plus, color: 'text-jade-400', label: 'Item Added' },
  item_remove: { icon: Minus, color: 'text-dragon-400', label: 'Item Removed' },
  item_modify: { icon: Edit3, color: 'text-gold-400', label: 'Item Modified' },
};

export function AuditLogView() {
  const auditLogs = usePOSStore(state => state.auditLogs);
  const users = usePOSStore(state => state.users);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');

  const filteredLogs = auditLogs.filter(log => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (userFilter !== 'all' && log.actorId !== userFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !log.actorName.toLowerCase().includes(search) &&
        !log.action.toLowerCase().includes(search) &&
        !log.entityType.toLowerCase().includes(search) &&
        !log.entityId.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    return true;
  });

  const actionTypes = [...new Set(auditLogs.map(l => l.action))];

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Details'].join(','),
      ...filteredLogs.map(log => [
        log.createdAt,
        log.actorName,
        log.action,
        log.entityType,
        log.entityId,
        JSON.stringify(log.metadata)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-ink-800/50 bg-ink-900/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-ink-100">Audit Log</h1>
            <p className="text-ink-500 text-sm mt-1">
              Track all system activity and modifications
            </p>
          </div>
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-ink-500" />
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="select"
            >
              <option value="all">All Actions</option>
              {actionTypes.map(action => (
                <option key={action} value={action}>
                  {actionConfig[action as AuditAction]?.label || action}
                </option>
              ))}
            </select>
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="select"
            >
              <option value="all">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.fullName}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Logs List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-ink-700 mx-auto mb-4" />
              <p className="text-ink-400 text-lg">No audit logs found</p>
              <p className="text-ink-600 text-sm">Activity will appear here as actions are performed</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log, i) => {
              const config = actionConfig[log.action] || { 
                icon: Clock, 
                color: 'text-ink-400', 
                label: log.action 
              };
              const Icon = config.icon;
              
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.01 }}
                  className="card p-4"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={clsx(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      config.color.replace('text-', 'bg-').replace('-400', '-500/20')
                    )}>
                      <Icon className={clsx('w-5 h-5', config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={clsx('font-medium', config.color)}>
                          {config.label}
                        </span>
                        <span className="text-ink-500">•</span>
                        <span className="text-ink-400 capitalize">{log.entityType}</span>
                      </div>
                      <p className="text-ink-300">
                        <span className="font-medium">{log.actorName}</span>
                        {' '}{getActionDescription(log)}
                      </p>
                      {Object.keys(log.metadata).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(log.metadata).slice(0, 4).map(([key, value]) => (
                            <span key={key} className="badge-ink text-xs">
                              {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-ink-400 text-sm">
                        {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                      </p>
                      <p className="text-ink-600 text-xs font-mono">
                        {log.entityId.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getActionDescription(log: { action: AuditAction; entityType: string; metadata: Record<string, unknown> }): string {
  switch (log.action) {
    case 'login':
      return 'logged into the system';
    case 'logout':
      return 'logged out of the system';
    case 'item_add':
      return `added ${log.metadata.quantity}× ${log.metadata.name} to order`;
    case 'item_remove':
      return `removed ${log.metadata.quantity}× ${log.metadata.name} from order`;
    case 'order_send':
      return `sent ${log.metadata.itemCount} items to kitchen`;
    case 'order_void':
      return `voided order: ${log.metadata.reason}`;
    case 'payment_process':
      return `processed ${log.metadata.method} payment of $${log.metadata.amount}`;
    case 'table_assign':
      return `assigned table (${log.metadata.status})`;
    case 'table_clear':
      return 'cleared table';
    default:
      return `performed ${log.action} on ${log.entityType}`;
  }
}

