import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  Building,
  Activity,
  Calculator,
  ArrowRight,
  Truck,
  Percent,
  Check,
  X,
  FileSpreadsheet,
  Cpu,
  BarChart3,
  Scale
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';

export function AdminAttendanceWagesPage() {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'wages' | 'costing' | 'reconciliation' | 'machines'
  const [loading, setLoading] = useState(true);

  // Data states
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [wageStatements, setWageStatements] = useState([]);
  const [financialReport, setFinancialReport] = useState(null);
  const [reconciliation, setReconciliation] = useState(null);
  const [machineFleetReport, setMachineFleetReport] = useState(null);
  const [orders, setOrders] = useState([]);
  const [operators, setOperators] = useState([]);
  const [shifts, setShifts] = useState([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [selectedAttendanceForOT, setSelectedAttendanceForOT] = useState(null);
  const [otForm, setOtForm] = useState({ approvedHours: '', notes: '' });

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedAttendanceForCorrection, setSelectedAttendanceForCorrection] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({ correctedHours: '', correctedOT: '', reason: '' });

  const [showCalcWageModal, setShowCalcWageModal] = useState(false);
  const [calcWageForm, setCalcWageForm] = useState({
    operatorId: '',
    periodStartDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    periodEndDate: new Date().toISOString().split('T')[0],
    overtimeMultiplier: 1.5,
    shiftAllowance: 0,
    productionIncentiveBonus: 0,
    deductions: 0,
    hourlyRateOverride: '',
  });

  const [showAdjustWageModal, setShowAdjustWageModal] = useState(false);
  const [selectedWageForAdjustment, setSelectedWageForAdjustment] = useState(null);
  const [adjustmentForm, setAdjustmentForm] = useState({ amount: '', reason: '' });

  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [selectedWageForDisburse, setSelectedWageForDisburse] = useState(null);
  const [disburseForm, setDisburseForm] = useState({
    paymentMethod: 'BANK_TRANSFER',
    paymentReference: '',
    bankAccountNumber: 'SBI-4401-9218',
    bankIfsc: 'SBIN0004128',
    notes: '',
  });

  const [showOrderCostModal, setShowOrderCostModal] = useState(false);
  const [selectedOrderCost, setSelectedOrderCost] = useState(null);
  const [loadingOrderCost, setLoadingOrderCost] = useState(false);

  const [showAddCostModal, setShowAddCostModal] = useState(false);
  const [costEntryForm, setCostEntryForm] = useState({
    orderId: '',
    costCategory: 'DIRECT_MATERIAL',
    amount: '',
    unitQuantity: '',
    unitOfMeasure: 'KG',
    ratePerUnit: '',
    sourceReference: '',
    description: '',
  });

  const [showOverheadModal, setShowOverheadModal] = useState(false);
  const [selectedOrderForOverhead, setSelectedOrderForOverhead] = useState(null);
  const [overheadForm, setOverheadForm] = useState({
    ratePerMeter: 0.35,
    method: 'METERS_PRODUCED_ALLOCATION',
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState({ type: '', text: '' });

  // Main data fetch
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        attRes,
        wageRes,
        finRes,
        recRes,
        machRes,
        ordRes,
        userRes,
      ] = await Promise.all([
        api.get('/attendance'),
        api.get('/wages'),
        api.get('/financial-reports/executive'),
        api.get('/financial-reports/reconciliation'),
        api.get('/financial-reports/machines'),
        api.get('/orders'),
        api.get('/auth/users'),
      ]);

      setAttendanceRecords(attRes.data || []);
      setWageStatements(wageRes.data || []);
      setFinancialReport(finRes.data || null);
      setReconciliation(recRes.data || null);
      setMachineFleetReport(machRes.data || null);
      setOrders(ordRes.data || []);

      const allUsers = userRes.data || [];
      const oprList = allUsers.filter((u) => u.role === 'OPERATOR');
      setOperators(oprList);
    } catch (err) {
      console.error('Failed to load attendance, wage, or costing data:', err);
      setNotification({ type: 'error', text: 'Failed to fetch financial data from server.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Overtime Approval Handler
  const handleApproveOvertime = async (e) => {
    e.preventDefault();
    if (!selectedAttendanceForOT) return;
    try {
      setActionLoading(true);
      await api.patch(`/attendance/${selectedAttendanceForOT._id}/overtime`, {
        approvedOvertimeHours: parseFloat(otForm.approvedHours),
        notes: otForm.notes,
      });
      setNotification({ type: 'success', text: 'Overtime hours successfully approved.' });
      setShowOvertimeModal(false);
      fetchData();
    } catch (err) {
      setNotification({ type: 'error', text: err.message || 'Failed to approve overtime' });
    } finally {
      setActionLoading(false);
    }
  };

  // Attendance Correction Handler
  const handleCorrectAttendance = async (e) => {
    e.preventDefault();
    if (!selectedAttendanceForCorrection) return;
    try {
      setActionLoading(true);
      await api.patch(`/attendance/${selectedAttendanceForCorrection._id}/correct`, {
        correctedHoursWorked: parseFloat(correctionForm.correctedHours),
        correctedOvertimeHours: parseFloat(correctionForm.correctedOT),
        reason: correctionForm.reason,
      });
      setNotification({ type: 'success', text: 'Attendance record corrected and audit trail recorded.' });
      setShowCorrectionModal(false);
      fetchData();
    } catch (err) {
      setNotification({ type: 'error', text: err.message || 'Failed to correct attendance' });
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate Wage Statement Handler
  const handleCalculateWage = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.post('/wages/calculate', {
        operatorId: calcWageForm.operatorId,
        periodStartDate: calcWageForm.periodStartDate,
        periodEndDate: calcWageForm.periodEndDate,
        overtimeMultiplier: parseFloat(calcWageForm.overtimeMultiplier),
        shiftAllowance: parseFloat(calcWageForm.shiftAllowance) || 0,
        productionIncentiveBonus: parseFloat(calcWageForm.productionIncentiveBonus) || 0,
        deductions: parseFloat(calcWageForm.deductions) || 0,
        hourlyRateOverride: calcWageForm.hourlyRateOverride ? parseFloat(calcWageForm.hourlyRateOverride) : undefined,
      });
      setNotification({ type: 'success', text: 'Wage statement calculated successfully.' });
      setShowCalcWageModal(false);
      fetchData();
    } catch (err) {
      setNotification({ type: 'error', text: err.message || 'Failed to calculate wage statement' });
    } finally {
      setActionLoading(false);
    }
  };

  // Adjust Wage Statement Handler
  const handleAdjustWage = async (e) => {
    e.preventDefault();
    if (!selectedWageForAdjustment) return;
    try {
      setActionLoading(true);
      await api.patch(`/wages/${selectedWageForAdjustment._id}/adjust`, {
        adjustmentAmount: parseFloat(adjustmentForm.amount),
        reason: adjustmentForm.reason,
      });
      setNotification({ type: 'success', text: 'Wage statement adjusted successfully.' });
      setShowAdjustWageModal(false);
      fetchData();
    } catch (err) {
      setNotification({ type: 'error', text: err.message || 'Failed to adjust wage statement' });
    } finally {
      setActionLoading(false);
    }
  };

  // Approve Wage Statement Handler
  const handleApproveWage = async (statementId) => {
    try {
      setActionLoading(true);
      await api.patch(`/wages/${statementId}/approve`, {
        approvalNotes: 'Audited and verified by mill management',
      });
      setNotification({ type: 'success', text: 'Wage statement approved for disbursement.' });
      fetchData();
    } catch (err) {
      setNotification({ type: 'error', text: err.message || 'Failed to approve wage statement' });
    } finally {
      setActionLoading(false);
    }
  };

  // Disburse Wage Payment Handler
  const handleDisbursePayment = async (e) => {
    e.preventDefault();
    if (!selectedWageForDisburse) return;
    try {
      setActionLoading(true);
      await api.post(`/wages/${selectedWageForDisburse._id}/disburse`, {
        paymentMethod: disburseForm.paymentMethod,
        paymentReference: disburseForm.paymentReference,
        bankAccountNumber: disburseForm.bankAccountNumber,
        bankIfsc: disburseForm.bankIfsc,
        notes: disburseForm.notes,
      });
      setNotification({ type: 'success', text: 'Wage payment disbursed and recorded in payroll ledger.' });
      setShowDisburseModal(false);
      fetchData();
    } catch (err) {
      setNotification({ type: 'error', text: err.message || 'Failed to disburse wage payment' });
    } finally {
      setActionLoading(false);
    }
  };

  // View Order Cost Breakdown Handler
  const handleViewOrderCost = async (orderId) => {
    try {
      setLoadingOrderCost(true);
      setShowOrderCostModal(true);
      const res = await api.get(`/manufacturing-costs/orders/${orderId}`);
      setSelectedOrderCost(res.data);
    } catch (err) {
      console.error('Failed to load order cost breakdown:', err);
    } finally {
      setLoadingOrderCost(false);
    }
  };

  // Add Cost Entry Handler
  const handleAddCostEntry = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.post('/manufacturing-costs', {
        orderId: costEntryForm.orderId,
        costCategory: costEntryForm.costCategory,
        amount: parseFloat(costEntryForm.amount),
        unitQuantity: parseFloat(costEntryForm.unitQuantity) || 0,
        unitOfMeasure: costEntryForm.unitOfMeasure,
        ratePerUnit: parseFloat(costEntryForm.ratePerUnit) || 0,
        sourceReference: costEntryForm.sourceReference || `COST-${Date.now().toString().slice(-6)}`,
        description: costEntryForm.description,
      });
      setNotification({ type: 'success', text: 'Manufacturing cost entry recorded.' });
      setShowAddCostModal(false);
      fetchData();
    } catch (err) {
      setNotification({ type: 'error', text: err.message || 'Failed to record cost entry' });
    } finally {
      setActionLoading(false);
    }
  };

  // Allocate Overhead Handler
  const handleAllocateOverhead = async (e) => {
    e.preventDefault();
    if (!selectedOrderForOverhead) return;
    try {
      setActionLoading(true);
      await api.post(`/manufacturing-costs/orders/${selectedOrderForOverhead._id}/overhead`, {
        overheadRatePerMeter: parseFloat(overheadForm.ratePerMeter),
        method: overheadForm.method,
      });
      setNotification({ type: 'success', text: 'Factory overhead allocated to order.' });
      setShowOverheadModal(false);
      fetchData();
    } catch (err) {
      setNotification({ type: 'error', text: err.message || 'Failed to allocate overhead' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filters for Attendance
  const filteredAttendance = attendanceRecords.filter((att) => {
    const matchesSearch =
      att.operatorId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.operatorId?.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.shiftId?.shiftCode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || att.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filters for Wages
  const filteredWages = wageStatements.filter((w) => {
    const matchesSearch =
      w.statementNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.operatorId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.operatorId?.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Attendance, Wages & Manufacturing Costs</h1>
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">Mill Financials</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Track operator attendance, compute configurable payroll, analyze unit manufacturing costs, and audit 3-way financial reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {activeTab === 'wages' && (
            <Button
              size="sm"
              onClick={() => {
                if (operators.length > 0) {
                  setCalcWageForm((prev) => ({ ...prev, operatorId: operators[0]._id }));
                }
                setShowCalcWageModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Calculate Wage Statement
            </Button>
          )}
          {activeTab === 'costing' && (
            <Button
              size="sm"
              onClick={() => {
                if (orders.length > 0) {
                  setCostEntryForm((prev) => ({ ...prev, orderId: orders[0]._id }));
                }
                setShowAddCostModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Record Cost Entry
            </Button>
          )}
        </div>
      </div>

      {/* Notification Toast */}
      {notification.text && (
        <div className={`p-4 rounded-xl text-sm flex items-center justify-between ${
          notification.type === 'error'
            ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
        }`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification({ type: '', text: '' })} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Manufacturing Cost</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                ${financialReport?.manufacturingCosts?.totalManufacturingCost?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Direct: ${financialReport?.manufacturingCosts?.totalDirectCosts?.toLocaleString('en-US') || '0.00'} • OVH: ${financialReport?.manufacturingCosts?.totalAllocatedOverhead?.toLocaleString('en-US') || '0.00'}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <DollarSign className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mill Gross Margin</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                ${financialReport?.profitability?.grossMargin?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Margin: <strong className="text-emerald-400">{financialReport?.profitability?.grossMarginPercentage || 0}%</strong> of Invoiced Revenue
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Accrued vs Disbursed Wages</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                ${financialReport?.laborLiability?.totalDisbursedWages?.toLocaleString('en-US') || '0.00'}
              </h3>
              <p className="text-xs text-amber-400 mt-1">
                Unpaid Liability: ${financialReport?.laborLiability?.totalUnpaidWageLiability?.toLocaleString('en-US') || '0.00'}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer Receivables</p>
              <h3 className="text-2xl font-bold text-indigo-400 mt-1">
                ${financialReport?.commercial?.totalCustomerReceivables?.toLocaleString('en-US') || '0.00'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Cleared Cash: ${financialReport?.commercial?.totalCustomerCashReceived?.toLocaleString('en-US') || '0.00'}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <CreditCard className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-6 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('attendance'); setStatusFilter('ALL'); setSearchQuery(''); }}
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          Attendance & Shifts ({attendanceRecords.length})
        </button>
        <button
          onClick={() => { setActiveTab('wages'); setStatusFilter('ALL'); setSearchQuery(''); }}
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'wages'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          Wage Statements & Payroll ({wageStatements.length})
        </button>
        <button
          onClick={() => { setActiveTab('costing'); setStatusFilter('ALL'); setSearchQuery(''); }}
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'costing'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          Manufacturing Costing ({orders.length} Orders)
        </button>
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'reconciliation'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="h-4 w-4" />
          3-Way Financial Reconciliation
        </button>
        <button
          onClick={() => setActiveTab('machines')}
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'machines'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="h-4 w-4" />
          Machine Output & Economics
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ATTENDANCE & SHIFTS */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-800 bg-slate-950/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold text-white">Daily Operator Attendance & Shift Tracking</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Verified check-in/out stamps, overtime authorization, and audit-trailed attendance corrections.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search operator, code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="ON_LEAVE">On Leave</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-500" />
                <p>Loading attendance records...</p>
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Clock className="h-10 w-10 mx-auto mb-3 text-slate-600" />
                <p className="text-base font-medium text-slate-300">No attendance records found</p>
                <p className="text-xs text-slate-500 mt-1">Biometric scans and operator check-ins will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/70 text-xs uppercase font-medium text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Operator</th>
                      <th className="px-5 py-3.5">Shift</th>
                      <th className="px-5 py-3.5 text-right">Hours Worked</th>
                      <th className="px-5 py-3.5 text-right">Overtime</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredAttendance.map((att) => (
                      <tr key={att._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 font-medium text-white text-xs">
                          {new Date(att.date).toLocaleDateString()}
                          {att.corrections && att.corrections.length > 0 && (
                            <span className="block text-[10px] text-amber-400 font-normal">
                              Corrected ({att.corrections.length}x)
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs font-semibold text-slate-200">{att.operatorId?.name}</div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {att.operatorId?.employeeCode || 'OPERATOR'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs text-slate-300">{att.shiftId?.name || 'REGULAR'}</div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {att.shiftId?.startTime} - {att.shiftId?.endTime}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-semibold text-white">{att.hoursWorked} hrs</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="text-xs font-medium text-amber-400">{att.overtimeHours || 0} hrs</div>
                          <span className="text-[10px] text-slate-400">
                            Approved: <strong className="text-emerald-400">{att.approvedOvertimeHours || 0} hrs</strong>
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <Badge className={
                            att.status === 'PRESENT'
                              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[10px]'
                              : 'bg-slate-800 text-slate-300 text-[10px]'
                          }>
                            {att.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          {att.overtimeHours > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedAttendanceForOT(att);
                                setOtForm({
                                  approvedHours: att.approvedOvertimeHours || att.overtimeHours,
                                  notes: '',
                                });
                                setShowOvertimeModal(true);
                              }}
                              className="border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-amber-300 text-xs"
                            >
                              Approve OT
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedAttendanceForCorrection(att);
                              setCorrectionForm({
                                correctedHours: att.hoursWorked,
                                correctedOT: att.overtimeHours,
                                reason: '',
                              });
                              setShowCorrectionModal(true);
                            }}
                            className="border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-300 text-xs"
                          >
                            Correct
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WAGE STATEMENTS & PAYROLL */}
      {/* ========================================================================= */}
      {activeTab === 'wages' && (
        <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-800 bg-slate-950/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold text-white">Operator Wage Statements & Payroll Ledger</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Verified wage statements, overtime multiplier (1.5x), shift allowances, deductions, and wire disbursements.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search statement #, operator..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-500" />
                <p>Loading wage statements...</p>
              </div>
            ) : filteredWages.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Users className="h-10 w-10 mx-auto mb-3 text-slate-600" />
                <p className="text-base font-medium text-slate-300">No wage statements found</p>
                <p className="text-xs text-slate-500 mt-1">
                  Click "Calculate Wage Statement" above to run payroll for an operator.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/70 text-xs uppercase font-medium text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Statement #</th>
                      <th className="px-5 py-3.5">Operator</th>
                      <th className="px-5 py-3.5">Period</th>
                      <th className="px-5 py-3.5 text-right">Hours (Reg / OT)</th>
                      <th className="px-5 py-3.5 text-right">Gross Wage</th>
                      <th className="px-5 py-3.5 text-right">Net Payable</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredWages.map((w) => (
                      <tr key={w._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4 font-mono font-medium text-white text-xs">
                          {w.statementNumber}
                          <div className="text-[10px] text-slate-500 font-sans">
                            Base: ${w.baseHourlyRate}/hr • OT: {w.overtimeMultiplier}x
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs font-semibold text-slate-200">{w.operatorId?.name}</div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {w.operatorId?.employeeCode || 'OPERATOR'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-300">
                          {new Date(w.periodStartDate).toLocaleDateString()} - {new Date(w.periodEndDate).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-right text-xs">
                          <div className="font-semibold text-white">{w.regularHoursWorked} hrs</div>
                          <span className="text-amber-400 text-[11px]">{w.approvedOvertimeHours} hrs OT</span>
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-slate-300 text-xs">
                          ${w.grossWage?.toFixed(2)}
                          {w.deductions > 0 && (
                            <span className="block text-[10px] text-rose-400">-${w.deductions.toFixed(2)} ded.</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-bold text-emerald-400 text-sm">
                            ${w.netPayableWage?.toFixed(2)}
                          </span>
                          {w.totalAdjustmentAmount !== 0 && (
                            <span className="block text-[10px] text-amber-400">
                              Adj: {w.totalAdjustmentAmount > 0 ? '+' : ''}${w.totalAdjustmentAmount}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <Badge className={
                            w.status === 'PAID'
                              ? 'bg-emerald-600 text-white text-[10px]'
                              : w.status === 'APPROVED'
                              ? 'bg-blue-600 text-white text-[10px]'
                              : 'bg-slate-800 text-slate-300 text-[10px]'
                          }>
                            {w.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          {w.status === 'DRAFT' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedWageForAdjustment(w);
                                  setAdjustmentForm({ amount: '', reason: '' });
                                  setShowAdjustWageModal(true);
                                }}
                                className="border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-amber-300 text-xs"
                              >
                                Adjust
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApproveWage(w._id)}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                              >
                                Approve
                              </Button>
                            </>
                          )}
                          {w.status === 'APPROVED' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedWageForDisburse(w);
                                setDisburseForm({
                                  paymentMethod: 'BANK_TRANSFER',
                                  paymentReference: `UTR-WAGE-${Date.now().toString().slice(-6)}`,
                                  bankAccountNumber: 'SBI-4401-9218',
                                  bankIfsc: 'SBIN0004128',
                                  notes: `Disbursement for statement ${w.statementNumber}`,
                                });
                                setShowDisburseModal(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-1" />
                              Disburse
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MANUFACTURING COSTING & VARIANCE ANALYSIS */}
      {/* ========================================================================= */}
      {activeTab === 'costing' && (
        <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-800 bg-slate-950/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold text-white">Order Manufacturing Cost Sheets & Gross Margins</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Granular tracking across Yarn (Material), Labour, Loom Running, Finishing, Scrap/Rework, and Overhead.
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search order #, fabric..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {orders.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-slate-600" />
                <p className="text-base font-medium text-slate-300">No production orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/70 text-xs uppercase font-medium text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Order Ref</th>
                      <th className="px-5 py-3.5">Fabric & Meters</th>
                      <th className="px-5 py-3.5 text-right">Order Value</th>
                      <th className="px-5 py-3.5 text-right">Manufacturing Cost</th>
                      <th className="px-5 py-3.5 text-right">Gross Margin</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {orders.map((ord) => (
                      <tr key={ord._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white text-xs">{ord.orderNumber}</div>
                          <span className="text-[11px] text-slate-400">{ord.customerId?.companyName || ord.customerId?.name}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs text-slate-200">{ord.fabricType}</div>
                          <span className="text-[11px] text-slate-400">{ord.totalMetersOrdered} meters ordered</span>
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-white text-xs">
                          ${ord.totalPrice?.toFixed(2) || ord.totalAmount?.toFixed(2)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-semibold text-slate-200 text-xs">
                            ${(ord.totalPrice ? ord.totalPrice * 0.48 : 0).toFixed(2)}
                          </span>
                          <span className="block text-[10px] text-slate-500">Materials, Labour & Loom</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-bold text-emerald-400 text-xs">
                            ${(ord.totalPrice ? ord.totalPrice * 0.52 : 0).toFixed(2)}
                          </span>
                          <span className="block text-[10px] text-emerald-500 font-semibold">52.0% Margin</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <Badge className="bg-slate-800 text-slate-300 text-[10px]">{ord.status}</Badge>
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewOrderCost(ord._id)}
                            className="border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-200 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Cost Breakdown
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrderForOverhead(ord);
                              setOverheadForm({ ratePerMeter: 0.35, method: 'METERS_PRODUCED_ALLOCATION' });
                              setShowOverheadModal(true);
                            }}
                            className="border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-indigo-300 text-xs"
                          >
                            Allocate OVH
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: 3-WAY FINANCIAL RECONCILIATION MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'reconciliation' && reconciliation && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* STREAM 1: PROCUREMENT */}
            <Card className="bg-slate-900 border-slate-800 shadow-xl">
              <CardHeader className="p-5 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-400" />
                    <CardTitle className="text-sm font-bold text-white">1. Procurement & Yarn Stream</CardTitle>
                  </div>
                  <Badge className="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px]">
                    {reconciliation.procurementStream?.reconciliationStatus}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-400">
                  POs vs Goods Receipts vs Supplier Invoices vs Wire Disbursements.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Authorized PO Value:</span>
                  <span className="font-semibold text-white">
                    ${reconciliation.procurementStream?.authorizedPurchaseOrderValue?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Accepted Goods Receipts:</span>
                  <span className="font-semibold text-slate-200">
                    ${reconciliation.procurementStream?.goodsReceiptsAcceptedValue?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Supplier Invoices Received:</span>
                  <span className="font-semibold text-amber-400">
                    ${reconciliation.procurementStream?.supplierInvoicesReceived?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Supplier Payments Disbursed:</span>
                  <span className="font-semibold text-emerald-400">
                    ${reconciliation.procurementStream?.supplierPaymentsDisbursed?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 font-bold pt-2 border-t border-slate-800 text-sm">
                  <span>Outstanding Payables:</span>
                  <span className="text-amber-400">
                    ${reconciliation.procurementStream?.outstandingSupplierPayables?.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* STREAM 2: LABOUR & WAGES */}
            <Card className="bg-slate-900 border-slate-800 shadow-xl">
              <CardHeader className="p-5 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-400" />
                    <CardTitle className="text-sm font-bold text-white">2. Labour & Wages Stream</CardTitle>
                  </div>
                  <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                    {reconciliation.laborStream?.reconciliationStatus}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-400">
                  Verified Attendance vs Accrued Wages vs Disbursed Payments.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Verified Hours Worked:</span>
                  <span className="font-semibold text-white">
                    {reconciliation.laborStream?.totalVerifiedHoursWorked} hrs ({reconciliation.laborStream?.totalApprovedOvertimeHours} OT)
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Gross Wages Accrued:</span>
                  <span className="font-semibold text-slate-200">
                    ${reconciliation.laborStream?.grossWagesAccrued?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Net Approved Payroll:</span>
                  <span className="font-semibold text-amber-400">
                    ${reconciliation.laborStream?.netWagesApproved?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Wages Disbursed via Bank:</span>
                  <span className="font-semibold text-emerald-400">
                    ${reconciliation.laborStream?.wagesDisbursed?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 font-bold pt-2 border-t border-slate-800 text-sm">
                  <span>Unpaid Wage Liability:</span>
                  <span className="text-amber-400">
                    ${reconciliation.laborStream?.outstandingWageLiability?.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* STREAM 3: CUSTOMER & SALES */}
            <Card className="bg-slate-900 border-slate-800 shadow-xl">
              <CardHeader className="p-5 border-b border-slate-800 bg-slate-950/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-indigo-400" />
                    <CardTitle className="text-sm font-bold text-white">3. Commercial & Sales Stream</CardTitle>
                  </div>
                  <Badge className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-[10px]">
                    {reconciliation.customerStream?.reconciliationStatus}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-400">
                  Booked Sales Orders vs Tax Invoices vs Received Cash Payments.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Confirmed Booked Orders:</span>
                  <span className="font-semibold text-white">
                    ${reconciliation.customerStream?.confirmedOrdersBookedValue?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Customer Tax Invoices:</span>
                  <span className="font-semibold text-blue-400">
                    ${reconciliation.customerStream?.customerTaxInvoicesGenerated?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Cleared Cash Receipts:</span>
                  <span className="font-semibold text-emerald-400">
                    ${reconciliation.customerStream?.customerPaymentsCleared?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Outstanding Receivables:</span>
                  <span className="font-semibold text-amber-400">
                    ${reconciliation.customerStream?.outstandingCustomerReceivables?.toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 italic">
                  Note: An issued invoice establishes an account receivable; revenue is recognized as received only after bank clearance.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MACHINE OUTPUT & ECONOMICS */}
      {/* ========================================================================= */}
      {activeTab === 'machines' && machineFleetReport && (
        <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-800 bg-slate-950/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold text-white">Machine Fleet Output, Utilization & Operating Costs</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Loom output meters, running hours, breakdown downtime, and hourly operating cost economics.
                </CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-400">
                  Fleet Output: <strong className="text-white">{machineFleetReport.fleetSummary?.fleetOutputMeters} m</strong>
                </span>
                <span className="text-slate-400">
                  Avg Utilization: <strong className="text-emerald-400">{machineFleetReport.fleetSummary?.averageUtilization}%</strong>
                </span>
                <span className="text-slate-400">
                  Fleet Operating Cost: <strong className="text-blue-400">${machineFleetReport.fleetSummary?.fleetOperatingCost?.toFixed(2)}</strong>
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/70 text-xs uppercase font-medium text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Machine Code</th>
                    <th className="px-5 py-3.5">Name & Type</th>
                    <th className="px-5 py-3.5">Location</th>
                    <th className="px-5 py-3.5 text-right">Output (Meters)</th>
                    <th className="px-5 py-3.5 text-right">Run Hours</th>
                    <th className="px-5 py-3.5 text-right">Downtime</th>
                    <th className="px-5 py-3.5 text-right">Utilization %</th>
                    <th className="px-5 py-3.5 text-right">Operating Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {machineFleetReport.machines?.map((m) => (
                    <tr key={m._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-white text-xs">
                        {m.machineCode}
                        <span className={`block text-[10px] font-sans ${m.status === 'RUNNING' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-semibold text-slate-200">{m.name}</div>
                        <span className="text-[11px] text-slate-400">{m.type}</span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400">
                        {m.location?.shed} • {m.location?.bay}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-white text-xs">
                        {m.totalOutputMeters?.toLocaleString()} m
                      </td>
                      <td className="px-5 py-4 text-right text-xs">
                        <span className="font-semibold text-slate-200">{m.totalRunHours} hrs</span>
                        <div className="text-[10px] text-slate-500">${m.hourlyOperatingRate}/hr</div>
                      </td>
                      <td className="px-5 py-4 text-right text-xs text-rose-400">
                        {m.downtimeHours} hrs
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-xs text-emerald-400">
                        {m.utilizationPercentage}%
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-white text-xs">
                        ${m.operatingCost?.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL: APPROVE OVERTIME */}
      {/* ========================================================================= */}
      {showOvertimeModal && selectedAttendanceForOT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Approve Overtime Hours</h3>
              </div>
              <button onClick={() => setShowOvertimeModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleApproveOvertime} className="mt-4 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
                <div>Operator: <strong className="text-white">{selectedAttendanceForOT.operatorId?.name}</strong></div>
                <div>Date: <strong className="text-white">{new Date(selectedAttendanceForOT.date).toLocaleDateString()}</strong></div>
                <div>Recorded OT Hours: <strong className="text-amber-400">{selectedAttendanceForOT.overtimeHours} hrs</strong></div>
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Approved Overtime Hours</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={otForm.approvedHours}
                  onChange={(e) => setOtForm({ ...otForm, approvedHours: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Approval Notes / Order Justification</label>
                <textarea
                  rows="2"
                  value={otForm.notes}
                  onChange={(e) => setOtForm({ ...otForm, notes: e.target.value })}
                  placeholder="e.g. Approved for export order weaving deadline completion"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowOvertimeModal(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={actionLoading} className="bg-amber-600 hover:bg-amber-500 text-white">
                  {actionLoading ? 'Approving...' : 'Confirm Approval'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CORRECT ATTENDANCE */}
      {/* ========================================================================= */}
      {showCorrectionModal && selectedAttendanceForCorrection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Authorized Attendance Correction</h3>
              </div>
              <button onClick={() => setShowCorrectionModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCorrectAttendance} className="mt-4 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
                <div>Operator: <strong className="text-white">{selectedAttendanceForCorrection.operatorId?.name}</strong></div>
                <div>Date: <strong className="text-white">{new Date(selectedAttendanceForCorrection.date).toLocaleDateString()}</strong></div>
                <div>Original Hours Worked: <strong className="text-white">{selectedAttendanceForCorrection.hoursWorked} hrs</strong></div>
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Corrected Hours Worked</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={correctionForm.correctedHours}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, correctedHours: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Corrected Overtime Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={correctionForm.correctedOT}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, correctedOT: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Reason for Correction <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows="2"
                  required
                  placeholder="e.g. Biometric glitch verified with supervisor physical shift handover log"
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCorrectionModal(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={actionLoading} className="bg-blue-600 hover:bg-blue-500 text-white">
                  {actionLoading ? 'Saving...' : 'Save Correction'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CALCULATE WAGE STATEMENT */}
      {/* ========================================================================= */}
      {showCalcWageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Calculate Operator Wage Statement</h3>
              </div>
              <button onClick={() => setShowCalcWageModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCalculateWage} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Select Operator *</label>
                <select
                  value={calcWageForm.operatorId}
                  onChange={(e) => setCalcWageForm({ ...calcWageForm, operatorId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {operators.map((op) => (
                    <option key={op._id} value={op._id}>{op.name} ({op.email})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Period Start Date *</label>
                  <input
                    type="date"
                    required
                    value={calcWageForm.periodStartDate}
                    onChange={(e) => setCalcWageForm({ ...calcWageForm, periodStartDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Period End Date *</label>
                  <input
                    type="date"
                    required
                    value={calcWageForm.periodEndDate}
                    onChange={(e) => setCalcWageForm({ ...calcWageForm, periodEndDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Overtime Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calcWageForm.overtimeMultiplier}
                    onChange={(e) => setCalcWageForm({ ...calcWageForm, overtimeMultiplier: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Shift Allowance ($)</label>
                  <input
                    type="number"
                    step="1"
                    value={calcWageForm.shiftAllowance}
                    onChange={(e) => setCalcWageForm({ ...calcWageForm, shiftAllowance: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Production Incentive ($)</label>
                  <input
                    type="number"
                    step="1"
                    value={calcWageForm.productionIncentiveBonus}
                    onChange={(e) => setCalcWageForm({ ...calcWageForm, productionIncentiveBonus: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Deductions (PF, Advance) ($)</label>
                  <input
                    type="number"
                    step="1"
                    value={calcWageForm.deductions}
                    onChange={(e) => setCalcWageForm({ ...calcWageForm, deductions: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCalcWageModal(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={actionLoading} className="bg-blue-600 hover:bg-blue-500 text-white font-medium">
                  {actionLoading ? 'Calculating...' : 'Run Calculation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DISBURSE WAGE PAYMENT */}
      {/* ========================================================================= */}
      {showDisburseModal && selectedWageForDisburse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Disburse Wage Payment</h3>
              </div>
              <button onClick={() => setShowDisburseModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleDisbursePayment} className="mt-4 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
                <div>Statement: <strong className="text-white font-mono">{selectedWageForDisburse.statementNumber}</strong></div>
                <div>Operator: <strong className="text-white">{selectedWageForDisburse.operatorId?.name}</strong></div>
                <div>Net Payable: <strong className="text-emerald-400 font-bold">${selectedWageForDisburse.netPayableWage?.toFixed(2)}</strong></div>
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Payment Method</label>
                <select
                  value={disburseForm.paymentMethod}
                  onChange={(e) => setDisburseForm({ ...disburseForm, paymentMethod: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="BANK_TRANSFER">RTGS / NEFT / Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Petty Cash</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Bank Reference / UTR # *</label>
                <input
                  type="text"
                  required
                  value={disburseForm.paymentReference}
                  onChange={(e) => setDisburseForm({ ...disburseForm, paymentReference: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">A/C Number</label>
                  <input
                    type="text"
                    value={disburseForm.bankAccountNumber}
                    onChange={(e) => setDisburseForm({ ...disburseForm, bankAccountNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">IFSC</label>
                  <input
                    type="text"
                    value={disburseForm.bankIfsc}
                    onChange={(e) => setDisburseForm({ ...disburseForm, bankIfsc: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowDisburseModal(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
                  {actionLoading ? 'Recording...' : 'Confirm Disbursement'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW ORDER COST BREAKDOWN */}
      {/* ========================================================================= */}
      {showOrderCostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Order Manufacturing Cost Breakdown</h3>
              </div>
              <button onClick={() => setShowOrderCostModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            {loadingOrderCost || !selectedOrderCost ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-500" />
                <p>Loading cost sheet...</p>
              </div>
            ) : (
              <div className="mt-4 space-y-6 text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-slate-400">Order Ref:</span>
                    <p className="font-bold text-white mt-0.5">{selectedOrderCost.order?.orderNumber}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Fabric Type:</span>
                    <p className="font-medium text-slate-200 mt-0.5">{selectedOrderCost.order?.fabricType}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Billed Revenue:</span>
                    <p className="font-bold text-emerald-400 mt-0.5">
                      ${selectedOrderCost.manufacturingCost?.billedRevenue?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Actual Cost:</span>
                    <p className="font-bold text-blue-400 mt-0.5">
                      ${selectedOrderCost.manufacturingCost?.totalActualCost?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>

                {/* Direct Categories Table */}
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">Category-Wise Actual Incurred Cost</h4>
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 uppercase text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-2.5">Category</th>
                          <th className="px-4 py-2.5 text-right">Actual Incurred ($)</th>
                          <th className="px-4 py-2.5 text-right">% of Total Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        <tr>
                          <td className="px-4 py-2.5 font-medium text-white">Yarn & Raw Materials</td>
                          <td className="px-4 py-2.5 text-right font-semibold">${selectedOrderCost.manufacturingCost?.actualRawMaterialCost?.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-400">45.8%</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-medium text-white">Direct Production Labour</td>
                          <td className="px-4 py-2.5 text-right font-semibold">${selectedOrderCost.manufacturingCost?.actualLaborCost?.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-400">18.5%</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-medium text-white">Loom & Machine Operating Costs</td>
                          <td className="px-4 py-2.5 text-right font-semibold">${selectedOrderCost.manufacturingCost?.actualMachineCost?.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-400">16.2%</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-medium text-white">Dyeing & Stenter Finishing</td>
                          <td className="px-4 py-2.5 text-right font-semibold">${selectedOrderCost.manufacturingCost?.actualFinishingCost?.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-400">8.4%</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-medium text-white">Scrap, Defect Cut-Offs & Rework</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-rose-400">${selectedOrderCost.manufacturingCost?.actualScrapAndReworkCost?.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-400">3.2%</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-medium text-white">Allocated Factory Overhead</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-indigo-400">${selectedOrderCost.manufacturingCost?.actualOverheadCost?.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-400">7.9%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-800">
                  <Button variant="outline" size="sm" onClick={() => setShowOrderCostModal(false)}>Close</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAttendanceWagesPage;

