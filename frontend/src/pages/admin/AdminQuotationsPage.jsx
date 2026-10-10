import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  FileText,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  Search,
  Filter,
  History,
  Plus,
  Loader2,
  Eye,
  CornerDownRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';
import { FeasibilityStudioModal } from '../../components/quotations/FeasibilityStudioModal';
import { MessageThread } from '../../components/common/MessageThread';

export function AdminQuotationsPage() {
  const [activeTab, setActiveTab] = useState('inquiries'); // 'inquiries' | 'quotations'
  const [inquiries, setInquiries] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  // Feasibility & Quote Studio Modal
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioTargetInquiry, setStudioTargetInquiry] = useState(null);
  const [studioTargetQuotation, setStudioTargetQuotation] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [inqRes, quotesRes] = await Promise.all([
        api.get('/order-requests'),
        api.get('/quotations'),
      ]);
      setInquiries(inqRes.data || []);
      setQuotations(quotesRes.data || []);

      if (selectedQuotation) {
        const found = quotesRes.data.find((q) => q._id === selectedQuotation._id);
        if (found) setSelectedQuotation(found);
      }
      if (selectedInquiry) {
        const found = inqRes.data.find((i) => i._id === selectedInquiry._id);
        if (found) setSelectedInquiry(found);
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

  const handleOpenStudioForInquiry = (inquiry) => {
    setStudioTargetInquiry(inquiry);
    setStudioTargetQuotation(null);
    setStudioOpen(true);
  };

  const handleOpenStudioForRevision = (quotation) => {
    setStudioTargetQuotation(quotation);
    setStudioTargetInquiry(null);
    setStudioOpen(true);
  };

  const handleConfirmOrderAdmin = async (quotationId) => {
    try {
      const res = await api.post('/orders/confirm', { quotationId });
      setActionSuccess(`Order ${res.data.orderNumber} successfully confirmed and locked!`);
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to confirm order');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <Badge variant="warning">Pending Review</Badge>;
      case 'QUOTED':
        return <Badge variant="success">Quotation Issued</Badge>;
      case 'ISSUED':
        return <Badge variant="default">Issued &bull; Awaiting Buyer</Badge>;
      case 'REVISED':
        return <Badge variant="secondary">Revision Active</Badge>;
      case 'CUSTOMER_ACCEPTED':
        return <Badge variant="success">Customer Accepted &bull; Ready to Confirm</Badge>;
      case 'CONVERTED_TO_ORDER':
        return <Badge variant="success">Order Confirmed</Badge>;
      case 'CUSTOMER_REJECTED':
        return <Badge variant="destructive">Customer Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Quotations & Inquiry Feasibility Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Validate incoming specifications against loom reed space, evaluate yarn warehouse stock, generate transparent timelines, and negotiate terms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            Pending Inquiries: <strong className="text-amber-600">{inquiries.filter((i) => i.status === 'PENDING_REVIEW').length}</strong>
          </span>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex justify-between items-center">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="font-bold">&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => { setActiveTab('inquiries'); setSelectedQuotation(null); }}
          className={`py-2.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'inquiries'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Customer Inquiries Queue ({inquiries.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('quotations'); setSelectedInquiry(null); }}
          className={`py-2.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'quotations'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Issued Quotations & Negotiations ({quotations.length})</span>
        </button>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-xs gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span>Loading commercial and inquiry data...</span>
        </div>
      ) : activeTab === 'inquiries' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inquiries List (1 col) */}
          <div className="space-y-3">
            {inquiries.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
                No customer inquiries in queue.
              </div>
            ) : (
              inquiries.map((inq) => {
                const isSelected = selectedInquiry?._id === inq._id;
                return (
                  <div
                    key={inq._id}
                    onClick={() => setSelectedInquiry(inq)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer bg-white text-xs ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {inq.requestNumber}
                      </span>
                      {getStatusBadge(inq.status)}
                    </div>

                    <div className="space-y-1 text-slate-600">
                      <p className="font-semibold text-slate-800">
                        {inq.customerId?.name || 'Customer'}
                      </p>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>{inq.items?.[0]?.productId?.name || 'Fabric'}</span>
                        <span className="font-mono font-bold text-blue-700">
                          {inq.items?.[0]?.targetQuantity?.toLocaleString()} {inq.items?.[0]?.targetUnit}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>Submitted: {new Date(inq.createdAt).toLocaleDateString()}</span>
                        {inq.specificationDocuments?.length > 0 && (
                          <span className="text-blue-600 font-semibold">{inq.specificationDocuments.length} Doc(s)</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Inquiry Detail View & Feasibility Launcher (2 cols) */}
          <div className="lg:col-span-2">
            {selectedInquiry ? (
              <div className="space-y-6">
                <Card className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">{selectedInquiry.requestNumber}</h2>
                        {getStatusBadge(selectedInquiry.status)}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Customer: <strong>{selectedInquiry.customerId?.name}</strong> ({selectedInquiry.customerId?.email})
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleOpenStudioForInquiry(selectedInquiry)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-xs"
                    >
                      <Cpu className="h-4 w-4" />
                      <span>Launch Feasibility Studio & Issue Quote</span>
                    </Button>
                  </div>

                  {/* Specification Snapshot */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Target Quantity:</span>
                      <span className="text-base font-bold font-mono text-slate-800">
                        {selectedInquiry.items?.[0]?.targetQuantity?.toLocaleString()} {selectedInquiry.items?.[0]?.targetUnit}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Target Price:</span>
                      <span className="text-base font-bold font-mono text-slate-800">
                        {selectedInquiry.items?.[0]?.targetPricePerUnit ? `₹${selectedInquiry.items[0].targetPricePerUnit}` : 'Open Quote'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Target Delivery:</span>
                      <span className="text-base font-bold font-mono text-slate-800">
                        {selectedInquiry.preferredDeliveryDate ? new Date(selectedInquiry.preferredDeliveryDate).toLocaleDateString() : 'Flexible'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Shade / Color:</span>
                      <span className="text-base font-bold text-slate-800 truncate block">
                        {selectedInquiry.items?.[0]?.fabricSpecSnapshot?.colorName || 'Standard'}
                      </span>
                    </div>
                  </div>

                  {/* Attached Documents */}
                  {selectedInquiry.specificationDocuments?.length > 0 && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="font-bold text-slate-700 block mb-1">
                        Buyer Specification Documents / Tech Pack:
                      </span>
                      <div className="space-y-1">
                        {selectedInquiry.specificationDocuments.map((doc, idx) => (
                          <a
                            key={idx}
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1.5 font-medium text-[11px]"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>{doc.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customer Notes */}
                  {selectedInquiry.customerNotes && (
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs">
                      <span className="font-bold text-blue-900 block mb-0.5">Customer Inquiry Notes:</span>
                      <p className="text-slate-700 italic">"{selectedInquiry.customerNotes}"</p>
                    </div>
                  )}
                </Card>

                {/* Message Thread */}
                <MessageThread
                  threadType="ORDER_REQUEST"
                  referenceId={selectedInquiry._id}
                  title={`Inquiry Discussion Thread &bull; ${selectedInquiry.requestNumber}`}
                />
              </div>
            ) : (
              <div className="p-16 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
                Select an inquiry from the left to review technical specifications and launch the Feasibility Studio.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Quotations Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quotations List (1 col) */}
          <div className="space-y-3">
            {quotations.map((quote) => {
              const isSelected = selectedQuotation?._id === quote._id;
              return (
                <div
                  key={quote._id}
                  onClick={() => setSelectedQuotation(quote)}
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

                  <div className="space-y-1 text-slate-600">
                    <p className="font-semibold text-slate-800">
                      {quote.customerId?.name || 'Customer'}
                    </p>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Rate: ₹{quote.items?.[0]?.unitPrice}</span>
                      <span className="font-bold text-blue-700 font-mono text-xs">
                        ₹{quote.totalAmount?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Rev #{quote.currentRevisionNumber || 1}</span>
                      {quote.customerDecision?.decision === 'COUNTER_OFFER' && (
                        <span className="text-amber-600 font-bold">Counter-Offer Received!</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quotation Details & Revision Studio (2 cols) */}
          <div className="lg:col-span-2">
            {selectedQuotation ? (
              <div className="space-y-6">
                <Card className="p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">{selectedQuotation.quotationNumber}</h2>
                        {getStatusBadge(selectedQuotation.status)}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Rev #{selectedQuotation.currentRevisionNumber || 1}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Customer: <strong>{selectedQuotation.customerId?.name}</strong> &bull; Delivery: {new Date(selectedQuotation.proposedDeliveryDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedQuotation.status !== 'CONVERTED_TO_ORDER' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenStudioForRevision(selectedQuotation)}
                          className="text-xs text-blue-700 border-blue-200 hover:bg-blue-50 gap-1.5"
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>Revise Quotation</span>
                        </Button>
                      )}

                      {selectedQuotation.status === 'CUSTOMER_ACCEPTED' && (
                        <Button
                          size="sm"
                          onClick={() => handleConfirmOrderAdmin(selectedQuotation._id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Confirm Sales Order</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Customer Counter-Offer Highlight Alert */}
                  {selectedQuotation.customerDecision?.decision === 'COUNTER_OFFER' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span>Customer Counter-Offer Submitted:</span>
                      </div>
                      <p className="text-amber-800">
                        Target Price: <strong>₹{selectedQuotation.customerDecision.counterOffer?.targetPrice?.toLocaleString() || 'N/A'}</strong>
                      </p>
                      <p className="text-amber-700 italic">
                        "{selectedQuotation.customerDecision.customerNotes || selectedQuotation.customerDecision.counterOffer?.notes}"
                      </p>
                    </div>
                  )}

                  {/* Quotation Line Items & Financials */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Amount:</span>
                      <span className="text-base font-bold font-mono text-blue-700">
                        ₹{selectedQuotation.totalAmount?.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Unit Rate:</span>
                      <span className="text-base font-bold font-mono text-slate-800">
                        ₹{selectedQuotation.items?.[0]?.unitPrice} / {selectedQuotation.items?.[0]?.unit}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Production Time:</span>
                      <span className="text-base font-bold font-mono text-slate-800">
                        {selectedQuotation.productionLeadTimeDays || 14} Days
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Material Status:</span>
                      <span className="text-base font-bold text-slate-800 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Allocated
                      </span>
                    </div>
                  </div>

                  {/* Revision History */}
                  {selectedQuotation.revisions?.length > 1 && (
                    <div className="pt-2 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-slate-500" />
                        <span>Preserved Quotation Revisions</span>
                      </h4>
                      <div className="space-y-2">
                        {selectedQuotation.revisions.map((rev) => (
                          <div
                            key={rev.revisionNumber}
                            className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs flex justify-between items-center"
                          >
                            <div>
                              <span className="font-bold text-slate-800">Revision #{rev.revisionNumber}</span>
                              <span className="text-slate-500 ml-2">₹{rev.items?.[0]?.unitPrice}/m &bull; Total: ₹{rev.totalAmount?.toLocaleString()}</span>
                              <p className="text-[10px] text-slate-500 italic mt-0.5">{rev.notes}</p>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {new Date(rev.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Message Thread */}
                <MessageThread
                  threadType="QUOTATION"
                  referenceId={selectedQuotation._id}
                  title={`Negotiation Thread &bull; ${selectedQuotation.quotationNumber}`}
                />
              </div>
            ) : (
              <div className="p-16 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
                Select a quotation from the left to view negotiation status, customer counter-offers, or issue revisions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feasibility & Quotation Studio Modal */}
      {studioOpen && (
        <FeasibilityStudioModal
          orderRequest={studioTargetInquiry}
          quotationToRevise={studioTargetQuotation}
          onClose={() => setStudioOpen(false)}
          onSuccess={() => {
            setStudioOpen(false);
            setActionSuccess('Quotation processed successfully!');
            fetchData();
          }}
        />
      )}
    </div>
  );
}

