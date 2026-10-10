import React, { useState, useEffect } from 'react';
import {
  Factory,
  Layers,
  ClipboardList,
  Package,
  Cpu,
  ShieldCheck,
  Truck,
  Users,
  BarChart3,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Building,
  UserCheck,
  KeyRound,
  FileText,
  ShieldAlert,
  ChevronDown,
  UserPlus,
  History
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { NotificationBell } from '../common/NotificationBell';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export function AppShell({ currentSection, onSectionChange, children }) {
  const { user, profile, role, logout } = useAuth();
  const [healthStatus, setHealthStatus] = useState({
    loading: true,
    healthy: false,
    data: null,
  });

  const checkHealth = async () => {
    try {
      setHealthStatus((prev) => ({ ...prev, loading: true }));
      const res = await api.get('/health');
      setHealthStatus({
        loading: false,
        healthy: res.data?.database?.isConnected ?? true,
        data: res.data,
      });
    } catch (err) {
      setHealthStatus({
        loading: false,
        healthy: false,
        data: err.details?.data || null,
      });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Role-Specific Navigation items
  const adminNav = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: BarChart3 },
    { id: 'control-tower', label: 'Production Control Tower', icon: Activity, badge: 'Live Tower' },
    { id: 'quotations', label: 'Quotations & Pricing', icon: ClipboardList, badge: '3 Pending' },
    { id: 'orders', label: 'Sales Orders', icon: Layers },
    { id: 'inventory', label: 'Yarn & Stock Balances', icon: Package },
    { id: 'procurement', label: 'Procurement & POs', icon: Truck },
    { id: 'planning', label: 'Production Routing', icon: Cpu, badge: 'Schedule' },
    { id: 'machines', label: 'Loom & Machine Fleet', icon: Factory, badge: 'Live' },
    { id: 'qc', label: '4-Point Quality Control', icon: ShieldCheck },
    { id: 'dispatch', label: 'Dispatches & Billing', icon: Truck },
    { id: 'attendance', label: 'Attendance & Wages', icon: Users },
    { id: 'staff', label: 'Staff Accounts', icon: UserPlus },
    { id: 'audits', label: 'Operational Audits', icon: History },
  ];

  const customerNav = [
    { id: 'catalog', label: 'Fabric Catalog', icon: Package },
    { id: 'request-quote', label: 'Request Quotation', icon: ClipboardList },
    { id: 'my-quotes', label: 'My Inquiries & Quotes', icon: FileText, badge: '1 Offer' },
    { id: 'my-orders', label: 'Live Order Tracking', icon: Layers },
    { id: 'invoices', label: 'Invoices & Receipts', icon: Truck },
    { id: 'profile', label: 'Company Profile', icon: Building },
  ];

  const operatorNav = [
    { id: 'my-machines', label: 'Assigned Looms / Frames', icon: Cpu, badge: 'Assigned' },
    { id: 'task-board', label: 'Operator Task Board', icon: Layers, badge: 'Task Board' },
    { id: 'shift-log', label: 'Record Shift Production', icon: ClipboardList },
    { id: 'qc', label: 'QC & Roll Traceability', icon: ShieldCheck },
    { id: 'breakdowns', label: 'Report Machine Breakdown', icon: AlertCircle, badge: 'Alert' },
    { id: 'handover', label: 'Shift Handover Notes', icon: Users },
    { id: 'attendance', label: 'My Timesheet', icon: UserCheck },
  ];

  const currentNav =
    role === 'ADMIN' ? adminNav : role === 'CUSTOMER' ? customerNav : operatorNav;

  const roleThemeBadge = {
    ADMIN: 'bg-blue-100 text-blue-800 border-blue-200',
    CUSTOMER: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    OPERATOR: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Factory className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-slate-900 text-base">FabricOps</span>
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${roleThemeBadge[role] || 'bg-slate-100'}`}>
                {role}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">FabricOps Manufacturing Operating System</p>
          </div>
        </div>

        {/* User Info & Telemetry */}
        <div className="flex items-center gap-3">
          <div
            onClick={checkHealth}
            title="Click to re-ping API health"
            className="hidden sm:flex items-center gap-2 cursor-pointer px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-xs hover:bg-slate-100 transition-colors"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                healthStatus.healthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-slate-600 font-medium">
              API: {healthStatus.loading ? 'Checking...' : healthStatus.healthy ? 'Online' : 'Degraded'}
            </span>
            <RefreshCw className={`h-3 w-3 text-slate-400 ${healthStatus.loading ? 'animate-spin' : ''}`} />
          </div>

          {/* Notification Centre Bell */}
          <NotificationBell onNavigateSection={onSectionChange} />

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          {/* User Profile Pill & Logout */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200 shadow-sm">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="hidden md:block text-left text-xs">
              <p className="font-semibold text-slate-800 leading-none">{user?.name || 'User'}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[150px]">
                {profile?.companyName || (profile?.department ? `Dept: ${profile.department}` : user?.email)}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              title="Sign Out"
              className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 h-8 px-2 text-xs"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1.5">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200 bg-white p-4 flex flex-col justify-between shrink-0 hidden md:flex">
          <div className="space-y-6">
            <div>
              <div className="px-2 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>{role} Navigation</span>
                <span className="text-[10px] text-slate-400 font-mono">RBAC Active</span>
              </div>
              <nav className="space-y-1">
                {currentNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSectionChange(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                            item.badge === 'Alert'
                              ? 'bg-rose-100 text-rose-700'
                              : item.badge === 'Live'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Role Context Helper */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
                <Activity className="h-4 w-4 text-blue-600" />
                <span>Session Clearance</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {role === 'ADMIN' && 'Full administrative authority across production, finance, orders, and operator wages.'}
                {role === 'CUSTOMER' && 'Private portal restricted strictly to your quotes, confirmed orders, and invoices.'}
                {role === 'OPERATOR' && 'Terminal authorized strictly for assigned looms, shift production, and breakdown alerts.'}
              </p>
            </div>
          </div>

          {/* User Account Info Bottom Bar */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <div className="truncate">
                <p className="font-semibold text-slate-700">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="text-slate-400 hover:text-rose-600 p-1"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
