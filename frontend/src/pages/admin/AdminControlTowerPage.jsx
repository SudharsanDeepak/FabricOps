import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Layers,
  Cpu,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Truck,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Eye,
  ArrowRight,
  Edit,
  Sliders,
  Check,
  X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';

export function AdminControlTowerPage({ onNavigateSection }) {
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
    const socket = getSocket();

    socket.emit('join_room', 'admin_control_tower', (res) => {
      if (res?.error) {
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
  }, [fetchControlTower]);

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
        <Card className="p-4 bg-white border-slate-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
            <span>Active Sales Orders</span>
            <Layers className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">{overview.activeOrdersCount || 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">In mill manufacturing pipeline</span>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-xs text-rose-600 font-bold uppercase tracking-wider mb-1">
            <span>Orders At Risk of Delay</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-600 font-mono">{overview.ordersAtRiskCount || 0}</p>
          <span className="text-[11px] text-rose-500 font-medium">Estimated completion &gt; Committed date</span>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">
            <span>Looms In Operation</span>
            <Cpu className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 font-mono">{overview.runningMachinesCount || 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">Out of {machineFleet.total || 0} total machines</span>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-sm rounded-xl">
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
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
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
                    className="h-8 pl-8 pr-3 rounded-lg border border-slate-200 text-xs w-44"
                  />
                </div>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
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
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Order & Buyer</th>
                      <th className="py-3 px-3">Stage & Progress</th>
                      <th className="py-3 px-3">Committed Date</th>
                      <th className="py-3 px-3">Estimated Date</th>
                      <th className="py-3 px-3">Delivery Risk</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((order) => (
                        <tr key={order.orderId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-slate-900 block">{order.orderNumber}</span>
                            <span className="text-[11px] text-slate-400 truncate block max-w-[140px]">
                              {order.customerName}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 min-w-[160px]">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-bold text-slate-800">{order.currentStageTitle}</span>
                              <span className="font-mono text-blue-600 font-bold">{order.progressPercentage}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
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
                            <span className={order.isAtRiskOfDelay ? 'text-rose-600 font-bold' : 'text-slate-800'}>
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
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
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
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Machine Fleet Utilization</span>
                <span className="text-[10px] text-slate-400 font-mono">{machineFleet.runningCount}/{machineFleet.total} Active</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {machineFleet.machines?.map((m) => (
                <div
                  key={m._id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{m.machineCode}</span>
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
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span>Detected Stage Bottlenecks</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {Object.entries(bottlenecks.stageLoadCounts || {}).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{stage.replace('_', ' ')}</span>
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
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Advance Order Milestone Stage</h3>
              <button onClick={() => setStageModal({ open: false, order: null })} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleStageSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Target Stage</label>
                <select
                  value={stageForm.stage}
                  onChange={(e) => setStageForm({ ...stageForm, stage: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 font-semibold"
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
                <label className="block font-bold text-slate-700 uppercase mb-1">Status</label>
                <select
                  value={stageForm.status}
                  onChange={(e) => setStageForm({ ...stageForm, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 font-semibold"
                >
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="DELAYED">DELAYED</option>
                  <option value="REWORK">REWORK</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Completed Quantity (Meters)</label>
                <input
                  type="number"
                  min="0"
                  value={stageForm.completedQuantity}
                  onChange={(e) => setStageForm({ ...stageForm, completedQuantity: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Delay Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="Reason if stage is delayed..."
                  value={stageForm.delayReason}
                  onChange={(e) => setStageForm({ ...stageForm, delayReason: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
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
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-amber-600 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Recalculate Dynamic Delivery Estimates</h3>
              <button onClick={() => setRecalcModal({ open: false, order: null })} className="text-amber-100 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleRecalcSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Trigger Cause</label>
                <select
                  value={recalcForm.triggerType}
                  onChange={(e) => setRecalcForm({ ...recalcForm, triggerType: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 font-semibold"
                >
                  <option value="BREAKDOWN">Machine Breakdown</option>
                  <option value="REWORK">Quality Inspection Defect Rework</option>
                  <option value="MATERIAL_SHORTAGE">Yarn Sourcing Procurement Delay</option>
                  <option value="MANUAL">Manual Mill Reschedule</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Delay Days Added to Downstream Milestones</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={recalcForm.delayDays}
                  onChange={(e) => setRecalcForm({ ...recalcForm, delayDays: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Transparent Root Cause Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g., Tsudakoma Rapier Loom drive gear replacement required 3 days stoppage..."
                  value={recalcForm.reason}
                  onChange={(e) => setRecalcForm({ ...recalcForm, reason: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
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

export default AdminControlTowerPage;
