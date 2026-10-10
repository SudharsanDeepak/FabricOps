import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  FileText,
  Package,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Calendar,
  Barcode,
  X,
  FileCheck2,
  DollarSign,
  Printer,
  ChevronRight,
  ShieldCheck,
  Building,
  User,
  Phone,
  Hash,
  MapPin,
  TrendingUp,
  Percent,
  Check
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';

const PACKAGING_TYPES = [
  { value: 'POLY_WRAPPED_BALES', label: 'Poly-Wrapped Bales (Standard Mill)' },
  { value: 'PALLETIZED_EXPORT', label: 'Palletized & Strapped (Export Grade)' },
  { value: 'BOXED_CARTONS', label: 'Heavy Duty Boxed Cartons' },
];

const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'RTGS / NEFT / Bank Transfer' },
  { value: 'LETTER_OF_CREDIT', label: 'Letter of Credit (LC)' },
  { value: 'UPI', label: 'UPI / Immediate Transfer' },
  { value: 'CHEQUE', label: 'Commercial Cheque' },
  { value: 'CREDIT_CARD', label: 'Corporate Card' },
  { value: 'CASH', label: 'Petty Cash' },
];

export function AdminDispatchInvoicesPage() {
  const [activeTab, setActiveTab] = useState('dispatches'); // 'dispatches' | 'finished-goods' | 'invoices'
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [dispatches, setDispatches] = useState([]);
  const [fgItems, setFgItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');

  // Modals
  const [showCreateDispatchModal, setShowCreateDispatchModal] = useState(false);
  const [showDispatchDetailModal, setShowDispatchDetailModal] = useState(false);
  const [selectedDispatchDetail, setSelectedDispatchDetail] = useState(null);
  const [loadingDispatchDetail, setLoadingDispatchDetail] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);

  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(false);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);

  const [showDeliveryStatusModal, setShowDeliveryStatusModal] = useState(false);
  const [selectedDispatchForStatus, setSelectedDispatchForStatus] = useState(null);

  const [showAddFgModal, setShowAddFgModal] = useState(false);
  const [availableRollsForFg, setAvailableRollsForFg] = useState([]);

  // Forms State
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Create Dispatch Form
  const [dispatchForm, setDispatchForm] = useState({
    orderId: '',
    selectedRollIds: [],
    carrierName: 'VRL Logistics Fleet',
    vehicleNumber: 'TN-38-BZ-4412',
    driverName: 'R. Velusamy',
    driverPhone: '+91 94431 88920',
    waybillNumber: '',
    gatePassNumber: '',
    deliveryReference: '',
    packagingType: 'POLY_WRAPPED_BALES',
    allowOverDispatch: false,
    overDispatchReason: '',
    notes: '',
  });

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: '',
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: '',
    notes: '',
  });

  // Delivery Status Form
  const [deliveryStatusForm, setDeliveryStatusForm] = useState({
    status: 'IN_TRANSIT',
    receiverSignatureAck: 'Received by Consignee Warehouse Receiving Dept',
    proofOfDeliveryNotes: 'Bales intact, barcode seals verified upon offloading',
  });

  // Add to FG Form
  const [addFgForm, setAddFgForm] = useState({
    fabricRollId: '',
    warehouseLocation: 'FG-BAY-A1-RACK-03',
    packingStatus: 'POLY_WRAPPED',
    notes: '',
  });

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      const [metricsRes, dspRes, fgRes, invRes, ordersRes] = await Promise.all([
        api.get('/dispatch/metrics'),
        api.get(`/dispatch?status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`),
        api.get(`/dispatch/finished-goods?search=${encodeURIComponent(searchQuery)}`),
        api.get(`/dispatch/invoices?paymentStatus=${paymentStatusFilter}&search=${encodeURIComponent(searchQuery)}`),
        api.get('/orders'),
      ]);

      setMetrics(metricsRes.data || null);
      setDispatches(dspRes.data || []);
      setFgItems(fgRes.data || []);
      setInvoices(invRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (err) {
      console.error('Failed to load dispatch & invoicing data:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to load dispatch data' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentStatusFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load candidate rolls when opening Add to FG modal
  const handleOpenAddFgModal = async () => {
    try {
      setActionLoading(true);
      const res = await api.get('/quality/rolls?status=GRADE_A,GRADE_B&grade=GRADE_A,GRADE_B');
      const rollsList = res.data || [];
      setAvailableRollsForFg(rollsList.filter((r) => r.status !== 'DISPATCHED'));
      if (rollsList.length > 0) {
        setAddFgForm((p) => ({ ...p, fabricRollId: rollsList[0]._id }));
      }
      setShowAddFgModal(true);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load candidate rolls' });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Dispatch Detail Modal
  const handleViewDispatchDetail = async (dispatchId) => {
    try {
      setLoadingDispatchDetail(true);
      setShowDispatchDetailModal(true);
      const res = await api.get(`/dispatch/${dispatchId}`);
      setSelectedDispatchDetail(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load dispatch details' });
      setShowDispatchDetailModal(false);
    } finally {
      setLoadingDispatchDetail(false);
    }
  };

  // Open Invoice Detail Modal
  const handleViewInvoiceDetail = async (invoiceId) => {
    try {
      setLoadingInvoiceDetail(true);
      setShowInvoiceDetailModal(true);
      const res = await api.get(`/dispatch/invoices/${invoiceId}`);
      setSelectedInvoiceDetail(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to load invoice details' });
      setShowInvoiceDetailModal(false);
    } finally {
      setLoadingInvoiceDetail(false);
    }
  };

  // Selected Order for Dispatch Calculation
  const selectedOrderForDispatch = orders.find((o) => o._id === dispatchForm.orderId);

  // Filter available FG rolls for the selected order
  const availableRollsForOrder = fgItems.filter(
    (item) =>
      item.orderId?._id === dispatchForm.orderId &&
      (item.status === 'AVAILABLE' || item.status === 'RESERVED_FOR_DISPATCH')
  );

  // Selected roll metrics calculation in Dispatch Form
  const selectedRollObjects = availableRollsForOrder.filter((r) =>
    dispatchForm.selectedRollIds.includes(r.fabricRollId?._id || r.fabricRollId)
  );

  const selectedMeters = selectedRollObjects.reduce((sum, r) => sum + r.netMeters, 0);
  const targetOrderMeters = selectedOrderForDispatch?.totalMetersOrdered || 0;
  const previouslyDispatchedMeters = selectedOrderForDispatch?.producedMeters || 0;
  const totalCumulativeAfterDispatch = previouslyDispatchedMeters + selectedMeters;
  const remainingAfterDispatch = Math.max(0, targetOrderMeters - totalCumulativeAfterDispatch);
  const isOverDispatch = targetOrderMeters > 0 && totalCumulativeAfterDispatch > targetOrderMeters;
  const isPartialDispatch = remainingAfterDispatch > 0;

  // Toggle roll selection
  const handleToggleRollSelection = (rollId) => {
    setDispatchForm((prev) => {
      const exists = prev.selectedRollIds.includes(rollId);
      const nextIds = exists
        ? prev.selectedRollIds.filter((id) => id !== rollId)
        : [...prev.selectedRollIds, rollId];
      return { ...prev, selectedRollIds: nextIds };
    });
  };

  // Select all available rolls for this order
  const handleSelectAllRolls = () => {
    const allIds = availableRollsForOrder.map((r) => r.fabricRollId?._id || r.fabricRollId);
    setDispatchForm((p) => ({ ...p, selectedRollIds: allIds }));
  };

  // Submit Create Dispatch
  const handleCreateDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchForm.orderId) {
      setMessage({ type: 'error', text: 'Please select an order' });
      return;
    }
    if (dispatchForm.selectedRollIds.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one roll to dispatch' });
      return;
    }

    try {
      setActionLoading(true);
      setMessage({ type: '', text: '' });

      const idempotencyKey = `idemp-dsp-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const waybillNumber = dispatchForm.waybillNumber || `WB-VRL-${Date.now().toString().slice(-6)}`;
      const gatePassNumber = dispatchForm.gatePassNumber || `GP-GATE-${Date.now().toString().slice(-4)}`;

      const res = await api.post('/dispatch', {
        orderId: dispatchForm.orderId,
        customerId: selectedOrderForDispatch?.customerId?._id || selectedOrderForDispatch?.customerId,
        rollIds: dispatchForm.selectedRollIds,
        carrierName: dispatchForm.carrierName,
        vehicleNumber: dispatchForm.vehicleNumber,
        driverName: dispatchForm.driverName,
        driverPhone: dispatchForm.driverPhone,
        waybillNumber,
        gatePassNumber,
        deliveryReference: dispatchForm.deliveryReference,
        packagingType: dispatchForm.packagingType,
        idempotencyKey,
        allowOverDispatch: dispatchForm.allowOverDispatch,
        overDispatchReason: dispatchForm.overDispatchReason,
        notes: dispatchForm.notes,
      });

      setMessage({
        type: 'success',
        text: `Dispatch ${res.data?.dispatch?.dispatchNumber} created successfully! Tax Invoice ${res.data?.invoice?.invoiceNumber} generated.`,
      });
      setShowCreateDispatchModal(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create dispatch' });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Add to Finished Goods
  const handleAddToFg = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.post('/dispatch/finished-goods', addFgForm);
      setMessage({ type: 'success', text: 'Roll added to Finished Goods inventory and verified.' });
      setShowAddFgModal(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to add roll to finished goods' });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Customer Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;

    try {
      setActionLoading(true);
      const res = await api.post(`/dispatch/invoices/${selectedInvoiceForPayment._id}/payments`, {
        amountPaid: Number(paymentForm.amountPaid),
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber || `UTR-${Date.now()}`,
        notes: paymentForm.notes,
      });

      setMessage({
        type: 'success',
        text: `Payment ${res.data?.payment?.paymentNumber} recorded! Invoice balance updated.`,
      });
      setShowPaymentModal(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to record payment' });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Update Delivery Status
  const handleUpdateDeliveryStatus = async (e) => {
    e.preventDefault();
    if (!selectedDispatchForStatus) return;

    try {
      setActionLoading(true);
      await api.patch(`/dispatch/${selectedDispatchForStatus._id}/status`, {
        status: deliveryStatusForm.status,
        actualDeliveryDate: deliveryStatusForm.status === 'DELIVERED' ? new Date() : undefined,
        receiverSignatureAck: deliveryStatusForm.receiverSignatureAck,
        proofOfDeliveryNotes: deliveryStatusForm.proofOfDeliveryNotes,
      });

      setMessage({
        type: 'success',
        text: `Dispatch ${selectedDispatchForStatus.dispatchNumber} delivery status updated to ${deliveryStatusForm.status}`,
      });
      setShowDeliveryStatusModal(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update delivery status' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Fast Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Dispatches, Finished Goods & Invoicing
              </h1>
              <p className="text-sm text-slate-500">
                Strict Quality Gating • Double-Allocation Prevention • Atomic Partial Dispatches & Commercial Billing
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAddFgModal}
            className="flex items-center gap-1.5 bg-white text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add to Finished Goods</span>
          </Button>

          <Button
            onClick={() => {
              if (orders.length > 0) {
                setDispatchForm((p) => ({
                  ...p,
                  orderId: orders[0]._id,
                  waybillNumber: `WB-VRL-${Date.now().toString().slice(-6)}`,
                  gatePassNumber: `GP-GATE-${Date.now().toString().slice(-4)}`,
                  selectedRollIds: [],
                }));
              }
              setShowCreateDispatchModal(true);
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Truck className="h-4 w-4" />
            <span>+ Create Outward Dispatch</span>
          </Button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {message.text && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between text-sm ${
            message.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'error' ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage({ type: '', text: '' })}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Finished Goods Available
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {metrics?.inventory?.totalAvailableMeters?.toLocaleString() ?? 0} m
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {metrics?.inventory?.totalAvailableRolls ?? 0} rolls in warehouse • {metrics?.inventory?.totalReservedRolls ?? 0} reserved
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                <Package className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Outward Dispatched
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  {metrics?.dispatch?.totalMetersDispatched?.toLocaleString() ?? 0} m
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {metrics?.dispatch?.totalDispatches ?? 0} consignments • {metrics?.dispatch?.partialDispatchesCount ?? 0} partials
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Truck className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Commercial Invoicing
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  ₹{metrics?.billing?.totalInvoicedAmount?.toLocaleString() ?? 0}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  GST 5% included • {metrics?.billing?.paidInvoicesCount ?? 0} fully settled
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                <FileText className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Outstanding Receivables
                </p>
                <p className="text-3xl font-bold text-amber-600 mt-1">
                  ₹{metrics?.billing?.totalOutstandingAmount?.toLocaleString() ?? 0}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  ₹{metrics?.billing?.totalCollectedAmount?.toLocaleString() ?? 0} collected to date
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-2 rounded-t-lg shadow-sm">
        <button
          onClick={() => setActiveTab('dispatches')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'dispatches'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Outward Dispatches & Waybills</span>
          <Badge variant="secondary" className="ml-1 text-[11px]">
            {dispatches.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab('finished-goods')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'finished-goods'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Finished Goods Warehouse Inventory</span>
          <Badge variant="secondary" className="ml-1 text-[11px]">
            {fgItems.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'invoices'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Commercial Invoices & Payments</span>
          <Badge variant="secondary" className="ml-1 text-[11px]">
            {invoices.length}
          </Badge>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: OUTWARD DISPATCHES & WAYBILLS                      */}
      {/* ========================================================= */}
      {activeTab === 'dispatches' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search Dispatch #, Waybill LR, Vehicle, Transporter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm outline-none border-none bg-transparent placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 outline-none"
              >
                <option value="ALL">All Delivery Statuses</option>
                <option value="GATE_CLEARED">Gate Cleared</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Dispatches Table */}
          <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Dispatch Ref & Date</th>
                  <th className="px-4 py-3">Order & Buyer</th>
                  <th className="px-4 py-3">Consignment Scope</th>
                  <th className="px-4 py-3">Transporter & Vehicle</th>
                  <th className="px-4 py-3">Waybill & Gate Pass</th>
                  <th className="px-4 py-3">Delivery Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dispatches.length > 0 ? (
                  dispatches.map((dsp) => (
                    <tr key={dsp._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-xs text-blue-600">
                          {dsp.dispatchNumber}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(dsp.dispatchedAt).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900">
                          {dsp.orderId?.orderNumber || 'SALES ORDER'}
                        </span>
                        <p className="text-xs text-slate-500">
                          {dsp.customerId?.companyName || dsp.customerId?.name || 'Customer'}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{dsp.totalMetersDispatched} m</span>
                          <span className="text-slate-500"> ({dsp.totalRolls} rolls)</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {dsp.isPartialDispatch ? (
                            <Badge variant="warning" className="text-[10px]">
                              Partial (Rem: {dsp.remainingOrderMeters}m)
                            </Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px]">
                              Full Order Scope
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs">
                        <p className="font-medium text-slate-800">{dsp.carrierName}</p>
                        <p className="text-[11px] font-mono text-slate-500">{dsp.vehicleNumber}</p>
                      </td>

                      <td className="px-4 py-3 text-xs font-mono">
                        <div>
                          <span className="text-slate-400 text-[10px]">LR:</span>{' '}
                          <span className="font-semibold text-slate-800">{dsp.waybillNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px]">GP:</span>{' '}
                          <span className="text-slate-600">{dsp.gatePassNumber}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {dsp.status === 'GATE_CLEARED' && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Gate Cleared
                          </Badge>
                        )}
                        {dsp.status === 'IN_TRANSIT' && (
                          <Badge variant="warning" className="text-xs">
                            In Transit
                          </Badge>
                        )}
                        {dsp.status === 'DELIVERED' && (
                          <Badge variant="success" className="text-xs">
                            Delivered
                          </Badge>
                        )}
                        {dsp.status === 'CANCELLED' && (
                          <Badge variant="destructive" className="text-xs">
                            Cancelled
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDispatchDetail(dsp._id)}
                            className="text-xs h-7 px-2.5 flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-600" />
                            <span>Challan</span>
                          </Button>

                          {dsp.status !== 'DELIVERED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDispatchForStatus(dsp);
                                setDeliveryStatusForm({
                                  status: dsp.status === 'GATE_CLEARED' ? 'IN_TRANSIT' : 'DELIVERED',
                                  receiverSignatureAck: 'Signed by Warehouse Incharge',
                                  proofOfDeliveryNotes: 'Bales intact',
                                });
                                setShowDeliveryStatusModal(true);
                              }}
                              className="text-xs h-7 px-2.5 flex items-center gap-1 text-slate-700 hover:text-emerald-700"
                            >
                              <Truck className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Update</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-slate-400 text-sm">
                      No dispatch records found. Click "+ Create Outward Dispatch" to prepare shipments.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: FINISHED GOODS WAREHOUSE INVENTORY                 */}
      {/* ========================================================= */}
      {activeTab === 'finished-goods' && (
        <div className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Finished Goods Warehouse Inventory Balances</span>
                <Badge variant="outline" className="text-xs font-normal">
                  Real-Time Warehouse Bay Locations
                </Badge>
              </CardTitle>
              <CardDescription>
                Audited stock of inspected, poly-wrapped fabric rolls stored across finished goods warehouse bays awaiting customer dispatch.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Roll ID</th>
                      <th className="px-4 py-3">Order Reference</th>
                      <th className="px-4 py-3">Fabric Spec & Grade</th>
                      <th className="px-4 py-3">Dimensions & Weight</th>
                      <th className="px-4 py-3">Warehouse Bay / Rack</th>
                      <th className="px-4 py-3">Packaging & Availability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fgItems.length > 0 ? (
                      fgItems.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-mono font-bold text-xs text-blue-600">
                            {item.rollNumber}
                          </td>

                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-900">
                              {item.orderId?.orderNumber || 'N/A'}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-xs">
                            <p className="font-medium text-slate-800">{item.productName}</p>
                            <Badge
                              variant={item.grade === 'GRADE_A' ? 'success' : 'warning'}
                              className="text-[10px] mt-0.5"
                            >
                              {item.grade}
                            </Badge>
                          </td>

                          <td className="px-4 py-3 text-xs font-mono">
                            <span className="font-bold text-slate-900">{item.netMeters} m</span>
                            <p className="text-slate-400 text-[11px] font-sans">
                              {item.weightKg} kg • {item.widthInches}" width
                            </p>
                          </td>

                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs font-mono bg-slate-50">
                              <MapPin className="h-3 w-3 mr-1 text-slate-400" />
                              {item.warehouseLocation}
                            </Badge>
                          </td>

                          <td className="px-4 py-3">
                            {item.status === 'AVAILABLE' && (
                              <Badge variant="success" className="text-xs">
                                <Check className="h-3 w-3 mr-1" /> Available
                              </Badge>
                            )}
                            {item.status === 'RESERVED_FOR_DISPATCH' && (
                              <Badge variant="warning" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" /> Reserved for Staging
                              </Badge>
                            )}
                            {item.status === 'DISPATCHED' && (
                              <Badge variant="secondary" className="text-xs">
                                Dispatched Outward
                              </Badge>
                            )}
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {item.packingStatus?.replace('_', ' ')}
                            </p>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-4 py-12 text-center text-slate-400 text-sm">
                          No finished goods rolls found in warehouse.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: COMMERCIAL INVOICES & PAYMENTS                     */}
      {/* ========================================================= */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search Invoice #, Order Ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm outline-none border-none bg-transparent placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="text-xs rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 outline-none"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="UNPAID">Unpaid Invoices</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Fully Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Dispatch & Order</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Total Amount</th>
                  <th className="px-4 py-3">Paid / Balance Due</th>
                  <th className="px-4 py-3">Status & Due Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length > 0 ? (
                  invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono font-bold text-xs text-slate-900">
                        {inv.invoiceNumber}
                        <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                          {new Date(inv.invoiceDate).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-blue-600">
                          {inv.dispatchId?.dispatchNumber}
                        </span>
                        <p className="text-xs text-slate-500 font-mono">
                          {inv.orderId?.orderNumber}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">
                          {inv.customerId?.companyName || inv.customerId?.name}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        ₹{inv.totalInvoiceAmount?.toLocaleString()}
                        <p className="text-[10px] text-slate-400 font-sans">
                          GST 5%: ₹{inv.taxAmount?.toLocaleString()}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-xs font-mono">
                        <div>
                          <span className="text-emerald-700 font-semibold">
                            Paid: ₹{inv.amountPaid?.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-rose-600 font-bold">
                            Due: ₹{inv.balanceDue?.toLocaleString()}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {inv.paymentStatus === 'PAID' && (
                          <Badge variant="success">Fully Paid</Badge>
                        )}
                        {inv.paymentStatus === 'PARTIALLY_PAID' && (
                          <Badge variant="warning">Partially Paid</Badge>
                        )}
                        {inv.paymentStatus === 'UNPAID' && (
                          <Badge variant="destructive">Unpaid</Badge>
                        )}
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Due: {new Date(inv.dueDate).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInvoiceDetail(inv._id)}
                            className="text-xs h-7 px-2.5 flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-600" />
                            <span>View</span>
                          </Button>

                          {inv.paymentStatus !== 'PAID' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedInvoiceForPayment(inv);
                                setPaymentForm({
                                  amountPaid: inv.balanceDue,
                                  paymentMethod: 'BANK_TRANSFER',
                                  referenceNumber: `UTR-${Date.now().toString().slice(-6)}`,
                                  notes: '',
                                });
                                setShowPaymentModal(true);
                              }}
                              className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                              <span>Record Payment</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-slate-400 text-sm">
                      No invoices recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CREATE OUTWARD DISPATCH TERMINAL                 */}
      {/* ========================================================= */}
      {showCreateDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Prepare Outward Dispatch & Gate Clearance
                </h3>
                <p className="text-xs text-slate-500">
                  Allocates Finished Goods rolls, generates Delivery Challan, Waybill LR, and matching Tax Invoice
                </p>
              </div>
              <button
                onClick={() => setShowCreateDispatchModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDispatch} className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Step 1: Order Selector */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  1. Confirmed Sales Order *
                </label>
                <select
                  required
                  value={dispatchForm.orderId}
                  onChange={(e) =>
                    setDispatchForm((p) => ({
                      ...p,
                      orderId: e.target.value,
                      selectedRollIds: [],
                    }))
                  }
                  className="w-full rounded border border-slate-300 p-2 bg-white text-xs"
                >
                  <option value="">Select Order...</option>
                  {orders.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.orderNumber} - {o.fabricType || 'Cotton'} (Ordered: {o.totalMetersOrdered}m • Dispatched: {o.producedMeters || 0}m)
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Roll Selection Grid */}
              {dispatchForm.orderId && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        2. Select Available Finished Goods Rolls ({availableRollsForOrder.length} available)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Only Grade A/B certified rolls stored in warehouse can be committed to dispatch
                      </p>
                    </div>

                    {availableRollsForOrder.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllRolls}
                        className="text-xs h-7 px-2.5"
                      >
                        Select All Available
                      </Button>
                    )}
                  </div>

                  {availableRollsForOrder.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {availableRollsForOrder.map((rollItem) => {
                        const rollId = rollItem.fabricRollId?._id || rollItem.fabricRollId;
                        const isSelected = dispatchForm.selectedRollIds.includes(rollId);

                        return (
                          <div
                            key={rollItem._id}
                            onClick={() => handleToggleRollSelection(rollId)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50/80 border-blue-500 ring-1 ring-blue-500'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-xs text-slate-900">
                                {rollItem.rollNumber}
                              </span>
                              <Badge
                                variant={rollItem.grade === 'GRADE_A' ? 'success' : 'warning'}
                                className="text-[10px]"
                              >
                                {rollItem.grade}
                              </Badge>
                            </div>
                            <div className="mt-1 flex justify-between text-slate-500 text-[11px]">
                              <span className="font-bold text-slate-800">{rollItem.netMeters} m</span>
                              <span>{rollItem.weightKg} kg</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              Loc: {rollItem.warehouseLocation}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                      No available rolls in Finished Goods for this order. Ensure rolls are doffed and passed inspection.
                    </div>
                  )}

                  {/* Real-Time Dispatch Scope Calculator */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-sans">Selected Rolls:</span>
                      <span className="font-bold text-slate-900">{dispatchForm.selectedRollIds.length} Rolls</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-sans">Consignment Meters:</span>
                      <span className="font-bold text-blue-700">{selectedMeters} Meters</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-sans">Remaining Balance:</span>
                      <span className="font-bold text-slate-800">{remainingAfterDispatch} Meters</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-sans">Dispatch Mode:</span>
                      {isPartialDispatch ? (
                        <Badge variant="warning" className="text-[10px]">
                          PARTIAL DISPATCH
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px]">
                          FULL ORDER
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Over-dispatch authorization override */}
                  {isOverDispatch && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 space-y-2">
                      <div className="flex items-center gap-2 font-bold">
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                        <span>Warning: Selected quantity ({totalCumulativeAfterDispatch}m) exceeds ordered quantity ({targetOrderMeters}m)</span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                        <input
                          type="checkbox"
                          checked={dispatchForm.allowOverDispatch}
                          onChange={(e) =>
                            setDispatchForm((p) => ({ ...p, allowOverDispatch: e.target.checked }))
                          }
                          className="h-4 w-4 rounded text-blue-600"
                        />
                        <span>Explicitly authorize over-dispatch exception</span>
                      </label>
                      {dispatchForm.allowOverDispatch && (
                        <input
                          type="text"
                          required
                          placeholder="State authorization reason (e.g. Buyer accepted 10% loom overrun allowance)"
                          value={dispatchForm.overDispatchReason}
                          onChange={(e) =>
                            setDispatchForm((p) => ({ ...p, overDispatchReason: e.target.value }))
                          }
                          className="w-full rounded border border-rose-300 p-1.5 bg-white text-xs"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Transporter & Gate Pass Details */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  3. Transporter & Gate Pass Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700">Carrier / Transporter Name *</label>
                    <input
                      type="text"
                      required
                      value={dispatchForm.carrierName}
                      onChange={(e) => setDispatchForm((p) => ({ ...p, carrierName: e.target.value }))}
                      className="mt-1 w-full rounded border border-slate-300 p-2 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700">Vehicle Registration Number *</label>
                    <input
                      type="text"
                      required
                      value={dispatchForm.vehicleNumber}
                      onChange={(e) => setDispatchForm((p) => ({ ...p, vehicleNumber: e.target.value }))}
                      className="mt-1 w-full rounded border border-slate-300 p-2 bg-white uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700">Driver Name</label>
                    <input
                      type="text"
                      value={dispatchForm.driverName}
                      onChange={(e) => setDispatchForm((p) => ({ ...p, driverName: e.target.value }))}
                      className="mt-1 w-full rounded border border-slate-300 p-2 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700">Driver Contact Phone</label>
                    <input
                      type="text"
                      value={dispatchForm.driverPhone}
                      onChange={(e) => setDispatchForm((p) => ({ ...p, driverPhone: e.target.value }))}
                      className="mt-1 w-full rounded border border-slate-300 p-2 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700">Waybill / LR Number *</label>
                    <input
                      type="text"
                      required
                      value={dispatchForm.waybillNumber}
                      onChange={(e) => setDispatchForm((p) => ({ ...p, waybillNumber: e.target.value }))}
                      className="mt-1 w-full rounded border border-slate-300 p-2 bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700">Gate Pass Number *</label>
                    <input
                      type="text"
                      required
                      value={dispatchForm.gatePassNumber}
                      onChange={(e) => setDispatchForm((p) => ({ ...p, gatePassNumber: e.target.value }))}
                      className="mt-1 w-full rounded border border-slate-300 p-2 bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700">Packaging Type</label>
                    <select
                      value={dispatchForm.packagingType}
                      onChange={(e) => setDispatchForm((p) => ({ ...p, packagingType: e.target.value }))}
                      className="mt-1 w-full rounded border border-slate-300 p-2 bg-white"
                    >
                      {PACKAGING_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDispatchModal(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={actionLoading || dispatchForm.selectedRollIds.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {actionLoading ? 'Allocating & Dispatching...' : 'Authorize Dispatch & Generate Invoice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: RECORD CUSTOMER PAYMENT                           */}
      {/* ========================================================= */}
      {showPaymentModal && selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Record Commercial Payment
                </h3>
                <p className="text-xs text-slate-500">
                  Invoice: {selectedInvoiceForPayment.invoiceNumber}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Total Invoiced:</span>
                <span className="font-bold text-slate-900">₹{selectedInvoiceForPayment.totalInvoiceAmount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Already Paid:</span>
                <span className="text-emerald-700 font-semibold">₹{selectedInvoiceForPayment.amountPaid?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold">
                <span className="text-slate-700 font-sans">Outstanding Due:</span>
                <span className="text-rose-600">₹{selectedInvoiceForPayment.balanceDue?.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">Amount to Settle (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amountPaid}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, amountPaid: e.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 p-2 bg-white text-sm font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Payment Instrument / Method *</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 p-2 bg-white"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">
                  Bank Reference / UTR Number (Unique) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR-HDFC-991203"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, referenceNumber: e.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 p-2 bg-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Cleared via RTGS from buyer main account"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 p-2 bg-white"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {actionLoading ? 'Recording...' : 'Confirm Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: DISPATCH DELIVERY CHALLAN DOCUMENT               */}
      {/* ========================================================= */}
      {showDispatchDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                <span className="font-bold text-slate-900 text-base">
                  Authorized Delivery Challan & Consignment Note
                </span>
                <Badge variant="outline" className="font-mono bg-blue-50 text-blue-700">
                  {selectedDispatchDetail?.dispatch?.dispatchNumber}
                </Badge>
              </div>
              <button
                onClick={() => setShowDispatchDetailModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {loadingDispatchDetail || !selectedDispatchDetail ? (
                <div className="py-20 text-center text-slate-400">Loading consignment details...</div>
              ) : (
                <>
                  {/* Challan Header */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Consignor (Mill):</span>
                      <p className="font-bold text-slate-900 text-sm">FabricOps Manufacturing Plant</p>
                      <p className="text-slate-500 text-[11px]">Mill Gate 4 • Dispatch Terminal</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Consignee (Buyer):</span>
                      <p className="font-bold text-slate-900 text-sm">
                        {selectedDispatchDetail.customer?.companyName || selectedDispatchDetail.customer?.name}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Order: {selectedDispatchDetail.order?.orderNumber}
                      </p>
                    </div>
                  </div>

                  {/* Transporter Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg border border-slate-200 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-sans">Carrier:</span>
                      <span className="font-bold text-slate-900">{selectedDispatchDetail.dispatch?.carrierName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-sans">Vehicle:</span>
                      <span className="font-bold text-blue-700">{selectedDispatchDetail.dispatch?.vehicleNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-sans">Waybill LR:</span>
                      <span className="font-bold text-slate-800">{selectedDispatchDetail.dispatch?.waybillNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-sans">Gate Pass:</span>
                      <span className="font-bold text-slate-800">{selectedDispatchDetail.dispatch?.gatePassNumber}</span>
                    </div>
                  </div>

                  {/* Dispatched Rolls Table */}
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-2">
                      Itemized Roll Packing List ({selectedDispatchDetail.items?.length || 0} Rolls)
                    </h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 font-semibold text-slate-700 border-b">
                          <tr>
                            <th className="p-2.5">Roll Number</th>
                            <th className="p-2.5">Fabric & Color</th>
                            <th className="p-2.5">Grade</th>
                            <th className="p-2.5">Net Meters</th>
                            <th className="p-2.5">Gross Weight</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedDispatchDetail.items?.map((item) => (
                            <tr key={item._id}>
                              <td className="p-2.5 font-mono font-bold text-blue-600">
                                {item.rollNumber}
                              </td>
                              <td className="p-2.5 text-slate-800">
                                {item.fabricType} ({item.color})
                              </td>
                              <td className="p-2.5">
                                <Badge variant={item.grade === 'GRADE_A' ? 'success' : 'warning'}>
                                  {item.grade}
                                </Badge>
                              </td>
                              <td className="p-2.5 font-bold font-mono text-slate-900">
                                {item.metersDispatched} m
                              </td>
                              <td className="p-2.5 text-slate-500 font-mono">
                                {item.weightKg || 25} kg
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sign-off acknowledgments */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-[11px] text-slate-500">
                    <div>
                      <p className="font-semibold text-slate-700">Authorized Plant Dispatcher:</p>
                      <p className="mt-6 border-t border-slate-300 pt-1">Signature & Gate Seal Stamp</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">Driver / Receiver Acknowledgment:</p>
                      <p className="mt-6 border-t border-slate-300 pt-1">
                        {selectedDispatchDetail.dispatch?.receiverSignatureAck || 'Pending Receiver Handover'}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button size="sm" onClick={() => setShowDispatchDetailModal(false)}>
                Close Challan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: COMMERCIAL TAX INVOICE DOCUMENT                  */}
      {/* ========================================================= */}
      {showInvoiceDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="font-bold text-slate-900 text-base">
                  Commercial Tax Invoice
                </span>
                <Badge variant="outline" className="font-mono bg-blue-50 text-blue-700">
                  {selectedInvoiceDetail?.invoice?.invoiceNumber}
                </Badge>
              </div>
              <button
                onClick={() => setShowInvoiceDetailModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {loadingInvoiceDetail || !selectedInvoiceDetail ? (
                <div className="py-20 text-center text-slate-400">Loading invoice details...</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Billed By:</span>
                      <p className="font-bold text-slate-900 text-sm">FabricOps Textile Corporation</p>
                      <p className="text-slate-500 text-[11px]">GSTIN: 33AAAAA0000A1Z5</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Billed To:</span>
                      <p className="font-bold text-slate-900 text-sm">
                        {selectedInvoiceDetail.customer?.companyName || selectedInvoiceDetail.customer?.name}
                      </p>
                      <p className="text-slate-500 text-[11px]">{selectedInvoiceDetail.customer?.email}</p>
                    </div>
                  </div>

                  {/* Invoice Line Items */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-semibold text-slate-700 border-b">
                        <tr>
                          <th className="p-2.5">Roll Number</th>
                          <th className="p-2.5">Grade</th>
                          <th className="p-2.5">Billable Meters</th>
                          <th className="p-2.5">Agreed Rate/m</th>
                          <th className="p-2.5 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {selectedInvoiceDetail.invoice?.lineItems?.map((line, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-bold text-blue-600">{line.rollNumber}</td>
                            <td className="p-2.5 font-sans">
                              <Badge variant={line.grade === 'GRADE_A' ? 'success' : 'warning'}>
                                {line.grade}
                              </Badge>
                            </td>
                            <td className="p-2.5 font-bold">{line.meters} m</td>
                            <td className="p-2.5">₹{line.ratePerMeter}</td>
                            <td className="p-2.5 text-right font-bold text-slate-900">
                              ₹{line.lineTotal?.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Breakdown */}
                  <div className="flex justify-end pt-2">
                    <div className="w-64 space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal:</span>
                        <span>₹{selectedInvoiceDetail.invoice?.subtotal?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>GST (5%):</span>
                        <span>₹{selectedInvoiceDetail.invoice?.taxAmount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-slate-900 border-t pt-1">
                        <span>Total Invoice:</span>
                        <span className="text-blue-700">
                          ₹{selectedInvoiceDetail.invoice?.totalInvoiceAmount?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold text-emerald-700">
                        <span>Amount Paid:</span>
                        <span>₹{selectedInvoiceDetail.invoice?.amountPaid?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-rose-600 border-t pt-1">
                        <span>Balance Due:</span>
                        <span>₹{selectedInvoiceDetail.invoice?.balanceDue?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payments Recorded */}
                  {selectedInvoiceDetail.payments?.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <h5 className="font-bold uppercase text-[10px] text-slate-700">
                        Payment Receipts Log ({selectedInvoiceDetail.payments.length})
                      </h5>
                      <div className="space-y-1">
                        {selectedInvoiceDetail.payments.map((p) => (
                          <div key={p._id} className="p-2 rounded bg-emerald-50/60 border border-emerald-100 flex justify-between font-mono text-[11px]">
                            <div>
                              <span className="font-bold text-emerald-800">{p.paymentNumber}</span>
                              <span className="text-slate-500 font-sans ml-2">({p.paymentMethod})</span>
                              <p className="text-slate-400 text-[10px] font-sans">Ref: {p.referenceNumber}</p>
                            </div>
                            <span className="font-bold text-emerald-700">₹{p.amountPaid?.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button size="sm" onClick={() => setShowInvoiceDetailModal(false)}>
                Close Invoice
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: ADD ROLL TO FINISHED GOODS                        */}
      {/* ========================================================= */}
      {showAddFgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Add Roll to Finished Goods Inventory
                </h3>
                <p className="text-xs text-slate-500">
                  Performs required quality check and assigns warehouse rack
                </p>
              </div>
              <button onClick={() => setShowAddFgModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddToFg} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase">
                  Select Certified Roll *
                </label>
                <select
                  required
                  value={addFgForm.fabricRollId}
                  onChange={(e) => setAddFgForm((p) => ({ ...p, fabricRollId: e.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 p-2 bg-white"
                >
                  {availableRollsForFg.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.rollNumber} - {r.grade} ({r.netMeters}m • {r.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase">
                  Warehouse Location / Bay-Rack *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FG-BAY-A1-RACK-03"
                  value={addFgForm.warehouseLocation}
                  onChange={(e) => setAddFgForm((p) => ({ ...p, warehouseLocation: e.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 p-2 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase">
                  Packaging Verification Status
                </label>
                <select
                  value={addFgForm.packingStatus}
                  onChange={(e) => setAddFgForm((p) => ({ ...p, packingStatus: e.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 p-2 bg-white"
                >
                  <option value="POLY_WRAPPED">Poly Wrapped (Moisture Barrier)</option>
                  <option value="BOXED_CARTON">Boxed Carton</option>
                  <option value="PALLETIZED">Palletized & Strapped</option>
                </select>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddFgModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {actionLoading ? 'Verifying...' : 'Verify & Add to Warehouse'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: UPDATE DELIVERY / TRANSIT STATUS                  */}
      {/* ========================================================= */}
      {showDeliveryStatusModal && selectedDispatchForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Update Delivery / Transit Status
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedDispatchForStatus.dispatchNumber}
                </p>
              </div>
              <button onClick={() => setShowDeliveryStatusModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDeliveryStatus} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase">Delivery Status *</label>
                <select
                  value={deliveryStatusForm.status}
                  onChange={(e) => setDeliveryStatusForm((p) => ({ ...p, status: e.target.value }))}
                  className="mt-1 w-full rounded border border-slate-300 p-2 bg-white"
                >
                  <option value="IN_TRANSIT">In Transit (Dispatched from Gate)</option>
                  <option value="DELIVERED">Delivered & Acknowledged by Consignee</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {deliveryStatusForm.status === 'DELIVERED' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase">
                      Receiver Signature / Acknowledgment
                    </label>
                    <input
                      type="text"
                      required
                      value={deliveryStatusForm.receiverSignatureAck}
                      onChange={(e) =>
                        setDeliveryStatusForm((p) => ({ ...p, receiverSignatureAck: e.target.value }))
                      }
                      className="mt-1 w-full rounded border border-slate-300 p-2 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase">
                      Proof of Delivery Notes
                    </label>
                    <input
                      type="text"
                      value={deliveryStatusForm.proofOfDeliveryNotes}
                      onChange={(e) =>
                        setDeliveryStatusForm((p) => ({ ...p, proofOfDeliveryNotes: e.target.value }))
                      }
                      className="mt-1 w-full rounded border border-slate-300 p-2 bg-white"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDeliveryStatusModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {actionLoading ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDispatchInvoicesPage;

