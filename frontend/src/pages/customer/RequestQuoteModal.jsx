import React, { useState } from 'react';
import { X, Send, Paperclip, FileText, Loader2, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { api } from '../../lib/api';

export function RequestQuoteModal({ product, onClose, onSuccess }) {
  const [targetQuantity, setTargetQuantity] = useState(product?.pricing?.minimumOrderQuantity || 1000);
  const [targetUnit, setTargetUnit] = useState(product?.measurementUnit || 'METER');
  const [colorName, setColorName] = useState(product?.colours?.[0]?.name || 'Optic White');
  const [targetPrice, setTargetPrice] = useState(product?.pricing?.basePricePerUnit || 140);
  const [preferredDeliveryDate, setPreferredDeliveryDate] = useState(
    new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0]
  );
  const [customerNotes, setCustomerNotes] = useState('');
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const documents = [];
      if (docName) {
        documents.push({
          name: docName,
          fileUrl: docUrl || 'https://fabricops.s3.amazonaws.com/uploads/customer-spec.pdf',
          fileType: 'application/pdf',
          fileSize: 102400,
        });
      }

      await api.post('/order-requests', {
        items: [
          {
            productId: product._id,
            targetQuantity: Number(targetQuantity),
            targetUnit,
            targetPricePerUnit: targetPrice ? Number(targetPrice) : undefined,
            notes: `Color selected: ${colorName}`,
            fabricSpecSnapshot: {
              ...product.fabricSpecification,
              colorName,
            },
          },
        ],
        specificationDocuments: documents,
        preferredDeliveryDate,
        customerNotes,
      });

      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to submit quote inquiry');
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
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Request Custom Fabric Quotation</h3>
            <p className="text-xs text-slate-500">
              Submit custom quantity, colour, and delivery target for {product.name}
            </p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
              {error}
            </div>
          )}

          {/* Product Specs Header Card */}
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-800">{product.name}</p>
              <p className="text-[11px] text-slate-500">
                {product.fabricSpecification?.gsm} GSM &bull; {product.fabricSpecification?.weaveType} &bull; Width: {product.fabricSpecification?.widthInches}"
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">MOQ:</span>
              <span className="font-bold text-blue-700 font-mono">
                {product.pricing?.minimumOrderQuantity || 500} {product.measurementUnit}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Target Quantity ({targetUnit}) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Measurement Unit
              </label>
              <select
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="METER">Meter</option>
                <option value="KILOGRAM">Kilogram</option>
                <option value="YARD">Yard</option>
                <option value="ROLL">Roll</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Preferred Colour / Shade *
              </label>
              <select
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                {product.colours?.map((c, idx) => (
                  <option key={idx} value={c.name}>
                    {c.name} {c.pantoneCode ? `(${c.pantoneCode})` : ''}
                  </option>
                ))}
                <option value="Custom Pantone Spec">Custom Lab Dip Spec</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Preferred Delivery Date *
              </label>
              <input
                type="date"
                required
                value={preferredDeliveryDate}
                onChange={(e) => setPreferredDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Target Price per {targetUnit} (Optional — in INR)
            </label>
            <input
              type="number"
              step="0.5"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="e.g. 135"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Specification Document Attachment */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-blue-600" />
              Upload Specification Documents / Tech Pack
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Document Title (e.g. Garment_Buyer_TechPack.pdf)"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Document URL / Cloud Reference"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Attach technical drawings, shrinkage tolerances, yarn blend limits, or testing standards.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Special Weaving / Finishing Notes
            </label>
            <textarea
              rows="2"
              placeholder="e.g. High colorfastness required for outdoor apparel, lab dips needed before bulk weaving."
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 px-4"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>Submit Inquiry for Mill Evaluation</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

