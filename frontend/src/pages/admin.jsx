import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Ban,
  Building2,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Clock,
  CornerDownRight,
  Cpu,
  Download,
  Edit,
  Eye,
  Factory,
  FileCheck2,
  FileText,
  Filter,
  History,
  Layers,
  Loader2,
  MessageSquare,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  UserX,
  X,
  XCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { FeasibilityStudioModal } from '../components/quotations/FeasibilityStudioModal';
import { AuthorizedOrderDocumentModal } from '../components/common/AuthorizedOrderDocumentModal';
import { MessageThread } from '../components/common/MessageThread';
import { AiQualityConsole } from '../components/common/AiQualityConsole';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../context/AuthContext';


// ==========================================
// 1. ADMIN CONTROL TOWER (PRODUCTION OPS)
// ==========================================
export function AdminControlTowerPage({ onNavigateSection }) {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL'); // 'ALL' | 'AT_RISK' | 'ON_TRACK'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [stageModal, setStageModal] = useState({ open: false, order: null });
  const [recalcModal, setRecalcModal] = useState({ open: false, order: null });
  const [submitting, setSubmitting] = useState(false);

  // Stage update form
  const [stageForm, setStageForm] = useState({
    stage: 'WEAVING',
    status: 'IN_PROGRESS',
    completedQuantity: 0,
    delayReason: '',
  });

  // Recalculate form
  const [recalcForm, setRecalcForm] = useState({
    reason: '',
    delayDays: 2,
    triggerType: 'BREAKDOWN',
  });

  const fetchControlTower = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      setError(null);
      const res = await api.get('/production-planning/control-tower');
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load Production Control Tower');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchControlTower();
  }, [fetchControlTower]);

  // Socket.IO Room Authorization & Real-Time Sync
  useEffect(() => {
    if (role !== 'ADMIN') return;
    const socket = getSocket();

    socket.emit('join_room', 'admin_control_tower', (res) => {
      if (res?.error && role === 'ADMIN') {
        console.warn('Control tower room subscription:', res.error);
      }
    });

    const handleUpdate = () => {
      fetchControlTower(true);
    };

    socket.on('order:control_tower_updated', handleUpdate);
    socket.on('production:job_updated', handleUpdate);
    socket.on('machine:status_changed', handleUpdate);

    return () => {
      socket.emit('leave_room', 'admin_control_tower');
      socket.off('order:control_tower_updated', handleUpdate);
      socket.off('production:job_updated', handleUpdate);
      socket.off('machine:status_changed', handleUpdate);
    };
  }, [role, fetchControlTower]);

  // Handle stage status advance
  const handleStageSubmit = async (e) => {
    e.preventDefault();
    if (!stageModal.order) return;
    setSubmitting(true);
    try {
      await api.patch(`/orders/${stageModal.order.orderId}/timeline/stage`, {
        stage: stageForm.stage,
        status: stageForm.status,
        completedQuantity: Number(stageForm.completedQuantity),
        delayReason: stageForm.delayReason || undefined,
      });
      setStageModal({ open: false, order: null });
      await fetchControlTower(true);
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle dynamic estimate recalculation
  const handleRecalcSubmit = async (e) => {
    e.preventDefault();
    if (!recalcModal.order) return;
    setSubmitting(true);
    try {
      await api.post(`/orders/${recalcModal.order.orderId}/timeline/recalculate`, {
        reason: recalcForm.reason,
        delayDays: Number(recalcForm.delayDays),
        triggerType: recalcForm.triggerType,
      });
      setRecalcModal({ open: false, order: null });
      await fetchControlTower(true);
    } catch (err) {
      alert(`Recalculation failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const overview = data?.overview || {};
  const activeOrders = data?.activeOrders || [];
  const machineFleet = data?.machineFleet || {};
  const bottlenecks = data?.bottlenecks || {};

  const filteredOrders = activeOrders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    if (riskFilter === 'AT_RISK') return matchesSearch && o.isAtRiskOfDelay;
    if (riskFilter === 'ON_TRACK') return matchesSearch && !o.isAtRiskOfDelay;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl text-white shadow-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Production Control Tower</h1>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Real-Time Mill Execution, Machine Fleet Telemetry, Bottlenecks & Dynamic Delivery Risk Analysis
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => fetchControlTower()}
            variant="outline"
            className="border-slate-700 text-slate-200 hover:bg-slate-800 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Control Tower
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-[#0D1220] border-slate-800 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
            <span>Active Sales Orders</span>
            <Layers className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-white font-mono">{overview.activeOrdersCount || 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">In mill manufacturing pipeline</span>
        </Card>

        <Card className="p-4 bg-[#0D1220] border-slate-800 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-xs text-rose-600 font-bold uppercase tracking-wider mb-1">
            <span>Orders At Risk of Delay</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-600 font-mono">{overview.ordersAtRiskCount || 0}</p>
          <span className="text-[11px] text-rose-500 font-medium">Estimated completion &gt; Committed date</span>
        </Card>

        <Card className="p-4 bg-[#0D1220] border-slate-800 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">
            <span>Looms In Operation</span>
            <Cpu className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 font-mono">{overview.runningMachinesCount || 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">Out of {machineFleet.total || 0} total machines</span>
        </Card>

        <Card className="p-4 bg-[#0D1220] border-slate-800 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-xs text-amber-600 font-bold uppercase tracking-wider mb-1">
            <span>Fault & Maintenance</span>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600 font-mono">{overview.faultMachinesCount || 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">Breakdowns / Service required</span>
        </Card>
      </div>

      {/* Delivery Risk Alert Banner */}
      {overview.ordersAtRiskCount > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
              High-Risk Orders Detected ({overview.ordersAtRiskCount} Orders)
            </h4>
            <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
              Dynamic schedule recalculation flagged orders where loom stops, material delays, or defect rework have pushed estimated completion past the customer-committed date. Review and adjust routing.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Orders Tower + Machine Fleet & Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Orders Tower (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-800 shadow-sm rounded-2xl bg-[#0D1220] overflow-hidden">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <span>Active Orders & Pipeline Progress</span>
              </CardTitle>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search order or client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 pr-3 rounded-lg border border-slate-800 text-xs w-44"
                  />
                </div>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-slate-800 text-xs font-semibold text-slate-300"
                >
                  <option value="ALL">All Orders</option>
                  <option value="AT_RISK">At Risk Only</option>
                  <option value="ON_TRACK">On Track</option>
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/60 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Order & Buyer</th>
                      <th className="py-3 px-3">Stage & Progress</th>
                      <th className="py-3 px-3">Committed Date</th>
                      <th className="py-3 px-3">Estimated Date</th>
                      <th className="py-3 px-3">Delivery Risk</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-300">
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((order) => (
                        <tr key={order.orderId} className="hover:bg-[#090D17] transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-white block">{order.orderNumber}</span>
                            <span className="text-[11px] text-slate-400 truncate block max-w-[140px]">
                              {order.customerName}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 min-w-[160px]">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-bold text-slate-200">{order.currentStageTitle}</span>
                              <span className="font-mono text-blue-600 font-bold">{order.progressPercentage}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-800">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${Math.min(100, order.progressPercentage)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {order.completedQuantity?.toLocaleString()} / {order.targetQuantity?.toLocaleString()} m
                            </span>
                          </td>

                          <td className="py-3.5 px-3 font-mono text-[11px]">
                            {new Date(order.confirmedDeliveryDate).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-3 font-mono text-[11px]">
                            <span className={order.isAtRiskOfDelay ? 'text-rose-600 font-bold' : 'text-slate-200'}>
                              {new Date(order.estimatedDeliveryDate).toLocaleDateString()}
                            </span>
                          </td>

                          <td className="py-3.5 px-3">
                            {order.isAtRiskOfDelay ? (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold text-[10px]">
                                Delay +{order.delayDays}d
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold text-[10px]">
                                On Schedule
                              </Badge>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setStageForm({
                                    stage: order.currentStage,
                                    status: 'COMPLETED',
                                    completedQuantity: order.targetQuantity,
                                    delayReason: '',
                                  });
                                  setStageModal({ open: true, order });
                                }}
                                title="Update Stage Milestone"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-[#5227FF]/15 rounded-lg"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setRecalcForm({
                                    reason: 'Machine breakdown schedule adjustment',
                                    delayDays: 3,
                                    triggerType: 'BREAKDOWN',
                                  });
                                  setRecalcModal({ open: true, order });
                                }}
                                title="Recalculate Dynamic Estimates"
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                              >
                                <Sliders className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                          No orders matching filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Machine Fleet Status & Bottlenecks */}
        <div className="space-y-4">
          {/* Machine Fleet Live Status */}
          <Card className="border-slate-800 shadow-sm rounded-2xl bg-[#0D1220]">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>Machine Fleet Utilization</span>
                <span className="text-[10px] text-slate-400 font-mono">{machineFleet.runningCount}/{machineFleet.total} Active</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {machineFleet.machines?.map((m) => (
                <div
                  key={m._id}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white">{m.machineCode}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                          m.status === 'RUNNING'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.status === 'BREAKDOWN'
                            ? 'bg-rose-100 text-rose-800'
                            : m.status === 'MAINTENANCE'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{m.name}</p>
                  </div>
                  <div className="text-right font-mono text-[10px] text-slate-500">
                    <span>{m.telemetrySnapshot?.picksPerMinute || 0} ppm</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Factory Floor Bottlenecks Detection */}
          <Card className="border-slate-800 shadow-sm rounded-2xl bg-[#0D1220]">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span>Detected Stage Bottlenecks</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {Object.entries(bottlenecks.stageLoadCounts || {}).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">{stage.replace('_', ' ')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500">{count} orders in stage</span>
                    {count >= 3 && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] font-bold">
                        Bottleneck
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stage Advance Modal */}
      {stageModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0D1220] text-slate-100 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Advance Order Milestone Stage</h3>
              <button onClick={() => setStageModal({ open: false, order: null })} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleStageSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Target Stage</label>
                <select
                  value={stageForm.stage}
                  onChange={(e) => setStageForm({ ...stageForm, stage: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-700 font-semibold"
                >
                  <option value="MATERIAL_PROCUREMENT">MATERIAL PROCUREMENT</option>
                  <option value="MATERIAL_ISSUANCE">MATERIAL ISSUANCE</option>
                  <option value="WEAVING">WEAVING</option>
                  <option value="QUALITY_INSPECTION">QUALITY INSPECTION</option>
                  <option value="FINISHED_GOODS">FINISHED GOODS</option>
                  <option value="PACKING">PACKING</option>
                  <option value="DISPATCH">DISPATCH</option>
                  <option value="DELIVERY">DELIVERY</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Status</label>
                <select
                  value={stageForm.status}
                  onChange={(e) => setStageForm({ ...stageForm, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-700 font-semibold"
                >
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="DELAYED">DELAYED</option>
                  <option value="REWORK">REWORK</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Completed Quantity (Meters)</label>
                <input
                  type="number"
                  min="0"
                  value={stageForm.completedQuantity}
                  onChange={(e) => setStageForm({ ...stageForm, completedQuantity: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Delay Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="Reason if stage is delayed..."
                  value={stageForm.delayReason}
                  onChange={(e) => setStageForm({ ...stageForm, delayReason: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setStageModal({ open: false, order: null })}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {submitting ? 'Saving...' : 'Update Milestone'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Recalculate Modal */}
      {recalcModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0D1220] text-slate-100 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
            <div className="p-4 bg-amber-600 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Recalculate Dynamic Delivery Estimates</h3>
              <button onClick={() => setRecalcModal({ open: false, order: null })} className="text-amber-100 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleRecalcSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Trigger Cause</label>
                <select
                  value={recalcForm.triggerType}
                  onChange={(e) => setRecalcForm({ ...recalcForm, triggerType: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-700 font-semibold"
                >
                  <option value="BREAKDOWN">Machine Breakdown</option>
                  <option value="REWORK">Quality Inspection Defect Rework</option>
                  <option value="MATERIAL_SHORTAGE">Yarn Sourcing Procurement Delay</option>
                  <option value="MANUAL">Manual Mill Reschedule</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Delay Days Added to Downstream Milestones</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={recalcForm.delayDays}
                  onChange={(e) => setRecalcForm({ ...recalcForm, delayDays: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Transparent Root Cause Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g., Tsudakoma Rapier Loom drive gear replacement required 3 days stoppage..."
                  value={recalcForm.reason}
                  onChange={(e) => setRecalcForm({ ...recalcForm, reason: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-700 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" onClick={() => setRecalcModal({ open: false, order: null })}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  {submitting ? 'Recalculating...' : 'Recalculate & Alert Rooms'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. ADMIN QUOTATIONS & INQUIRIES STUDIO
// ==========================================
export function AdminQuotationsPage() {
  const [activeTab, setActiveTab] = useState('inquiries'); // 'inquiries' | 'quotations'
  const [inquiries, setInquiries] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  // Feasibility & Quote Studio Modal
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioTargetInquiry, setStudioTargetInquiry] = useState(null);
  const [studioTargetQuotation, setStudioTargetQuotation] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [inqRes, quotesRes] = await Promise.all([
        api.get('/order-requests'),
        api.get('/quotations'),
      ]);
      setInquiries(inqRes.data || []);
      setQuotations(quotesRes.data || []);

      if (selectedQuotation) {
        const found = quotesRes.data.find((q) => q._id === selectedQuotation._id);
        if (found) setSelectedQuotation(found);
      }
      if (selectedInquiry) {
        const found = inqRes.data.find((i) => i._id === selectedInquiry._id);
        if (found) setSelectedInquiry(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenStudioForInquiry = (inquiry) => {
    setStudioTargetInquiry(inquiry);
    setStudioTargetQuotation(null);
    setStudioOpen(true);
  };

  const handleOpenStudioForRevision = (quotation) => {
    setStudioTargetQuotation(quotation);
    setStudioTargetInquiry(null);
    setStudioOpen(true);
  };

  const handleConfirmOrderAdmin = async (quotationId) => {
    try {
      const res = await api.post('/orders/confirm', { quotationId });
      setActionSuccess(`Order ${res.data.orderNumber} successfully confirmed and locked!`);
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to confirm order');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <Badge variant="warning">Pending Review</Badge>;
      case 'QUOTED':
        return <Badge variant="success">Quotation Issued</Badge>;
      case 'ISSUED':
        return <Badge variant="default">Issued &bull; Awaiting Buyer</Badge>;
      case 'REVISED':
        return <Badge variant="secondary">Revision Active</Badge>;
      case 'CUSTOMER_ACCEPTED':
        return <Badge variant="success">Customer Accepted &bull; Ready to Confirm</Badge>;
      case 'CONVERTED_TO_ORDER':
        return <Badge variant="success">Order Confirmed</Badge>;
      case 'CUSTOMER_REJECTED':
        return <Badge variant="destructive">Customer Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D1220] p-6 rounded-xl border border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-white">Quotations & Inquiry Feasibility Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Validate incoming specifications against loom reed space, evaluate yarn warehouse stock, generate transparent timelines, and negotiate terms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            Pending Inquiries: <strong className="text-amber-600">{inquiries.filter((i) => i.status === 'PENDING_REVIEW').length}</strong>
          </span>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex justify-between items-center">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="font-bold">&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => { setActiveTab('inquiries'); setSelectedQuotation(null); }}
          className={`py-2.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'inquiries'
              ? 'border-blue-600 text-[#FF9FFC]'
              : 'border-transparent text-slate-500 hover:text-slate-200'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Customer Inquiries Queue ({inquiries.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('quotations'); setSelectedInquiry(null); }}
          className={`py-2.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'quotations'
              ? 'border-blue-600 text-[#FF9FFC]'
              : 'border-transparent text-slate-500 hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Issued Quotations & Negotiations ({quotations.length})</span>
        </button>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-xs gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span>Loading commercial and inquiry data...</span>
        </div>
      ) : activeTab === 'inquiries' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inquiries List (1 col) */}
          <div className="space-y-3">
            {inquiries.length === 0 ? (
              <div className="p-8 text-center bg-[#0D1220] rounded-xl border border-slate-800 text-xs text-slate-400">
                No customer inquiries in queue.
              </div>
            ) : (
              inquiries.map((inq) => {
                const isSelected = selectedInquiry?._id === inq._id;
                return (
                  <div
                    key={inq._id}
                    onClick={() => setSelectedInquiry(inq)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer bg-[#0D1220] text-xs ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono font-bold text-white text-sm">
                        {inq.requestNumber}
                      </span>
                      {getStatusBadge(inq.status)}
                    </div>

                    <div className="space-y-1 text-slate-400">
                      <p className="font-semibold text-slate-200">
                        {inq.customerId?.name || 'Customer'}
                      </p>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>{inq.items?.[0]?.productId?.name || 'Fabric'}</span>
                        <span className="font-mono font-bold text-[#FF9FFC]">
                          {inq.items?.[0]?.targetQuantity?.toLocaleString()} {inq.items?.[0]?.targetUnit}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>Submitted: {new Date(inq.createdAt).toLocaleDateString()}</span>
                        {inq.specificationDocuments?.length > 0 && (
                          <span className="text-blue-600 font-semibold">{inq.specificationDocuments.length} Doc(s)</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Inquiry Detail View & Feasibility Launcher (2 cols) */}
          <div className="lg:col-span-2">
            {selectedInquiry ? (
              <div className="space-y-6">
                <Card className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white">{selectedInquiry.requestNumber}</h2>
                        {getStatusBadge(selectedInquiry.status)}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Customer: <strong>{selectedInquiry.customerId?.name}</strong> ({selectedInquiry.customerId?.email})
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleOpenStudioForInquiry(selectedInquiry)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-xs"
                    >
                      <Cpu className="h-4 w-4" />
                      <span>Launch Feasibility Studio & Issue Quote</span>
                    </Button>
                  </div>

                  {/* Specification Snapshot */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Target Quantity:</span>
                      <span className="text-base font-bold font-mono text-slate-200">
                        {selectedInquiry.items?.[0]?.targetQuantity?.toLocaleString()} {selectedInquiry.items?.[0]?.targetUnit}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Target Price:</span>
                      <span className="text-base font-bold font-mono text-slate-200">
                        {selectedInquiry.items?.[0]?.targetPricePerUnit ? `₹${selectedInquiry.items[0].targetPricePerUnit}` : 'Open Quote'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Target Delivery:</span>
                      <span className="text-base font-bold font-mono text-slate-200">
                        {selectedInquiry.preferredDeliveryDate ? new Date(selectedInquiry.preferredDeliveryDate).toLocaleDateString() : 'Flexible'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Shade / Color:</span>
                      <span className="text-base font-bold text-slate-200 truncate block">
                        {selectedInquiry.items?.[0]?.fabricSpecSnapshot?.colorName || 'Standard'}
                      </span>
                    </div>
                  </div>

                  {/* Attached Documents */}
                  {selectedInquiry.specificationDocuments?.length > 0 && (
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
                      <span className="font-bold text-slate-300 block mb-1">
                        Buyer Specification Documents / Tech Pack:
                      </span>
                      <div className="space-y-1">
                        {selectedInquiry.specificationDocuments.map((doc, idx) => (
                          <a
                            key={idx}
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1.5 font-medium text-[11px]"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>{doc.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customer Notes */}
                  {selectedInquiry.customerNotes && (
                    <div className="p-3 bg-[#5227FF]/15 rounded-xl border border-[#5227FF]/30 text-xs">
                      <span className="font-bold text-blue-900 block mb-0.5">Customer Inquiry Notes:</span>
                      <p className="text-slate-300 italic">"{selectedInquiry.customerNotes}"</p>
                    </div>
                  )}
                </Card>

                {/* Message Thread */}
                <MessageThread
                  threadType="ORDER_REQUEST"
                  referenceId={selectedInquiry._id}
                  title={`Inquiry Discussion Thread &bull; ${selectedInquiry.requestNumber}`}
                />
              </div>
            ) : (
              <div className="p-16 text-center bg-[#0D1220] rounded-xl border border-slate-800 text-xs text-slate-400">
                Select an inquiry from the left to review technical specifications and launch the Feasibility Studio.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Quotations Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quotations List (1 col) */}
          <div className="space-y-3">
            {quotations.map((quote) => {
              const isSelected = selectedQuotation?._id === quote._id;
              return (
                <div
                  key={quote._id}
                  onClick={() => setSelectedQuotation(quote)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer bg-[#0D1220] text-xs ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono font-bold text-white text-sm">
                      {quote.quotationNumber}
                    </span>
                    {getStatusBadge(quote.status)}
                  </div>

                  <div className="space-y-1 text-slate-400">
                    <p className="font-semibold text-slate-200">
                      {quote.customerId?.name || 'Customer'}
                    </p>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Rate: ₹{quote.items?.[0]?.unitPrice}</span>
                      <span className="font-bold text-[#FF9FFC] font-mono text-xs">
                        ₹{quote.totalAmount?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Rev #{quote.currentRevisionNumber || 1}</span>
                      {quote.customerDecision?.decision === 'COUNTER_OFFER' && (
                        <span className="text-amber-600 font-bold">Counter-Offer Received!</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quotation Details & Revision Studio (2 cols) */}
          <div className="lg:col-span-2">
            {selectedQuotation ? (
              <div className="space-y-6">
                <Card className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white">{selectedQuotation.quotationNumber}</h2>
                        {getStatusBadge(selectedQuotation.status)}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                          Rev #{selectedQuotation.currentRevisionNumber || 1}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Customer: <strong>{selectedQuotation.customerId?.name}</strong> &bull; Delivery: {new Date(selectedQuotation.proposedDeliveryDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedQuotation.status !== 'CONVERTED_TO_ORDER' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenStudioForRevision(selectedQuotation)}
                          className="text-xs text-[#FF9FFC] border-[#5227FF]/40 hover:bg-[#5227FF]/15 gap-1.5"
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>Revise Quotation</span>
                        </Button>
                      )}

                      {selectedQuotation.status === 'CUSTOMER_ACCEPTED' && (
                        <Button
                          size="sm"
                          onClick={() => handleConfirmOrderAdmin(selectedQuotation._id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Confirm Sales Order</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Customer Counter-Offer Highlight Alert */}
                  {selectedQuotation.customerDecision?.decision === 'COUNTER_OFFER' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span>Customer Counter-Offer Submitted:</span>
                      </div>
                      <p className="text-amber-800">
                        Target Price: <strong>₹{selectedQuotation.customerDecision.counterOffer?.targetPrice?.toLocaleString() || 'N/A'}</strong>
                      </p>
                      <p className="text-amber-700 italic">
                        "{selectedQuotation.customerDecision.customerNotes || selectedQuotation.customerDecision.counterOffer?.notes}"
                      </p>
                    </div>
                  )}

                  {/* Quotation Line Items & Financials */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Amount:</span>
                      <span className="text-base font-bold font-mono text-[#FF9FFC]">
                        ₹{selectedQuotation.totalAmount?.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Unit Rate:</span>
                      <span className="text-base font-bold font-mono text-slate-200">
                        ₹{selectedQuotation.items?.[0]?.unitPrice} / {selectedQuotation.items?.[0]?.unit}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Production Time:</span>
                      <span className="text-base font-bold font-mono text-slate-200">
                        {selectedQuotation.productionLeadTimeDays || 14} Days
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Material Status:</span>
                      <span className="text-base font-bold text-slate-200 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Allocated
                      </span>
                    </div>
                  </div>

                  {/* Revision History */}
                  {selectedQuotation.revisions?.length > 1 && (
                    <div className="pt-2 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-slate-500" />
                        <span>Preserved Quotation Revisions</span>
                      </h4>
                      <div className="space-y-2">
                        {selectedQuotation.revisions.map((rev) => (
                          <div
                            key={rev.revisionNumber}
                            className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 text-xs flex justify-between items-center"
                          >
                            <div>
                              <span className="font-bold text-slate-200">Revision #{rev.revisionNumber}</span>
                              <span className="text-slate-500 ml-2">₹{rev.items?.[0]?.unitPrice}/m &bull; Total: ₹{rev.totalAmount?.toLocaleString()}</span>
                              <p className="text-[10px] text-slate-500 italic mt-0.5">{rev.notes}</p>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {new Date(rev.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Message Thread */}
                <MessageThread
                  threadType="QUOTATION"
                  referenceId={selectedQuotation._id}
                  title={`Negotiation Thread &bull; ${selectedQuotation.quotationNumber}`}
                />
              </div>
            ) : (
              <div className="p-16 text-center bg-[#0D1220] rounded-xl border border-slate-800 text-xs text-slate-400">
                Select a quotation from the left to view negotiation status, customer counter-offers, or issue revisions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feasibility & Quotation Studio Modal */}
      {studioOpen && (
        <FeasibilityStudioModal
          orderRequest={studioTargetInquiry}
          quotationToRevise={studioTargetQuotation}
          onClose={() => setStudioOpen(false)}
          onSuccess={() => {
            setStudioOpen(false);
            setActionSuccess('Quotation processed successfully!');
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// 3. ADMIN ORDERS & DOCUMENT DISPATCH
// ==========================================
export function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [documentOrderId, setDocumentOrderId] = useState(null);

  const fetchOrders = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (statusFilter !== 'ALL') query.set('status', statusFilter);

    api.get(`/orders?${query.toString()}`)
      .then((res) => {
        setOrders(res.data || []);
        if (res.data?.length > 0 && !selectedOrder) {
          setSelectedOrder(res.data[0]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D1220] p-6 rounded-xl border border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-white">Confirmed Sales Orders Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Production-locked orders verified against capacity and yarn allocation. Access authorized legal documents and fulfillment threads.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {['ALL', 'CONFIRMED', 'IN_PRODUCTION', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Orders' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-xs gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span>Loading sales orders...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-16 text-center bg-[#0D1220] rounded-xl border border-slate-800 text-xs text-slate-400">
          No orders found matching status filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders List (1 col) */}
          <div className="space-y-3">
            {orders.map((order) => {
              const isSelected = selectedOrder?._id === order._id;
              return (
                <div
                  key={order._id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer bg-[#0D1220] text-xs ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono font-bold text-white text-sm">
                      {order.orderNumber}
                    </span>
                    <Badge variant={order.status === 'COMPLETED' ? 'success' : 'default'} className="text-[10px]">
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-slate-400">
                    <p className="font-semibold text-slate-200">
                      {order.customerId?.name || 'Customer'}
                    </p>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{order.items?.[0]?.quantity?.toLocaleString()} {order.items?.[0]?.unit}</span>
                      <span className="font-bold text-[#FF9FFC] font-mono text-xs">
                        ₹{order.totalAmount?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Confirmed: {new Date(order.confirmedDeliveryDate).toLocaleDateString()}</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                        <ShieldCheck className="h-3 w-3" /> Locked
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Order Details (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {selectedOrder && (
              <>
                <Card className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white">{selectedOrder.orderNumber}</h2>
                        <Badge variant="success" className="text-xs">
                          {selectedOrder.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Buyer: <strong>{selectedOrder.customerId?.name}</strong> &bull; Quote Ref: {selectedOrder.quotationId?.quotationNumber || 'Direct'}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setDocumentOrderId(selectedOrder._id)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5 shadow-xs"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print Authorized Certificate</span>
                    </Button>
                  </div>

                  {/* Order Specs & Audits */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Revenue:</span>
                      <span className="text-base font-bold font-mono text-[#FF9FFC]">
                        ₹{selectedOrder.totalAmount?.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Target Delivery:</span>
                      <span className="text-base font-bold font-mono text-slate-200">
                        {new Date(selectedOrder.confirmedDeliveryDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Yarn Reserved:</span>
                      <span className="text-base font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Atomic Lock
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Payment Status:</span>
                      <span className="text-base font-bold text-slate-200 font-mono">
                        {selectedOrder.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="overflow-x-auto border border-slate-800 rounded-lg text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold">
                        <tr>
                          <th className="p-3">Fabric Line</th>
                          <th className="p-3">Specifications</th>
                          <th className="p-3 text-right">Quantity</th>
                          <th className="p-3 text-right">Unit Rate</th>
                          <th className="p-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedOrder.items?.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-3 font-semibold text-slate-200">
                              {item.productId?.name || 'Fabric'}
                            </td>
                            <td className="p-3 text-slate-400 text-[11px]">
                              {item.fabricSpecSnapshot?.gsm} GSM &bull; {item.fabricSpecSnapshot?.weaveType} &bull; {item.fabricSpecSnapshot?.colorName}
                            </td>
                            <td className="p-3 text-right font-mono font-bold">
                              {item.quantity?.toLocaleString()} {item.unit}
                            </td>
                            <td className="p-3 text-right font-mono">
                              ₹{item.unitPrice}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-[#FF9FFC]">
                              ₹{item.lineTotal?.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Enhanced Production Telemetry, ASTM 4-Point QC & Dispatch Terminal */}
                <Card className="border border-slate-800/80 bg-[#0D1220]/90 text-white rounded-xl shadow-xl overflow-hidden backdrop-blur-md">
                  <div className="p-4 border-b border-slate-800/80 bg-gradient-to-r from-[#5227FF]/15 via-transparent to-transparent flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-[#5227FF]/20 border border-[#5227FF]/40 text-[#FF9FFC]">
                        <Cpu className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold font-rajdhani uppercase tracking-wider text-white">
                            Production Telemetry &amp; Roll QC Terminal
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/40 border border-emerald-800/50 text-emerald-300">
                            LIVE LOOM FEED
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Real-time picks, ASTM 4-point defect grading, and bay dispatch manifest
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDocumentOrderId(selectedOrder._id)}
                        className="text-xs border-slate-700 bg-slate-800/60 hover:bg-[#5227FF] text-slate-200 hover:text-white flex items-center gap-1.5"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Authorized Manifest</span>
                      </Button>
                    </div>
                  </div>

                  <div className="p-5 space-y-6">
                    {/* 1. Live Loom Telemetry Grid */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5 text-[#FF9FFC] animate-pulse" />
                          Assigned Weaving Machinery &amp; Telemetry
                        </span>
                        <span className="text-[11px] font-mono text-[#FF9FFC] font-semibold">
                          Loom: Tsudakoma Airjet AJ-04 &bull; Bay 12
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-[#090D18] border border-slate-800/90 rounded-lg">
                          <span className="text-[10px] uppercase font-rajdhani font-bold text-slate-400">Picks / Minute</span>
                          <p className="text-lg font-bold font-mono text-white mt-0.5">865 PPM</p>
                          <span className="text-[10px] text-emerald-400 font-semibold font-mono">Normal &plusmn;2%</span>
                        </div>
                        <div className="p-3 bg-[#090D18] border border-slate-800/90 rounded-lg">
                          <span className="text-[10px] uppercase font-rajdhani font-bold text-slate-400">Warp Tension</span>
                          <p className="text-lg font-bold font-mono text-white mt-0.5">320 cN</p>
                          <span className="text-[10px] text-emerald-400 font-semibold font-mono">Calibrated</span>
                        </div>
                        <div className="p-3 bg-[#090D18] border border-slate-800/90 rounded-lg">
                          <span className="text-[10px] uppercase font-rajdhani font-bold text-slate-400">Fleet OEE</span>
                          <p className="text-lg font-bold font-mono text-[#FF9FFC] mt-0.5">96.4%</p>
                          <span className="text-[10px] text-slate-400 font-mono">Target: 95%</span>
                        </div>
                        <div className="p-3 bg-[#090D18] border border-slate-800/90 rounded-lg">
                          <span className="text-[10px] uppercase font-rajdhani font-bold text-slate-400">Yarn Lot Batch</span>
                          <p className="text-sm font-bold font-mono text-white mt-1 truncate">YC-2026-904</p>
                          <span className="text-[10px] text-slate-400 font-mono">40s Combed Cotton</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. 6-Stage Fulfillment Stepper */}
                    <div>
                      <span className="text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-300 block mb-2.5">
                        Mill Production Stage Progression
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                        {[
                          { step: '1. Yarn Inward', status: 'COMPLETED', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20' },
                          { step: '2. Warping/Sizing', status: 'COMPLETED', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20' },
                          { step: '3. Loom Weaving', status: selectedOrder.status === 'DRAFT' || selectedOrder.status === 'CONFIRMED' ? 'IN PROGRESS' : 'COMPLETED', color: 'text-[#FF9FFC] border-[#5227FF]/50 bg-[#5227FF]/20' },
                          { step: '4. Dyeing/Finishing', status: selectedOrder.status === 'FULFILLED' ? 'COMPLETED' : 'QUEUED', color: 'text-slate-400 border-slate-800 bg-[#090D18]' },
                          { step: '5. ASTM 4-Pt QC', status: selectedOrder.status === 'FULFILLED' ? 'COMPLETED' : 'PENDING', color: 'text-slate-400 border-slate-800 bg-[#090D18]' },
                          { step: '6. Bay Dispatch', status: selectedOrder.status === 'FULFILLED' ? 'DISPATCHED' : 'READY', color: 'text-slate-400 border-slate-800 bg-[#090D18]' }
                        ].map((st, i) => (
                          <div key={i} className={`p-2.5 rounded-lg border text-center ${st.color}`}>
                            <p className="text-[11px] font-bold font-rajdhani uppercase">{st.step}</p>
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider block mt-1">{st.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 3. ASTM 4-Point Roll Inspection Log */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                          ASTM 4-Point Inspected Fabric Rolls (Tamper-Evident QR)
                        </span>
                        <span className="text-[11px] font-mono font-bold text-emerald-400">
                          Pass Rate: 100% (4 / 4 Approved)
                        </span>
                      </div>
                      <div className="border border-slate-800/80 rounded-lg overflow-hidden bg-[#090D18]">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#0B0F1C] border-b border-slate-800 text-slate-400 font-rajdhani font-bold uppercase text-[10px]">
                            <tr>
                              <th className="p-2.5">Roll ID</th>
                              <th className="p-2.5 text-right">Length (m)</th>
                              <th className="p-2.5 text-right">Weight (kg)</th>
                              <th className="p-2.5 text-center">Defect Pts / 100m²</th>
                              <th className="p-2.5 text-center">Grade</th>
                              <th className="p-2.5 text-center">Optical QC</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono">
                            {[
                              { id: 'ROLL-9041-A', length: 104.5, weight: 26.2, pts: '0.8 pts', grade: 'Grade A', status: 'PASS' },
                              { id: 'ROLL-9042-A', length: 102.0, weight: 25.8, pts: '1.2 pts', grade: 'Grade A', status: 'PASS' },
                              { id: 'ROLL-9043-A', length: 98.5, weight: 24.9, pts: '0.4 pts', grade: 'Grade A (Flawless)', status: 'PASS' },
                              { id: 'ROLL-9044-A', length: 105.0, weight: 26.5, pts: '1.5 pts', grade: 'Grade A', status: 'PASS' }
                            ].map((r) => (
                              <tr key={r.id} className="hover:bg-slate-800/30">
                                <td className="p-2.5 font-bold text-white flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  {r.id}
                                </td>
                                <td className="p-2.5 text-right text-slate-200">{r.length.toFixed(1)} m</td>
                                <td className="p-2.5 text-right text-slate-200">{r.weight.toFixed(1)} kg</td>
                                <td className="p-2.5 text-center text-slate-300 font-semibold">{r.pts}</td>
                                <td className="p-2.5 text-center">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                                    {r.grade}
                                  </span>
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#5227FF]/20 text-[#FF9FFC] border border-[#5227FF]/40">
                                    CERTIFIED ✓
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* AI Fabric Quality Assurance & XGBoost Prediction Console */}
                    <div>
                      <AiQualityConsole
                        persona="MANAGER"
                        orderNumber={selectedOrder.orderNumber}
                        rollId="ROL-9041-A"
                        customerName={selectedOrder.customerId?.name || 'Apex Garments Sourcing Pvt Ltd'}
                        loomId="LOOM-AJ-04"
                        initialData={{
                          fabric_type: 'Cotton',
                          colour: 'White',
                          yarn_batch_age_days: 10,
                          production_length_m: 1200,
                          downtime_min: 15,
                          production_duration_min: 130
                        }}
                      />
                    </div>

                    {/* 4. Dispatch Bay & Carrier Manifest */}
                    <div className="p-3.5 bg-[#090D18] border border-slate-800/80 rounded-lg flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/80 text-white">
                          <Truck className="h-5 w-5 text-[#FF9FFC]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold font-rajdhani uppercase text-white">
                            Dispatch Bay 03 &bull; Freight Manifest Verified
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Carrier: Blue Dart Express &bull; Truck: MH-04-EB-8821 &bull; Seal #TS-88912
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 font-mono font-bold">
                          E-Way Bill Active
                        </span>
                        <Button
                          size="sm"
                          onClick={() => setDocumentOrderId(selectedOrder._id)}
                          className="bg-gradient-to-r from-[#5227FF] to-[#FF9FFC] hover:opacity-90 text-white font-rajdhani font-bold uppercase tracking-wider text-xs"
                        >
                          Print E-Way Gate Pass
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {/* Authorized Document Modal */}
      {documentOrderId && (
        <AuthorizedOrderDocumentModal
          orderId={documentOrderId}
          onClose={() => setDocumentOrderId(null)}
        />
      )}
    </div>
  );
}

// ==========================================
// 4. ADMIN INVENTORY & RAW MATERIAL LEDGER
// ==========================================
export function AdminInventoryPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [shortages, setShortages] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'shortages' | 'ledger'
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showGrnModal, setShowGrnModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);

  // Form states
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [confirmedOrders, setConfirmedOrders] = useState([]);
  const [grnForm, setGrnForm] = useState({
    purchaseOrderId: '',
    deliveryChallanNumber: '',
    receivedDate: new Date().toISOString().split('T')[0],
    items: [],
    allowOverReceipt: false,
    overReceiptReason: '',
    remarks: '',
  });

  const [issueForm, setIssueForm] = useState({
    orderId: '',
    inventoryItemId: '',
    quantity: '',
    reason: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    inventoryItemId: '',
    deltaAmount: '',
    reason: '',
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (lowStockFilter) params.set('lowStockOnly', 'true');
      if (searchQuery) params.set('search', searchQuery);

      const [invRes, shortRes, movRes] = await Promise.all([
        api.get(`/inventory?${params.toString()}`),
        api.get('/inventory/shortages'),
        api.get('/inventory/movements?limit=30'),
      ]);

      setItems(invRes.data || []);
      setSummary(invRes.summary || null);
      setShortages(shortRes.data || null);
      setMovements(movRes.data || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [categoryFilter, lowStockFilter, searchQuery]);

  // Load auxiliary data for modals
  const loadModalDependencies = async () => {
    try {
      const [pos, ords] = await Promise.all([
        api.get('/procurement/orders?status=ISSUED'),
        api.get('/orders?status=CONFIRMED'),
      ]);
      setPurchaseOrders(pos.data || []);
      setConfirmedOrders(ords.data || []);
    } catch (err) {
      console.error('Error loading modal helpers:', err);
    }
  };

  const handleOpenGrnModal = () => {
    loadModalDependencies();
    setGrnForm({
      purchaseOrderId: '',
      deliveryChallanNumber: '',
      receivedDate: new Date().toISOString().split('T')[0],
      items: [],
      allowOverReceipt: false,
      overReceiptReason: '',
      remarks: '',
    });
    setErrorMessage('');
    setSuccessMessage('');
    setShowGrnModal(true);
  };

  const handleSelectPoForGrn = async (poId) => {
    const po = purchaseOrders.find((p) => p._id === poId);
    if (!po) return;

    setGrnForm((prev) => ({
      ...prev,
      purchaseOrderId: poId,
      items: po.items.map((line) => {
        const remaining = Math.max(0, line.quantity - (line.receivedQuantity || 0));
        return {
          poItemId: line._id,
          inventoryItemId: line.inventoryItemId,
          description: line.description,
          orderedQty: line.quantity,
          receivedSoFar: line.receivedQuantity || 0,
          remainingAuthorized: remaining,
          receivedQuantity: remaining,
          acceptedQuantity: remaining,
          rejectedQuantity: 0,
          rejectionReason: '',
          yarnBatchNumber: `BAT-${Date.now().toString().slice(-4)}`,
          unit: line.unit,
        };
      }),
    }));
  };

  const submitGrn = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.post('/inventory/goods-receipt', grnForm);
      setSuccessMessage(res.message || 'Goods receipt recorded successfully!');
      setShowGrnModal(false);
      fetchInventory();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to record Goods Receipt');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenIssueModal = () => {
    loadModalDependencies();
    setIssueForm({
      orderId: '',
      inventoryItemId: items.length > 0 ? items[0]._id : '',
      quantity: '',
      reason: '',
    });
    setErrorMessage('');
    setSuccessMessage('');
    setShowIssueModal(true);
  };

  const submitIssueMaterial = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.post('/inventory/issue-material', {
        ...issueForm,
        quantity: Number(issueForm.quantity),
      });
      setSuccessMessage(res.message || 'Material issued successfully!');
      setShowIssueModal(false);
      fetchInventory();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to issue material');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAdjustModal = (item = null) => {
    setAdjustForm({
      inventoryItemId: item ? item._id : items.length > 0 ? items[0]._id : '',
      deltaAmount: '',
      reason: '',
    });
    setErrorMessage('');
    setSuccessMessage('');
    setShowAdjustModal(true);
  };

  const submitAdjustment = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.post('/inventory/adjust-stock', {
        ...adjustForm,
        deltaAmount: Number(adjustForm.deltaAmount),
      });
      setSuccessMessage(res.message || 'Physical audit adjustment recorded!');
      setShowAdjustModal(false);
      fetchInventory();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to adjust stock');
    } finally {
      setActionLoading(false);
    }
  };

  const viewItemLedger = async (itemId) => {
    try {
      const res = await api.get(`/inventory/${itemId}`);
      setSelectedItemDetail(res.data);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch item details');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D1220] p-6 rounded-xl border border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Yarn & Raw Material Inventory</h1>
            <Badge variant="outline" className="text-[10px] bg-[#5227FF]/15 text-[#FF9FFC] border-[#5227FF]/40">
              ACID Concurrency Safe
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track on-hand, reserved, available-to-promise, and incoming stock balances. Enforce non-negative conditional ledger updates and goods receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={handleOpenGrnModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 gap-1.5"
          >
            <ArrowDownRight className="h-4 w-4" />
            Record Goods Receipt (GRN)
          </Button>

          <Button
            size="sm"
            onClick={handleOpenIssueModal}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 gap-1.5"
          >
            <ArrowUpRight className="h-4 w-4" />
            Issue to Production
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenAdjustModal(null)}
            className="text-slate-300 text-xs h-9 gap-1.5"
          >
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            Audit Adjustment
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchInventory}
            className="text-slate-500 hover:text-slate-200 h-9 px-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-800 font-bold">×</button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-800 font-bold">×</button>
        </div>
      )}

      {/* Summary Metrics Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total SKUs</p>
            <p className="text-xl font-bold text-white mt-1">{summary.totalSkus}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Active Mill Items</p>
          </Card>

          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">On-Hand Stock</p>
            <p className="text-xl font-bold text-white mt-1">{summary.totalOnHand.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg/m</span></p>
            <p className="text-[10px] text-slate-400 mt-0.5">Physical Inventory</p>
          </Card>

          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Reserved</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{summary.totalReserved.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg/m</span></p>
            <p className="text-[10px] text-amber-600 mt-0.5">Locked for Sales Orders</p>
          </Card>

          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Available (ATP)</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{summary.totalAvailable.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg/m</span></p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Uncommitted for Quotes</p>
          </Card>

          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Incoming POs</p>
            <p className="text-xl font-bold text-[#FF9FFC] mt-1">{summary.totalIncoming.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg/m</span></p>
            <p className="text-[10px] text-blue-600 mt-0.5">Authorized Purchase Orders</p>
          </Card>

          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Low Stock Alerts</p>
            <p className="text-xl font-bold text-rose-700 mt-1">{summary.lowStockCount}</p>
            <p className="text-[10px] text-rose-500 mt-0.5">Below Reorder Level</p>
          </Card>
        </div>
      )}

      {/* Tabs & Search Navigation */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {[
            { id: 'inventory', label: 'Stock Balances', icon: Package },
            { id: 'shortages', label: 'Shortage Summary', icon: AlertTriangle, badge: shortages?.totalShortageSkus },
            { id: 'ledger', label: 'Stock Movement Ledger', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  active
                    ? 'bg-[#5227FF]/15 text-[#FF9FFC] font-semibold border border-[#5227FF]/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-100'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === 'inventory' && (
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search SKU, yarn, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-800 bg-[#0D1220] focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-800 bg-[#0D1220] text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="RAW_YARN">Raw Yarn</option>
              <option value="DYES_CHEMICALS">Dyes & Chemicals</option>
              <option value="GREY_FABRIC">Grey Fabric</option>
              <option value="FINISHED_FABRIC">Finished Fabric</option>
              <option value="SPARE_PARTS">Spare Parts</option>
            </select>

            {/* Low stock toggle */}
            <button
              onClick={() => setLowStockFilter(!lowStockFilter)}
              className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                lowStockFilter
                  ? 'bg-rose-50 text-rose-700 border-rose-300 font-semibold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              Low Stock Only
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Stock Balances Table */}
      {activeTab === 'inventory' && (
        <Card className="border-slate-800 overflow-hidden shadow-xs bg-[#0D1220]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400">
              <thead className="bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">SKU / Item Name</th>
                  <th className="py-3 px-4 font-semibold">Category / Spec</th>
                  <th className="py-3 px-4 font-semibold text-right">On-Hand</th>
                  <th className="py-3 px-4 font-semibold text-right">Reserved</th>
                  <th className="py-3 px-4 font-semibold text-right text-emerald-700">Available (ATP)</th>
                  <th className="py-3 px-4 font-semibold text-right text-[#FF9FFC]">Incoming PO</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold">Location</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No inventory items found matching current filters.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item._id} className="hover:bg-[#090D17] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{item.sku}</div>
                        <div className="text-[11px] text-slate-500">{item.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-300">{item.category.replace('_', ' ')}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.yarnType || ''} {item.yarnColor ? `(${item.yarnColor})` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-200">
                        {item.quantityOnHand.toLocaleString()} <span className="text-[10px] text-slate-400">{item.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-amber-700">
                        {item.quantityReserved.toLocaleString()} <span className="text-[10px] text-slate-400">{item.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        {item.availableStock.toLocaleString()} <span className="text-[10px] text-slate-400">{item.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[#FF9FFC]">
                        {item.incomingStock > 0 ? (
                          `+${item.incomingStock.toLocaleString()}`
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            item.stockHealth === 'HEALTHY'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.stockHealth === 'LOW_STOCK'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.stockHealth.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {item.warehouseLocation || 'MAIN-WH'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => viewItemLedger(item._id)}
                            title="Inspect Batches & Movements"
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-[#5227FF]/15 rounded"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenAdjustModal(item)}
                            title="Audit Adjust Stock"
                            className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: Shortage Summaries & Deficits */}
      {activeTab === 'shortages' && shortages && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-xs text-amber-900">
                Production Shortage & Reorder Requisitions
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Evaluated against {shortages.activeOrdersCount} confirmed customer production orders. Shortages indicate materials where available stock is below minimum reorder thresholds or customer delivery commitments.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shortages.shortages.length === 0 ? (
              <Card className="col-span-full p-8 text-center text-slate-400 bg-[#0D1220]">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-300">No Material Shortages Detected</p>
                <p className="text-xs text-slate-400 mt-1">All active confirmed orders have sufficient yarn stock.</p>
              </Card>
            ) : (
              shortages.shortages.map((s) => (
                <Card key={s.inventoryItemId} className="p-4 border-slate-800 bg-[#0D1220] shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-white">{s.sku}</span>
                      <h4 className="text-xs font-semibold text-slate-300 mt-0.5">{s.name}</h4>
                      <p className="text-[11px] text-slate-400">{s.yarnType}</p>
                    </div>
                    <Badge variant={s.severity === 'CRITICAL' ? 'destructive' : 'warning'}>
                      {s.severity}
                    </Badge>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400">Available Stock:</span>
                      <p className="font-bold text-slate-200">{s.availableStock} kg</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Reorder Threshold:</span>
                      <p className="font-bold text-slate-200">{s.minimumReorderLevel} kg</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Deficit Gap:</span>
                      <p className="font-bold text-rose-600">-{s.deficitQuantity} kg</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Open PRQs:</span>
                      <p className="font-bold text-blue-600">{s.pendingPurchaseRequestQuantity} kg</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Immutable Stock Movement Ledger */}
      {activeTab === 'ledger' && (
        <Card className="border-slate-800 bg-[#0D1220] shadow-xs overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <History className="h-4 w-4 text-blue-600" />
              Immutable Material Movement Ledger
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Audit-trail ledger recording every receipt, issue, and adjustment with cryptographic consistency.
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400">
              <thead className="bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Movement #</th>
                  <th className="py-2.5 px-4 font-semibold">Date & Time</th>
                  <th className="py-2.5 px-4 font-semibold">Item SKU</th>
                  <th className="py-2.5 px-4 font-semibold">Movement Type</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Delta</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Previous On-Hand</th>
                  <th className="py-2.5 px-4 font-semibold text-right">New On-Hand</th>
                  <th className="py-2.5 px-4 font-semibold">Reference</th>
                  <th className="py-2.5 px-4 font-semibold">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m._id} className="hover:bg-[#090D17]">
                      <td className="py-2.5 px-4 font-bold text-slate-200">{m.movementNumber}</td>
                      <td className="py-2.5 px-4 text-slate-500 font-sans">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                        {m.inventoryItemId?.sku || 'SKU'}
                      </td>
                      <td className="py-2.5 px-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            m.movementType.includes('RECEIPT')
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.movementType.includes('ISSUE')
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {m.movementType}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-bold ${
                          m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500">{m.previousQuantityOnHand}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-200">{m.newQuantityOnHand}</td>
                      <td className="py-2.5 px-4 text-slate-500 font-sans">
                        {m.referenceModel}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-sans">
                        {m.recordedBy?.name || 'System'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL 1: Record Goods Receipt (GRN) */}
      {showGrnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#0D1220] text-slate-100 border border-slate-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ArrowDownRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Record Goods Receipt (GRN)</h3>
                  <p className="text-xs text-slate-500">Atomic verification against Purchase Order with batch registration</p>
                </div>
              </div>
              <button onClick={() => setShowGrnModal(false)} className="text-slate-400 hover:text-slate-300 font-bold text-lg">×</button>
            </div>

            <form onSubmit={submitGrn} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Select Purchase Order *</label>
                  <select
                    required
                    value={grnForm.purchaseOrderId}
                    onChange={(e) => handleSelectPoForGrn(e.target.value)}
                    className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800 bg-[#0D1220]"
                  >
                    <option value="">Choose Open PO...</option>
                    {purchaseOrders.map((po) => (
                      <option key={po._id} value={po._id}>
                        {po.poNumber} — {po.supplierId?.name || 'Supplier'} ({po.items.length} items)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Delivery Challan Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DC-2026-9921"
                    value={grnForm.deliveryChallanNumber}
                    onChange={(e) => setGrnForm({ ...grnForm, deliveryChallanNumber: e.target.value })}
                    className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Receipt Date *</label>
                  <input
                    type="date"
                    required
                    value={grnForm.receivedDate}
                    onChange={(e) => setGrnForm({ ...grnForm, receivedDate: e.target.value })}
                    className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800"
                  />
                </div>
              </div>

              {/* Line items table */}
              {grnForm.items.length > 0 && (
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <div className="bg-slate-900/60 p-2.5 border-b border-slate-800 text-xs font-bold text-slate-300">
                    PO Line Items Reconciliation
                  </div>
                  <div className="divide-y divide-slate-100">
                    {grnForm.items.map((line, idx) => (
                      <div key={idx} className="p-3 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{line.description}</span>
                          <span className="text-slate-500">
                            Ordered: {line.orderedQty} | Remaining: {line.remainingAuthorized} {line.unit}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 font-medium">Received Qty</label>
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              required
                              value={line.receivedQuantity}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const newItems = [...grnForm.items];
                                newItems[idx].receivedQuantity = val;
                                newItems[idx].acceptedQuantity = val - (newItems[idx].rejectedQuantity || 0);
                                setGrnForm({ ...grnForm, items: newItems });
                              }}
                              className="w-full p-1.5 border border-slate-800 rounded text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 font-medium">Accepted Qty</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              required
                              value={line.acceptedQuantity}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const newItems = [...grnForm.items];
                                newItems[idx].acceptedQuantity = val;
                                setGrnForm({ ...grnForm, items: newItems });
                              }}
                              className="w-full p-1.5 border border-slate-800 rounded text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 font-medium">Rejected Qty</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={line.rejectedQuantity}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const newItems = [...grnForm.items];
                                newItems[idx].rejectedQuantity = val;
                                newItems[idx].acceptedQuantity = newItems[idx].receivedQuantity - val;
                                setGrnForm({ ...grnForm, items: newItems });
                              }}
                              className="w-full p-1.5 border border-slate-800 rounded text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 font-medium">Batch / Lot #</label>
                            <input
                              type="text"
                              value={line.yarnBatchNumber}
                              onChange={(e) => {
                                const newItems = [...grnForm.items];
                                newItems[idx].yarnBatchNumber = e.target.value;
                                setGrnForm({ ...grnForm, items: newItems });
                              }}
                              className="w-full p-1.5 border border-slate-800 rounded text-xs"
                            />
                          </div>
                        </div>

                        {line.rejectedQuantity > 0 && (
                          <div>
                            <input
                              type="text"
                              placeholder="Reason for rejection (e.g. moisture test failure)..."
                              value={line.rejectionReason}
                              onChange={(e) => {
                                const newItems = [...grnForm.items];
                                newItems[idx].rejectionReason = e.target.value;
                                setGrnForm({ ...grnForm, items: newItems });
                              }}
                              className="w-full p-1.5 border border-rose-200 bg-rose-50/50 rounded text-xs"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Over-receipt authorization control */}
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowOverReceipt"
                    checked={grnForm.allowOverReceipt}
                    onChange={(e) => setGrnForm({ ...grnForm, allowOverReceipt: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <label htmlFor="allowOverReceipt" className="text-xs font-semibold text-slate-200">
                    Authorize Over-Receipt Exception (if received exceeds PO limit)
                  </label>
                </div>
                {grnForm.allowOverReceipt && (
                  <input
                    type="text"
                    required
                    placeholder="Enter authorized justification for over-receipt..."
                    value={grnForm.overReceiptReason}
                    onChange={(e) => setGrnForm({ ...grnForm, overReceiptReason: e.target.value })}
                    className="w-full p-2 border border-amber-300 bg-amber-50 rounded text-xs"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowGrnModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading || !grnForm.purchaseOrderId}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                  Submit Goods Receipt
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Issue Material to Production */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#0D1220] text-slate-100 border border-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-[#FF9FFC] flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Issue Material to Production</h3>
                  <p className="text-xs text-slate-500">Atomic stock deduction with reservation release</p>
                </div>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-300 font-bold text-lg">×</button>
            </div>

            <form onSubmit={submitIssueMaterial} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Target Confirmed Order *</label>
                <select
                  required
                  value={issueForm.orderId}
                  onChange={(e) => setIssueForm({ ...issueForm, orderId: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800 bg-[#0D1220]"
                >
                  <option value="">Choose Order...</option>
                  {confirmedOrders.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.orderNumber} ({o.items?.[0]?.quantity}m)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Inventory Item *</label>
                <select
                  required
                  value={issueForm.inventoryItemId}
                  onChange={(e) => setIssueForm({ ...issueForm, inventoryItemId: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800 bg-[#0D1220]"
                >
                  {items.map((i) => (
                    <option key={i._id} value={i._id}>
                      {i.sku} — {i.name} (Available: {i.availableStock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Issue Quantity *</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder="e.g. 250"
                  value={issueForm.quantity}
                  onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Issued for Warping Section A"
                  value={issueForm.reason}
                  onChange={(e) => setIssueForm({ ...issueForm, reason: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowIssueModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                  Issue Material
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Physical Audit Adjustment */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#0D1220] text-slate-100 border border-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Physical Stock Count Adjustment</h3>
                  <p className="text-xs text-slate-500">Authorized floor audit with bound protection</p>
                </div>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-300 font-bold text-lg">×</button>
            </div>

            <form onSubmit={submitAdjustment} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Inventory Item *</label>
                <select
                  required
                  value={adjustForm.inventoryItemId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, inventoryItemId: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800 bg-[#0D1220]"
                >
                  {items.map((i) => (
                    <option key={i._id} value={i._id}>
                      {i.sku} — {i.name} (On-Hand: {i.quantityOnHand}, Reserved: {i.quantityReserved})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Delta Adjustment (+ or -) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. +50 or -20"
                  value={adjustForm.deltaAmount}
                  onChange={(e) => setAdjustForm({ ...adjustForm, deltaAmount: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Safe guard: On-hand will not be permitted to fall below reserved stock.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Audit Justification *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Godown Physical Recount discrepancy"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAdjustModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                  Apply Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL: Item Batches & History Detail */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#0D1220] text-slate-100 border border-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedItemDetail.sku} — {selectedItemDetail.name}</h3>
                <p className="text-xs text-slate-500">Warehouse: {selectedItemDetail.warehouseLocation} | Unit Cost: ₹{selectedItemDetail.unitCost}</p>
              </div>
              <button onClick={() => setSelectedItemDetail(null)} className="text-slate-400 hover:text-slate-300 font-bold text-lg">×</button>
            </div>

            {/* Yarn Batches */}
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Registered Batches</h4>
              {selectedItemDetail.batches?.length === 0 ? (
                <p className="text-xs text-slate-400">No batch records registered for this SKU.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedItemDetail.batches?.map((b) => (
                    <div key={b._id} className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                      <div className="font-mono font-bold text-slate-200">{b.batchNumber}</div>
                      <div className="text-[11px] text-slate-500">Remaining: {b.remainingQuantity} / Received: {b.receivedQuantity} {b.unit}</div>
                      <div className="text-[10px] text-slate-400 mt-1">Lot: {b.yarnSpecification?.lotNumber || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Item movements */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Recent Stock Movements</h4>
              <div className="divide-y divide-slate-100 text-xs max-h-60 overflow-y-auto">
                {selectedItemDetail.movements?.map((m) => (
                  <div key={m._id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-semibold text-slate-200">{m.movementNumber}</span>
                      <p className="text-[11px] text-slate-400">{m.reason || m.movementType}</p>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                      </span>
                      <p className="text-[10px] text-slate-400">{new Date(m.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 5. ADMIN PROCUREMENT & PURCHASE ORDERS
// ==========================================
export function AdminProcurementPage() {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'requests' | 'suppliers'
  const [overview, setOverview] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [poStatusFilter, setPoStatusFilter] = useState('ALL');
  const [prStatusFilter, setPrStatusFilter] = useState('ALL');

  // Modal states
  const [showCreatePoModal, setShowCreatePoModal] = useState(false);
  const [showCreatePrModal, setShowCreatePrModal] = useState(false);
  const [selectedPoDetail, setSelectedPoDetail] = useState(null);

  // Form states
  const [poForm, setPoForm] = useState({
    supplierId: '',
    purchaseRequestId: '',
    expectedDeliveryDate: '',
    allowOverReceipt: false,
    overReceiptReason: '',
    notes: '',
    items: [
      {
        inventoryItemId: '',
        description: '',
        quantity: '',
        unitPrice: '',
      },
    ],
  });

  const [prForm, setPrForm] = useState({
    inventoryItemId: '',
    requiredQuantity: '',
    reason: 'SHORTAGE_FOR_ORDER',
    notes: '',
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchProcurementData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [overRes, poRes, prRes, supRes, invRes] = await Promise.all([
        api.get('/procurement/overview'),
        api.get(`/procurement/orders${poStatusFilter !== 'ALL' ? `?status=${poStatusFilter}` : ''}`),
        api.get(`/procurement/requests${prStatusFilter !== 'ALL' ? `?status=${prStatusFilter}` : ''}`),
        api.get('/procurement/suppliers'),
        api.get('/inventory'),
      ]);

      setOverview(overRes.data || null);
      setPurchaseOrders(poRes.data || []);
      setPurchaseRequests(prRes.data || []);
      setSuppliers(supRes.data || []);
      setInventoryItems(invRes.data || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch procurement data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcurementData();
  }, [poStatusFilter, prStatusFilter]);

  const handleOpenCreatePo = (fromPr = null) => {
    setErrorMessage('');
    setSuccessMessage('');
    if (fromPr) {
      setPoForm({
        supplierId: suppliers[0]?._id || '',
        purchaseRequestId: fromPr._id,
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        allowOverReceipt: false,
        overReceiptReason: '',
        notes: `Issued against Request ${fromPr.requestNumber}`,
        items: [
          {
            inventoryItemId: fromPr.inventoryItemId?._id || fromPr.inventoryItemId,
            description: `${fromPr.inventoryItemId?.sku || 'Yarn'} - Shortage Requisition`,
            quantity: fromPr.requiredQuantity,
            unitPrice: 280,
          },
        ],
      });
    } else {
      setPoForm({
        supplierId: suppliers[0]?._id || '',
        purchaseRequestId: '',
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        allowOverReceipt: false,
        overReceiptReason: '',
        notes: '',
        items: [
          {
            inventoryItemId: inventoryItems[0]?._id || '',
            description: inventoryItems[0]?.name || '',
            quantity: '',
            unitPrice: inventoryItems[0]?.unitCost || '',
          },
        ],
      });
    }
    setShowCreatePoModal(true);
  };

  const handleAddPoLine = () => {
    setPoForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          inventoryItemId: inventoryItems[0]?._id || '',
          description: inventoryItems[0]?.name || '',
          quantity: '',
          unitPrice: inventoryItems[0]?.unitCost || '',
        },
      ],
    }));
  };

  const handleRemovePoLine = (index) => {
    setPoForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const submitCreatePo = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage('');
    try {
      const payload = {
        ...poForm,
        items: poForm.items.map((it) => ({
          ...it,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        })),
      };
      const res = await api.post('/procurement/orders', payload);
      setSuccessMessage(res.message || 'Purchase Order issued successfully!');
      setShowCreatePoModal(false);
      fetchProcurementData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to issue Purchase Order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCreatePr = () => {
    setPrForm({
      inventoryItemId: inventoryItems[0]?._id || '',
      requiredQuantity: '',
      reason: 'SHORTAGE_FOR_ORDER',
      notes: '',
    });
    setErrorMessage('');
    setSuccessMessage('');
    setShowCreatePrModal(true);
  };

  const submitCreatePr = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage('');
    try {
      const payload = {
        ...prForm,
        requiredQuantity: Number(prForm.requiredQuantity),
      };
      const res = await api.post('/procurement/requests', payload);
      setSuccessMessage(res.message || 'Purchase Request created!');
      setShowCreatePrModal(false);
      fetchProcurementData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create Purchase Request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovePr = async (requestId) => {
    setActionLoading(true);
    try {
      await api.patch(`/procurement/requests/${requestId}/approve`);
      setSuccessMessage('Purchase Request approved!');
      fetchProcurementData();
    } catch (err) {
      setErrorMessage(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPr = async (requestId) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;
    setActionLoading(true);
    try {
      await api.patch(`/procurement/requests/${requestId}/reject`, { reason });
      setSuccessMessage('Purchase Request rejected');
      fetchProcurementData();
    } catch (err) {
      setErrorMessage(err.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const viewPoDetails = async (poId) => {
    try {
      const res = await api.get(`/procurement/orders/${poId}`);
      setSelectedPoDetail(res.data);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load PO details');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D1220] p-6 rounded-xl border border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Procurement & Supplier Purchase Orders</h1>
            <Badge variant="outline" className="text-[10px] bg-[#5227FF]/15 text-[#FF9FFC] border-[#5227FF]/40">
              Contract Enforced
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage purchase requisitions for yarn shortages, issue purchase orders, track supplier delivery commitments and supplier delay metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleOpenCreatePo(null)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Issue Purchase Order
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenCreatePr}
            className="text-slate-300 text-xs h-9 gap-1.5"
          >
            <FileText className="h-4 w-4 text-slate-500" />
            Request Shortage PRQ
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchProcurementData}
            className="text-slate-500 hover:text-slate-200 h-9 px-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-800 font-bold">×</button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-800 font-bold">×</button>
        </div>
      )}

      {/* Metrics Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total POs</p>
            <p className="text-xl font-bold text-white mt-1">{overview.totalPurchaseOrders}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Commercial Contracts</p>
          </Card>

          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Open POs</p>
            <p className="text-xl font-bold text-[#FF9FFC] mt-1">{overview.openOrdersCount}</p>
            <p className="text-[10px] text-blue-600 mt-0.5">Pending Delivery</p>
          </Card>

          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Delayed POs</p>
            <p className="text-xl font-bold text-rose-700 mt-1">{overview.delayedOrdersCount}</p>
            <p className="text-[10px] text-rose-500 mt-0.5">Past Expected Date</p>
          </Card>

          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Pending PRQs</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{overview.pendingRequestsCount}</p>
            <p className="text-[10px] text-amber-600 mt-0.5">Awaiting Approval</p>
          </Card>

          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Spend</p>
            <p className="text-xl font-bold text-white mt-1">₹{(overview.totalPoSpend / 100000).toFixed(1)}L</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Cumulative Material Value</p>
          </Card>

          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Avg Delay Days</p>
            <p className="text-xl font-bold text-white mt-1">{overview.avgSupplierDelayDays} <span className="text-xs font-normal text-slate-500">days</span></p>
            <p className="text-[10px] text-slate-400 mt-0.5">Supplier SLA Metric</p>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {[
            { id: 'orders', label: 'Purchase Orders', icon: Truck, count: purchaseOrders.length },
            { id: 'requests', label: 'Shortage Requests (PRQ)', icon: FileText, count: purchaseRequests.length },
            { id: 'suppliers', label: 'Suppliers Directory', icon: Building2, count: suppliers.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  active
                    ? 'bg-[#5227FF]/15 text-[#FF9FFC] font-semibold border border-[#5227FF]/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-100'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span className="text-[10px] bg-slate-100 text-slate-400 font-bold px-1.5 py-0.2 rounded-full">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {activeTab === 'orders' && (
          <div className="flex items-center gap-2">
            <select
              value={poStatusFilter}
              onChange={(e) => setPoStatusFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-800 bg-[#0D1220] text-slate-300"
            >
              <option value="ALL">All PO Statuses</option>
              <option value="ISSUED">Issued / Open</option>
              <option value="PARTIALLY_RECEIVED">Partially Received</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="flex items-center gap-2">
            <select
              value={prStatusFilter}
              onChange={(e) => setPrStatusFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-800 bg-[#0D1220] text-slate-300"
            >
              <option value="ALL">All PRQ Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="PO_CREATED">PO Created</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Purchase Orders Table */}
      {activeTab === 'orders' && (
        <Card className="border-slate-800 overflow-hidden shadow-xs bg-[#0D1220]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400">
              <thead className="bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">PO Number</th>
                  <th className="py-3 px-4 font-semibold">Supplier</th>
                  <th className="py-3 px-4 font-semibold">Items</th>
                  <th className="py-3 px-4 font-semibold text-right">Order Value</th>
                  <th className="py-3 px-4 font-semibold">Expected Delivery</th>
                  <th className="py-3 px-4 font-semibold">Receipt Progress</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No purchase orders found matching current filter.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po._id} className="hover:bg-[#090D17] transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-200">
                        {po.poNumber}
                        {po.allowOverReceipt && (
                          <span className="block text-[10px] text-amber-600 font-normal">Over-Receipt Allowed</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-300">{po.supplierId?.name || 'Supplier'}</div>
                        <div className="text-[11px] text-slate-400">{po.supplierId?.contactPerson?.email || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {po.items.length} line(s) ({po.totalOrdered} units)
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-200">
                        ₹{po.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {po.expectedDeliveryDate
                              ? new Date(po.expectedDeliveryDate).toLocaleDateString()
                              : 'Not Specified'}
                          </span>
                        </div>
                        {po.isOverdue && (
                          <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">Overdue</span>
                        )}
                        {po.supplierDelayDays > 0 && (
                          <span className="text-[10px] text-amber-600 block mt-0.5">
                            Delay: {po.supplierDelayDays} days
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-28">
                          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                            <span>{po.totalReceived} / {po.totalOrdered}</span>
                            <span>{po.completionPercentage}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, po.completionPercentage)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            po.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : po.status === 'PARTIALLY_RECEIVED'
                              ? 'bg-blue-100 text-blue-800'
                              : po.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {po.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewPoDetails(po._id)}
                          className="text-xs h-7 px-2 text-blue-600 hover:text-blue-800"
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: Purchase Requests (PRQ) */}
      {activeTab === 'requests' && (
        <Card className="border-slate-800 overflow-hidden shadow-xs bg-[#0D1220]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-400">
              <thead className="bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Request #</th>
                  <th className="py-3 px-4 font-semibold">Item Required</th>
                  <th className="py-3 px-4 font-semibold text-right">Required Qty</th>
                  <th className="py-3 px-4 font-semibold">Reason / Linked Order</th>
                  <th className="py-3 px-4 font-semibold">Requested By</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No purchase requests found matching filter.
                    </td>
                  </tr>
                ) : (
                  purchaseRequests.map((pr) => (
                    <tr key={pr._id} className="hover:bg-[#090D17] transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-200">{pr.requestNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-300">{pr.inventoryItemId?.sku || 'SKU'}</div>
                        <div className="text-[11px] text-slate-400">{pr.inventoryItemId?.name || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#FF9FFC]">
                        {pr.requiredQuantity.toLocaleString()} {pr.unit}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-300">{pr.reason.replace(/_/g, ' ')}</span>
                        {pr.relatedOrderId && (
                          <span className="block text-[10px] text-slate-400">
                            Order: {pr.relatedOrderId.orderNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {pr.requestedBy?.name || 'System User'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            pr.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-800'
                              : pr.status === 'PO_CREATED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : pr.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {pr.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {pr.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprovePr(pr._id)}
                                title="Approve Request"
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleRejectPr(pr._id)}
                                title="Reject Request"
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {pr.status === 'APPROVED' && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenCreatePo(pr)}
                              className="text-[11px] h-6 px-2 bg-blue-600 hover:bg-blue-700 text-white gap-1"
                            >
                              Issue PO
                            </Button>
                          )}
                          {pr.status === 'PO_CREATED' && pr.purchaseOrderId && (
                            <span className="text-[10px] text-emerald-600 font-semibold font-mono">
                              {pr.purchaseOrderId.poNumber}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Suppliers Directory */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <Card key={sup._id} className="p-4 border-slate-800 bg-[#0D1220] shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-200">{sup.supplierCode}</span>
                  <h3 className="text-sm font-semibold text-white mt-0.5">{sup.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{sup.contactPerson?.name || 'Contact Representative'}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-600">★ {sup.rating || 4.5}</span>
                  <p className="text-[10px] text-slate-400">Supplier Rating</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1">
                <p className="text-slate-400">Email: {sup.contactPerson?.email || 'N/A'}</p>
                <p className="text-slate-400">Phone: {sup.contactPerson?.phone || 'N/A'}</p>
                <p className="text-slate-400">Terms: Net {sup.paymentTermsDays || 30} Days</p>
              </div>

              <div className="mt-3 flex items-center justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    handleOpenCreatePo();
                    setPoForm((prev) => ({ ...prev, supplierId: sup._id }));
                  }}
                  className="text-xs h-7 text-blue-600 gap-1"
                >
                  Create PO <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL 1: Create Purchase Order */}
      {showCreatePoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#0D1220] text-slate-100 border border-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-[#FF9FFC] flex items-center justify-center">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Issue Supplier Purchase Order</h3>
                  <p className="text-xs text-slate-500">Commercial contract with authorized quantities and delivery commitments</p>
                </div>
              </div>
              <button onClick={() => setShowCreatePoModal(false)} className="text-slate-400 hover:text-slate-300 font-bold text-lg">×</button>
            </div>

            <form onSubmit={submitCreatePo} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Select Supplier *</label>
                  <select
                    required
                    value={poForm.supplierId}
                    onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                    className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800 bg-[#0D1220]"
                  >
                    <option value="">Choose Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.supplierCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Expected Delivery Date *</label>
                  <input
                    type="date"
                    required
                    value={poForm.expectedDeliveryDate}
                    onChange={(e) => setPoForm({ ...poForm, expectedDeliveryDate: e.target.value })}
                    className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800"
                  />
                </div>
              </div>

              {/* Line items */}
              <div className="border border-slate-800 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddPoLine}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Line
                  </button>
                </div>

                {poForm.items.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-500">Material Item *</label>
                      <select
                        required
                        value={line.inventoryItemId}
                        onChange={(e) => {
                          const chosen = inventoryItems.find((i) => i._id === e.target.value);
                          const newItems = [...poForm.items];
                          newItems[idx].inventoryItemId = e.target.value;
                          newItems[idx].description = chosen?.name || '';
                          newItems[idx].unitPrice = chosen?.unitCost || '';
                          setPoForm({ ...poForm, items: newItems });
                        }}
                        className="w-full p-1.5 border border-slate-800 rounded text-xs bg-[#0D1220]"
                      >
                        {inventoryItems.map((i) => (
                          <option key={i._id} value={i._id}>
                            {i.sku} — {i.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500">Quantity (kg/m) *</label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        required
                        placeholder="e.g. 500"
                        value={line.quantity}
                        onChange={(e) => {
                          const newItems = [...poForm.items];
                          newItems[idx].quantity = e.target.value;
                          setPoForm({ ...poForm, items: newItems });
                        }}
                        className="w-full p-1.5 border border-slate-800 rounded text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-500">Unit Price (₹) *</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={line.unitPrice}
                          onChange={(e) => {
                            const newItems = [...poForm.items];
                            newItems[idx].unitPrice = e.target.value;
                            setPoForm({ ...poForm, items: newItems });
                          }}
                          className="w-full p-1.5 border border-slate-800 rounded text-xs"
                        />
                      </div>
                      {poForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePoLine(idx)}
                          className="mt-3 text-rose-500 hover:text-rose-700 text-sm font-bold"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Over-receipt allowance */}
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="poAllowOverReceipt"
                    checked={poForm.allowOverReceipt}
                    onChange={(e) => setPoForm({ ...poForm, allowOverReceipt: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <label htmlFor="poAllowOverReceipt" className="text-xs font-semibold text-slate-200">
                    Pre-Authorize Over-Receipt Tolerance for this PO
                  </label>
                </div>
                {poForm.allowOverReceipt && (
                  <input
                    type="text"
                    required
                    placeholder="Enter reason for pre-authorizing over-receipt..."
                    value={poForm.overReceiptReason}
                    onChange={(e) => setPoForm({ ...poForm, overReceiptReason: e.target.value })}
                    className="w-full p-2 border border-slate-800 rounded text-xs"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Contract Notes</label>
                <textarea
                  rows="2"
                  placeholder="Terms of delivery, payment, packaging instructions..."
                  value={poForm.notes}
                  onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreatePoModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading || !poForm.supplierId}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                  Issue Purchase Order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Purchase Request (PRQ) */}
      {showCreatePrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#0D1220] text-slate-100 border border-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Request Material Shortage PRQ</h3>
                  <p className="text-xs text-slate-500">Initiate procurement workflow for production shortages</p>
                </div>
              </div>
              <button onClick={() => setShowCreatePrModal(false)} className="text-slate-400 hover:text-slate-300 font-bold text-lg">×</button>
            </div>

            <form onSubmit={submitCreatePr} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Shortage Item *</label>
                <select
                  required
                  value={prForm.inventoryItemId}
                  onChange={(e) => setPrForm({ ...prForm, inventoryItemId: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800 bg-[#0D1220]"
                >
                  {inventoryItems.map((i) => (
                    <option key={i._id} value={i._id}>
                      {i.sku} — {i.name} (ATP: {i.availableStock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Required Quantity *</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder="e.g. 500"
                  value={prForm.requiredQuantity}
                  onChange={(e) => setPrForm({ ...prForm, requiredQuantity: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Requisition Reason *</label>
                <select
                  value={prForm.reason}
                  onChange={(e) => setPrForm({ ...prForm, reason: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800 bg-[#0D1220]"
                >
                  <option value="SHORTAGE_FOR_ORDER">Shortage for Confirmed Production Order</option>
                  <option value="MINIMUM_STOCK_REPLENISHMENT">Replenishment below Reorder Level</option>
                  <option value="DEFECT_REPLACEMENT">Replacement for Defective Yarn</option>
                  <option value="NEW_FABRIC_SAMPLING">New Fabric Development Sampling</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Justification Notes</label>
                <textarea
                  rows="2"
                  placeholder="Specific details on lead times, order commitments..."
                  value={prForm.notes}
                  onChange={(e) => setPrForm({ ...prForm, notes: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreatePrModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Submit Requisition
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PO Details & Goods Receipts History */}
      {selectedPoDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#0D1220] text-slate-100 border border-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {selectedPoDetail.poNumber} — {selectedPoDetail.supplierId?.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Total Value: ₹{selectedPoDetail.totalAmount.toLocaleString()} | Status: {selectedPoDetail.status}
                </p>
              </div>
              <button onClick={() => setSelectedPoDetail(null)} className="text-slate-400 hover:text-slate-300 font-bold text-lg">×</button>
            </div>

            {/* Line items */}
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Order Line Items</h4>
              <div className="divide-y divide-slate-100 border border-slate-800 rounded-lg text-xs">
                {selectedPoDetail.items.map((line) => (
                  <div key={line._id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-200">{line.description}</p>
                      <p className="text-[11px] text-slate-400">
                        Price: ₹{line.unitPrice} / {line.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-200">
                        {line.receivedQuantity || 0} / {line.quantity} {line.unit}
                      </p>
                      <p className="text-[10px] text-emerald-600">Accepted: {line.acceptedQuantity || 0}</p>
                      {line.rejectedQuantity > 0 && (
                        <p className="text-[10px] text-rose-600">Rejected: {line.rejectedQuantity}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Goods receipts recorded against this PO */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Goods Receipts (GRNs) Recorded</h4>
              {selectedPoDetail.receipts?.length === 0 ? (
                <p className="text-xs text-slate-400">No goods receipts recorded against this PO yet.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {selectedPoDetail.receipts?.map((r) => (
                    <div key={r._id} className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-slate-200">{r.grnNumber}</span>
                        <p className="text-[11px] text-slate-500">Challan #{r.deliveryChallanNumber} | Received by {r.receivedBy?.name}</p>
                        {r.supplierDelayDays > 0 && (
                          <span className="text-[10px] text-amber-600 font-semibold">Delayed by {r.supplierDelayDays} days</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-500">{new Date(r.receivedDate).toLocaleDateString()}</span>
                        {r.isOverReceipt && (
                          <span className="block text-[10px] text-amber-600 font-semibold">Authorized Over-Receipt</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 6. ADMIN PRODUCTION PLANNING & SCHEDULING
// ==========================================
export function AdminProductionPlanningPage() {
  const [plans, setPlans] = useState([]);
  const [overview, setOverview] = useState(null);
  const [confirmedOrders, setConfirmedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedPlanForReschedule, setSelectedPlanForReschedule] = useState(null);
  const [selectedPlanDetail, setSelectedPlanDetail] = useState(null);

  // Create plan form
  const [planForm, setPlanForm] = useState({
    orderId: '',
    plannedStartDate: new Date().toISOString().split('T')[0],
    plannedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'DRAFT',
    notes: '',
    stages: [
      { stageName: 'WARPING', sequence: 1, targetQuantity: 1000, unit: 'METER', estimatedHours: 24, assignedMachineIds: [] },
      { stageName: 'SIZING', sequence: 2, targetQuantity: 1000, unit: 'METER', estimatedHours: 16, assignedMachineIds: [] },
      { stageName: 'WEAVING', sequence: 3, targetQuantity: 1000, unit: 'METER', estimatedHours: 48, assignedMachineIds: [] },
      { stageName: 'INSPECTION', sequence: 4, targetQuantity: 1000, unit: 'METER', estimatedHours: 12, assignedMachineIds: [] },
      { stageName: 'PACKING', sequence: 5, targetQuantity: 1000, unit: 'METER', estimatedHours: 8, assignedMachineIds: [] },
    ],
  });

  const [orderReadiness, setOrderReadiness] = useState(null);
  const [checkingReadiness, setCheckingReadiness] = useState(false);

  // Reschedule form
  const [rescheduleForm, setRescheduleForm] = useState({
    newStartDate: '',
    newCompletionDate: '',
    reason: '',
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchPlanningData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [overRes, plansRes, ordsRes] = await Promise.all([
        api.get('/production-planning/overview'),
        api.get(`/production-planning/plans${statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''}`),
        api.get('/orders?status=CONFIRMED'),
      ]);

      setOverview(overRes.data || null);
      setPlans(plansRes.data || []);
      setConfirmedOrders(ordsRes.data || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch production planning data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanningData();
  }, [statusFilter]);

  const handleOrderChange = async (orderId) => {
    setPlanForm((prev) => ({ ...prev, orderId }));
    if (!orderId) {
      setOrderReadiness(null);
      return;
    }

    setCheckingReadiness(true);
    try {
      const res = await api.get(`/production-planning/readiness?orderId=${orderId}`);
      setOrderReadiness(res.data);
      // Auto-restrict status to DRAFT if material is in shortage
      if (!res.data.materialReadiness?.isReady) {
        setPlanForm((prev) => ({ ...prev, orderId, status: 'DRAFT' }));
      }
    } catch (err) {
      console.error('Readiness check failed:', err);
    } finally {
      setCheckingReadiness(false);
    }
  };

  const handleOpenCreatePlan = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setOrderReadiness(null);
    setPlanForm({
      orderId: confirmedOrders[0]?._id || '',
      plannedStartDate: new Date().toISOString().split('T')[0],
      plannedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'DRAFT',
      notes: '',
      stages: [
        { stageName: 'WARPING', sequence: 1, targetQuantity: 1000, unit: 'METER', estimatedHours: 24, assignedMachineIds: [] },
        { stageName: 'SIZING', sequence: 2, targetQuantity: 1000, unit: 'METER', estimatedHours: 16, assignedMachineIds: [] },
        { stageName: 'WEAVING', sequence: 3, targetQuantity: 1000, unit: 'METER', estimatedHours: 48, assignedMachineIds: [] },
        { stageName: 'INSPECTION', sequence: 4, targetQuantity: 1000, unit: 'METER', estimatedHours: 12, assignedMachineIds: [] },
        { stageName: 'PACKING', sequence: 5, targetQuantity: 1000, unit: 'METER', estimatedHours: 8, assignedMachineIds: [] },
      ],
    });
    if (confirmedOrders.length > 0) {
      handleOrderChange(confirmedOrders[0]._id);
    }
    setShowCreatePlanModal(true);
  };

  const submitCreatePlan = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.post('/production-planning/plans', planForm);
      setSuccessMessage(res.message || 'Production plan created successfully!');
      setShowCreatePlanModal(false);
      fetchPlanningData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReschedule = (plan) => {
    setSelectedPlanForReschedule(plan);
    setRescheduleForm({
      newStartDate: plan.plannedStartDate ? new Date(plan.plannedStartDate).toISOString().split('T')[0] : '',
      newCompletionDate: plan.plannedCompletionDate ? new Date(plan.plannedCompletionDate).toISOString().split('T')[0] : '',
      reason: '',
    });
    setErrorMessage('');
    setSuccessMessage('');
    setShowRescheduleModal(true);
  };

  const submitReschedule = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage('');
    try {
      const res = await api.patch(
        `/production-planning/plans/${selectedPlanForReschedule._id}/reschedule`,
        rescheduleForm
      );
      setSuccessMessage(res.message || 'Plan rescheduled successfully!');
      setShowRescheduleModal(false);
      fetchPlanningData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reschedule plan');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D1220] p-6 rounded-xl border border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Production Routing & Scheduling</h1>
            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
              Material Readiness Guarded
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Assign confirmed orders to compatible stages & looms. Detect machine conflicts, monitor bottlenecks, and execute authorized rescheduling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleOpenCreatePlan}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Schedule Production Plan
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchPlanningData}
            className="text-slate-500 hover:text-slate-200 h-9 px-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-800 font-bold">×</button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-800 font-bold">×</button>
        </div>
      )}

      {/* Analytics Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Plans</p>
            <p className="text-xl font-bold text-white mt-1">{overview.activePlansCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">In Pipeline / Mill</p>
          </Card>

          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Idle Machines</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{overview.idleMachinesCount}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Available for Routing</p>
          </Card>

          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Running Fleet</p>
            <p className="text-xl font-bold text-[#FF9FFC] mt-1">{overview.runningMachinesCount}</p>
            <p className="text-[10px] text-blue-600 mt-0.5">Under Production</p>
          </Card>

          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Maintenance</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{overview.maintenanceMachinesCount}</p>
            <p className="text-[10px] text-amber-600 mt-0.5">Breakdown / Servicing</p>
          </Card>

          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Delay Risks</p>
            <p className="text-xl font-bold text-rose-700 mt-1">{overview.ordersAtRiskCount}</p>
            <p className="text-[10px] text-rose-500 mt-0.5">Target Delivery at Risk</p>
          </Card>

          <Card className="p-4 border-slate-800 bg-[#0D1220]">
            <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Machine Conflicts</p>
            <p className="text-xl font-bold text-purple-700 mt-1">{overview.conflictsCount}</p>
            <p className="text-[10px] text-purple-500 mt-0.5">Overlapping Bookings</p>
          </Card>
        </div>
      )}

      {/* Conflicts & Alerts Banner */}
      {overview && overview.conflicts?.length > 0 && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-purple-700" />
            <h3 className="text-xs font-bold text-purple-900">Machine Overlap Conflicts Detected</h3>
          </div>
          <div className="space-y-1">
            {overview.conflicts.map((c, idx) => (
              <p key={idx} className="text-xs text-purple-800">
                • <strong>Plan {c.planNumber}</strong> [{c.stageName}]: {c.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Production Plans Table */}
      <Card className="border-slate-800 overflow-hidden shadow-xs bg-[#0D1220]">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Master Production Schedule
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Multi-stage routing workflows with material readiness gates and stage progress
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-1 px-2.5 rounded-lg border border-slate-800 bg-[#0D1220] text-slate-300"
            >
              <option value="ALL">All Plan Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
              <option value="IN_EXECUTION">In Execution</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-400">
            <thead className="bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Plan # / Order</th>
                <th className="py-3 px-4 font-semibold">Timeline Window</th>
                <th className="py-3 px-4 font-semibold">Material Readiness</th>
                <th className="py-3 px-4 font-semibold">Stages & Machines</th>
                <th className="py-3 px-4 font-semibold">Delay Risk</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No production plans found. Schedule a confirmed sales order above.
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p._id} className="hover:bg-[#090D17] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-200 font-mono">{p.planNumber}</div>
                      <div className="text-[11px] text-slate-500">Order: {p.orderId?.orderNumber}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {new Date(p.plannedStartDate).toLocaleDateString()} —{' '}
                          {new Date(p.plannedCompletionDate).toLocaleDateString()}
                        </span>
                      </div>
                      {p.orderId?.confirmedDeliveryDate && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Agreed Delivery: {new Date(p.orderId.confirmedDeliveryDate).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          p.materialReadinessStatus === 'READY'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {p.materialReadinessStatus === 'READY' ? 'Material Ready' : 'Shortage Blocked'}
                      </span>
                      {p.materialShortageDetails?.shortageKg > 0 && (
                        <span className="block text-[10px] text-rose-600 mt-0.5">
                          Shortage: {p.materialShortageDetails.shortageKg} kg
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {p.stages.map((st, i) => (
                          <span
                            key={i}
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              st.machineConflict?.hasConflict
                                ? 'bg-purple-100 text-purple-800 border-purple-300 font-semibold'
                                : 'bg-slate-100 text-slate-300 border-slate-800'
                            }`}
                            title={st.machineConflict?.message || `${st.stageName} stage`}
                          >
                            {st.stageName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {p.isAtRiskOfDelay ? (
                        <div className="text-rose-600">
                          <span className="font-semibold text-[10px] block">High Risk of Delay</span>
                          <span className="text-[10px] text-slate-500 truncate max-w-xs block">{p.riskReason}</span>
                        </div>
                      ) : (
                        <span className="text-emerald-600 font-medium text-[10px]">On Schedule</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          p.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-800'
                            : p.status === 'IN_EXECUTION'
                            ? 'bg-purple-100 text-purple-800'
                            : p.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReschedule(p)}
                          className="text-[11px] h-7 px-2 text-slate-400 gap-1"
                        >
                          <History className="h-3 w-3" /> Reschedule
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL 1: Schedule Production Plan */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#0D1220] text-slate-100 border border-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-[#FF9FFC] flex items-center justify-center">
                  <Factory className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Schedule Production Plan</h3>
                  <p className="text-xs text-slate-500">Material readiness evaluation & machine conflict detection</p>
                </div>
              </div>
              <button onClick={() => setShowCreatePlanModal(false)} className="text-slate-400 hover:text-slate-300 font-bold text-lg">×</button>
            </div>

            <form onSubmit={submitCreatePlan} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Select Confirmed Sales Order *</label>
                <select
                  required
                  value={planForm.orderId}
                  onChange={(e) => handleOrderChange(e.target.value)}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800 bg-[#0D1220]"
                >
                  <option value="">Choose Order...</option>
                  {confirmedOrders.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.orderNumber} — Target: {new Date(o.confirmedDeliveryDate).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Real-time Material Readiness check */}
              {checkingReadiness && (
                <div className="p-3 bg-slate-900/60 rounded-lg text-xs flex items-center gap-2 text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Evaluating material readiness and yarn stock...
                </div>
              )}

              {orderReadiness && (
                <div
                  className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                    orderReadiness.materialReadiness.isReady
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      {orderReadiness.materialReadiness.isReady ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-rose-600" />
                      )}
                      Material Readiness:{' '}
                      {orderReadiness.materialReadiness.isReady ? 'READY' : 'SHORTAGE DETECTED'}
                    </span>
                    <span className="text-[11px] font-mono">
                      Req: {orderReadiness.materialReadiness.requiredKg} kg | Avail:{' '}
                      {orderReadiness.materialReadiness.availableKg} kg
                    </span>
                  </div>
                  <p className="text-[11px]">{orderReadiness.materialReadiness.message}</p>
                  {!orderReadiness.materialReadiness.isReady && (
                    <p className="text-[11px] font-semibold text-rose-700">
                      Normal scheduling is blocked: Plan will be restricted to DRAFT status until yarn is procured.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Planned Start Date *</label>
                  <input
                    type="date"
                    required
                    value={planForm.plannedStartDate}
                    onChange={(e) => setPlanForm({ ...planForm, plannedStartDate: e.target.value })}
                    className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Planned Completion Date *</label>
                  <input
                    type="date"
                    required
                    value={planForm.plannedCompletionDate}
                    onChange={(e) => setPlanForm({ ...planForm, plannedCompletionDate: e.target.value })}
                    className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Schedule Status *</label>
                <select
                  value={planForm.status}
                  onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}
                  disabled={orderReadiness && !orderReadiness.materialReadiness?.isReady}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800 bg-[#0D1220]"
                >
                  <option value="DRAFT">DRAFT (Uncommitted Draft)</option>
                  <option value="APPROVED" disabled={orderReadiness && !orderReadiness.materialReadiness?.isReady}>
                    APPROVED (Authorized Mill Job)
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Production Routing Notes</label>
                <textarea
                  rows="2"
                  placeholder="Notes on machine allocation, loom speed settings, shift scheduling..."
                  value={planForm.notes}
                  onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreatePlanModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading || !planForm.orderId}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Factory className="h-4 w-4" />}
                  Schedule Plan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Authorized Rescheduling */}
      {showRescheduleModal && selectedPlanForReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#0D1220] text-slate-100 border border-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Authorized Plan Rescheduling</h3>
                  <p className="text-xs text-slate-500">Plan: {selectedPlanForReschedule.planNumber}</p>
                </div>
              </div>
              <button onClick={() => setShowRescheduleModal(false)} className="text-slate-400 hover:text-slate-300 font-bold text-lg">×</button>
            </div>

            <form onSubmit={submitReschedule} className="mt-4 space-y-3">
              <div className="p-3 bg-slate-900/60 rounded-lg text-xs space-y-1">
                <p className="text-slate-500">
                  Current Window:{' '}
                  <strong>
                    {new Date(selectedPlanForReschedule.plannedStartDate).toLocaleDateString()} —{' '}
                    {new Date(selectedPlanForReschedule.plannedCompletionDate).toLocaleDateString()}
                  </strong>
                </p>
                <p className="text-slate-500">
                  Agreed Customer Delivery:{' '}
                  <strong>
                    {selectedPlanForReschedule.orderId?.confirmedDeliveryDate
                      ? new Date(selectedPlanForReschedule.orderId.confirmedDeliveryDate).toLocaleDateString()
                      : 'N/A'}
                  </strong>
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">New Planned Start Date *</label>
                <input
                  type="date"
                  required
                  value={rescheduleForm.newStartDate}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, newStartDate: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">New Planned Completion Date *</label>
                <input
                  type="date"
                  required
                  value={rescheduleForm.newCompletionDate}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, newCompletionDate: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Authorized Rescheduling Justification *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Machine conflict resolution on Rapier Loom #4 / Supplier yarn shipment delay..."
                  value={rescheduleForm.reason}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowRescheduleModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
                  Confirm Reschedule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 7. FACTORY WORKER ATTENDANCE MANAGEMENT (ADMIN)
// ==========================================

export function AdminAttendancePage({ onNavigateSection }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [workersList, setWorkersList] = useState([]);

  // Filter States
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'monthly'
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(todayStr);
  const [department, setDepartment] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [socketLive, setSocketLive] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Modal States
  const [markModal, setMarkModal] = useState({
    open: false,
    operatorId: '',
    workerName: '',
    employeeCode: '',
    department: '',
    date: todayStr,
    status: 'PRESENT',
    checkInTime: '08:00',
    checkOutTime: '16:30',
    remarks: '',
    submitting: false,
    error: null,
  });

  const [auditModal, setAuditModal] = useState({
    open: false,
    record: null,
    logs: [],
    loading: false,
  });

  const [exporting, setExporting] = useState(false);

  const showToast = useCallback((msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // 1. Fetch Dashboard Summary
  const fetchSummary = useCallback(async (date) => {
    try {
      const res = await api.get(`/operator/attendance/dashboard-summary?date=${date || todayStr}`);
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to load attendance summary:', err);
    }
  }, [todayStr]);

  // 2. Fetch Attendance Records
  const fetchRecords = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setRecordsLoading(true);
      const params = new URLSearchParams();

      if (viewMode === 'daily') {
        params.append('date', selectedDate);
      } else {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      if (department !== 'ALL') params.append('department', department);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);

      const res = await api.get(`/operator/attendance/records?${params.toString()}`);
      if (res.success && res.data) {
        setRecords(res.data.records || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load attendance records:', err);
    } finally {
      if (!quiet) setRecordsLoading(false);
    }
  }, [viewMode, selectedDate, startDate, endDate, department, statusFilter, searchTerm, pagination.page, pagination.limit]);

  // 3. Fetch Active Workers list
  const fetchWorkers = useCallback(async () => {
    try {
      const res = await api.get('/operator/attendance/workers');
      if (res.success && res.data) {
        setWorkersList(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load workers list:', err);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchSummary(selectedDate),
        fetchWorkers(),
        fetchRecords(),
      ]);
      setLoading(false);
    };
    init();
  }, [fetchSummary, fetchWorkers, fetchRecords, selectedDate]);

  // Real-time WebSocket synchronization
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      setSocketLive(true);
      const handleAttendanceUpdated = () => {
        fetchSummary(selectedDate);
        fetchRecords(true);
        showToast('Live attendance sync: records updated', 'info');
      };
      socket.on('attendance:updated', handleAttendanceUpdated);
      return () => {
        socket.off('attendance:updated', handleAttendanceUpdated);
      };
    }
  }, [fetchSummary, fetchRecords, selectedDate, showToast]);

  // Re-fetch records when filters change
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Calculate live preview hours worked and overtime
  const calculatedHoursPreview = useMemo(() => {
    if (markModal.status === 'ABSENT' || markModal.status === 'ON_LEAVE') {
      return { hours: 0, overtime: 0 };
    }
    if (markModal.status === 'HALF_DAY' && (!markModal.checkInTime || !markModal.checkOutTime)) {
      return { hours: 4.0, overtime: 0 };
    }
    if (markModal.checkInTime && markModal.checkOutTime) {
      const [inH, inM] = markModal.checkInTime.split(':').map(Number);
      const [outH, outM] = markModal.checkOutTime.split(':').map(Number);
      const inMinutes = inH * 60 + inM;
      const outMinutes = outH * 60 + outM;
      if (outMinutes > inMinutes) {
        const diffHours = Number(((outMinutes - inMinutes) / 60).toFixed(2));
        const ot = diffHours > 8 ? Number((diffHours - 8).toFixed(2)) : 0;
        return { hours: diffHours, overtime: ot };
      }
    }
    return { hours: markModal.status === 'PRESENT' ? 8.0 : 4.0, overtime: 0 };
  }, [markModal.status, markModal.checkInTime, markModal.checkOutTime]);

  // Open Mark Modal for a specific worker
  const openMarkModalForWorker = (item) => {
    let checkInStr = '08:00';
    let checkOutStr = '16:30';

    if (item.checkInTime) {
      const d = new Date(item.checkInTime);
      checkInStr = d.toTimeString().slice(0, 5);
    }
    if (item.checkOutTime) {
      const d = new Date(item.checkOutTime);
      checkOutStr = d.toTimeString().slice(0, 5);
    }

    setMarkModal({
      open: true,
      operatorId: item.operatorId,
      workerName: item.workerName,
      employeeCode: item.employeeCode,
      department: item.department,
      date: item.date ? new Date(item.date).toISOString().slice(0, 10) : selectedDate,
      status: item.status === 'UNMARKED' ? 'PRESENT' : item.status,
      checkInTime: checkInStr,
      checkOutTime: checkOutStr,
      remarks: item.remarks || '',
      submitting: false,
      error: null,
    });
  };

  // Submit Mark / Update Attendance
  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    setMarkModal((prev) => ({ ...prev, submitting: true, error: null }));

    try {
      if (!markModal.operatorId) {
        throw new Error('Please select a worker');
      }

      let parsedCheckIn = null;
      let parsedCheckOut = null;

      if (
        (markModal.status === 'PRESENT' || markModal.status === 'HALF_DAY') &&
        markModal.checkInTime &&
        markModal.checkOutTime
      ) {
        parsedCheckIn = new Date(`${markModal.date}T${markModal.checkInTime}:00`).toISOString();
        parsedCheckOut = new Date(`${markModal.date}T${markModal.checkOutTime}:00`).toISOString();
      }

      const payload = {
        operatorId: markModal.operatorId,
        date: markModal.date,
        status: markModal.status,
        checkInTime: parsedCheckIn,
        checkOutTime: parsedCheckOut,
        remarks: markModal.remarks,
      };

      const res = await api.post('/operator/attendance/mark', payload);

      if (res.success) {
        showToast(`Attendance saved successfully for ${markModal.workerName || 'worker'}`, 'success');
        setMarkModal({ open: false, submitting: false, error: null });
        await Promise.all([fetchSummary(selectedDate), fetchRecords()]);
      }
    } catch (err) {
      setMarkModal((prev) => ({ ...prev, submitting: false, error: err.message || 'Failed to save attendance' }));
    }
  };

  // Open Audit History Modal
  const openAuditModal = async (record) => {
    if (!record._id) return;
    setAuditModal({
      open: true,
      record,
      logs: [],
      loading: true,
    });

    try {
      const res = await api.get(`/operator/attendance/audit-history/${record._id}`);
      if (res.success) {
        setAuditModal((prev) => ({
          ...prev,
          logs: res.data || [],
          loading: false,
        }));
      }
    } catch (err) {
      console.error('Failed to load audit history:', err);
      setAuditModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (viewMode === 'daily') {
        params.append('date', selectedDate);
      } else {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      if (department !== 'ALL') params.append('department', department);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`/api/v1/operator/attendance/export?${params.toString()}`, {
        headers: { 'Accept': 'text/csv' },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `FabricOps_Attendance_${viewMode === 'daily' ? selectedDate : `${startDate}_to_${endDate}`}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Attendance report exported to CSV successfully', 'success');
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Status Styling Map
  const statusStyles = {
    PRESENT: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold', dot: 'bg-emerald-500' },
    HALF_DAY: { badge: 'bg-amber-50 text-amber-700 border-amber-300 font-bold', dot: 'bg-amber-500' },
    ON_LEAVE: { badge: 'bg-purple-50 text-purple-700 border-purple-300 font-bold', dot: 'bg-purple-500' },
    ABSENT: { badge: 'bg-rose-50 text-rose-700 border-rose-300 font-bold', dot: 'bg-rose-500' },
    UNMARKED: { badge: 'bg-slate-100 text-slate-400 border-slate-700 font-medium', dot: 'bg-slate-400' },
  };

  // Department Styling Map
  const deptStyles = {
    WEAVING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    SPINNING: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    DYEING: 'bg-violet-50 text-violet-700 border-violet-200',
    FINISHING: 'bg-teal-50 text-teal-700 border-teal-200',
    MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
    QC: 'bg-rose-50 text-rose-700 border-rose-200',
    GENERAL: 'bg-slate-900/60 text-slate-300 border-slate-800',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all transform animate-in fade-in slide-in-from-top-4 ${
            toastMessage.type === 'danger'
              ? 'bg-rose-900 text-rose-100 border-rose-700'
              : toastMessage.type === 'info'
              ? 'bg-blue-900 text-blue-100 border-blue-700'
              : 'bg-emerald-950 text-emerald-100 border-emerald-700'
          }`}
        >
          {toastMessage.type === 'danger' ? (
            <AlertCircle className="h-5 w-5 text-rose-400" />
          ) : toastMessage.type === 'info' ? (
            <Activity className="h-5 w-5 text-blue-400" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          )}
          <span>{toastMessage.msg}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl border border-slate-700/50">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/30">
              <UserCheck className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Worker Attendance Management</h1>
            {socketLive && (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Real-time biometric attendance dashboard, roll-call verification, shift working hours calculation, audit logging, and timesheet exports.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            onClick={() => {
              setMarkModal({
                open: true,
                operatorId: workersList[0]?._id || '',
                workerName: workersList[0]?.name || '',
                employeeCode: workersList[0]?.employeeCode || '',
                department: workersList[0]?.department || '',
                date: selectedDate,
                status: 'PRESENT',
                checkInTime: '08:00',
                checkOutTime: '16:30',
                remarks: '',
                submitting: false,
                error: null,
              });
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-blue-600/30"
          >
            <Plus className="h-4 w-4" />
            Mark Attendance
          </Button>

          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={exporting}
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-xs gap-1.5"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export CSV
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              fetchSummary(selectedDate);
              fetchRecords();
            }}
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 p-2"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${recordsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 2. Key Metrics Dashboard Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
        {/* Total Workers */}
        <div className="p-4 rounded-xl bg-[#0D1220] border border-slate-800/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Workers</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {summary ? summary.totalWorkers : <span className="animate-pulse">--</span>}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">Active Mill Operators</div>
        </div>

        {/* Present */}
        <div className="p-4 rounded-xl bg-[#0D1220] border border-slate-800/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider">Present</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {summary ? summary.presentCount : <span className="animate-pulse">--</span>}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold">On Floor & Running</div>
        </div>

        {/* Absent */}
        <div className="p-4 rounded-xl bg-[#0D1220] border border-slate-800/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-bold uppercase tracking-wider">Absent</span>
            <UserX className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono">
            {summary ? summary.absentCount : <span className="animate-pulse">--</span>}
          </div>
          <div className="text-[11px] text-rose-600 font-medium">Unexcused Absence</div>
        </div>

        {/* On Leave */}
        <div className="p-4 rounded-xl bg-[#0D1220] border border-slate-800/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-xs font-bold uppercase tracking-wider">On Leave</span>
            <CalendarDays className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono">
            {summary ? summary.onLeaveCount : <span className="animate-pulse">--</span>}
          </div>
          <div className="text-[11px] text-purple-600 font-medium">Approved Leaves</div>
        </div>

        {/* Half Day */}
        <div className="p-4 rounded-xl bg-[#0D1220] border border-slate-800/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-bold uppercase tracking-wider">Half Day</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">
            {summary ? summary.halfDayCount : <span className="animate-pulse">--</span>}
          </div>
          <div className="text-[11px] text-amber-600 font-medium">4 Hours Standard</div>
        </div>

        {/* Attendance Rate */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-[#5227FF]/40 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-xs font-bold uppercase tracking-wider">Attendance %</span>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-900 font-mono">
            {summary ? `${summary.attendancePercentage}%` : <span className="animate-pulse">--</span>}
          </div>
          <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${summary?.attendancePercentage || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Filters, Date Pickers & Search Bar */}
      <div className="bg-[#0D1220] p-4 rounded-2xl border border-slate-800/90 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* View Mode Buttons */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-800">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'daily'
                  ? 'bg-[#EBA832] text-black shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Daily Roll Call
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'monthly'
                  ? 'bg-[#EBA832] text-black shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly History
            </button>
          </div>

          {/* Date Picker Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {viewMode === 'daily' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    fetchSummary(e.target.value);
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDate(todayStr);
                    fetchSummary(todayStr);
                  }}
                  className="text-xs font-semibold h-8"
                >
                  Today
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1 text-xs font-medium rounded-xl border border-slate-700"
                />
                <span className="text-xs font-bold text-slate-500">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1 text-xs font-medium rounded-xl border border-slate-700"
                />
              </div>
            )}
          </div>
        </div>

        {/* Secondary Filter Line */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-slate-100">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search worker by name, code (e.g. EMP-WEAV-042), or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Department Filter */}
          <div className="sm:col-span-4">
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-800 font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Departments</option>
              <option value="WEAVING">Weaving Department</option>
              <option value="SPINNING">Spinning Department</option>
              <option value="DYEING">Dyeing & Processing</option>
              <option value="FINISHING">Finishing & Stentering</option>
              <option value="MAINTENANCE">Maintenance Fleet</option>
              <option value="QC">Quality Control (QC)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-800 font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present Only</option>
              <option value="HALF_DAY">Half Day Only</option>
              <option value="ON_LEAVE">On Leave Only</option>
              <option value="ABSENT">Absent Only</option>
              {viewMode === 'daily' && <option value="UNMARKED">Unmarked Only</option>}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Attendance Records Table */}
      <div className="bg-[#0D1220] rounded-2xl border border-slate-800/90 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-slate-300" />
            <h2 className="text-sm font-bold text-white">
              {viewMode === 'daily' ? `Roll Call for ${selectedDate}` : `Attendance Log (${startDate} to ${endDate})`}
            </h2>
            <Badge variant="outline" className="text-xs">
              {records.length} records
            </Badge>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Shift times, calculated hours, overtime & audit logs
          </div>
        </div>

        {recordsLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Loading verified attendance records...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <UserX className="h-10 w-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-400">No attendance records found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No workers match the selected filters for this period. Try clearing search or selecting another department.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090D17] text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="py-3.5 px-4">Worker & Code</th>
                  <th className="py-3.5 px-3">Department</th>
                  <th className="py-3.5 px-3">Date & Shift</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Check-In / Out</th>
                  <th className="py-3.5 px-3">Hours Worked</th>
                  <th className="py-3.5 px-3">Overtime</th>
                  <th className="py-3.5 px-3">Verified By</th>
                  <th className="py-3.5 px-3">Remarks</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {records.map((r, idx) => {
                  const style = statusStyles[r.status] || statusStyles.UNMARKED;
                  const deptStyle = deptStyles[r.department] || deptStyles.GENERAL;

                  const formattedCheckIn = r.checkInTime
                    ? new Date(r.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    : '—';
                  const formattedCheckOut = r.checkOutTime
                    ? new Date(r.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    : '—';

                  return (
                    <tr key={r._id || `${r.operatorId}-${idx}`} className="hover:bg-slate-900/60/70 transition-colors">
                      {/* Worker & Code */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{r.workerName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-300 px-1.5 py-0.5 rounded border border-slate-800 font-bold">
                            {r.employeeCode}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[150px]">{r.workerEmail}</span>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${deptStyle}`}>
                          {r.department}
                        </span>
                      </td>

                      {/* Date & Shift */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="text-slate-200 font-medium">
                          {r.date ? new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                          {r.shift || 'MORNING'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] border ${style.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          {r.status}
                        </span>
                      </td>

                      {/* Check-In / Out */}
                      <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-300">
                        {formattedCheckIn} → {formattedCheckOut}
                      </td>

                      {/* Hours Worked */}
                      <td className="py-3.5 px-3 whitespace-nowrap font-mono">
                        <span className="font-bold text-white">{r.hoursWorked || 0} hrs</span>
                      </td>

                      {/* Overtime */}
                      <td className="py-3.5 px-3 whitespace-nowrap font-mono">
                        {r.overtimeHours > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            +{r.overtimeHours} hrs
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Verified By */}
                      <td className="py-3.5 px-3 text-slate-400 truncate max-w-[120px]">
                        {r.verifiedBy || 'System'}
                      </td>

                      {/* Remarks */}
                      <td className="py-3.5 px-3 text-slate-500 italic truncate max-w-[150px]">
                        {r.remarks || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openMarkModalForWorker(r)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-[#5227FF]/15 transition-colors"
                            title="Edit / Mark Attendance"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {r._id && (
                            <button
                              onClick={() => openAuditModal(r)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="View Audit Trail"
                            >
                              <History className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Mark / Update Attendance Modal */}
      {markModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#0D1220] shadow-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-[#FF9FFC]">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Record Worker Attendance</h3>
                  <p className="text-xs text-slate-500">Authorized biometric timesheet entry</p>
                </div>
              </div>
              <button
                onClick={() => setMarkModal({ ...markModal, open: false })}
                className="text-slate-400 hover:text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {markModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{markModal.error}</span>
              </div>
            )}

            <form onSubmit={handleSaveAttendance} className="space-y-4">
              {/* Select Worker */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Worker / Operator *</label>
                <select
                  required
                  value={markModal.operatorId}
                  onChange={(e) => {
                    const found = workersList.find((w) => w._id === e.target.value);
                    setMarkModal({
                      ...markModal,
                      operatorId: e.target.value,
                      workerName: found?.name || '',
                      employeeCode: found?.employeeCode || '',
                      department: found?.department || '',
                    });
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-700 text-xs font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Select Worker --</option>
                  {workersList.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name} ({w.employeeCode}) — {w.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Attendance Date *</label>
                <input
                  type="date"
                  required
                  value={markModal.date}
                  onChange={(e) => setMarkModal({ ...markModal, date: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-700 text-xs font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Attendance Status *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'PRESENT', label: 'Present', color: 'border-emerald-500 text-emerald-700 bg-emerald-50' },
                    { id: 'HALF_DAY', label: 'Half Day', color: 'border-amber-500 text-amber-700 bg-amber-50' },
                    { id: 'ON_LEAVE', label: 'On Leave', color: 'border-purple-500 text-purple-700 bg-purple-50' },
                    { id: 'ABSENT', label: 'Absent', color: 'border-rose-500 text-rose-700 bg-rose-50' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setMarkModal({ ...markModal, status: s.id })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        markModal.status === s.id
                          ? `${s.color} ring-2 ring-blue-500/30 shadow-sm`
                          : 'border-slate-800 bg-[#0D1220] text-slate-400 hover:bg-slate-900/60'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Check-In and Check-Out Time Inputs (for PRESENT or HALF_DAY) */}
              {(markModal.status === 'PRESENT' || markModal.status === 'HALF_DAY') && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Check-In Time</label>
                    <input
                      type="time"
                      value={markModal.checkInTime}
                      onChange={(e) => setMarkModal({ ...markModal, checkInTime: e.target.value })}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-700 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Check-Out Time</label>
                    <input
                      type="time"
                      value={markModal.checkOutTime}
                      onChange={(e) => setMarkModal({ ...markModal, checkOutTime: e.target.value })}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-700 font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Live Hours Worked Preview */}
              <div className="p-3 rounded-xl bg-[#5227FF]/15/70 border border-[#5227FF]/40 flex items-center justify-between text-xs">
                <span className="font-bold text-blue-900">Calculated Work Duration:</span>
                <div className="flex items-center gap-2">
                  <span className="font-black text-blue-950 font-mono text-sm">
                    {calculatedHoursPreview.hours} hrs
                  </span>
                  {calculatedHoursPreview.overtime > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">
                      +{calculatedHoursPreview.overtime}h OT
                    </span>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Supervisor Remarks</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Assigned to Air-Jet Loom #2 / Approved early leave..."
                  value={markModal.remarks}
                  onChange={(e) => setMarkModal({ ...markModal, remarks: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-700 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMarkModal({ ...markModal, open: false })}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={markModal.submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5"
                >
                  {markModal.submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Confirm & Save'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Audit Trail Modal */}
      {auditModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#0D1220] shadow-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Attendance Audit Trail</h3>
                  <p className="text-xs text-slate-500">
                    Immutable revision history for {auditModal.record?.workerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAuditModal({ open: false, record: null, logs: [], loading: false })}
                className="text-slate-400 hover:text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {auditModal.loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="text-xs font-semibold">Loading audit logs...</span>
              </div>
            ) : auditModal.logs.length === 0 ? (
              <div className="py-10 text-center text-slate-400 space-y-1">
                <p className="text-xs font-semibold">No audit logs recorded for this entry</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {auditModal.logs.map((log) => (
                  <div key={log._id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{log.action}</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Modified by: <b className="text-slate-200">{log.actorId?.name || 'Administrator'}</b> ({log.actorId?.email || 'admin'})
                    </div>
                    {log.previousState && (
                      <div className="text-[10px] bg-[#0D1220] p-2 rounded border border-slate-800 font-mono text-slate-300">
                        <div>Previous Status: <b>{log.previousState?.status}</b> ({log.previousState?.hoursWorked} hrs)</div>
                        <div>New Status: <b className="text-blue-600">{log.newState?.status}</b> ({log.newState?.hoursWorked} hrs)</div>
                      </div>
                    )}
                    {log.notes && (
                      <div className="text-[11px] text-slate-500 italic">Notes: {log.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAuditModal({ open: false, record: null, logs: [], loading: false })}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 8. UNIFIED ADMIN PORTAL CONTROLLER
// ==========================================
export default function AdminPage({ currentSection = 'control-tower', onNavigateSection }) {
  switch (currentSection) {
    case 'control-tower':
      return <AdminControlTowerPage onNavigateSection={onNavigateSection} />;
    case 'quotations':
      return <AdminQuotationsPage onNavigateSection={onNavigateSection} />;
    case 'orders':
      return <AdminOrdersPage onNavigateSection={onNavigateSection} />;
    case 'inventory':
      return <AdminInventoryPage onNavigateSection={onNavigateSection} />;
    case 'procurement':
      return <AdminProcurementPage onNavigateSection={onNavigateSection} />;
    case 'planning':
      return <AdminProductionPlanningPage onNavigateSection={onNavigateSection} />;
    case 'attendance':
      return <AdminAttendancePage onNavigateSection={onNavigateSection} />;
    default:
      return <AdminControlTowerPage onNavigateSection={onNavigateSection} />;
  }
}
