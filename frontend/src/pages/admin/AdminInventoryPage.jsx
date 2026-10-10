import React, { useState, useEffect } from 'react';
import {
  Package,
  Layers,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  FileCheck2,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  History,
  CheckCircle2,
  XCircle,
  Truck,
  ShieldAlert,
  Loader2,
  FileText,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Yarn & Raw Material Inventory</h1>
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
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
            className="text-slate-700 text-xs h-9 gap-1.5"
          >
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            Audit Adjustment
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchInventory}
            className="text-slate-500 hover:text-slate-800 h-9 px-2"
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
          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total SKUs</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{summary.totalSkus}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Active Mill Items</p>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">On-Hand Stock</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{summary.totalOnHand.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg/m</span></p>
            <p className="text-[10px] text-slate-400 mt-0.5">Physical Inventory</p>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Reserved</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{summary.totalReserved.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg/m</span></p>
            <p className="text-[10px] text-amber-600 mt-0.5">Locked for Sales Orders</p>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Available (ATP)</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{summary.totalAvailable.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg/m</span></p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Uncommitted for Quotes</p>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Incoming POs</p>
            <p className="text-xl font-bold text-blue-700 mt-1">{summary.totalIncoming.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg/m</span></p>
            <p className="text-[10px] text-blue-600 mt-0.5">Authorized Purchase Orders</p>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Low Stock Alerts</p>
            <p className="text-xl font-bold text-rose-700 mt-1">{summary.lowStockCount}</p>
            <p className="text-[10px] text-rose-500 mt-0.5">Below Reorder Level</p>
          </Card>
        </div>
      )}

      {/* Tabs & Search Navigation */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-slate-200 pb-3">
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
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Low Stock Only
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Stock Balances Table */}
      {activeTab === 'inventory' && (
        <Card className="border-slate-200 overflow-hidden shadow-xs bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">SKU / Item Name</th>
                  <th className="py-3 px-4 font-semibold">Category / Spec</th>
                  <th className="py-3 px-4 font-semibold text-right">On-Hand</th>
                  <th className="py-3 px-4 font-semibold text-right">Reserved</th>
                  <th className="py-3 px-4 font-semibold text-right text-emerald-700">Available (ATP)</th>
                  <th className="py-3 px-4 font-semibold text-right text-blue-700">Incoming PO</th>
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
                    <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{item.sku}</div>
                        <div className="text-[11px] text-slate-500">{item.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-700">{item.category.replace('_', ' ')}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.yarnType || ''} {item.yarnColor ? `(${item.yarnColor})` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">
                        {item.quantityOnHand.toLocaleString()} <span className="text-[10px] text-slate-400">{item.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-amber-700">
                        {item.quantityReserved.toLocaleString()} <span className="text-[10px] text-slate-400">{item.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        {item.availableStock.toLocaleString()} <span className="text-[10px] text-slate-400">{item.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-blue-700">
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
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
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
              <Card className="col-span-full p-8 text-center text-slate-400 bg-white">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No Material Shortages Detected</p>
                <p className="text-xs text-slate-400 mt-1">All active confirmed orders have sufficient yarn stock.</p>
              </Card>
            ) : (
              shortages.shortages.map((s) => (
                <Card key={s.inventoryItemId} className="p-4 border-slate-200 bg-white shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-900">{s.sku}</span>
                      <h4 className="text-xs font-semibold text-slate-700 mt-0.5">{s.name}</h4>
                      <p className="text-[11px] text-slate-400">{s.yarnType}</p>
                    </div>
                    <Badge variant={s.severity === 'CRITICAL' ? 'destructive' : 'warning'}>
                      {s.severity}
                    </Badge>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400">Available Stock:</span>
                      <p className="font-bold text-slate-800">{s.availableStock} kg</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Reorder Threshold:</span>
                      <p className="font-bold text-slate-800">{s.minimumReorderLevel} kg</p>
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
        <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <History className="h-4 w-4 text-blue-600" />
              Immutable Material Movement Ledger
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Audit-trail ledger recording every receipt, issue, and adjustment with cryptographic consistency.
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
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
                    <tr key={m._id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-bold text-slate-800">{m.movementNumber}</td>
                      <td className="py-2.5 px-4 text-slate-500 font-sans">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
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
                      <td className="py-2.5 px-4 text-right font-bold text-slate-800">{m.newQuantityOnHand}</td>
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
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ArrowDownRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Goods Receipt (GRN)</h3>
                  <p className="text-xs text-slate-500">Atomic verification against Purchase Order with batch registration</p>
                </div>
              </div>
              <button onClick={() => setShowGrnModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">×</button>
            </div>

            <form onSubmit={submitGrn} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Select Purchase Order *</label>
                  <select
                    required
                    value={grnForm.purchaseOrderId}
                    onChange={(e) => handleSelectPoForGrn(e.target.value)}
                    className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
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
                  <label className="text-xs font-semibold text-slate-700">Delivery Challan Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DC-2026-9921"
                    value={grnForm.deliveryChallanNumber}
                    onChange={(e) => setGrnForm({ ...grnForm, deliveryChallanNumber: e.target.value })}
                    className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Receipt Date *</label>
                  <input
                    type="date"
                    required
                    value={grnForm.receivedDate}
                    onChange={(e) => setGrnForm({ ...grnForm, receivedDate: e.target.value })}
                    className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              {/* Line items table */}
              {grnForm.items.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 p-2.5 border-b border-slate-200 text-xs font-bold text-slate-700">
                    PO Line Items Reconciliation
                  </div>
                  <div className="divide-y divide-slate-100">
                    {grnForm.items.map((line, idx) => (
                      <div key={idx} className="p-3 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{line.description}</span>
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
                              className="w-full p-1.5 border border-slate-200 rounded text-xs"
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
                              className="w-full p-1.5 border border-slate-200 rounded text-xs"
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
                              className="w-full p-1.5 border border-slate-200 rounded text-xs"
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
                              className="w-full p-1.5 border border-slate-200 rounded text-xs"
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
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowOverReceipt"
                    checked={grnForm.allowOverReceipt}
                    onChange={(e) => setGrnForm({ ...grnForm, allowOverReceipt: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <label htmlFor="allowOverReceipt" className="text-xs font-semibold text-slate-800">
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Issue Material to Production</h3>
                  <p className="text-xs text-slate-500">Atomic stock deduction with reservation release</p>
                </div>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">×</button>
            </div>

            <form onSubmit={submitIssueMaterial} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Target Confirmed Order *</label>
                <select
                  required
                  value={issueForm.orderId}
                  onChange={(e) => setIssueForm({ ...issueForm, orderId: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
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
                <label className="text-xs font-semibold text-slate-700">Inventory Item *</label>
                <select
                  required
                  value={issueForm.inventoryItemId}
                  onChange={(e) => setIssueForm({ ...issueForm, inventoryItemId: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                >
                  {items.map((i) => (
                    <option key={i._id} value={i._id}>
                      {i.sku} — {i.name} (Available: {i.availableStock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Issue Quantity *</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  placeholder="e.g. 250"
                  value={issueForm.quantity}
                  onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Issued for Warping Section A"
                  value={issueForm.reason}
                  onChange={(e) => setIssueForm({ ...issueForm, reason: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200"
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Physical Stock Count Adjustment</h3>
                  <p className="text-xs text-slate-500">Authorized floor audit with bound protection</p>
                </div>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">×</button>
            </div>

            <form onSubmit={submitAdjustment} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Inventory Item *</label>
                <select
                  required
                  value={adjustForm.inventoryItemId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, inventoryItemId: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                >
                  {items.map((i) => (
                    <option key={i._id} value={i._id}>
                      {i.sku} — {i.name} (On-Hand: {i.quantityOnHand}, Reserved: {i.quantityReserved})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Delta Adjustment (+ or -) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. +50 or -20"
                  value={adjustForm.deltaAmount}
                  onChange={(e) => setAdjustForm({ ...adjustForm, deltaAmount: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Safe guard: On-hand will not be permitted to fall below reserved stock.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Audit Justification *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Godown Physical Recount discrepancy"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="mt-1 w-full text-xs p-2 rounded-lg border border-slate-200"
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
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedItemDetail.sku} — {selectedItemDetail.name}</h3>
                <p className="text-xs text-slate-500">Warehouse: {selectedItemDetail.warehouseLocation} | Unit Cost: ₹{selectedItemDetail.unitCost}</p>
              </div>
              <button onClick={() => setSelectedItemDetail(null)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">×</button>
            </div>

            {/* Yarn Batches */}
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Registered Batches</h4>
              {selectedItemDetail.batches?.length === 0 ? (
                <p className="text-xs text-slate-400">No batch records registered for this SKU.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedItemDetail.batches?.map((b) => (
                    <div key={b._id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="font-mono font-bold text-slate-800">{b.batchNumber}</div>
                      <div className="text-[11px] text-slate-500">Remaining: {b.remainingQuantity} / Received: {b.receivedQuantity} {b.unit}</div>
                      <div className="text-[10px] text-slate-400 mt-1">Lot: {b.yarnSpecification?.lotNumber || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Item movements */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Recent Stock Movements</h4>
              <div className="divide-y divide-slate-100 text-xs max-h-60 overflow-y-auto">
                {selectedItemDetail.movements?.map((m) => (
                  <div key={m._id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-semibold text-slate-800">{m.movementNumber}</span>
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

