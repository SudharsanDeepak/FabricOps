import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Radio,
  FileCode2,
  Workflow,
  Sparkles,
  Info,
  Building,
  User,
  CreditCard,
  AlertTriangle,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  PackageCheck,
  RefreshCw,
  TrendingUp,
  Truck,
  Package,
  FileText,
  AlertCircle,
  Factory,
  Gauge,
  Calendar,
  DollarSign,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import AeroShards from '../components/ui/AeroShards';

export function DashboardPage({ currentSection, onNavigateSection }) {
  const { user, profile, role } = useAuth();
  const [healthData, setHealthData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [healthRes, analyticsRes] = await Promise.allSettled([
        api.get('/health'),
        api.get('/analytics/me'),
      ]);

      if (healthRes.status === 'fulfilled') {
        setHealthData(healthRes.value.data);
      }
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.data?.success) {
        setAnalyticsData(analyticsRes.value.data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
=======
  const [bannerFlow, setBannerFlow] = useState('stream');
  const [bannerMaterial, setBannerMaterial] = useState('pearl');
  const [bannerPaused, setBannerPaused] = useState(false);
>>>>>>> origin/main

  useEffect(() => {
    fetchDashboardData();
  }, [role]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
<<<<<<< HEAD
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Welcome & System Status Banner */}
      <div className="rounded-xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
=======
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Living WebGPU Textile Yarn Banner */}
      <div className="relative rounded-2xl bg-slate-950 border border-slate-800/80 p-6 sm:p-7 text-white shadow-xl overflow-hidden group">
        {/* Living Shards Background Canvas */}
        <div className="absolute inset-0 z-0 opacity-80 pointer-events-none">
          <AeroShards
            backgroundColor="#080e1e"
            shardColor="#13233e"
            accentColor="#3b82f6"
            placement="full"
            flow={bannerFlow}
            material={bannerMaterial}
            detail="balanced"
            effect="none"
            scale={1.05}
            spread={0.9}
            depth={1.15}
            speed={0.75}
            spin={0.7}
            interaction="repel"
            density={1.1}
            shardSize={1.0}
            stretch={1.1}
            turbulence={0.35}
            glow={1.15}
            edgeSoftness={2}
            bloom={1.0}
            grain={0.03}
            chromaticAberration={0.005}
            transitionDuration={1.1}
            interactionRadius={1.4}
            interactionStrength={0.5}
            rippleIntensity={1.0}
            holdToGather
            paused={bannerPaused}
          />
        </div>

        {/* Ambient Dark Gradient Wash for Legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-transparent pointer-events-none z-[1]" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
>>>>>>> origin/main
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-900/80 border border-blue-400/40 px-2.5 py-0.5 text-xs text-blue-200 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Verified Session &bull; {role}
              </span>
              <span className="text-xs text-blue-200/90">
                Logged in as <strong>{user?.name}</strong>
              </span>
            </div>


            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
              {role === 'ADMIN' && 'FabricOps Executive Console'}
              {role === 'CUSTOMER' && `Welcome, ${profile?.companyName || user?.name}`}
              {role === 'OPERATOR' && `Loom Operator Terminal — ${profile?.department || 'Weaving'} Shed`}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed drop-shadow-xs">
              {role === 'ADMIN' && 'Real-time orchestration of yarn inventory, loom capacity, quality scoring, dispatches, and operator wages.'}
              {role === 'CUSTOMER' && 'Monitor your custom woven fabrics, review quotes, track roll production stages, and download tax invoices.'}
              {role === 'OPERATOR' && 'View assigned loom machines, log shift production meters, and report mechanical breakdown halts.'}
            </p>
          </div>

          {/* Interactive Simulation Controls & Telemetry Pill */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 text-xs text-blue-200 shadow-sm backdrop-blur">
              <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
              <span>Real-time Subsystem Active</span>
            </span>

            {/* Weave Flow Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2 py-1 rounded-lg backdrop-blur shadow-sm text-xs">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider pl-1">Filaments:</span>
              {(['stream', 'vortex', 'ribbon']).map((flow) => (
                <button
                  key={flow}
                  type="button"
                  onClick={() => setBannerFlow(flow)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
                    bannerFlow === flow
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {flow}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setBannerPaused((p) => !p)}
                title={bannerPaused ? 'Resume Shard Animation' : 'Pause Shard Animation'}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              >
                {bannerPaused ? <Play className="h-3 w-3 text-emerald-400" /> : <Pause className="h-3 w-3" />}
              </button>
            </div>

            <span className="text-[10px] text-slate-400/90 font-mono hidden lg:block">
              Click & drag to create yarn ripples
            </span>
>>>>>>> origin/main
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROLE: ADMIN DASHBOARD
          ========================================================================= */}
      {role === 'ADMIN' && analyticsData && (
        <div className="space-y-6">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Machine Fleet */}
            <Card
              onClick={() => onNavigateSection && onNavigateSection('machines')}
              className="cursor-pointer hover:border-blue-300 hover:shadow-xs transition-all"
            >
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs font-medium text-slate-500">Fleet Utilization</CardDescription>
                <div className="flex items-baseline justify-between">
                  <CardTitle className="text-2xl font-bold text-slate-900">
                    {analyticsData.machineFleet?.runningCount || 0} / {analyticsData.machineFleet?.totalMachines || 0}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-semibold text-blue-700 bg-blue-50 border-blue-200">
                    {analyticsData.machineFleet?.fleetUtilizationRate || 0}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-xs text-slate-500 flex items-center justify-between">
                <span>
                  {analyticsData.machineFleet?.breakdownCount > 0 ? (
                    <span className="text-rose-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {analyticsData.machineFleet.breakdownCount} Loom Halts
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> 100% Operational
                    </span>
                  )}
                </span>
                <span className="text-slate-400">Downtime: {analyticsData.machineFleet?.totalDowntimeHours || 0}h</span>
              </CardContent>
            </Card>

            {/* Orders Awaiting Decisions */}
            <Card
              onClick={() => onNavigateSection && onNavigateSection('quotations')}
              className="cursor-pointer hover:border-amber-300 hover:shadow-xs transition-all"
            >
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs font-medium text-slate-500">Awaiting Decision</CardDescription>
                <div className="flex items-baseline justify-between">
                  <CardTitle className="text-2xl font-bold text-amber-600">
                    {analyticsData.ordersAwaitingDecisions?.total || 0}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    Action Needed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-xs text-slate-500 flex items-center justify-between">
                <span>{analyticsData.ordersAwaitingDecisions?.pendingRequestsCount || 0} Inquiries</span>
                <span>{analyticsData.ordersAwaitingDecisions?.pendingQuotationsCount || 0} Quotes</span>
              </CardContent>
            </Card>

            {/* Orders At Risk */}
            <Card
              onClick={() => onNavigateSection && onNavigateSection('control-tower')}
              className="cursor-pointer hover:border-rose-300 hover:shadow-xs transition-all"
            >
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs font-medium text-slate-500">Delay Risk Watchlist</CardDescription>
                <div className="flex items-baseline justify-between">
                  <CardTitle className="text-2xl font-bold text-rose-600">
                    {analyticsData.ordersAtRiskOfDelay?.count || 0}
                  </CardTitle>
                  <Badge variant="destructive" className="text-xs">
                    Milestone Alerts
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-xs text-slate-500 flex items-center justify-between">
                <span className="text-rose-600 font-medium">Critical Schedule Slippage</span>
                <span className="text-blue-600 font-semibold">Inspect &rarr;</span>
              </CardContent>
            </Card>

            {/* Material Shortages */}
            <Card
              onClick={() => onNavigateSection && onNavigateSection('inventory')}
              className="cursor-pointer hover:border-purple-300 hover:shadow-xs transition-all"
            >
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs font-medium text-slate-500">Yarn Stock Deficits</CardDescription>
                <div className="flex items-baseline justify-between">
                  <CardTitle className="text-2xl font-bold text-purple-700">
                    {analyticsData.materialShortages?.count || 0} Items
                  </CardTitle>
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                    Reorder Level
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-xs text-slate-500 flex items-center justify-between">
                <span>Deficit: {analyticsData.materialShortages?.totalShortageQuantity || 0} kg</span>
                <span className="text-purple-600 font-semibold">Procure &rarr;</span>
              </CardContent>
            </Card>
          </div>

          {/* Second Row: Daily Output, QC Rates & Financials */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Production Output */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Daily Woven Output
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {analyticsData.dailyProduction?.dailyAttainmentPercentage || 0}% Target
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Today's output from active runs and rolls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-2xl font-bold text-slate-900">
                      {analyticsData.dailyProduction?.todayProducedMeters?.toLocaleString() || 0} m
                    </span>
                    <span className="text-xs text-slate-500">
                      Target: {analyticsData.dailyProduction?.targetDailyOutputMeters?.toLocaleString() || 5000} m
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, analyticsData.dailyProduction?.dailyAttainmentPercentage || 0)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Active Production Stages</p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {analyticsData.dailyProduction?.stageBreakdown?.length > 0 ? (
                      analyticsData.dailyProduction.stageBreakdown.map((s) => (
                        <div key={s.stage} className="flex justify-between items-center text-xs text-slate-600 py-1 border-b border-slate-50">
                          <span className="font-medium text-slate-800">{s.stage}</span>
                          <span className="text-slate-500">{s.activeJobsCount} Jobs ({s.producedQuantity}m)</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No stage runs recorded yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quality Control & 4-Point Scores */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    4-Point Quality Metrics
                  </CardTitle>
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                    {analyticsData.defectAndRework?.totalInspections || 0} Inspected
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Automated ASTM D5430 grading compliance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-xl font-bold text-rose-600">
                      {analyticsData.defectAndRework?.defectRate || 0}%
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Defect Rate</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-xl font-bold text-amber-600">
                      {analyticsData.defectAndRework?.reworkRate || 0}%
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Rework Rate</div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Common Defect Types</p>
                  <div className="space-y-1.5">
                    {analyticsData.defectAndRework?.topDefectTypes?.length > 0 ? (
                      analyticsData.defectAndRework.topDefectTypes.map((t) => (
                        <div key={t.type} className="flex justify-between items-center text-xs text-slate-600 py-1 border-b border-slate-50">
                          <span className="font-medium text-slate-700">{t.type}</span>
                          <Badge variant="outline" className="text-[10px]">{t.count} logs</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No defects recorded &bull; Zero penalty</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Ledger & Receivables */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    Commercial Ledger
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">Invoiced Revenue</Badge>
                </div>
                <CardDescription className="text-xs">
                  Tax invoice billings and cleared receipts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                  <div className="text-xs text-emerald-800 font-medium">Total Billed Volume</div>
                  <div className="text-xl font-bold text-emerald-900 mt-0.5">
                    {formatCurrency(analyticsData.dispatchesAndFinancials?.totalInvoiced)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block">Cleared Cash:</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(analyticsData.dispatchesAndFinancials?.totalCollected)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block">Receivables:</span>
                    <span className="font-semibold text-rose-700">
                      {formatCurrency(analyticsData.dispatchesAndFinancials?.totalReceivables)}
                    </span>
                  </div>
                </div>

                {analyticsData.dispatchesAndFinancials?.overdueInvoicesCount > 0 && (
                  <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      <strong>{analyticsData.dispatchesAndFinancials.overdueInvoicesCount} overdue</strong> invoice(s) pending follow-up.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Third Row: Orders at Risk & Critical Shortage Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders at Risk Watchlist */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    Delayed & At-Risk Sales Orders
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateSection && onNavigateSection('orders')}
                    className="text-xs text-blue-600 h-7 px-2"
                  >
                    View All &rarr;
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {analyticsData.ordersAtRiskOfDelay?.orders?.length > 0 ? (
                    analyticsData.ordersAtRiskOfDelay.orders.map((o) => (
                      <div key={o._id} className="p-3 px-4 flex items-center justify-between hover:bg-slate-50/50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900">{o.orderNumber}</span>
                            <span className="text-xs text-slate-500">&bull; {o.customerName}</span>
                          </div>
                          <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                            {o.delayRiskReason}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive" className="text-[10px]">{o.status}</Badge>
                          <div className="text-[10px] text-slate-400 mt-1">
                            Due: {new Date(o.confirmedDeliveryDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">
                      <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-1 opacity-70" />
                      All active production orders on scheduled track!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Critical Yarn Shortages */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <Package className="h-4 w-4 text-purple-600" />
                    Material Shortages & Reorder Warnings
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateSection && onNavigateSection('procurement')}
                    className="text-xs text-purple-700 h-7 px-2"
                  >
                    New PO &rarr;
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {analyticsData.materialShortages?.criticalItems?.length > 0 ? (
                    analyticsData.materialShortages.criticalItems.map((item) => (
                      <div key={item._id} className="p-3 px-4 flex items-center justify-between hover:bg-slate-50/50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900">{item.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Avail: <strong>{item.availableStock} {item.unit}</strong> (Min: {item.minimumReorderLevel})
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-rose-600 block">
                            -{item.shortageQuantity} {item.unit}
                          </span>
                          <span className="text-[10px] text-slate-400">Deficit</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">
                      <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-1 opacity-70" />
                      No critical yarn inventory shortages detected.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          ROLE: CUSTOMER DASHBOARD
          ========================================================================= */}
      {role === 'CUSTOMER' && analyticsData && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card
              onClick={() => onNavigateSection && onNavigateSection('my-orders')}
              className="cursor-pointer hover:border-blue-300 hover:shadow-xs transition-all"
            >
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs">Active Fabric Orders</CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {analyticsData.activeOrders?.count || 0} Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-xs text-blue-600 flex items-center justify-between font-medium">
                <span>{analyticsData.activeOrders?.completedOrdersCount || 0} Orders Completed</span>
                <span>Track &rarr;</span>
              </CardContent>
            </Card>

            <Card
              onClick={() => onNavigateSection && onNavigateSection('my-quotes')}
              className="cursor-pointer hover:border-amber-300 hover:shadow-xs transition-all"
            >
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs">Quotations for Review</CardDescription>
                <CardTitle className="text-2xl font-bold text-amber-600">
                  {analyticsData.quotationDecisions?.pendingCount || 0} Offers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-xs text-slate-500 flex items-center justify-between">
                <span>Accept, Decline, or Revise</span>
                <span className="text-amber-600 font-semibold">Review &rarr;</span>
              </CardContent>
            </Card>

            <Card
              onClick={() => onNavigateSection && onNavigateSection('invoices')}
              className="cursor-pointer hover:border-emerald-300 hover:shadow-xs transition-all"
            >
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs">Outstanding Ledger Balance</CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {formatCurrency(analyticsData.invoicesAndPayments?.outstandingBalance)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-xs text-slate-500 flex items-center justify-between">
                <span>Paid: {formatCurrency(analyticsData.invoicesAndPayments?.totalPaid)}</span>
                <span className="text-emerald-700 font-semibold">Invoices &rarr;</span>
              </CardContent>
            </Card>
          </div>

          {/* Active Orders with Live Production Progress */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                  <Layers className="h-4 w-4 text-blue-600" />
                  Live Order Production Tracking
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateSection && onNavigateSection('my-orders')}
                  className="text-xs text-blue-600"
                >
                  All Orders &rarr;
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {analyticsData.activeOrders?.orders?.length > 0 ? (
                  analyticsData.activeOrders.orders.map((order) => (
                    <div key={order._id} className="p-4 hover:bg-slate-50/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{order.orderNumber}</span>
                          <Badge variant="outline" className="text-xs font-semibold">{order.status}</Badge>
                          {order.isAtRiskOfDelay && (
                            <Badge variant="destructive" className="text-[10px]">At Risk</Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          Delivery: <strong>{new Date(order.confirmedDeliveryDate).toLocaleDateString()}</strong>
                          {order.daysRemaining !== null && (
                            <span className="ml-1 text-slate-400">({order.daysRemaining} days left)</span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Progress: {order.producedMeters}m / {order.totalMetersOrdered}m produced</span>
                          <span className="font-semibold text-slate-700">{order.progressPercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${order.progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    No active production orders right now. Explore the catalog to request a quotation.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Consignments in Transit & Quality Rolls */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                  <Truck className="h-4 w-4 text-indigo-600" />
                  Recent Consignment Dispatches
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {analyticsData.qualityAndDispatches?.recentDispatches?.length > 0 ? (
                    analyticsData.qualityAndDispatches.recentDispatches.map((d) => (
                      <div key={d._id} className="p-3 px-4 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{d.dispatchNumber}</div>
                          <div className="text-slate-500 text-[11px]">
                            {d.carrierName} &bull; LR #{d.waybillNumber}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-[10px]">{d.status}</Badge>
                          <div className="text-[10px] text-slate-400 mt-1">{d.totalMetersDispatched}m</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No dispatches generated yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  Recent Invoices & Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {analyticsData.invoicesAndPayments?.recentInvoices?.length > 0 ? (
                    analyticsData.invoicesAndPayments.recentInvoices.map((inv) => (
                      <div key={inv._id} className="p-3 px-4 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{inv.invoiceNumber}</div>
                          <div className="text-slate-500 text-[11px]">
                            Due: {new Date(inv.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-slate-900">{formatCurrency(inv.totalInvoiceAmount)}</div>
                          <Badge variant={inv.paymentStatus === 'PAID' ? 'success' : 'outline'} className="text-[10px] mt-1">
                            {inv.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No invoices issued yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          ROLE: OPERATOR DASHBOARD
          ========================================================================= */}
      {role === 'OPERATOR' && analyticsData && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs">Assigned Floor Tasks</CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {analyticsData.assignedTasks?.activeJobsCount || 0} Active
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-xs text-blue-600 font-medium">
                {analyticsData.assignedTasks?.machines?.length || 0} Assigned Loom Stations
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs">Shift Attendance</CardDescription>
                <div className="flex items-baseline justify-between">
                  <CardTitle className="text-2xl font-bold text-slate-900">
                    {analyticsData.shiftAndAttendance?.attendanceStatus || 'PRESENT'}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                    {analyticsData.shiftAndAttendance?.hoursWorked || 0} hrs
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-xs text-slate-500">
                OT Approved: {analyticsData.shiftAndAttendance?.approvedOvertimeHours || 0}h
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs">Shift Output Attainment</CardDescription>
                <div className="flex items-baseline justify-between">
                  <CardTitle className="text-2xl font-bold text-slate-900">
                    {analyticsData.productionProgress?.totalProducedMeters || 0} m
                  </CardTitle>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    {analyticsData.productionProgress?.targetAttainmentPercentage || 0}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-xs text-slate-500">
                Target: {analyticsData.productionProgress?.totalTargetMeters || 0} m
              </CardContent>
            </Card>
          </div>

          {/* Assigned Looms & Floor Machines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                  <Factory className="h-4 w-4 text-purple-600" />
                  Assigned Loom Telemetry & Speed
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {analyticsData.assignedTasks?.machines?.length > 0 ? (
                    analyticsData.assignedTasks.machines.map((m) => (
                      <div key={m._id} className="p-3 px-4 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{m.machineCode} — {m.name}</div>
                          <div className="text-slate-500 text-[11px]">
                            {m.location?.shed} &bull; {m.location?.bay}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={m.status === 'RUNNING' ? 'success' : m.status === 'BREAKDOWN' ? 'destructive' : 'outline'} className="text-[10px]">
                            {m.status}
                          </Badge>
                          {m.telemetry && (
                            <div className="text-[10px] text-blue-700 font-mono mt-1">
                              {m.telemetry.rpm || 0} RPM &bull; {m.telemetry.picksPerMinute || 0} PPM
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No looms currently assigned. Report to shift supervisor.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  Active Machine Breakdown Halts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {analyticsData.breakdownsAndAlerts?.breakdowns?.length > 0 ? (
                    analyticsData.breakdownsAndAlerts.breakdowns.map((b) => (
                      <div key={b._id} className="p-3 px-4 flex items-center justify-between text-xs bg-rose-50/30">
                        <div>
                          <div className="font-bold text-rose-800">{b.reportNumber} &bull; {b.machineCode}</div>
                          <div className="text-slate-600 text-[11px] mt-0.5">{b.description}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive" className="text-[10px]">{b.severity}</Badge>
                          <div className="text-[10px] text-slate-400 mt-1">{b.status}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">
                      <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-1 opacity-70" />
                      All assigned machines operational without active breakdowns!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Subsystem Health Grid (Common across all roles) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
        {/* API Core */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-600" />
                Express.js REST API
              </CardTitle>
              <Badge variant="success">Active</Badge>
            </div>
            <CardDescription className="text-xs">
              Port: 5000 &bull; Modular MVC & RBAC
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Session Auth:</span>
              <span className="font-semibold text-emerald-700">HTTP-Only JWT Cookie</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Server Uptime:</span>
              <span className="font-mono">{healthData?.uptime || 'Active'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Analytics API:</span>
              <code className="text-blue-600 font-mono">/api/v1/analytics/me</code>
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-600" />
                MongoDB & Mongoose
              </CardTitle>
              <Badge variant={healthData?.database?.isConnected ? 'success' : 'warning'}>
                {healthData?.database?.state || 'Connected'}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              30 Dedicated Collections & Schemas
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Connection State:</span>
              <span className="font-semibold text-slate-700 capitalize">
                {healthData?.database?.state || 'Connected'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Target Database:</span>
              <span className="font-mono">{healthData?.database?.name || 'fabricops'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Transactions:</span>
              <span className="text-emerald-700 font-medium">Replica-Set Supported</span>
            </div>
          </CardContent>
        </Card>

        {/* Security & Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Radio className="h-4 w-4 text-purple-600" />
                Socket.IO & Events
              </CardTitle>
              <Badge variant="success">Online</Badge>
            </div>
            <CardDescription className="text-xs">
              Event-Driven Real-time Bus
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Tenant Isolation:</span>
              <span className="text-emerald-700 font-medium">Mongoose Scoped RBAC</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Notification Engine:</span>
              <span className="text-emerald-700 font-medium">Unique Deduplicated Alerts</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">WebSockets:</span>
              <span className="text-blue-700 font-medium">Room-Scoped Push</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
