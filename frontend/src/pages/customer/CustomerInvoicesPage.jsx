import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  FileText,
  CreditCard,
  Package,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
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
  Check,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';

const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'RTGS / NEFT / Bank Transfer' },
  { value: 'LETTER_OF_CREDIT', label: 'Letter of Credit (LC)' },
  { value: 'UPI', label: 'UPI / Immediate Transfer' },
  { value: 'CHEQUE', label: 'Commercial Cheque' },
  { value: 'CREDIT_CARD', label: 'Corporate Card' },
];

export function CustomerInvoicesPage({ onNavigateSection }) {
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'consignments'
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [dispatches, setDispatches] = useState([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('ALL');

  // Modals
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);

  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [loadingDispatchDetail, setLoadingDispatchDetail] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState(null);

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    paymentReference: '',
    notes: '',
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch customer invoices & dispatches
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, dspRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/dispatch'),
      ]);
      setInvoices(invRes.data || []);
      setDispatches(dspRes.data || []);
    } catch (err) {
      console.error('Failed to load customer billing data:', err);
      setMessage({ type: 'error', text: 'Failed to load invoices and consignments.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open invoice detail
  const handleViewInvoice = async (invoiceId) => {
    try {
      setLoadingInvoiceDetail(true);
      setShowInvoiceModal(true);
      const res = await api.get(`/invoices/${invoiceId}`);
      setSelectedInvoice(res.data);
    } catch (err) {
      console.error('Failed to load invoice details:', err);
    } finally {
      setLoadingInvoiceDetail(false);
    }
  };

  // Open dispatch detail
  const handleViewDispatch = async (dispatchId) => {
    try {
      setLoadingDispatchDetail(true);
      setShowDispatchModal(true);
      const res = await api.get(`/dispatch/${dispatchId}`);
      setSelectedDispatch(res.data);
    } catch (err) {
      console.error('Failed to load dispatch details:', err);
    } finally {
      setLoadingDispatchDetail(false);
    }
  };

  // Open payment modal
  const handleOpenPaymentModal = (invoice) => {
    setInvoiceForPayment(invoice);
    setPaymentForm({
      amount: invoice.balanceDue || 0,
      paymentMethod: 'BANK_TRANSFER',
      paymentReference: `UTR-${Date.now().toString().slice(-8)}`,
      notes: `Settlement for Invoice ${invoice.invoiceNumber}`,
    });
    setMessage({ type: '', text: '' });
    setShowPaymentModal(true);
  };

  // Submit payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!invoiceForPayment) return;

    const amountNum = parseFloat(paymentForm.amount);
    if (!amountNum || amountNum <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid payment amount.' });
      return;
    }

    if (amountNum > invoiceForPayment.balanceDue) {
      setMessage({ type: 'error', text: `Payment amount cannot exceed outstanding balance ($${invoiceForPayment.balanceDue.toFixed(2)}).` });
      return;
    }

    if (!paymentForm.paymentReference.trim()) {
      setMessage({ type: 'error', text: 'Please provide a valid UTR / Bank reference number.' });
      return;
    }

    try {
      setActionLoading(true);
      setMessage({ type: '', text: '' });
      await api.post(`/invoices/${invoiceForPayment._id}/payments`, {
        amount: amountNum,
        paymentMethod: paymentForm.paymentMethod,
        paymentReference: paymentForm.paymentReference.trim(),
        notes: paymentForm.notes.trim(),
      });

      setMessage({ type: 'success', text: `Payment of $${amountNum.toFixed(2)} recorded successfully against ${invoiceForPayment.invoiceNumber}!` });
      setTimeout(() => {
        setShowPaymentModal(false);
        fetchData();
      }, 1200);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Payment processing failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  // KPI calculations
  const totalInvoiced = invoices.reduce((acc, inv) => acc + (inv.totalInvoiceAmount || 0), 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + (inv.amountPaid || 0), 0);
  const totalOutstanding = invoices.reduce((acc, inv) => acc + (inv.balanceDue || 0), 0);
  const activeConsignments = dispatches.filter(d => ['DISPATCHED', 'GATE_CLEARED', 'IN_TRANSIT'].includes(d.deliveryStatus)).length;

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.orderId?.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.dispatchId?.dispatchNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      invoiceStatusFilter === 'ALL' || inv.paymentStatus === invoiceStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filtered dispatches
  const filteredDispatches = dispatches.filter((dsp) => {
    const matchesSearch =
      dsp.dispatchNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dsp.orderId?.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dsp.carrierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dsp.waybillNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      deliveryStatusFilter === 'ALL' || dsp.deliveryStatus === deliveryStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-600 text-white font-semibold">PAID IN FULL</Badge>;
      case 'PARTIALLY_PAID':
        return <Badge className="bg-amber-500 text-white font-semibold">PARTIALLY PAID</Badge>;
      case 'OVERDUE':
        return <Badge className="bg-rose-600 text-white font-semibold animate-pulse">OVERDUE</Badge>;
      case 'UNPAID':
      default:
        return <Badge className="bg-slate-700 text-slate-200 font-semibold">UNPAID</Badge>;
    }
  };

  const getDeliveryStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge className="bg-emerald-600 text-white font-semibold flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> DELIVERED</Badge>;
      case 'IN_TRANSIT':
        return <Badge className="bg-blue-600 text-white font-semibold flex items-center gap-1"><Truck className="h-3 w-3 animate-bounce" /> IN TRANSIT</Badge>;
      case 'GATE_CLEARED':
        return <Badge className="bg-indigo-600 text-white font-semibold flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> GATE CLEARED</Badge>;
      case 'DISPATCHED':
      default:
        return <Badge className="bg-amber-600 text-white font-semibold flex items-center gap-1"><Clock className="h-3 w-3" /> DISPATCHED</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Invoices, Billing & Deliveries</h1>
            <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs">Customer Portal</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Access authorized commercial tax invoices, monitor live consignment tracking, and manage wire settlements.
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
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Invoiced</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                ${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{invoices.length} commercial invoices</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paid Amount</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Cleared via RTGS / NEFT</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Balance Due</p>
              <h3 className={`text-2xl font-bold mt-1 ${totalOutstanding > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                ${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Net 30 Mill Credit</p>
            </div>
            <div className={`h-12 w-12 rounded-xl border flex items-center justify-center ${totalOutstanding > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
              <CreditCard className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Consignments In Transit</p>
              <h3 className="text-2xl font-bold text-indigo-400 mt-1">
                {activeConsignments}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Out of {dispatches.length} dispatches</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Truck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'invoices'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          Tax Invoices & Receipts ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('consignments')}
          className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'consignments'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Truck className="h-4 w-4" />
          Consignments & Waybill Tracking ({dispatches.length})
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder={activeTab === 'invoices' ? "Search Invoice #, Order #..." : "Search Waybill, Carrier, Dispatch #..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {activeTab === 'invoices' ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 font-medium">Payment Status:</span>
            <select
              value={invoiceStatusFilter}
              onChange={(e) => setInvoiceStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid in Full</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 font-medium">Delivery Status:</span>
            <select
              value={deliveryStatusFilter}
              onChange={(e) => setDeliveryStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="GATE_CLEARED">Gate Cleared</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: INVOICES & RECEIPTS */}
      {activeTab === 'invoices' && (
        <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-800 bg-slate-950/40">
            <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
              <span>Customer Tax Invoices Ledger</span>
              <span className="text-xs font-normal text-slate-400">Total: {filteredInvoices.length} invoices</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Tax invoices generated automatically upon outward mill dispatch matching billable fabric roll quantities.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                <p>Loading invoices...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <FileText className="h-10 w-10 mx-auto mb-3 text-slate-600" />
                <p className="text-base font-medium text-slate-300">No invoices found</p>
                <p className="text-xs text-slate-500 mt-1">
                  Once your production orders are inspected, packed, and dispatched from the mill, official invoices will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/70 text-xs uppercase font-medium text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Invoice #</th>
                      <th className="px-5 py-3.5">Order & Dispatch Ref</th>
                      <th className="px-5 py-3.5">Invoice Date / Due Date</th>
                      <th className="px-5 py-3.5 text-right">Total Amount</th>
                      <th className="px-5 py-3.5 text-right">Balance Due</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-blue-400" />
                            {inv.invoiceNumber}
                          </div>
                          <span className="text-xs text-slate-400">Net 30 Commercial</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm text-slate-200">
                            {inv.orderId?.orderNumber || 'N/A'}
                          </div>
                          <span className="text-xs text-slate-400">
                            Challan: {inv.dispatchId?.dispatchNumber || 'N/A'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs text-slate-300">
                            Issued: {new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 text-amber-500" />
                            Due: {new Date(inv.dueDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-white">
                          ${inv.totalInvoiceAmount?.toFixed(2)}
                          <div className="text-xs text-slate-500">
                            Paid: ${inv.amountPaid?.toFixed(2) || '0.00'}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className={`font-semibold ${inv.balanceDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            ${inv.balanceDue?.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {getPaymentStatusBadge(inv.paymentStatus)}
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInvoice(inv._id)}
                            className="border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-200 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View Invoice
                          </Button>
                          {inv.balanceDue > 0 && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenPaymentModal(inv)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-1" />
                              Pay / Settle
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

      {/* TAB 2: DISPATCHED CONSIGNMENTS & TRACKING */}
      {activeTab === 'consignments' && (
        <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-800 bg-slate-950/40">
            <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
              <span>Consignment Deliveries & In-Transit Tracking</span>
              <span className="text-xs font-normal text-slate-400">Total: {filteredDispatches.length} consignments</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Track fabric roll deliveries from mill dispatch bay to destination warehouse with transporter & waybill details.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                <p>Loading consignments...</p>
              </div>
            ) : filteredDispatches.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Truck className="h-10 w-10 mx-auto mb-3 text-slate-600" />
                <p className="text-base font-medium text-slate-300">No consignments found</p>
                <p className="text-xs text-slate-500 mt-1">
                  When confirmed orders are packed and dispatched, tracking and waybill details will be accessible here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/70 text-xs uppercase font-medium text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Dispatch Ref</th>
                      <th className="px-5 py-3.5">Order Ref</th>
                      <th className="px-5 py-3.5">Carrier & Vehicle</th>
                      <th className="px-5 py-3.5">Waybill / LR & Gate Pass</th>
                      <th className="px-5 py-3.5 text-right">Quantity</th>
                      <th className="px-5 py-3.5 text-center">Delivery Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredDispatches.map((dsp) => (
                      <tr key={dsp._id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <Truck className="h-4 w-4 text-indigo-400" />
                            {dsp.dispatchNumber}
                          </div>
                          <span className="text-xs text-slate-400">
                            {new Date(dsp.dispatchDate || dsp.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-200">{dsp.orderId?.orderNumber || 'N/A'}</div>
                          <span className="text-xs text-slate-400">
                            {dsp.isPartialDispatch ? (
                              <span className="text-amber-400 font-medium">Partial Dispatch</span>
                            ) : (
                              <span className="text-emerald-400 font-medium">Full Order</span>
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm text-slate-200">{dsp.carrierName}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <span>Veh: {dsp.vehicleNumber}</span>
                            {dsp.driverPhone && <span>• {dsp.driverPhone}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs font-mono text-blue-400">LR: {dsp.waybillNumber}</div>
                          <div className="text-xs text-slate-400 font-mono">GP: {dsp.gatePassNumber}</div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="font-semibold text-white">{dsp.dispatchedMeters} m</div>
                          <div className="text-xs text-slate-400">
                            {dsp.dispatchedRollCount} rolls • {dsp.totalWeightKg ? `${dsp.totalWeightKg} kg` : ''}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {getDeliveryStatusBadge(dsp.deliveryStatus)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDispatch(dsp._id)}
                            className="border-slate-700 bg-slate-900/50 hover:bg-slate-800 text-slate-200 text-xs"
                          >
                            <FileCheck2 className="h-3.5 w-3.5 mr-1" />
                            Delivery Challan
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
      {/* MODAL: VIEW TAX INVOICE */}
      {/* ========================================================================= */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl my-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Commercial Tax Invoice</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedInvoice?.invoiceNumber || 'Loading...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  Print / PDF
                </Button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
              {loadingInvoiceDetail || !selectedInvoice ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                  <p>Loading invoice details...</p>
                </div>
              ) : (
                <>
                  {/* Mill / Supplier vs Customer Header */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-sm">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Manufactured & Billed By:</span>
                      <h4 className="font-bold text-white text-base mt-1">FabricOps Textile Mills Ltd.</h4>
                      <p className="text-xs text-slate-400 mt-1">Unit 4, SIPCOT Industrial Growth Center, Perundurai</p>
                      <p className="text-xs text-slate-400">Erode - 638052, Tamil Nadu, India</p>
                      <p className="text-xs text-slate-400 font-mono mt-1">GSTIN: 33AAECF9012F1Z8</p>
                    </div>

                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Billed & Shipped To:</span>
                      <h4 className="font-bold text-white text-base mt-1">
                        {selectedInvoice.customerId?.companyName || selectedInvoice.customerId?.name || 'Customer'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Contact: {selectedInvoice.customerId?.name} ({selectedInvoice.customerId?.email})
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-1">
                        Order Ref: {selectedInvoice.orderId?.orderNumber || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        Dispatch Challan: {selectedInvoice.dispatchId?.dispatchNumber || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Invoice Summary Meta Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs">
                    <div>
                      <span className="text-slate-400">Invoice Date:</span>
                      <p className="font-semibold text-white mt-0.5">
                        {new Date(selectedInvoice.invoiceDate || selectedInvoice.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Due Date:</span>
                      <p className="font-semibold text-amber-400 mt-0.5">
                        {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Commercial Terms:</span>
                      <p className="font-semibold text-white mt-0.5">Net 30 Mill Delivery</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Payment Status:</span>
                      <div className="mt-0.5">{getPaymentStatusBadge(selectedInvoice.paymentStatus)}</div>
                    </div>
                  </div>

                  {/* Itemized Dispatched Rolls Table */}
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Barcode className="h-4 w-4 text-blue-400" />
                      Billable Dispatched Rolls Breakdown
                    </h4>
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/80 uppercase text-slate-400 font-semibold border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3">Roll Number</th>
                            <th className="px-4 py-3">Fabric Specifications</th>
                            <th className="px-4 py-3 text-right">Billable Meters</th>
                            <th className="px-4 py-3 text-right">Rate / Meter</th>
                            <th className="px-4 py-3 text-right">Total Line Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 ? (
                            selectedInvoice.lineItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30">
                                <td className="px-4 py-3 font-mono text-white font-medium">
                                  {item.rollNumber || `ROLL-${idx + 1}`}
                                </td>
                                <td className="px-4 py-3 text-slate-300">
                                  {item.fabricDescription || 'Grade-A Finished Woven Fabric'}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-white">
                                  {item.meters?.toFixed(2)} m
                                </td>
                                <td className="px-4 py-3 text-right text-slate-300">
                                  ${item.ratePerMeter?.toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                                  ${item.lineTotal?.toFixed(2)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="px-4 py-4 text-center text-slate-500">
                                No line items recorded.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financial Reconciliation & Totals */}
                  <div className="flex flex-col sm:flex-row justify-between gap-6 pt-4 border-t border-slate-800">
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex-1 text-xs space-y-2">
                      <span className="font-semibold text-slate-300 uppercase tracking-wider">NEFT / RTGS Wire Settlement Details:</span>
                      <p className="text-slate-400">Beneficiary: <strong className="text-white">FabricOps Textile Operations Pvt Ltd</strong></p>
                      <p className="text-slate-400">Bank: <strong className="text-white">State Bank of India (Industrial Finance Branch)</strong></p>
                      <p className="text-slate-400 font-mono">A/C No: <strong className="text-white">409182390192</strong> | IFSC: <strong className="text-white">SBIN0004128</strong></p>
                      <p className="text-slate-500 italic mt-1">Please quote Invoice Number {selectedInvoice.invoiceNumber} in transaction remarks.</p>
                    </div>

                    <div className="w-full sm:w-72 space-y-2 text-sm">
                      <div className="flex justify-between text-slate-400">
                        <span>Subtotal:</span>
                        <span className="text-white font-medium">${selectedInvoice.subtotal?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>GST / Sales Tax ({selectedInvoice.taxRate || 5}%):</span>
                        <span className="text-white font-medium">${selectedInvoice.taxAmount?.toFixed(2)}</span>
                      </div>
                      {selectedInvoice.discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Mill Discount:</span>
                          <span>-${selectedInvoice.discountAmount?.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                        <span>Total Invoice:</span>
                        <span>${selectedInvoice.totalInvoiceAmount?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-emerald-400">
                        <span>Amount Settled:</span>
                        <span>-${selectedInvoice.amountPaid?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-amber-400 pt-2 border-t border-slate-800">
                        <span>Outstanding Balance Due:</span>
                        <span>${selectedInvoice.balanceDue?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Payment History Ledger */}
                  {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                    <div className="pt-4 border-t border-slate-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                        Recorded Customer Payments ({selectedInvoice.payments.length})
                      </h4>
                      <div className="border border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="px-4 py-2">Payment Date</th>
                              <th className="px-4 py-2">UTR / Reference</th>
                              <th className="px-4 py-2">Payment Mode</th>
                              <th className="px-4 py-2 text-right">Amount Paid</th>
                              <th className="px-4 py-2">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {selectedInvoice.payments.map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30">
                                <td className="px-4 py-2 text-slate-400">
                                  {new Date(p.paymentDate || p.createdAt).toLocaleString()}
                                </td>
                                <td className="px-4 py-2 font-mono text-emerald-400 font-semibold">
                                  {p.paymentReference}
                                </td>
                                <td className="px-4 py-2">{p.paymentMethod}</td>
                                <td className="px-4 py-2 text-right font-bold text-white">
                                  ${p.amount?.toFixed(2)}
                                </td>
                                <td className="px-4 py-2 text-slate-400">{p.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800">
              <div className="text-xs text-slate-500">
                Official Computer-Generated Tax Document • FabricOps Textile OS
              </div>
              <div className="flex gap-2">
                {selectedInvoice && selectedInvoice.balanceDue > 0 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowInvoiceModal(false);
                      handleOpenPaymentModal(selectedInvoice);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                  >
                    <CreditCard className="h-3.5 w-3.5 mr-1" />
                    Record Settlement Payment
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInvoiceModal(false)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW DELIVERY CHALLAN / PACKING NOTE */}
      {/* ========================================================================= */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl my-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Outward Delivery Challan & Packing Note</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedDispatch?.dispatchNumber || 'Loading...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  Print Challan
                </Button>
                <button
                  onClick={() => setShowDispatchModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
              {loadingDispatchDetail || !selectedDispatch ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                  <p>Loading consignment details...</p>
                </div>
              ) : (
                <>
                  {/* Dispatch Overview & Carrier Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-sm">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Transporter & Logistics:</span>
                      <h4 className="font-bold text-white text-base mt-1">{selectedDispatch.carrierName}</h4>
                      <p className="text-xs text-slate-400 mt-1">Vehicle No: <strong className="text-white font-mono">{selectedDispatch.vehicleNumber}</strong></p>
                      <p className="text-xs text-slate-400">Driver: <strong className="text-white">{selectedDispatch.driverName || 'Designated Driver'}</strong> ({selectedDispatch.driverPhone || 'N/A'})</p>
                      <p className="text-xs text-slate-400 font-mono mt-1">Waybill / LR: <strong className="text-blue-400">{selectedDispatch.waybillNumber}</strong></p>
                      <p className="text-xs text-slate-400 font-mono">Mill Gate Pass: <strong className="text-amber-400">{selectedDispatch.gatePassNumber}</strong></p>
                    </div>

                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Destination & Status:</span>
                      <h4 className="font-bold text-white text-base mt-1">
                        {selectedDispatch.customerId?.companyName || selectedDispatch.customerId?.name || 'Customer Warehouse'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">Order Ref: <strong className="text-white">{selectedDispatch.orderId?.orderNumber}</strong></p>
                      <p className="text-xs text-slate-400">
                        Packaging Standard: <strong className="text-slate-200">{selectedDispatch.packagingType || 'Poly-Wrapped Bales'}</strong>
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-400">Current Transit State:</span>
                        {getDeliveryStatusBadge(selectedDispatch.deliveryStatus)}
                      </div>
                    </div>
                  </div>

                  {/* Consignment Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs">
                    <div>
                      <span className="text-slate-400">Dispatch Date:</span>
                      <p className="font-semibold text-white mt-0.5">
                        {new Date(selectedDispatch.dispatchDate || selectedDispatch.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Dispatched Quantity:</span>
                      <p className="font-semibold text-indigo-400 mt-0.5">
                        {selectedDispatch.dispatchedMeters} m ({selectedDispatch.dispatchedRollCount} rolls)
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Net Weight:</span>
                      <p className="font-semibold text-white mt.0.5">
                        {selectedDispatch.totalWeightKg ? `${selectedDispatch.totalWeightKg} kg` : 'Calculated at Weighbridge'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Dispatch Type:</span>
                      <p className="font-semibold text-emerald-400 mt-0.5">
                        {selectedDispatch.isPartialDispatch ? 'Partial Consignment' : 'Full Order Complete'}
                      </p>
                    </div>
                  </div>

                  {/* Dispatched Rolls Breakdown */}
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-indigo-400" />
                      Individual Fabric Rolls in Consignment
                    </h4>
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/80 uppercase text-slate-400 font-semibold border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3">Roll ID</th>
                            <th className="px-4 py-3">Fabric Specs / Color</th>
                            <th className="px-4 py-3 text-right">Length (Meters)</th>
                            <th className="px-4 py-3 text-right">Weight (Kg)</th>
                            <th className="px-4 py-3 text-center">Quality Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {selectedDispatch.dispatchedRolls && selectedDispatch.dispatchedRolls.length > 0 ? (
                            selectedDispatch.dispatchedRolls.map((roll, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30">
                                <td className="px-4 py-3 font-mono text-white font-medium">
                                  {roll.rollNumber || `ROLL-${idx + 1}`}
                                </td>
                                <td className="px-4 py-3 text-slate-300">
                                  {roll.fabricType || 'Organic Cotton'} • {roll.color || 'Standard Dye'}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-white">
                                  {roll.metersDispatched || roll.grossMeters || 100} m
                                </td>
                                <td className="px-4 py-3 text-right text-slate-400">
                                  {roll.weightKg || roll.grossWeightKg || 25} kg
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                                    QC PASSED (GRADE A)
                                  </Badge>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="px-4 py-4 text-center text-slate-500">
                                No roll breakdown available.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Transit Notes & Gate Security Clearances */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
                    <span className="font-semibold text-slate-300 uppercase tracking-wider">Gate Security & Proof of Delivery Notes:</span>
                    <p className="text-slate-400">
                      {selectedDispatch.proofOfDeliveryNotes || 'Goods cleared through Mill Outward Gate #2 after security weighbridge verification and driver document check.'}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800">
              <div className="text-xs text-slate-500">
                Official Outward Mill Gate Challan • FabricOps Textile OS
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDispatchModal(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD WIRE / SETTLEMENT PAYMENT */}
      {/* ========================================================================= */}
      {showPaymentModal && invoiceForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-600/20 text-emerald-400 rounded-lg">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record Settlement Payment</h3>
                  <p className="text-xs text-slate-400 font-mono">{invoiceForPayment.invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {message.text && (
              <div className={`mt-4 p-3 rounded-lg text-xs font-medium ${
                message.type === 'error' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Total Invoiced:</span>
                  <span className="text-white font-medium">${invoiceForPayment.totalInvoiceAmount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Current Amount Paid:</span>
                  <span className="text-emerald-400 font-medium">${invoiceForPayment.amountPaid?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-slate-300 font-semibold pt-1 border-t border-slate-800">
                  <span>Outstanding Balance Due:</span>
                  <span className="text-amber-400">${invoiceForPayment.balanceDue?.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Payment Amount ($ USD) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  max={invoiceForPayment.balanceDue}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Payment Method <span className="text-rose-400">*</span>
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  UTR / Wire Transaction Reference # <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR-9821849102"
                  value={paymentForm.paymentReference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Settlement Notes / Bank Details
                </label>
                <textarea
                  rows="2"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPaymentModal(false)}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  {actionLoading ? 'Verifying Wire...' : 'Confirm Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerInvoicesPage;

