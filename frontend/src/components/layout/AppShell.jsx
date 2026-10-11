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
    { id: 'breakdowns', label: 'Report Machine Breakdown', icon: AlertCircle, badge: 'Alert' },
    { id: 'handover', label: 'Shift Handover Notes', icon: Users },
    { id: 'attendance', label: 'My Timesheet', icon: UserCheck },
  ];

  const currentNav =
    role === 'ADMIN' ? adminNav : role === 'CUSTOMER' ? customerNav : operatorNav;

  const roleThemeBadge = {
    ADMIN: 'bg-purple-950/50 text-purple-300 border-purple-500/40',
    CUSTOMER: 'bg-sky-950/50 text-sky-300 border-sky-500/40',
    OPERATOR: 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40',
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col font-opensans selection:bg-[#5227FF] selection:text-white">
      {/* INDUSTRIAL STATUS TICKER */}
      <div className="bg-[#0B0F1C]/95 border-b border-slate-800/80 px-4 py-2 text-xs text-slate-300">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[#FF9FFC] font-rajdhani font-bold uppercase tracking-wider text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#FF9FFC] animate-ping"></span>
              MILL SYSTEM ONLINE
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-300 text-[11px] font-mono font-medium">Shift A Active (06:00 - 14:00)</span>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span className="text-slate-300 text-[11px] hidden sm:inline">Power Grid: <strong className="text-white font-mono">412 kW</strong></span>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <div
              onClick={checkHealth}
              title="Click to re-ping API health"
              className="cursor-pointer inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white transition-colors"
            >
              <span>API:</span>
              <strong className={healthStatus.healthy ? 'text-emerald-400 font-mono font-semibold' : 'text-amber-400 font-mono font-semibold'}>
                {healthStatus.loading ? 'Pinging...' : healthStatus.healthy ? 'Online' : 'Degraded'}
              </strong>
              <RefreshCw className={`h-2.5 w-2.5 text-slate-400 ${healthStatus.loading ? 'animate-spin' : ''}`} />
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-[#FF9FFC] font-semibold font-mono">12,450 kg Yarn in Silos</span>
            <span className="text-slate-700">•</span>
            <span className="text-emerald-400 font-semibold font-mono">96.8% First-Pass Yield</span>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => onSectionChange(role === 'ADMIN' ? 'attendance' : role === 'CUSTOMER' ? 'my-orders' : 'attendance')}
              className="text-[#FF9FFC] hover:text-white font-rajdhani font-bold uppercase tracking-wider underline flex items-center gap-1 transition-colors"
            >
              {role === 'ADMIN' ? 'Attendance & Wages →' : role === 'CUSTOMER' ? 'Order Tracking →' : 'My Timesheet →'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Sticky Header */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-[#0D1220]/90 px-4 backdrop-blur-md sm:px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-[#5227FF]/15 border border-[#5227FF]/30 text-[#FF9FFC] rounded-lg shadow-sm">
            <Factory className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white font-rajdhani text-lg">EVEREST TEXTILE MILLS</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gradient-to-r from-[#5227FF] to-[#FF9FFC] text-white font-bold uppercase rounded">
                MillOS
              </span>
              <span className={`text-[10px] font-rajdhani font-bold uppercase tracking-wider px-2 py-0.5 border rounded ${roleThemeBadge[role] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                {role}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-normal">FabricOps Digital Loom Operating System &bull; ASTM D5430</p>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3">
          {/* User Profile Pill & Logout */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-[#5227FF]/20 text-[#FF9FFC] flex items-center justify-center font-bold text-xs border border-[#5227FF]/40 rounded-lg shadow-sm">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="hidden md:block text-left text-xs">
              <p className="font-bold text-white font-rajdhani uppercase tracking-wider leading-none">{user?.name || 'User'}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[150px] font-mono">
                {profile?.companyName || (profile?.department ? `Dept: ${profile.department}` : user?.email)}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              title="Sign Out"
              className="text-slate-300 hover:text-red-400 hover:bg-red-950/30 hover:border-red-800/50 h-8 px-2.5 text-xs font-rajdhani font-bold uppercase tracking-wider border-slate-700/80"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline ml-1.5">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800/80 bg-[#0B0F1C]/95 p-4 flex flex-col justify-between shrink-0 hidden md:flex">
          <div className="space-y-6">
            <div>
              <div className="px-2 mb-2 text-[11px] font-rajdhani font-bold uppercase tracking-widest text-[#FF9FFC] flex items-center justify-between">
                <span>{role} Consoles</span>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold">ONLINE</span>
              </div>
              <nav className="space-y-1">
                {currentNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSectionChange(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-rajdhani font-bold uppercase tracking-wider rounded-lg transition-all ${isActive
                          ? 'bg-gradient-to-r from-[#5227FF]/25 to-[#FF9FFC]/10 text-white border-l-2 border-[#5227FF] shadow-xs'
                          : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-[#FF9FFC]' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider border rounded ${item.badge === 'Alert'
                              ? 'bg-red-950/40 text-red-300 border-red-800/50'
                              : item.badge === 'Live' || item.badge === 'Live Tower'
                                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                                : 'bg-[#5227FF]/20 text-[#FF9FFC] border-[#5227FF]/40'
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
            <div className="border border-slate-800/80 bg-[#0D1220]/80 p-3 text-xs rounded-xl relative">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#5227FF] via-[#FF9FFC] to-transparent rounded-t-xl"></div>
              <div className="flex items-center gap-2 font-bold font-rajdhani uppercase tracking-wider text-[#FF9FFC] mb-1">
                <Activity className="h-4 w-4 text-[#5227FF]" />
                <span>Station Authorization</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-opensans">
                {role === 'ADMIN' && 'Full administrative authority across production, finance, orders, and worker wages.'}
                {role === 'CUSTOMER' && 'Private buyer portal restricted strictly to your quotes, confirmed orders, and invoices.'}
                {role === 'OPERATOR' && 'Floor terminal authorized strictly for assigned looms, shift production, and breakdown alerts.'}
              </p>
            </div>
          </div>

          {/* User Account Info Bottom Bar */}
          <div className="border-t border-slate-800/80 pt-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <div className="truncate">
                <p className="font-bold text-white font-rajdhani uppercase">{user?.name}</p>
                <p className="text-[10px] text-slate-500 font-mono truncate">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="text-slate-500 hover:text-red-400 p-1 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#070A12] text-slate-100">
          {children}
        </main>
      </div>
    </div>
  );
}
