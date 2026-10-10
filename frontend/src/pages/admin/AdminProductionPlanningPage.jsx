import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  RefreshCw,
  SlidersHorizontal,
  ShieldAlert,
  ArrowRight,
  Loader2,
  AlertCircle,
  Factory,
  Activity,
  History,
  X,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';

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

  // Keyboard Escape listener to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowCreatePlanModal(false);
        setShowRescheduleModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Production Routing & Scheduling</h1>
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
            className="text-slate-500 hover:text-slate-800 h-9 px-2"
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
          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Plans</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{overview.activePlansCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">In Pipeline / Mill</p>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Idle Machines</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{overview.idleMachinesCount}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Available for Routing</p>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Running Fleet</p>
            <p className="text-xl font-bold text-blue-700 mt-1">{overview.runningMachinesCount}</p>
            <p className="text-[10px] text-blue-600 mt-0.5">Under Production</p>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Maintenance</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{overview.maintenanceMachinesCount}</p>
            <p className="text-[10px] text-amber-600 mt-0.5">Breakdown / Servicing</p>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Delay Risks</p>
            <p className="text-xl font-bold text-rose-700 mt-1">{overview.ordersAtRiskCount}</p>
            <p className="text-[10px] text-rose-500 mt-0.5">Target Delivery at Risk</p>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
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
      <Card className="border-slate-200 overflow-hidden shadow-xs bg-white">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">
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
              className="text-xs py-1 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700"
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
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
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
                  <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 font-mono">{p.planNumber}</div>
                      <div className="text-[11px] text-slate-500">Order: {p.orderId?.orderNumber}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700">
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
                                : 'bg-slate-100 text-slate-700 border-slate-200'
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
                            : 'bg-slate-100 text-slate-700'
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
                          className="text-[11px] h-7 px-2 text-slate-600 gap-1"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCreatePlanModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Factory className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Schedule Production Plan</h3>
                  <p className="text-xs text-slate-500">Material readiness evaluation & machine conflict detection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePlanModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Close"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitCreatePlan} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Select Confirmed Sales Order *</label>
                <select
                  required
                  value={planForm.orderId}
                  onChange={(e) => handleOrderChange(e.target.value)}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
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
                <div className="p-3 bg-slate-50 rounded-lg text-xs flex items-center gap-2 text-slate-500">
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
                  <label className="text-xs font-semibold text-slate-700">Planned Start Date *</label>
                  <input
                    type="date"
                    required
                    value={planForm.plannedStartDate}
                    onChange={(e) => setPlanForm({ ...planForm, plannedStartDate: e.target.value })}
                    className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Planned Completion Date *</label>
                  <input
                    type="date"
                    required
                    value={planForm.plannedCompletionDate}
                    onChange={(e) => setPlanForm({ ...planForm, plannedCompletionDate: e.target.value })}
                    className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Schedule Status *</label>
                <select
                  value={planForm.status}
                  onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}
                  disabled={orderReadiness && !orderReadiness.materialReadiness?.isReady}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="DRAFT">DRAFT (Uncommitted Draft)</option>
                  <option value="APPROVED" disabled={orderReadiness && !orderReadiness.materialReadiness?.isReady}>
                    APPROVED (Authorized Mill Job)
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Production Routing Notes</label>
                <textarea
                  rows="2"
                  placeholder="Notes on machine allocation, loom speed settings, shift scheduling..."
                  value={planForm.notes}
                  onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowRescheduleModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Authorized Plan Rescheduling</h3>
                  <p className="text-xs text-slate-500">Plan: {selectedPlanForReschedule.planNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Close"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitReschedule} className="mt-4 space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
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
                <label className="text-xs font-semibold text-slate-700">New Planned Start Date *</label>
                <input
                  type="date"
                  required
                  value={rescheduleForm.newStartDate}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, newStartDate: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">New Planned Completion Date *</label>
                <input
                  type="date"
                  required
                  value={rescheduleForm.newCompletionDate}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, newCompletionDate: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Authorized Rescheduling Justification *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Machine conflict resolution on Rapier Loom #4 / Supplier yarn shipment delay..."
                  value={rescheduleForm.reason}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200"
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

