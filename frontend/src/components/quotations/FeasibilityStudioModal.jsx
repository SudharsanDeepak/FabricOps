import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  Calendar,
  Package,
  Info,
  DollarSign
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { api } from '../../lib/api';

export function FeasibilityStudioModal({
  orderRequest,
  quotationToRevise = null,
  onClose,
  onSuccess,
}) {
  const [activeTab, setActiveTab] = useState('feasibility'); // 'feasibility' | 'quote'
  const [feasibility, setFeasibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Quotation form state
  const [unitPrice, setUnitPrice] = useState(
    quotationToRevise?.items?.[0]?.unitPrice ||
    orderRequest?.items?.[0]?.targetPricePerUnit ||
    orderRequest?.items?.[0]?.productId?.pricing?.basePricePerUnit ||
    140
  );
  const [taxPercent, setTaxPercent] = useState(5);
  const [proposedDays, setProposedDays] = useState(14);
  const [assumptions, setAssumptions] = useState([
    'Assumes Tsudakoma Air-Jet loom allocation at 820 picks/min',
    'Yarn stock allocation confirmed in warehouse Shed-A',
    'Standard 4-point ASTM D5430 quality grading buffer included',
  ]);
  const [riskFactors, setRiskFactors] = useState([
    'Supplier delivery dates for yarn shortages are unconfirmed estimates',
    'Shade matching subject to lab dip tolerance of +/- 0.5 Delta-E',
  ]);
  const [adminNotes, setAdminNotes] = useState('');

  const targetItem = orderRequest?.items?.[0] || quotationToRevise?.items?.[0] || {};
  const quantity = targetItem.targetQuantity || targetItem.quantity || 1000;
  const unit = targetItem.targetUnit || targetItem.unit || 'METER';

  useEffect(() => {
    setLoading(true);
    const queryParams = new URLSearchParams();
    if (orderRequest?._id) queryParams.set('orderRequestId', orderRequest._id);
    if (targetItem.productId?._id || targetItem.productId) {
      queryParams.set('productId', targetItem.productId?._id || targetItem.productId);
    }
    queryParams.set('quantity', quantity);

    api.get(`/quotations/feasibility?${queryParams.toString()}`)
      .then((res) => {
        setFeasibility(res.data);
        if (res.data.timeline?.totalLeadTimeDays) {
          setProposedDays(res.data.timeline.totalLeadTimeDays);
        }
        if (res.data.timeline?.assumptions?.length) {
          setAssumptions(res.data.timeline.assumptions);
        }
        if (res.data.timeline?.riskFactors?.length) {
          setRiskFactors(res.data.timeline.riskFactors);
        }
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load feasibility evaluation');
      })
      .finally(() => setLoading(false));
  }, [orderRequest, quotationToRevise]);

  // Derived financial calculation
  const subtotal = Number(quantity) * Number(unitPrice);
  const taxAmount = (subtotal * Number(taxPercent)) / 100;
  const totalAmount = subtotal + taxAmount;
  const proposedDeliveryDate = new Date(Date.now() + Number(proposedDays) * 86400000);

  const handleSubmitQuotation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const itemsPayload = [
        {
          productId: targetItem.productId?._id || targetItem.productId,
          fabricSpecSnapshot: targetItem.fabricSpecSnapshot,
          quantity: Number(quantity),
          unit,
          unitPrice: Number(unitPrice),
          lineTotal: subtotal,
          estimatedProductionDays: Number(proposedDays),
          yarnAvailableInStock: feasibility?.yarnFeasibility?.yarnInStock ?? true,
        },
      ];

      const materialAvailabilityPayload = feasibility?.yarnFeasibility
        ? {
            yarnInStock: feasibility.yarnFeasibility.yarnInStock,
            onHandKg: feasibility.yarnFeasibility.onHandKg,
            reservedKg: feasibility.yarnFeasibility.reservedKg,
            availableKg: feasibility.yarnFeasibility.availableKg,
            expectedIncomingKg: feasibility.yarnFeasibility.expectedIncomingKg,
            shortageKg: feasibility.yarnFeasibility.shortageKg,
            supplierGuaranteed: false,
            notes: feasibility.yarnFeasibility.notes,
          }
        : {};

      if (quotationToRevise) {
        // Issue revision
        await api.post(`/quotations/${quotationToRevise._id}/revise`, {
          items: itemsPayload,
          taxPercent: Number(taxPercent),
          proposedDeliveryDate: proposedDeliveryDate.toISOString(),
          productionLeadTimeDays: Number(proposedDays),
          materialAvailability: materialAvailabilityPayload,
          assumptions,
          riskFactors,
          notes: adminNotes || 'Revised quotation terms',
        });
      } else {
        // Issue new quotation
        await api.post('/quotations', {
          orderRequestId: orderRequest?._id,
          customerId: orderRequest?.customerId?._id || orderRequest?.customerId,
          items: itemsPayload,
          taxPercent: Number(taxPercent),
          proposedDeliveryDate: proposedDeliveryDate.toISOString(),
          productionLeadTimeDays: Number(proposedDays),
          materialAvailability: materialAvailabilityPayload,
          assumptions,
          riskFactors,
          adminNotes,
        });
      }

      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to issue quotation');
    } finally {
      setSubmitting(false);
    }
  };

  // Keyboard Escape listener to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
                <Cpu className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-slate-800">
                {quotationToRevise ? `Quotation Revision Studio (Rev #${(quotationToRevise.currentRevisionNumber || 1) + 1})` : 'Feasibility & Quotation Studio'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Target: {quantity.toLocaleString()} {unit} &bull; Customer: {orderRequest?.customerId?.name || 'B2B Client'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('feasibility')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'feasibility' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Capacity & Stock Audit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('quote')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'quote' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Price & Terms Offer
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="gap-1 text-xs text-slate-700 hover:text-slate-900 border-slate-300"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
              <span>Close</span>
            </Button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-500 text-sm gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span>Analyzing yarn warehouse stock, loom reed spaces, and timeline models...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {error}
            </div>
          ) : activeTab === 'feasibility' ? (
            <div className="space-y-6">
              {/* Yarn Stock Analysis Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Yarn Stock Multi-Level Audit
                    </h4>
                  </div>
                  <Badge variant={feasibility?.yarnFeasibility?.yarnInStock ? 'success' : 'destructive'}>
                    {feasibility?.yarnFeasibility?.yarnInStock ? 'Material In Stock' : 'Yarn Shortage Flagged'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Required Yarn:</span>
                    <span className="text-lg font-bold text-slate-900 font-mono">
                      {feasibility?.yarnFeasibility?.yarnRequiredKg} kg
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Includes 5% weaving loss</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">On-Hand Stock:</span>
                    <span className="text-lg font-bold text-slate-700 font-mono">
                      {feasibility?.yarnFeasibility?.onHandKg} kg
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Physical in mill</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Reserved Stock:</span>
                    <span className="text-lg font-bold text-amber-700 font-mono">
                      {feasibility?.yarnFeasibility?.reservedKg} kg
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Active running orders</span>
                  </div>

                  <div className={`p-3 rounded-lg border ${
                    feasibility?.yarnFeasibility?.availableKg >= feasibility?.yarnFeasibility?.yarnRequiredKg
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-rose-50 border-rose-200'
                  }`}>
                    <span className="text-[10px] font-semibold block uppercase text-slate-500">Unreserved Available:</span>
                    <span className={`text-lg font-bold font-mono ${
                      feasibility?.yarnFeasibility?.availableKg >= feasibility?.yarnFeasibility?.yarnRequiredKg
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}>
                      {feasibility?.yarnFeasibility?.availableKg} kg
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Shortage: {feasibility?.yarnFeasibility?.shortageKg} kg
                    </span>
                  </div>
                </div>

                {/* Open POs for Incoming Yarn */}
                {feasibility?.yarnFeasibility?.incomingPOs?.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50/50 border border-blue-200 rounded-lg text-xs">
                    <span className="font-semibold text-blue-900 block mb-1">
                      Expected Incoming Yarn Orders (Open Supplier POs):
                    </span>
                    <div className="space-y-1">
                      {feasibility.yarnFeasibility.incomingPOs.map((po, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] text-slate-700">
                          <span>{po.poNumber} &bull; {po.supplierName} ({po.quantity} {po.unit})</span>
                          <span className="font-mono text-blue-700">ETA: {new Date(po.expectedDeliveryDate).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Critical Business Rule Warning */}
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Business Policy:</strong> A yarn shortage must not imply that a supplier delivery date is guaranteed.
                    Proposed delivery timelines are estimates until supplier dispatch manifests are verified.
                  </p>
                </div>
              </div>

              {/* Machine Fleet & Reed Space Compatibility */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-purple-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Loom Fleet Compatibility & Workload
                    </h4>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    Fabric Width: <strong>{targetItem.fabricSpecSnapshot?.widthInches || 58}"</strong>
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {feasibility?.machineFeasibility?.compatibleMachines?.map((machine) => (
                    <div
                      key={machine.machineId}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/60"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{machine.machineCode}</span>
                          <span className="text-slate-600">&bull; {machine.name}</span>
                          <Badge variant={machine.status === 'RUNNING' ? 'success' : 'outline'}>
                            {machine.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Location: {machine.shedLocation} &bull; Reed Space: {machine.reedSpaceInches}" &bull; Speed: {machine.speedRpm} RPM
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1 justify-end">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Compatible
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Loom Efficiency: {machine.efficiencyPercentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proposed Timeline Formula */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Transparent Timeline Formula Breakdown
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-blue-700 font-mono">
                    Total: {feasibility?.timeline?.totalLeadTimeDays || proposedDays} Days
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs mb-4">
                  {feasibility?.timeline?.breakdown?.map((stage, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-center">
                      <span className="text-[10px] font-bold text-slate-500 block truncate">{stage.stage}</span>
                      <span className="text-base font-bold text-slate-800 font-mono my-0.5 block">{stage.days}d</span>
                      <span className="text-[9px] text-slate-400 block truncate">{stage.status}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="text-xs"
                  >
                    Close Studio
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab('quote')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
                  >
                    <span>Proceed to Quotation Terms</span>
                    &rarr;
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Quotation Terms Form */
            <form onSubmit={handleSubmitQuotation} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Offered Unit Price (₹ / {unit})
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Base catalog price: ₹{targetItem.productId?.pricing?.basePricePerUnit || 140}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Production Lead Time (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    required
                    value={proposedDays}
                    onChange={(e) => setProposedDays(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Calculated: {proposedDeliveryDate.toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    GST Rate (%)
                  </label>
                  <select
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="5">5% (Fabric Standard)</option>
                    <option value="12">12% (Technical Textile)</option>
                    <option value="18">18% (Specialty Finished)</option>
                  </select>
                </div>
              </div>

              {/* Commercial Summary Banner */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Summary: </span>
                  <strong>{quantity.toLocaleString()} {unit}</strong> @ <strong>₹{Number(unitPrice).toFixed(2)}</strong> + {taxPercent}% GST
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 mr-2">Total Quotation Value:</span>
                  <span className="text-lg font-bold font-mono text-blue-700">₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Transparent Assumptions & Risks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Transparent Assumptions (Visible to Buyer)
                  </label>
                  <textarea
                    rows="3"
                    value={assumptions.join('\n')}
                    onChange={(e) => setAssumptions(e.target.value.split('\n'))}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg leading-relaxed focus:border-blue-500 focus:outline-none font-mono"
                    placeholder="Enter one assumption per line"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Identified Risk Factors & Disclosures
                  </label>
                  <textarea
                    rows="3"
                    value={riskFactors.join('\n')}
                    onChange={(e) => setRiskFactors(e.target.value.split('\n'))}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg leading-relaxed focus:border-blue-500 focus:outline-none font-mono"
                    placeholder="Enter one risk factor per line"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Internal / Commercial Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Volume discount applied per quarterly commitments"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="text-xs"
                >
                  Close Studio
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab('feasibility')}
                    className="text-xs"
                  >
                    &larr; Back to Feasibility
                  </Button>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 px-5"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span>{quotationToRevise ? 'Issue Quotation Revision' : 'Issue Official Quotation'}</span>
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

