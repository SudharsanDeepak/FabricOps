import React, { useState, useEffect } from 'react';
import {
  Layers,
  Printer,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  AlertCircle,
  FileText,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';
import { AuthorizedOrderDocumentModal } from '../../components/common/AuthorizedOrderDocumentModal';
import { MessageThread } from '../../components/common/MessageThread';

export function CustomerOrdersPage({ onNavigateSection }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [documentOrderId, setDocumentOrderId] = useState(null);

  const fetchOrders = () => {
    setLoading(true);
    api.get('/orders')
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
  }, []);

  const stages = [
    { key: 'CONFIRMED', label: 'Order Confirmed' },
    { key: 'YARN_ALLOCATED', label: 'Yarn Allocated' },
    { key: 'IN_PRODUCTION', label: 'Loom Weaving' },
    { key: 'QUALITY_APPROVED', label: '4-Point QC Pass' },
    { key: 'PARTIALLY_DISPATCHED', label: 'Dispatched' },
    { key: 'COMPLETED', label: 'Delivered' },
  ];

  const getStageIndex = (status) => {
    const idx = stages.findIndex((s) => s.key === status);
    return idx === -1 ? 0 : idx;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Live Order Tracking & Mill Documents</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track confirmed sales orders through spinning, weaving, quality scoring, and transit. Access official mill certificates.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => onNavigateSection('catalog')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
        >
          <span>Explore Fabric Catalog</span>
          &rarr;
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-xs gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span>Loading confirmed orders and production milestones...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
          No confirmed orders yet. Accept an issued quotation to lock in a confirmed production order.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order List (Left 1 col) */}
          <div className="space-y-3">
            {orders.map((order) => {
              const isSelected = selectedOrder?._id === order._id;
              return (
                <div
                  key={order._id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer bg-white text-xs ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {order.orderNumber}
                    </span>
                    <Badge variant={order.status === 'COMPLETED' ? 'success' : 'default'} className="text-[10px]">
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-slate-600">
                    <p className="font-semibold text-slate-800">
                      {order.items?.[0]?.productId?.name || 'Custom Woven Fabric'}
                    </p>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{order.items?.[0]?.quantity?.toLocaleString()} {order.items?.[0]?.unit}</span>
                      <span className="font-bold text-blue-700 font-mono text-xs">
                        ₹{order.totalAmount?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Delivery: {new Date(order.confirmedDeliveryDate).toLocaleDateString()}</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                        <ShieldCheck className="h-3 w-3" /> Certified
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Order Tracking & Details (Right 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {selectedOrder && (
              <>
                <Card className="p-6 space-y-6">
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">{selectedOrder.orderNumber}</h2>
                        <Badge variant="success" className="text-xs">
                          {selectedOrder.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Confirmed Delivery: <strong>{new Date(selectedOrder.confirmedDeliveryDate).toLocaleDateString()}</strong> &bull; Quote: {selectedOrder.quotationId?.quotationNumber || 'Direct'}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setDocumentOrderId(selectedOrder._id)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5 shadow-xs"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>View Authorized Document</span>
                    </Button>
                  </div>

                  {/* Production Milestones Progress Tracker */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                      Production & Logistics Pipeline:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                      {stages.map((stage, idx) => {
                        const currentStageIdx = getStageIndex(selectedOrder.status);
                        const isCompleted = idx <= currentStageIdx;
                        const isCurrent = idx === currentStageIdx;

                        return (
                          <div
                            key={stage.key}
                            className={`p-2 rounded-lg border transition-all ${
                              isCurrent
                                ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                                : isCompleted
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                                : 'bg-white text-slate-400 border-slate-200 opacity-60'
                            }`}
                          >
                            <span className="text-[9px] block mb-0.5">Stage {idx + 1}</span>
                            <span className="text-[11px] leading-tight block truncate">{stage.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Technical Specifications & Commercial Schedule
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] uppercase font-bold">
                          <tr>
                            <th className="p-3">Fabric</th>
                            <th className="p-3">Specifications</th>
                            <th className="p-3 text-right">Quantity</th>
                            <th className="p-3 text-right">Rate</th>
                            <th className="p-3 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedOrder.items?.map((item, idx) => (
                            <tr key={idx}>
                              <td className="p-3 font-semibold text-slate-800">
                                {item.productId?.name || 'Custom Fabric'}
                              </td>
                              <td className="p-3 text-slate-600 text-[11px]">
                                {item.fabricSpecSnapshot?.gsm} GSM &bull; {item.fabricSpecSnapshot?.weaveType} &bull; {item.fabricSpecSnapshot?.colorName}
                              </td>
                              <td className="p-3 text-right font-mono font-bold">
                                {item.quantity?.toLocaleString()} {item.unit}
                              </td>
                              <td className="p-3 text-right font-mono">
                                ₹{item.unitPrice}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-blue-700">
                                ₹{item.lineTotal?.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Order Totals Summary */}
                  <div className="flex justify-end pt-2 border-t border-slate-100 text-xs">
                    <div className="w-64 space-y-1">
                      <div className="flex justify-between text-slate-500">
                        <span>Subtotal:</span>
                        <span className="font-mono">₹{selectedOrder.subtotal?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>GST (5%):</span>
                        <span className="font-mono">₹{selectedOrder.taxAmount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1 text-sm">
                        <span>Total:</span>
                        <span className="font-mono text-blue-700">₹{selectedOrder.totalAmount?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Communication Thread for Order Updates */}
                <MessageThread
                  threadType="ORDER"
                  referenceId={selectedOrder._id}
                  title={`Order Fulfillment Thread &bull; ${selectedOrder.orderNumber}`}
                />
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

