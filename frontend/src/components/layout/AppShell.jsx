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
  HelpCircle,
  RefreshCw,
  Bell,
  Search,
  SlidersHorizontal,
  ChevronRight,
  LogOut,
  UserCheck
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { api } from '../../lib/api';

export function AppShell({ activeRole, onRoleChange, currentSection, onSectionChange, children }) {
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

  const adminNav = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: BarChart3 },
    { id: 'quotations', label: 'Quotations & Pricing', icon: ClipboardList, badge: '3 Pending' },
    { id: 'orders', label: 'Sales Orders', icon: Layers },
    { id: 'inventory', label: 'Yarn & Fabric Stock', icon: Package },
    { id: 'machines', label: 'Loom & Machine Fleet', icon: Cpu, badge: 'Live' },
    { id: 'qc', label: '4-Point Quality Control', icon: ShieldCheck },
    { id: 'dispatch', label: 'Dispatches & Billing', icon: Truck },
    { id: 'attendance', label: 'Attendance & Wages', icon: Users },
  ];

  const customerNav = [
    { id: 'catalog', label: 'Fabric Catalog', icon: Package },
    { id: 'my-quotes', label: 'My Inquiries & Quotes', icon: ClipboardList, badge: '1 Offer' },
    { id: 'my-orders', label: 'Live Order Tracking', icon: Layers },
    { id: 'invoices', label: 'Invoices & Receipts', icon: Truck },
  ];

  const operatorNav = [
    { id: 'my-machines', label: 'Assigned Looms / Frames', icon: Cpu },
    { id: 'shift-log', label: 'Record Shift Production', icon: ClipboardList },
    { id: 'breakdowns', label: 'Report Machine Breakdown', icon: AlertCircle, badge: 'Alert' },
    { id: 'handover', label: 'Shift Handover Notes', icon: Users },
  ];

  const currentNav =
    activeRole === 'ADMIN'
      ? adminNav
      : activeRole === 'CUSTOMER'
      ? customerNav
      : operatorNav;

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
              <span className="font-bold tracking-tight text-slate-900 text-base">Everest Textile OS</span>
              <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 bg-slate-100">
                v1.0-alpha
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium">Everest Textile Mills Manufacturing System</p>
          </div>
        </div>

        {/* Role Switcher Toolbar */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
          <span className="text-xs font-semibold text-slate-500 uppercase px-2 tracking-wider">Simulate Role:</span>
          {(['ADMIN', 'CUSTOMER', 'OPERATOR']).map((role) => (
            <button
              key={role}
              onClick={() => onRoleChange(role)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeRole === role
                  ? 'bg-white text-blue-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {/* Telemetry Status and User Info */}
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
              API: {healthStatus.loading ? 'Checking...' : healthStatus.healthy ? 'Online' : 'Degraded / No Mongo'}
            </span>
            <RefreshCw className={`h-3 w-3 text-slate-400 ${healthStatus.loading ? 'animate-spin' : ''}`} />
          </div>

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200">
              {activeRole[0]}
            </div>
            <div className="hidden md:block text-left text-xs">
              <p className="font-semibold text-slate-800 leading-none">
                {activeRole === 'ADMIN' ? 'Factory Supervisor' : activeRole === 'CUSTOMER' ? 'Apex Garments Ltd.' : 'Loom Master Rajesh'}
              </p>
              <p className="text-slate-500 capitalize">{activeRole.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200 bg-white p-4 flex flex-col justify-between shrink-0 hidden md:flex">
          <div className="space-y-6">
            <div>
              <div className="px-2 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {activeRole} Workspace
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
                          ? 'bg-blue-50 text-blue-700 font-semibold'
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

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1">
                <Activity className="h-4 w-4 text-blue-600" />
                <span>Textile Flow</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Seamless progression: Quote Request &rarr; Yarn Procurement &rarr; Weaving &rarr; 4-Point QC &rarr; Invoicing.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-400">
            Everest Mills &copy; 2026. Production Monorepo.
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

