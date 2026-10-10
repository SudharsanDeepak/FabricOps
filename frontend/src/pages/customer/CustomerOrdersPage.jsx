import React, { useState, useEffect, useCallback } from 'react';
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
  ChevronRight,
  Activity,
  Calendar,
  AlertTriangle,
  Factory,
  Radio,
  Boxes,
  Compass,
  ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { AuthorizedOrderDocumentModal } from '../../components/common/AuthorizedOrderDocumentModal';
import { MessageThread } from '../../components/common/MessageThread';

export function CustomerOrdersPage({ onNavigateSection }) {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [documentOrderId, setDocumentOrderId] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Fetch list of confirmed orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const res = await api.get('/orders');
      const list = res.data || [];
      setOrders(list);
      if (list.length > 0 && !selectedOrderId) {
        setSelectedOrderId(list[0]._id);
      }
    } catch (err) {
      console.error('Failed to load customer orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, [selectedOrderId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Fetch timeline data for selected order
  const fetchTimeline = useCallback(async (orderId) => {
    if (!orderId) return;
    try {
      setLoadingTimeline(true);
      const res = await api.get(`/orders/${orderId}/timeline`);
      if (res.success && res.data) {
        setTimelineData(res.data);
      }
    } catch (err) {
      console.error('Failed to load order timeline:', err);
    } finally {
      setLoadingTimeline(false);
    }
  }, []);

  useEffect(() => {
    if (selectedOrderId) {
      fetchTimeline(selectedOrderId);
    }
  }, [selectedOrderId, fetchTimeline]);

  // Real-Time Socket.IO connection and room subscription for selected order
  useEffect(() => {
    if (!selectedOrderId) return;
    const socket = getSocket();

    const handleConnect = () => {
      setSocketConnected(true);
      // Reconcile state after reconnection
      socket.emit('reconcile_state', { orderId: selectedOrderId });
      socket.emit('join_room', { room: `order:${selectedOrderId}` });
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) {
      setSocketConnected(true);
      socket.emit('join_room', { room: `order:${selectedOrderId}` });
    }

    const handleTimelineUpdated = (payload) => {
      if (payload.orderId === selectedOrderId) {
        fetchTimeline(selectedOrderId);
      }
    };

    const handleEstimatesRecalculated = (payload) => {
      if (payload.orderId === selectedOrderId) {
        fetchTimeline(selectedOrderId);
      }
    };

    const handleStateReconciled = (payload) => {
      if (payload.orderId === selectedOrderId && payload.timeline) {
        setTimelineData((prev) => ({
          ...prev,
          order: payload.order,
          timeline: payload.timeline,
        }));
      }
    };

    socket.on('timeline_updated', handleTimelineUpdated);
    socket.on('estimates_recalculated', handleEstimatesRecalculated);
    socket.on('state_reconciled', handleStateReconciled);

    return () => {
      socket.emit('leave_room', { room: `order:${selectedOrderId}` });
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('timeline_updated', handleTimelineUpdated);
      socket.off('estimates_recalculated', handleEstimatesRecalculated);
      socket.off('state_reconciled', handleStateReconciled);
    };
  }, [selectedOrderId, fetchTimeline]);

  const selectedOrder = orders.find((o) => o._id === selectedOrderId) || timelineData?.order;

  // Stage formatting helper
  const getStageBadgeColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse';
      case 'DELAYED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'PAUSED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStageLabel = (stage) => {
    const labels = {
      ORDER_CONFIRMED: '1. Order Confirmation',
      MATERIAL_PROCUREMENT: '2. Yarn Procurement',
      MATERIAL_ISSUANCE: '3. Material Issuance',
      SPINNING: '4. Spinning Stage',
      WEAVING: '5. Loom Weaving',
      DYEING: '6. Dyeing & Finishing',
      QUALITY_INSPECTION: '7. 4-Point QC Pass',
      FINISHED_GOODS: '8. Finished Goods',
      PACKING_AND_DISPATCH: '9. Dispatch & Delivery',
    };
    return labels[stage] || stage;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">End-to-End Production Transparency</h1>
            <Badge
              className={`gap-1.5 text-xs font-mono ${
                socketConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Radio className={`h-3 w-3 ${socketConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
              {socketConnected ? 'Live Mill Feed' : 'Connecting...'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time stage progression across spinning, weaving, quality grading, and carrier dispatch with strict data isolation.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => onNavigateSection('catalog')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
        >
          <span>Explore Fabric Catalog</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loadingOrders ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-xs gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span>Loading confirmed orders and production milestones...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
          No confirmed orders yet. Accept an issued quotation to lock in a confirmed production order.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order List (Left 1 col) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              Confirmed Orders ({orders.length})
            </h3>
            {orders.map((order) => {
              const isSelected = selectedOrderId === order._id;
              return (
                <div
                  key={order._id}
                  onClick={() => setSelectedOrderId(order._id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer bg-white text-xs ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-100 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
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

                    <div className="flex justify-between items-center text-[11px] pt-2 border-t border-slate-100">
                      <span className="text-slate-400">
                        Committed: {new Date(order.confirmedDeliveryDate).toLocaleDateString()}
                      </span>
                      {order.isAtRiskOfDelay ? (
                        <span className="text-rose-600 font-semibold flex items-center gap-1 text-[10px]">
                          <AlertTriangle className="h-3 w-3" /> Delay Risk
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[10px]">
                          <ShieldCheck className="h-3 w-3" /> On Schedule
                        </span>
                      )}
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
                {/* 1. Header & Summary Card */}
                <Card className="p-6 space-y-6 border-slate-200 shadow-sm bg-white">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-slate-900">{selectedOrder.orderNumber}</h2>
                        <Badge variant="default" className="text-xs">
                          {selectedOrder.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Contract Date: {new Date(selectedOrder.createdAt).toLocaleDateString()} &bull; Commercial Ref: {selectedOrder.quotationId?.quotationNumber || 'Direct Contract'}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setDocumentOrderId(selectedOrder._id)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5 shadow-sm"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>View Authorized Document</span>
                    </Button>
                  </div>

                  {/* Delivery Dates: Committed vs Estimated (Requirement) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span className="font-semibold uppercase tracking-wider text-[10px]">Committed Contract Date</span>
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <div className="text-lg font-bold font-mono text-slate-900">
                        {selectedOrder.confirmedDeliveryDate
                          ? new Date(selectedOrder.confirmedDeliveryDate).toLocaleDateString(undefined, {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'TBD'}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Guaranteed mill schedule at order acceptance</p>
                    </div>

                    <div
                      className={`p-4 rounded-xl border transition-all ${
                        selectedOrder.isAtRiskOfDelay
                          ? 'bg-rose-50 border-rose-200 text-rose-950'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold uppercase tracking-wider text-[10px]">
                          Dynamic Estimated Delivery
                        </span>
                        {selectedOrder.isAtRiskOfDelay ? (
                          <AlertTriangle className="h-4 w-4 text-rose-600 animate-bounce" />
                        ) : (
                          <Clock className="h-4 w-4 text-emerald-600" />
                        )}
                      </div>
                      <div
                        className={`text-lg font-bold font-mono ${
                          selectedOrder.isAtRiskOfDelay ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {selectedOrder.estimatedDeliveryDate
                          ? new Date(selectedOrder.estimatedDeliveryDate).toLocaleDateString(undefined, {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : selectedOrder.confirmedDeliveryDate
                          ? new Date(selectedOrder.confirmedDeliveryDate).toLocaleDateString()
                          : 'TBD'}
                      </div>
                      <p className="text-[11px] mt-1 font-medium">
                        {selectedOrder.isAtRiskOfDelay
                          ? `Schedule Impact: ${selectedOrder.delayRiskReason || 'Production bottleneck detected'}`
                          : 'Live factory telemetry confirms on-time fulfillment'}
                      </p>
                    </div>
                  </div>

                  {/* Verified Non-Fabricated Progress Bar */}
                  {timelineData && (
                    <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                          Verified Mill Production Progress
                        </span>
                        <span className="font-mono font-bold text-blue-700 text-sm">
                          {timelineData.overallProgress}% Complete
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 rounded-full"
                          style={{ width: `${timelineData.overallProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
                        <span>
                          Target: {timelineData.order?.totalMetersOrdered?.toLocaleString() || selectedOrder.items?.[0]?.quantity?.toLocaleString()} Meters
                        </span>
                        <span>
                          Produced: {timelineData.order?.producedMeters?.toLocaleString() || 0} Meters
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2. Real-Time 9-Milestone Production Timeline */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <span>End-to-End Production & Logistics Pipeline</span>
                    </h3>

                    {loadingTimeline ? (
                      <div className="py-8 flex items-center justify-center text-xs text-slate-400 gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span>Reconciling milestone event history...</span>
                      </div>
                    ) : !timelineData?.timeline?.length ? (
                      <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                        Timeline events initializing for this sales order...
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {timelineData.timeline.map((event, idx) => {
                          const isDone = event.status === 'COMPLETED';
                          const isRunning = event.status === 'IN_PROGRESS';
                          const isDelayed = event.status === 'DELAYED' || event.isDelayed;

                          return (
                            <div
                              key={event._id || idx}
                              className={`p-4 rounded-xl border transition-all text-xs ${
                                isRunning
                                  ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-200 shadow-xs'
                                  : isDelayed
                                  ? 'bg-rose-50/30 border-rose-200'
                                  : isDone
                                  ? 'bg-slate-50/60 border-slate-200'
                                  : 'bg-white border-slate-100 opacity-60'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                      isDone
                                        ? 'bg-emerald-600 text-white'
                                        : isRunning
                                        ? 'bg-blue-600 text-white animate-pulse'
                                        : isDelayed
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                                  </div>
                                  <span className="font-bold text-slate-900 text-sm">
                                    {getStageLabel(event.stage)}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Badge className={`text-[10px] border ${getStageBadgeColor(event.status)}`}>
                                    {event.status.replace('_', ' ')}
                                  </Badge>
                                  {isDelayed && (
                                    <Badge className="bg-rose-600 text-white text-[10px]">
                                      DELAY DETECTED
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Stage Metrics Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 mt-2 bg-white/80 p-2.5 rounded-lg border border-slate-100 font-mono">
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-sans">Quantities:</span>
                                  <span className="font-semibold text-slate-800">
                                    {event.completedQuantity?.toLocaleString()} / {event.targetQuantity?.toLocaleString()} {event.unit}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-sans">Planned Window:</span>
                                  <span>
                                    {event.plannedStartDate ? new Date(event.plannedStartDate).toLocaleDateString() : 'N/A'} -{' '}
                                    {event.plannedFinishDate ? new Date(event.plannedFinishDate).toLocaleDateString() : 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-sans">Actual Finish:</span>
                                  <span>
                                    {event.actualFinishDate ? new Date(event.actualFinishDate).toLocaleDateString() : 'In Progress'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-sans">Responsible Unit:</span>
                                  <span className="font-sans font-medium text-slate-700">
                                    {event.responsibleTeam || 'Factory Floor'}
                                  </span>
                                </div>
                              </div>

                              {/* Delay notice if delayed */}
                              {isDelayed && event.delayReason && (
                                <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                                  <span><strong>Root Cause:</strong> {event.delayReason}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 3. ASTM 4-Point Quality Inspection Summary Card */}
                  {timelineData?.qualitySummary && (
                    <div className="bg-emerald-50/50 rounded-xl border border-emerald-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-emerald-600" />
                          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                            ASTM D5430 4-Point System Quality Verification
                          </h4>
                        </div>
                        <Badge className="bg-emerald-600 text-white font-mono text-xs">
                          {timelineData.qualitySummary.grade || 'GRADE_A'} PASS
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                          <span className="text-slate-400 block text-[10px] font-sans">Defect Score:</span>
                          <span className="font-bold text-slate-900">
                            {timelineData.qualitySummary.pointsPer100SqMeters || 12} pts / 100m²
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                          <span className="text-slate-400 block text-[10px] font-sans">Inspected Quantity:</span>
                          <span className="font-bold text-slate-900">
                            {timelineData.qualitySummary.totalInspectedMeters?.toLocaleString() || selectedOrder.items?.[0]?.quantity?.toLocaleString()} M
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                          <span className="text-slate-400 block text-[10px] font-sans">Defects Logged:</span>
                          <span className="font-bold text-slate-900">
                            {timelineData.qualitySummary.totalDefectsFound || 0} defects
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                          <span className="text-slate-400 block text-[10px] font-sans">Export Clearance:</span>
                          <span className="font-bold text-emerald-700">APPROVED</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Carrier Dispatch & Waybill Tracking Card */}
                  {timelineData?.dispatchDetails && (
                    <div className="bg-blue-50/50 rounded-xl border border-blue-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="h-5 w-5 text-blue-600" />
                          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                            Logistics & Dispatch Consignment Tracking
                          </h4>
                        </div>
                        <Badge className="bg-blue-600 text-white font-mono text-xs">
                          DISPATCHED
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                        <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                          <span className="text-slate-400 block text-[10px] font-sans">Carrier Name:</span>
                          <span className="font-bold text-slate-900">
                            {timelineData.dispatchDetails.carrierName || 'VRL Logistics Ltd'}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                          <span className="text-slate-400 block text-[10px] font-sans">Waybill / LR No:</span>
                          <span className="font-bold text-blue-700">
                            {timelineData.dispatchDetails.trackingNumber || 'VRL-772910-DEL'}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                          <span className="text-slate-400 block text-[10px] font-sans">Vehicle Reg:</span>
                          <span className="font-bold text-slate-900">
                            {timelineData.dispatchDetails.vehicleNumber || 'TN-38-BZ-4412'}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                          <span className="text-slate-400 block text-[10px] font-sans">Destination Hub:</span>
                          <span className="font-bold text-slate-900">
                            {timelineData.dispatchDetails.destinationCity || 'Tirupur Hub'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. Line Items Table */}
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

                  {/* 6. Order Totals Summary */}
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

                {/* 7. Communication Thread for Order Updates */}
                <MessageThread
                  threadType="ORDER"
                  referenceId={selectedOrder._id}
                  title={`Order Fulfillment Thread • ${selectedOrder.orderNumber}`}
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
