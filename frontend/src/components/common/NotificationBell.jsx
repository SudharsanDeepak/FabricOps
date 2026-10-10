import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  Clock,
  Package,
  Layers,
  FileText,
  Truck,
  DollarSign,
  ShieldCheck,
  X,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../context/AuthContext';

export function NotificationBell({ onNavigateSection }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // Real-Time Socket Listener
    try {
      const socket = getSocket();
      const handleNewNotification = (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      };

      socket.on('notification', handleNewNotification);

      return () => {
        socket.off('notification', handleNewNotification);
      };
    } catch (sockErr) {
      console.warn('Socket connection skipped:', sockErr);
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notif) => {
    if (notif.isRead) return;
    try {
      await api.patch(`/notifications/${notif._id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, isRead: true, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = (notif) => {
    handleMarkAsRead(notif);

    if (notif.actionUrl && onNavigateSection) {
      const cleanUrl = notif.actionUrl.replace('/', '').split('?')[0];
      const sectionMap = {
        quotations: 'quotations',
        'my-quotes': 'my-quotes',
        orders: 'orders',
        'my-orders': 'my-orders',
        planning: 'planning',
        inventory: 'inventory',
        procurement: 'procurement',
        qc: 'qc',
        dispatch: 'dispatch',
        invoices: 'invoices',
        'control-tower': 'control-tower',
        'task-board': 'task-board',
        machines: 'machines',
        attendance: 'attendance',
      };

      if (sectionMap[cleanUrl]) {
        onNavigateSection(sectionMap[cleanUrl]);
        setIsOpen(false);
      }
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOW':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'BREAKDOWN_ALERT':
      case 'QUALITY_FAILURE':
        return <AlertTriangle className="h-4 w-4 text-rose-600" />;
      case 'MATERIAL_SHORTAGE':
      case 'SUPPLIER_DELIVERY_DELAYED':
      case 'PRODUCTION_MILESTONE_MISSED':
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      case 'QUOTATION_PROPOSED':
      case 'QUOTATION_REVISED':
      case 'QUOTATION_ACCEPTED':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'QC_PASSED':
      case 'INSPECTION_COMPLETED':
        return <ShieldCheck className="h-4 w-4 text-emerald-600" />;
      case 'DISPATCH_SHIPPED':
      case 'DELIVERY_COMPLETED':
        return <Truck className="h-4 w-4 text-indigo-600" />;
      case 'INVOICE_GENERATED':
      case 'PAYMENT_RECEIVED':
        return <DollarSign className="h-4 w-4 text-emerald-600" />;
      case 'FINISHED_GOODS_AVAILABLE':
        return <Package className="h-4 w-4 text-teal-600" />;
      case 'PRODUCTION_STAGE_CHANGED':
      case 'TASK_REASSIGNED':
      default:
        return <Layers className="h-4 w-4 text-purple-600" />;
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now - date) / (1000 * 60));
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const filteredNotifications = notifications.filter((n) =>
    filter === 'UNREAD' ? !n.isRead : true
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        title="Notification Centre"
        className="relative p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-hidden"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  title="Mark all as read"
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/50 px-4 py-1.5 text-xs gap-3">
            <button
              onClick={() => setFilter('ALL')}
              className={`pb-0.5 font-medium transition-colors ${
                filter === 'ALL'
                  ? 'text-blue-600 border-b-2 border-blue-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`pb-0.5 font-medium transition-colors ${
                filter === 'UNREAD'
                  ? 'text-blue-600 border-b-2 border-blue-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300 opacity-60" />
                {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 flex gap-3 cursor-pointer transition-colors hover:bg-slate-50/80 ${
                    !n.isRead ? 'bg-blue-50/30 font-normal' : 'opacity-85'
                  }`}
                >
                  <div className="mt-0.5 shrink-0 rounded-lg p-2 bg-slate-100/80 border border-slate-200/50">
                    {getTypeIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-xs truncate ${!n.isRead ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                        {n.title}
                      </p>
                      <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${getPriorityBadgeClass(n.priority)}`}>
                        {n.priority}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{formatTimestamp(n.createdAt)}</span>
                      {n.actionUrl && (
                        <span className="flex items-center gap-0.5 text-blue-600 hover:underline">
                          View details <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                  {!n.isRead && (
                    <span className="h-2 w-2 rounded-full bg-blue-600 self-center shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

