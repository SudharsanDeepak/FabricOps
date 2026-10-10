import React, { useState, useEffect } from 'react';
import {
  Layers,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  Filter,
  Eye,
  MessageSquare
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';
import { AuthorizedOrderDocumentModal } from '../../components/common/AuthorizedOrderDocumentModal';
import { MessageThread } from '../../components/common/MessageThread';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Confirmed Sales Orders Management</h1>
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
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
        <div className="p-16 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
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
                      {order.customerId?.name || 'Customer'}
                    </p>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{order.items?.[0]?.quantity?.toLocaleString()} {order.items?.[0]?.unit}</span>
                      <span className="font-bold text-blue-700 font-mono text-xs">
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
                        <h2 className="text-lg font-bold text-slate-900">{selectedOrder.orderNumber}</h2>
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
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Revenue:</span>
                      <span className="text-base font-bold font-mono text-blue-700">
                        ₹{selectedOrder.totalAmount?.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Target Delivery:</span>
                      <span className="text-base font-bold font-mono text-slate-800">
                        {new Date(selectedOrder.confirmedDeliveryDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Yarn Reserved:</span>
                      <span className="text-base font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Atomic Lock
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Payment Status:</span>
                      <span className="text-base font-bold text-slate-800 font-mono">
                        {selectedOrder.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-lg text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] uppercase font-bold">
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
                            <td className="p-3 font-semibold text-slate-800">
                              {item.productId?.name || 'Fabric'}
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
                </Card>

                {/* Message Thread */}
                <MessageThread
                  threadType="ORDER"
                  referenceId={selectedOrder._id}
                  title={`Order Fulfillment & Logistics Thread &bull; ${selectedOrder.orderNumber}`}
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

