import React, { useState, useEffect } from 'react';
import {
  FileText,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  MessageSquare,
  AlertTriangle,
  History,
  Check,
  Send,
  Loader2,
  Calendar,
  Layers,
  ShieldCheck,
  CornerDownRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';
import { MessageThread } from '../../components/common/MessageThread';

export function CustomerQuotesPage({ onNavigateSection }) {
  const [activeTab, setActiveTab] = useState('quotes'); // 'quotes' | 'inquiries'
  const [quotations, setQuotations] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  // Counter-offer modal state
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterDate, setCounterDate] = useState('');
  const [counterNotes, setCounterNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quotesRes, inqRes] = await Promise.all([
        api.get('/quotations'),
        api.get('/order-requests'),
      ]);
      setQuotations(quotesRes.data || []);
      setInquiries(inqRes.data || []);

      if (selectedQuote) {
        const updated = quotesRes.data.find((q) => q._id === selectedQuote._id);
        if (updated) setSelectedQuote(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Customer Accept Quotation
  const handleAcceptQuote = async (quoteId) => {
    setActionLoading(true);
    try {
      await api.post(`/quotations/${quoteId}/decision`, {
        decision: 'ACCEPTED',
        customerNotes: 'Approved by procurement. Ready for final order confirmation.',
      });
      setStatusMessage({ type: 'success', text: 'Quotation accepted! You can now confirm the final order.' });
      await fetchData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to accept quotation' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Customer Decline Quotation
  const handleDeclineQuote = async (quoteId) => {
    const reason = prompt('Please specify a reason for declining this quotation:');
    if (!reason) return;

    setActionLoading(true);
    try {
      await api.post(`/quotations/${quoteId}/decision`, {
        decision: 'REJECTED',
        customerNotes: reason,
      });
      setStatusMessage({ type: 'info', text: 'Quotation declined.' });
      await fetchData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to decline quotation' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Submit Counter-Offer
  const handleSubmitCounterOffer = async (e) => {
    e.preventDefault();
    if (!selectedQuote) return;

    setActionLoading(true);
    try {
      await api.post(`/quotations/${selectedQuote._id}/decision`, {
        decision: 'COUNTER_OFFER',
        customerNotes: counterNotes,
        counterOffer: {
          targetPrice: counterPrice ? Number(counterPrice) : undefined,
          targetDeliveryDate: counterDate || undefined,
          notes: counterNotes,
        },
      });
      setShowCounterModal(false);
      setStatusMessage({ type: 'success', text: 'Counter-offer submitted to Everest Mills sales team!' });
      await fetchData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to submit counter-offer' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Confirm Order (Atomic multi-document transaction)
  const handleConfirmOrder = async (quoteId) => {
    setActionLoading(true);
    try {
      const idempotencyKey = `idemp-customer-${quoteId}-${Date.now()}`;
      const res = await api.post('/orders/confirm', {
        quotationId: quoteId,
        idempotencyKey,
      });

      setStatusMessage({
        type: 'success',
        text: `Order ${res.data.orderNumber} successfully locked into factory schedule!`,
      });
      await fetchData();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Order confirmation failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ISSUED':
        return <Badge variant="default">Offer Received</Badge>;
      case 'REVISED':
        return <Badge variant="secondary">Revised Offer</Badge>;
      case 'CUSTOMER_ACCEPTED':
        return <Badge variant="success">Accepted &bull; Ready to Confirm</Badge>;
      case 'CONVERTED_TO_ORDER':
        return <Badge variant="success">Converted to Order</Badge>;
      case 'CUSTOMER_REJECTED':
        return <Badge variant="destructive">Declined</Badge>;
      case 'PENDING_REVIEW':
        return <Badge variant="warning">Under Mill Review</Badge>;
      case 'QUOTED':
        return <Badge variant="success">Quotation Generated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Quotations & Inquiries</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review Everest Mills offers, negotiate pricing and timelines, review revision history, and confirm final orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onNavigateSection('catalog')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
          >
            <span>Browse Catalog & Request New Quote</span>
            &rarr;
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex justify-between items-center ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="font-bold">&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => { setActiveTab('quotes'); setSelectedInquiry(null); }}
          className={`py-2.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'quotes'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Active Quotations ({quotations.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('inquiries'); setSelectedQuote(null); }}
          className={`py-2.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'inquiries'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Submitted Inquiries ({inquiries.length})</span>
        </button>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-xs gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span>Loading your commercial records...</span>
        </div>
      ) : activeTab === 'quotes' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quotes List (Left 1 col) */}
          <div className="space-y-3">
            {quotations.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
                No quotations issued yet.
              </div>
            ) : (
              quotations.map((quote) => {
                const isSelected = selectedQuote?._id === quote._id;
                return (
                  <div
                    key={quote._id}
                    onClick={() => setSelectedQuote(quote)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer bg-white text-xs ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {quote.quotationNumber}
                      </span>
                      {getStatusBadge(quote.status)}
                    </div>

                    <div className="space-y-1 text-slate-600 mb-3">
                      <p className="font-semibold text-slate-800">
                        {quote.items?.[0]?.productId?.name || 'Custom Woven Fabric'}
                      </p>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Quantity: {quote.items?.[0]?.quantity?.toLocaleString()} {quote.items?.[0]?.unit}</span>
                        <span className="font-bold text-blue-700 font-mono text-xs">
                          ₹{quote.totalAmount?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>Delivery: {new Date(quote.proposedDeliveryDate).toLocaleDateString()}</span>
                        <span>Rev #{quote.currentRevisionNumber || 1}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quotation Detail View & Negotiation Console (Right 2 cols) */}
          <div className="lg:col-span-2">
            {selectedQuote ? (
              <div className="space-y-6">
                {/* Quotation Header & Action Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">{selectedQuote.quotationNumber}</h2>
                        {getStatusBadge(selectedQuote.status)}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Revision #{selectedQuote.currentRevisionNumber || 1}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Valid Until: {new Date(selectedQuote.validUntil).toLocaleDateString()} &bull; GST 5% Included
                      </p>
                    </div>

                    {/* Primary Negotiation Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedQuote.status === 'ISSUED' || selectedQuote.status === 'REVISED' ? (
                        <>
                          <Button
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleAcceptQuote(selectedQuote._id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Accept Offer</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoading}
                            onClick={() => setShowCounterModal(true)}
                            className="text-xs gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
                          >
                            <CornerDownRight className="h-3.5 w-3.5" />
                            <span>Counter-Offer</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={actionLoading}
                            onClick={() => handleDeclineQuote(selectedQuote._id)}
                            className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <span>Decline</span>
                          </Button>
                        </>
                      ) : selectedQuote.status === 'CUSTOMER_ACCEPTED' ? (
                        <Button
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => handleConfirmOrder(selectedQuote._id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm animate-pulse"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>Confirm Final Order (Lock Factory Schedule)</span>
                        </Button>
                      ) : selectedQuote.status === 'CONVERTED_TO_ORDER' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onNavigateSection('my-orders')}
                          className="text-xs text-emerald-700 border-emerald-300 gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>View Confirmed Order Tracking &rarr;</span>
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Financial & Schedule Highlights */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Amount:</span>
                      <span className="text-base font-bold font-mono text-blue-700">
                        ₹{selectedQuote.totalAmount?.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Unit Rate:</span>
                      <span className="text-base font-bold font-mono text-slate-800">
                        ₹{selectedQuote.items?.[0]?.unitPrice} / {selectedQuote.items?.[0]?.unit}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Delivery Target:</span>
                      <span className="text-base font-bold font-mono text-slate-800">
                        {new Date(selectedQuote.proposedDeliveryDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Production Time:</span>
                      <span className="text-base font-bold font-mono text-slate-800">
                        {selectedQuote.productionLeadTimeDays || 14} Days
                      </span>
                    </div>
                  </div>

                  {/* Transparent Assumptions & Identified Risks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                      <span className="font-bold text-blue-900 block mb-1">
                        Transparent Production Assumptions:
                      </span>
                      {selectedQuote.assumptions?.map((assump, idx) => (
                        <p key={idx} className="text-[11px] text-blue-800 leading-relaxed">&bull; {assump}</p>
                      ))}
                    </div>

                    <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 space-y-1">
                      <span className="font-bold text-amber-900 block mb-1">
                        Identified Risks & Disclosures:
                      </span>
                      {selectedQuote.riskFactors?.map((risk, idx) => (
                        <p key={idx} className="text-[11px] text-amber-800 leading-relaxed">&bull; {risk}</p>
                      ))}
                    </div>
                  </div>

                  {/* Revision History Viewer */}
                  {selectedQuote.revisions?.length > 1 && (
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-slate-500" />
                        <span>Preserved Quotation Revision History</span>
                      </h4>
                      <div className="space-y-2">
                        {selectedQuote.revisions.map((rev) => (
                          <div
                            key={rev.revisionNumber}
                            className={`p-3 rounded-lg border text-xs flex justify-between items-center ${
                              rev.revisionNumber === selectedQuote.currentRevisionNumber
                                ? 'bg-blue-50/40 border-blue-200'
                                : 'bg-slate-50 border-slate-200 opacity-80'
                            }`}
                          >
                            <div>
                              <span className="font-bold text-slate-800">
                                Revision #{rev.revisionNumber}
                              </span>
                              <span className="text-[11px] text-slate-500 ml-2">
                                Rate: ₹{rev.items?.[0]?.unitPrice} &bull; Delivery: {new Date(rev.proposedDeliveryDate).toLocaleDateString()}
                              </span>
                              <p className="text-[10px] text-slate-500 italic mt-0.5">
                                Notes: {rev.notes || 'Official offer update'}
                              </p>
                            </div>
                            <span className="font-mono font-bold text-slate-700">
                              ₹{rev.totalAmount?.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Embedded Communication Thread */}
                <MessageThread
                  threadType="QUOTATION"
                  referenceId={selectedQuote._id}
                  title={`Negotiation Thread &bull; ${selectedQuote.quotationNumber}`}
                />
              </div>
            ) : (
              <div className="p-16 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
                Select a quotation from the left to view technical details, negotiate, or accept.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Inquiries Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inquiries.length === 0 ? (
            <div className="col-span-2 p-12 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
              No inquiries submitted yet.
            </div>
          ) : (
            inquiries.map((inq) => (
              <Card key={inq._id} className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono font-bold text-slate-900 text-sm">{inq.requestNumber}</span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Submitted: {new Date(inq.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(inq.status)}
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1">
                  <p className="font-bold text-slate-800">{inq.items?.[0]?.productId?.name}</p>
                  <div className="flex justify-between text-slate-600">
                    <span>Target Quantity: {inq.items?.[0]?.targetQuantity?.toLocaleString()} {inq.items?.[0]?.targetUnit}</span>
                    <span>Target Date: {inq.preferredDeliveryDate ? new Date(inq.preferredDeliveryDate).toLocaleDateString() : 'Flexible'}</span>
                  </div>
                  {inq.customerNotes && (
                    <p className="text-slate-500 italic text-[11px] pt-1 border-t border-slate-200">
                      "{inq.customerNotes}"
                    </p>
                  )}
                </div>

                {/* Attached Specification Documents */}
                {inq.specificationDocuments?.length > 0 && (
                  <div className="text-xs">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Attached Documents:</span>
                    {inq.specificationDocuments.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-medium text-[11px]"
                      >
                        <FileText className="h-3 w-3" />
                        <span>{doc.name}</span>
                      </a>
                    ))}
                  </div>
                )}

                {/* Linked Quotation shortcut */}
                {inq.quotationId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActiveTab('quotes');
                      const found = quotations.find((q) => q._id === inq.quotationId._id || q._id === inq.quotationId);
                      if (found) setSelectedQuote(found);
                    }}
                    className="w-full text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    View Issued Quotation &rarr;
                  </Button>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* Counter-Offer Modal */}
      {showCounterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Submit Revision / Counter-Offer</h3>
              <button onClick={() => setShowCounterModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>

            <form onSubmit={handleSubmitCounterOffer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Target Price (₹ per unit or total)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 136"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Requested Target Delivery Date
                </label>
                <input
                  type="date"
                  value={counterDate}
                  onChange={(e) => setCounterDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Negotiation Notes & Rationale *
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="e.g. We have budget constraints of ₹136/m; can commit to quarterly repeat volumes."
                  value={counterNotes}
                  onChange={(e) => setCounterNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCounterModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Counter-Offer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

