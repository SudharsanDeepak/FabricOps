import React, { useState, useEffect } from 'react';
import { Printer, Download, X, Factory, ShieldCheck, CheckCircle2, Loader2, Building, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { api } from '../../lib/api';

export function AuthorizedOrderDocumentModal({ orderId, onClose }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    api.get(`/orders/${orderId}/document`)
      .then((res) => {
        setDoc(res.data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch authorized order document');
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0D1220] text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden my-8">
        {/* Top Modal Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#090D17] print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Factory className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-200">Authorized Order Confirmation Document</h3>
              <p className="text-xs text-slate-500">Official contract document issued by FabricOps Limited</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs text-slate-300 hover:text-blue-600"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
            </Button>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-400 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Document Content Area */}
        <div className="p-8 sm:p-12 text-white print:p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 text-sm">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span>Generating Authorized Mill Certificate...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-rose-600 text-sm font-medium">
              {error}
            </div>
          ) : doc ? (
            <div className="space-y-8">
              {/* Mill Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-6 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-3 w-3 rounded-full bg-blue-600 inline-block" />
                    <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                      {doc.millDetails.companyName}
                    </h1>
                  </div>
                  <p className="text-xs font-semibold text-[#FF9FFC] tracking-wider uppercase">
                    {doc.millDetails.division}
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
                    {doc.millDetails.millAddress}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-mono mt-2">
                    <span>GSTIN: <strong>{doc.millDetails.gstin}</strong></span>
                    <span>CIN: <strong>{doc.millDetails.cin}</strong></span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="inline-block bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-sm uppercase tracking-wider mb-2">
                    Official Order Confirmation
                  </div>
                  <p className="text-sm font-mono font-bold text-slate-200">{doc.orderDetails.orderNumber}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Date: {new Date(doc.issuedDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-500">
                    Quote Ref: <strong>{doc.orderDetails.quotationNumber}</strong>
                  </p>
                </div>
              </div>

              {/* Parties Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Buyer / Consignee:</span>
                  <p className="font-bold text-white text-sm">{doc.buyerDetails.companyName}</p>
                  <p className="text-slate-400 font-mono mt-0.5">GSTIN: {doc.buyerDetails.gstin}</p>
                  <p className="text-slate-400 mt-1">{doc.buyerDetails.billingAddress.street}, {doc.buyerDetails.billingAddress.city}, {doc.buyerDetails.billingAddress.state}</p>
                  <p className="text-slate-500 mt-1">Contact: {doc.buyerDetails.contactPerson.name} &bull; {doc.buyerDetails.contactPerson.phone}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Order Execution Terms:</span>
                  <div className="space-y-1 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Confirmed Delivery:</span>
                      <span className="font-bold text-[#FF9FFC] font-mono">
                        {new Date(doc.orderDetails.confirmedDeliveryDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Terms:</span>
                      <span className="font-semibold">{doc.orderDetails.paymentTerms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Capacity & Spec Audit:</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Validated
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Specifications & Pricing Table */}
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                  Fabric Schedule & Technical Specifications
                </h4>
                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-300 border-b border-slate-800 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Fabric Description</th>
                        <th className="py-2.5 px-3">Technical Specifications</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Unit Rate</th>
                        <th className="py-2.5 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {doc.lineItems.map((item) => (
                        <tr key={item.itemNumber} className="hover:bg-slate-900/50">
                          <td className="py-3 px-3 font-mono text-slate-400">{item.itemNumber}</td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-200">{item.productName}</p>
                            <span className="text-[10px] font-mono text-slate-500">{item.productCode}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-400 space-y-0.5 text-[11px]">
                            <div><strong>GSM:</strong> {item.specifications.gsm} &bull; <strong>Weave:</strong> {item.specifications.weaveType}</div>
                            <div><strong>Composition:</strong> {item.specifications.composition}</div>
                            <div><strong>Width:</strong> {item.specifications.widthInches}" &bull; <strong>Color:</strong> {item.specifications.colorName}</div>
                            {item.specifications.construction && <div><strong>Construction:</strong> {item.specifications.construction}</div>}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">
                            {item.quantity.toLocaleString()} {item.unit}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-300">
                            ₹{item.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-white">
                            ₹{item.lineTotal.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="flex justify-end">
                <div className="w-full sm:w-72 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>Taxable Subtotal:</span>
                    <span className="font-mono font-semibold">₹{doc.financials.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST ({doc.financials.taxPercent}%):</span>
                    <span className="font-mono font-semibold">₹{doc.financials.taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm text-white">
                    <span>Total Amount (INR):</span>
                    <span className="font-mono text-[#FF9FFC]">₹{doc.financials.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Terms and Standard Conditions */}
              <div className="border-t border-slate-800 pt-4 text-[11px] text-slate-500 space-y-1">
                <span className="font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Quality Standards & Dispatch Policy:
                </span>
                {doc.commercialTerms.map((term, idx) => (
                  <p key={idx}>&bull; {term}</p>
                ))}
              </div>

              {/* Authorized Signatory & Mill Seal */}
              <div className="border-t border-slate-800 pt-6 flex justify-between items-end text-xs">
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold mb-1">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Cryptographically Authenticated Record</span>
                  </div>
                  <p className="font-mono text-[10px] text-slate-400 break-all max-w-sm">
                    {doc.millAuthorizedSignatory.digitalSignatureHash}
                  </p>
                </div>

                <div className="text-right">
                  <div className="h-12 border-b border-dashed border-slate-400 mb-2 w-48 inline-block" />
                  <p className="font-bold text-slate-200">{doc.millAuthorizedSignatory.name}</p>
                  <p className="text-[11px] text-slate-500">{doc.millAuthorizedSignatory.designation}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">FabricOps Limited</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

