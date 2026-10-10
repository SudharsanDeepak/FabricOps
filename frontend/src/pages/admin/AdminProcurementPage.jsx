import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  RefreshCw,
  Building2,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Check,
  Ban,
  Calendar,
  X,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';

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

  // Escape key handler to close any active modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedPoDetail(null);
        setShowCreatePoModal(false);
        setShowCreatePrModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Procurement & Supplier Purchase Orders</h1>
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
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
            className="text-slate-700 text-xs h-9 gap-1.5"
          >
            <FileText className="h-4 w-4 text-slate-500" />
            Request Shortage PRQ
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchProcurementData}
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

      {/* Metrics Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total POs</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{overview.totalPurchaseOrders}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Commercial Contracts</p>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Open POs</p>
            <p className="text-xl font-bold text-blue-700 mt-1">{overview.openOrdersCount}</p>
            <p className="text-[10px] text-blue-600 mt-0.5">Pending Delivery</p>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Delayed POs</p>
            <p className="text-xl font-bold text-rose-700 mt-1">{overview.delayedOrdersCount}</p>
            <p className="text-[10px] text-rose-500 mt-0.5">Past Expected Date</p>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Pending PRQs</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{overview.pendingRequestsCount}</p>
            <p className="text-[10px] text-amber-600 mt-0.5">Awaiting Approval</p>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Spend</p>
            <p className="text-xl font-bold text-slate-900 mt-1">₹{(overview.totalPoSpend / 100000).toFixed(1)}L</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Cumulative Material Value</p>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Avg Delay Days</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{overview.avgSupplierDelayDays} <span className="text-xs font-normal text-slate-500">days</span></p>
            <p className="text-[10px] text-slate-400 mt-0.5">Supplier SLA Metric</p>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
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
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded-full">
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
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700"
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
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700"
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
        <Card className="border-slate-200 overflow-hidden shadow-xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
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
                    <tr key={po._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {po.poNumber}
                        {po.allowOverReceipt && (
                          <span className="block text-[10px] text-amber-600 font-normal">Over-Receipt Allowed</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-700">{po.supplierId?.name || 'Supplier'}</div>
                        <div className="text-[11px] text-slate-400">{po.supplierId?.contactPerson?.email || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {po.items.length} line(s) ({po.totalOrdered} units)
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
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
        <Card className="border-slate-200 overflow-hidden shadow-xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
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
                    <tr key={pr._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">{pr.requestNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-700">{pr.inventoryItemId?.sku || 'SKU'}</div>
                        <div className="text-[11px] text-slate-400">{pr.inventoryItemId?.name || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-blue-700">
                        {pr.requiredQuantity.toLocaleString()} {pr.unit}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700">{pr.reason.replace(/_/g, ' ')}</span>
                        {pr.relatedOrderId && (
                          <span className="block text-[10px] text-slate-400">
                            Order: {pr.relatedOrderId.orderNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
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
            <Card key={sup._id} className="p-4 border-slate-200 bg-white shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-800">{sup.supplierCode}</span>
                  <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{sup.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{sup.contactPerson?.name || 'Contact Representative'}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-600">★ {sup.rating || 4.5}</span>
                  <p className="text-[10px] text-slate-400">Supplier Rating</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1">
                <p className="text-slate-600">Email: {sup.contactPerson?.email || 'N/A'}</p>
                <p className="text-slate-600">Phone: {sup.contactPerson?.phone || 'N/A'}</p>
                <p className="text-slate-600">Terms: Net {sup.paymentTermsDays || 30} Days</p>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCreatePoModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Issue Supplier Purchase Order</h3>
                  <p className="text-xs text-slate-500">Commercial contract with authorized quantities and delivery commitments</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePoModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Close"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitCreatePo} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Select Supplier *</label>
                  <select
                    required
                    value={poForm.supplierId}
                    onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                    className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
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
                  <label className="text-xs font-semibold text-slate-700">Expected Delivery Date *</label>
                  <input
                    type="date"
                    required
                    value={poForm.expectedDeliveryDate}
                    onChange={(e) => setPoForm({ ...poForm, expectedDeliveryDate: e.target.value })}
                    className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              {/* Line items */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Line Items</span>
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
                        className="w-full p-1.5 border border-slate-200 rounded text-xs bg-white"
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
                        className="w-full p-1.5 border border-slate-200 rounded text-xs"
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
                          className="w-full p-1.5 border border-slate-200 rounded text-xs"
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
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="poAllowOverReceipt"
                    checked={poForm.allowOverReceipt}
                    onChange={(e) => setPoForm({ ...poForm, allowOverReceipt: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <label htmlFor="poAllowOverReceipt" className="text-xs font-semibold text-slate-800">
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
                    className="w-full p-2 border border-slate-200 rounded text-xs"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Contract Notes</label>
                <textarea
                  rows="2"
                  placeholder="Terms of delivery, payment, packaging instructions..."
                  value={poForm.notes}
                  onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCreatePrModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Request Material Shortage PRQ</h3>
                  <p className="text-xs text-slate-500">Initiate procurement workflow for production shortages</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePrModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Close"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitCreatePr} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Shortage Item *</label>
                <select
                  required
                  value={prForm.inventoryItemId}
                  onChange={(e) => setPrForm({ ...prForm, inventoryItemId: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                >
                  {inventoryItems.map((i) => (
                    <option key={i._id} value={i._id}>
                      {i.sku} — {i.name} (ATP: {i.availableStock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Required Quantity *</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder="e.g. 500"
                  value={prForm.requiredQuantity}
                  onChange={(e) => setPrForm({ ...prForm, requiredQuantity: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Requisition Reason *</label>
                <select
                  value={prForm.reason}
                  onChange={(e) => setPrForm({ ...prForm, reason: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="SHORTAGE_FOR_ORDER">Shortage for Confirmed Production Order</option>
                  <option value="MINIMUM_STOCK_REPLENISHMENT">Replenishment below Reorder Level</option>
                  <option value="DEFECT_REPLACEMENT">Replacement for Defective Yarn</option>
                  <option value="NEW_FABRIC_SAMPLING">New Fabric Development Sampling</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Justification Notes</label>
                <textarea
                  rows="2"
                  placeholder="Specific details on lead times, order commitments..."
                  value={prForm.notes}
                  onChange={(e) => setPrForm({ ...prForm, notes: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedPoDetail(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedPoDetail.poNumber} — {selectedPoDetail.supplierId?.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Total Value: ₹{selectedPoDetail.totalAmount.toLocaleString()} | Status: {selectedPoDetail.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPoDetail(null)}
                  className="gap-1 text-xs text-slate-700 hover:text-slate-900 border-slate-300"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                  <span>Close</span>
                </Button>
              </div>
            </div>

            {/* Line items */}
            <div className="mt-4 flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Order Line Items</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg text-xs">
                {selectedPoDetail.items.map((line) => (
                  <div key={line._id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{line.description}</p>
                      <p className="text-[11px] text-slate-400">
                        Price: ₹{line.unitPrice} / {line.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Goods Receipts (GRNs) Recorded</h4>
              {selectedPoDetail.receipts?.length === 0 ? (
                <p className="text-xs text-slate-400">No goods receipts recorded against this PO yet.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {selectedPoDetail.receipts?.map((r) => (
                    <div key={r._id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-slate-800">{r.grnNumber}</span>
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

            {/* Prominent Footer Close Button */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">Click outside, press Esc, or click button to close</span>
              <Button
                variant="default"
                size="sm"
                onClick={() => setSelectedPoDetail(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 text-xs shadow-xs"
              >
                <X className="h-4 w-4" />
                <span>Close Goods Receipts</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

