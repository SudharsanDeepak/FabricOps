import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Compass,
  CornerDownRight,
  CreditCard,
  Download,
  Factory,
  FileText,
  Filter,
  History,
  Layers,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Paperclip,
  Phone,
  Printer,
  Radio,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
  X,
  XCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import AeroShards from '../components/ui/AeroShards';
import { AuthorizedOrderDocumentModal } from '../components/common/AuthorizedOrderDocumentModal';
import { MessageThread } from '../components/common/MessageThread';
import { AiQualityConsole } from '../components/common/AiQualityConsole';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';


// ==========================================
// 1. REQUEST QUOTE MODAL
// ==========================================
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0D1220] text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#090D17]">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Request Custom Fabric Quotation</h3>
            <p className="text-xs text-slate-500">
              Submit custom quantity, colour, and delivery target for {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
              {error}
            </div>
          )}

          {/* Product Specs Header Card */}
          <div className="p-3 bg-[#5227FF]/15 rounded-xl border border-[#5227FF]/30 flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-200">{product.name}</p>
              <p className="text-[11px] text-slate-500">
                {product.fabricSpecification?.gsm} GSM &bull; {product.fabricSpecification?.weaveType} &bull; Width: {product.fabricSpecification?.widthInches}"
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">MOQ:</span>
              <span className="font-bold text-[#FF9FFC] font-mono">
                {product.pricing?.minimumOrderQuantity || 500} {product.measurementUnit}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Target Quantity ({targetUnit}) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Measurement Unit
              </label>
              <select
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:border-blue-500 focus:outline-none"
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
              <label className="block font-bold text-slate-300 mb-1">
                Preferred Colour / Shade *
              </label>
              <select
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:border-blue-500 focus:outline-none"
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
              <label className="block font-bold text-slate-300 mb-1">
                Preferred Delivery Date *
              </label>
              <input
                type="date"
                required
                value={preferredDeliveryDate}
                onChange={(e) => setPreferredDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">
              Target Price per {targetUnit} (Optional — in INR)
            </label>
            <input
              type="number"
              step="0.5"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="e.g. 135"
              className="w-full px-3 py-2 border border-slate-700 rounded-lg font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Specification Document Attachment */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-blue-600" />
              Upload Specification Documents / Tech Pack
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Document Title (e.g. Garment_Buyer_TechPack.pdf)"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-700 rounded-lg bg-slate-900 text-slate-100 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Document URL / Cloud Reference"
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-700 rounded-lg bg-slate-900 text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Attach technical drawings, shrinkage tolerances, yarn blend limits, or testing standards.
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">
              Special Weaving / Finishing Notes
            </label>
            <textarea
              rows="2"
              placeholder="e.g. High colorfastness required for outdoor apparel, lab dips needed before bulk weaving."
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
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

// ==========================================
// 2. FABRIC CATALOG PAGE
// ==========================================
export function FabricCatalogPage({ onNavigateSection }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [catalogFlow, setCatalogFlow] = useState('ribbon');
  const [selectedProductForQuote, setSelectedProductForQuote] = useState(null);
  const [inquirySuccessBanner, setInquirySuccessBanner] = useState(false);

  const fetchCatalog = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (search) query.set('search', search);
    if (categoryFilter !== 'ALL') query.set('category', categoryFilter);

    api.get(`/products?${query.toString()}`)
      .then((res) => {
        setProducts(res.data || []);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCatalog();
  }, [categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCatalog();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Dynamic WebGPU Textile Filament Banner */}
      <div className="relative rounded-2xl bg-slate-950 border border-slate-800/80 p-6 text-white shadow-xl overflow-hidden group">
        <div className="absolute inset-0 z-0 opacity-75 pointer-events-none">
          <AeroShards
            backgroundColor="#080e1e"
            shardColor="#13233e"
            accentColor="#06b6d4"
            placement="full"
            flow={catalogFlow}
            material="satin"
            detail="balanced"
            effect="none"
            scale={1.05}
            spread={0.9}
            depth={1.15}
            speed={0.7}
            spin={0.65}
            interaction="repel"
            density={1.05}
            shardSize={1.0}
            stretch={1.1}
            turbulence={0.3}
            glow={1.1}
            edgeSoftness={2}
            bloom={0.95}
            grain={0.03}
            chromaticAberration={0.005}
            transitionDuration={1.1}
            interactionRadius={1.4}
            interactionStrength={0.5}
            rippleIntensity={1.0}
            holdToGather
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-transparent pointer-events-none z-[1]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-900/80 border border-blue-400/40 px-2.5 py-0.5 text-xs text-blue-200 font-medium mb-2">
              <Package className="h-3.5 w-3.5" /> Published Fabric Catalog &bull; CAD Simulation
            </span>
            <h1 className="text-2xl font-bold tracking-tight">
              FabricOps Range & Specifications
            </h1>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              Explore our mill-woven combed poplin, organic chinos, and ring-spun denim lines. View real-time Available-to-Promise (ATP) stock, MOQ, shade cards, and indicative delivery lead times.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
            {/* Quick Flow Picker */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-lg backdrop-blur text-xs">
              {(['ribbon', 'stream', 'vortex']).map((flow) => (
                <button
                  key={flow}
                  type="button"
                  onClick={() => setCatalogFlow(flow)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
                    catalogFlow === flow
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {flow}
                </button>
              ))}
            </div>

            <Button
              onClick={() => onNavigateSection('my-quotes')}
              variant="outline"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs shrink-0"
            >
              Track My Inquiries &rarr;
            </Button>
          </div>
        </div>
      </div>

      {inquirySuccessBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              Your custom quotation inquiry was submitted successfully! Our mill engineering team is reviewing yarn availability and loom capacity.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateSection('my-quotes')}
            className="text-xs text-emerald-700 border-emerald-300"
          >
            View Inquiry Status
          </Button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#0D1220] p-3.5 rounded-xl border border-slate-800">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by fabric name, product code (e.g. POP-40S), weave type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="text-xs">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'FINISHED_FABRIC', 'RAW_YARN'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                categoryFilter === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All Fabrics' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-xs gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span>Loading published catalog and checking ATP yarn availability...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center bg-[#0D1220] rounded-xl border border-slate-800 text-xs text-slate-400">
          No published fabrics found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const spec = product.fabricSpecification || {};
            const atp = product.atp || {};

            return (
              <Card key={product._id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader className="p-5 pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-300">
                      {product.productCode}
                    </span>
                    <Badge
                      variant={
                        atp.stockStatus === 'IN_STOCK'
                          ? 'success'
                          : atp.stockStatus === 'PRODUCIBLE'
                          ? 'outline'
                          : 'warning'
                      }
                      className="text-[10px]"
                    >
                      {atp.stockStatus === 'IN_STOCK' && `In Warehouse: ${atp.atpStock}m`}
                      {atp.stockStatus === 'PRODUCIBLE' && `Producible: ~${atp.indicativeLeadTimeDays}d`}
                      {atp.stockStatus === 'BACKORDER_REQUIRED' && `Backorder: ~${atp.indicativeLeadTimeDays}d`}
                    </Badge>
                  </div>

                  <CardTitle className="text-base font-bold text-white mt-2">
                    {product.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {product.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4">
                  {/* Technical Specifications Matrix */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">GSM / Weight:</span>
                      <span className="font-bold text-slate-200">{spec.gsm || 'N/A'} GSM</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Weave Type:</span>
                      <span className="font-bold text-slate-200">{spec.weaveType || 'PLAIN'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Composition:</span>
                      <span className="font-bold text-slate-200 truncate block">{spec.composition || '100% Cotton'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Width:</span>
                      <span className="font-bold text-slate-200">{spec.widthInches || 58} Inches</span>
                    </div>
                    {spec.yarnCountWarp && (
                      <div className="col-span-2 pt-1 border-t border-slate-800/60 flex justify-between text-[11px] text-slate-400">
                        <span>Warp/Weft Count:</span>
                        <span className="font-mono">{spec.yarnCountWarp} x {spec.yarnCountWeft}</span>
                      </div>
                    )}
                  </div>

                  {/* Colours Swatches */}
                  {product.colours?.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                        Standard Shades & Lab Dips:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {product.colours.map((col, idx) => (
                          <div
                            key={idx}
                            title={`${col.name} (${col.pantoneCode || ''})`}
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-800 bg-[#0D1220] text-[10px] font-medium text-slate-300 shadow-2xs"
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-slate-700"
                              style={{ backgroundColor: col.hexCode || '#ccc' }}
                            />
                            <span>{col.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pricing and MOQ Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Indicative Rate:</span>
                      <span className="text-base font-bold font-mono text-white">
                        ₹{product.pricing?.basePricePerUnit} <span className="text-xs font-normal text-slate-500">/ {product.measurementUnit}</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">MOQ:</span>
                      <span className="font-bold text-slate-300 font-mono">
                        {product.pricing?.minimumOrderQuantity || 500} {product.measurementUnit}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setSelectedProductForQuote(product)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-xs"
                  >
                    <span>Request Custom Quotation</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Request Modal */}
      {selectedProductForQuote && (
        <RequestQuoteModal
          product={selectedProductForQuote}
          onClose={() => setSelectedProductForQuote(null)}
          onSuccess={() => {
            setSelectedProductForQuote(null);
            setInquirySuccessBanner(true);
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// 3. CUSTOMER QUOTES & INQUIRIES PAGE
// ==========================================
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
      setStatusMessage({ type: 'success', text: 'Counter-offer submitted to FabricOps sales team!' });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D1220] p-6 rounded-xl border border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-white">My Quotations & Inquiries</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review FabricOps offers, negotiate pricing and timelines, review revision history, and confirm final orders.
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
              : 'bg-[#5227FF]/15 text-blue-800 border border-[#5227FF]/40'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="font-bold">&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => { setActiveTab('quotes'); setSelectedInquiry(null); }}
          className={`py-2.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'quotes'
              ? 'border-blue-600 text-[#FF9FFC]'
              : 'border-transparent text-slate-500 hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Active Quotations ({quotations.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('inquiries'); setSelectedQuote(null); }}
          className={`py-2.5 px-4 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'inquiries'
              ? 'border-blue-600 text-[#FF9FFC]'
              : 'border-transparent text-slate-500 hover:text-slate-200'
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
              <div className="p-8 text-center bg-[#0D1220] rounded-xl border border-slate-800 text-xs text-slate-400">
                No quotations issued yet.
              </div>
            ) : (
              quotations.map((quote) => {
                const isSelected = selectedQuote?._id === quote._id;
                return (
                  <div
                    key={quote._id}
                    onClick={() => setSelectedQuote(quote)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer bg-[#0D1220] text-xs ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono font-bold text-white text-sm">
                        {quote.quotationNumber}
                      </span>
                      {getStatusBadge(quote.status)}
                    </div>

                    <div className="space-y-1 text-slate-400 mb-3">
                      <p className="font-semibold text-slate-200">
                        {quote.items?.[0]?.productId?.name || 'Custom Woven Fabric'}
                      </p>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Quantity: {quote.items?.[0]?.quantity?.toLocaleString()} {quote.items?.[0]?.unit}</span>
                        <span className="font-bold text-[#FF9FFC] font-mono text-xs">
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
                <div className="bg-[#0D1220] rounded-xl border border-slate-800 p-6 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white">{selectedQuote.quotationNumber}</h2>
                        {getStatusBadge(selectedQuote.status)}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
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
                            className="text-xs gap-1 text-[#FF9FFC] border-[#5227FF]/40 hover:bg-[#5227FF]/15"
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
                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Amount:</span>
                      <span className="text-base font-bold font-mono text-[#FF9FFC]">
                        ₹{selectedQuote.totalAmount?.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Unit Rate:</span>
                      <span className="text-base font-bold font-mono text-slate-200">
                        ₹{selectedQuote.items?.[0]?.unitPrice} / {selectedQuote.items?.[0]?.unit}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Delivery Target:</span>
                      <span className="text-base font-bold font-mono text-slate-200">
                        {new Date(selectedQuote.proposedDeliveryDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Production Time:</span>
                      <span className="text-base font-bold font-mono text-slate-200">
                        {selectedQuote.productionLeadTimeDays || 14} Days
                      </span>
                    </div>
                  </div>

                  {/* Transparent Assumptions & Identified Risks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-[#5227FF]/15 rounded-xl border border-[#5227FF]/30 space-y-1">
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
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <History className="h-3.5 w-3.5 text-slate-500" />
                        <span>Preserved Quotation Revision History</span>
                      </h4>
                      <div className="space-y-2">
                        {selectedQuote.revisions.map((rev) => (
                          <div
                            key={rev.revisionNumber}
                            className={`p-3 rounded-lg border text-xs flex justify-between items-center ${
                              rev.revisionNumber === selectedQuote.currentRevisionNumber
                                ? 'bg-[#5227FF]/15/40 border-[#5227FF]/40'
                                : 'bg-slate-900/60 border-slate-800 opacity-80'
                            }`}
                          >
                            <div>
                              <span className="font-bold text-slate-200">
                                Revision #{rev.revisionNumber}
                              </span>
                              <span className="text-[11px] text-slate-500 ml-2">
                                Rate: ₹{rev.items?.[0]?.unitPrice} &bull; Delivery: {new Date(rev.proposedDeliveryDate).toLocaleDateString()}
                              </span>
                              <p className="text-[10px] text-slate-500 italic mt-0.5">
                                Notes: {rev.notes || 'Official offer update'}
                              </p>
                            </div>
                            <span className="font-mono font-bold text-slate-300">
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
              <div className="p-16 text-center bg-[#0D1220] rounded-xl border border-slate-800 text-xs text-slate-400">
                Select a quotation from the left to view technical details, negotiate, or accept.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Inquiries Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inquiries.length === 0 ? (
            <div className="col-span-2 p-12 text-center bg-[#0D1220] rounded-xl border border-slate-800 text-xs text-slate-400">
              No inquiries submitted yet.
            </div>
          ) : (
            inquiries.map((inq) => (
              <Card key={inq._id} className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono font-bold text-white text-sm">{inq.requestNumber}</span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Submitted: {new Date(inq.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(inq.status)}
                </div>

                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-100 text-xs space-y-1">
                  <p className="font-bold text-slate-200">{inq.items?.[0]?.productId?.name}</p>
                  <div className="flex justify-between text-slate-400">
                    <span>Target Quantity: {inq.items?.[0]?.targetQuantity?.toLocaleString()} {inq.items?.[0]?.targetUnit}</span>
                    <span>Target Date: {inq.preferredDeliveryDate ? new Date(inq.preferredDeliveryDate).toLocaleDateString() : 'Flexible'}</span>
                  </div>
                  {inq.customerNotes && (
                    <p className="text-slate-500 italic text-[11px] pt-1 border-t border-slate-800">
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
                    className="w-full text-xs text-[#FF9FFC] border-[#5227FF]/40 hover:bg-[#5227FF]/15"
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
          <div className="w-full max-w-md bg-[#0D1220] rounded-2xl p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-200">Submit Revision / Counter-Offer</h3>
              <button onClick={() => setShowCounterModal(false)} className="text-slate-400 hover:text-slate-400">&times;</button>
            </div>

            <form onSubmit={handleSubmitCounterOffer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Target Price (₹ per unit or total)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 136"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Requested Target Delivery Date
                </label>
                <input
                  type="date"
                  value={counterDate}
                  onChange={(e) => setCounterDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Negotiation Notes & Rationale *
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="e.g. We have budget constraints of ₹136/m; can commit to quarterly repeat volumes."
                  value={counterNotes}
                  onChange={(e) => setCounterNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:border-blue-500 focus:outline-none"
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

// ==========================================
// 4. CUSTOMER ORDERS & PRODUCTION TRACKER
// ==========================================
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
        return 'bg-slate-100 text-slate-400 border-slate-800';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D1220] p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">End-to-End Production Transparency</h1>
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
        <div className="p-16 text-center bg-[#0D1220] rounded-2xl border border-slate-800 text-xs text-slate-400">
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
                  className={`p-4 rounded-xl border transition-all cursor-pointer bg-[#0D1220] text-xs ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-100 shadow-md'
                      : 'border-slate-800 hover:border-slate-700 hover:shadow-xs'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono font-bold text-white text-sm">
                      {order.orderNumber}
                    </span>
                    <Badge variant={order.status === 'COMPLETED' ? 'success' : 'default'} className="text-[10px]">
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-slate-400">
                    <p className="font-semibold text-slate-200">
                      {order.items?.[0]?.productId?.name || 'Custom Woven Fabric'}
                    </p>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{order.items?.[0]?.quantity?.toLocaleString()} {order.items?.[0]?.unit}</span>
                      <span className="font-bold text-[#FF9FFC] font-mono text-xs">
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
                <Card className="p-6 space-y-6 border-slate-800 shadow-sm bg-[#0D1220]">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-white">{selectedOrder.orderNumber}</h2>
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
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span className="font-semibold uppercase tracking-wider text-[10px]">Committed Contract Date</span>
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <div className="text-lg font-bold font-mono text-white">
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
                    <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                          Verified Mill Production Progress
                        </span>
                        <span className="font-mono font-bold text-[#FF9FFC] text-sm">
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
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
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
                                  ? 'bg-[#5227FF]/15/40 border-blue-300 ring-1 ring-blue-200 shadow-xs'
                                  : isDelayed
                                  ? 'bg-rose-50/30 border-rose-200'
                                  : isDone
                                  ? 'bg-slate-900/60/60 border-slate-800'
                                  : 'bg-slate-900 border-slate-800 opacity-60'
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
                                        : 'bg-slate-200 text-slate-400'
                                    }`}
                                  >
                                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                                  </div>
                                  <span className="font-bold text-white text-sm">
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
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400 mt-2 bg-[#0D1220]/80 p-2.5 rounded-lg border border-slate-100 font-mono">
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-sans">Quantities:</span>
                                  <span className="font-semibold text-slate-200">
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
                                  <span className="font-sans font-medium text-slate-300">
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
                          <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                            ASTM D5430 4-Point System Quality Verification
                          </h4>
                        </div>
                        <Badge className="bg-emerald-600 text-white font-mono text-xs">
                          {timelineData.qualitySummary.grade || 'GRADE_A'} PASS
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                        <div className="bg-[#0D1220] p-2.5 rounded-lg border border-emerald-100">
                          <span className="text-slate-400 block text-[10px] font-sans">Defect Score:</span>
                          <span className="font-bold text-white">
                            {timelineData.qualitySummary.pointsPer100SqMeters || 12} pts / 100m²
                          </span>
                        </div>
                        <div className="bg-[#0D1220] p-2.5 rounded-lg border border-emerald-100">
                          <span className="text-slate-400 block text-[10px] font-sans">Inspected Quantity:</span>
                          <span className="font-bold text-white">
                            {timelineData.qualitySummary.totalInspectedMeters?.toLocaleString() || selectedOrder.items?.[0]?.quantity?.toLocaleString()} M
                          </span>
                        </div>
                        <div className="bg-[#0D1220] p-2.5 rounded-lg border border-emerald-100">
                          <span className="text-slate-400 block text-[10px] font-sans">Defects Logged:</span>
                          <span className="font-bold text-white">
                            {timelineData.qualitySummary.totalDefectsFound || 0} defects
                          </span>
                        </div>
                        <div className="bg-[#0D1220] p-2.5 rounded-lg border border-emerald-100">
                          <span className="text-slate-400 block text-[10px] font-sans">Export Clearance:</span>
                          <span className="font-bold text-emerald-700">APPROVED</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Carrier Dispatch & Waybill Tracking Card */}
                  {timelineData?.dispatchDetails && (
                    <div className="bg-[#5227FF]/15 rounded-xl border border-[#5227FF]/40 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="h-5 w-5 text-blue-600" />
                          <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                            Logistics & Dispatch Consignment Tracking
                          </h4>
                        </div>
                        <Badge className="bg-blue-600 text-white font-mono text-xs">
                          DISPATCHED
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                        <div className="bg-[#0D1220] p-2.5 rounded-lg border border-[#5227FF]/30">
                          <span className="text-slate-400 block text-[10px] font-sans">Carrier Name:</span>
                          <span className="font-bold text-white">
                            {timelineData.dispatchDetails.carrierName || 'VRL Logistics Ltd'}
                          </span>
                        </div>
                        <div className="bg-[#0D1220] p-2.5 rounded-lg border border-[#5227FF]/30">
                          <span className="text-slate-400 block text-[10px] font-sans">Waybill / LR No:</span>
                          <span className="font-bold text-[#FF9FFC]">
                            {timelineData.dispatchDetails.trackingNumber || 'VRL-772910-DEL'}
                          </span>
                        </div>
                        <div className="bg-[#0D1220] p-2.5 rounded-lg border border-[#5227FF]/30">
                          <span className="text-slate-400 block text-[10px] font-sans">Vehicle Reg:</span>
                          <span className="font-bold text-white">
                            {timelineData.dispatchDetails.vehicleNumber || 'TN-38-BZ-4412'}
                          </span>
                        </div>
                        <div className="bg-[#0D1220] p-2.5 rounded-lg border border-[#5227FF]/30">
                          <span className="text-slate-400 block text-[10px] font-sans">Destination Hub:</span>
                          <span className="font-bold text-white">
                            {timelineData.dispatchDetails.destinationCity || 'Tirupur Hub'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. Line Items Table */}
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                      Technical Specifications & Commercial Schedule
                    </h4>
                    <div className="overflow-x-auto border border-slate-800 rounded-lg text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold">
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
                              <td className="p-3 font-semibold text-slate-200">
                                {item.productId?.name || 'Custom Fabric'}
                              </td>
                              <td className="p-3 text-slate-400 text-[11px]">
                                {item.fabricSpecSnapshot?.gsm} GSM &bull; {item.fabricSpecSnapshot?.weaveType} &bull; {item.fabricSpecSnapshot?.colorName}
                              </td>
                              <td className="p-3 text-right font-mono font-bold">
                                {item.quantity?.toLocaleString()} {item.unit}
                              </td>
                              <td className="p-3 text-right font-mono">
                                ₹{item.unitPrice}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-[#FF9FFC]">
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
                      <div className="flex justify-between font-bold text-white border-t border-slate-800 pt-1 text-sm">
                        <span>Total:</span>
                        <span className="font-mono text-[#FF9FFC]">₹{selectedOrder.totalAmount?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* 7. Buyer Production Telemetry & Inspection QC Console */}
                <Card className="border border-slate-800/80 bg-[#0D1220]/90 text-white rounded-xl shadow-xl overflow-hidden backdrop-blur-md">
                  <div className="p-4 border-b border-slate-800/80 bg-gradient-to-r from-[#5227FF]/15 via-transparent to-transparent flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-[#5227FF]/20 border border-[#5227FF]/40 text-[#FF9FFC]">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold font-rajdhani uppercase tracking-wider text-white">
                            Mill Production Telemetry &amp; Quality Certificates
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/40 border border-emerald-800/50 text-emerald-300">
                            100% AUDITED
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Real-time airjet loom status, ASTM 4-point inspected rolls, and dispatch verification
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setDocumentOrderId(selectedOrder._id)}
                      className="bg-gradient-to-r from-[#5227FF] via-[#7B42FF] to-[#FF9FFC] hover:opacity-90 text-white font-rajdhani font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 shadow-md"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>View Official Order &amp; Inspection Document</span>
                    </Button>
                  </div>

                  <div className="p-5 space-y-6">
                    {/* Live Loom Telemetry */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                          <Radio className="h-3.5 w-3.5 text-[#FF9FFC] animate-pulse" />
                          Live Machine Station Telemetry
                        </span>
                        <span className="text-[11px] font-mono text-[#FF9FFC]">
                          Airjet Loom #AJ-04 &bull; Shed B
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-[#090D18] border border-slate-800/90 rounded-lg">
                          <span className="text-[10px] uppercase font-rajdhani font-bold text-slate-400">Speed (Weave Rate)</span>
                          <p className="text-lg font-bold font-mono text-white mt-0.5">865 PPM</p>
                          <span className="text-[10px] text-emerald-400 font-semibold font-mono">Airjet High-Speed</span>
                        </div>
                        <div className="p-3 bg-[#090D18] border border-slate-800/90 rounded-lg">
                          <span className="text-[10px] uppercase font-rajdhani font-bold text-slate-400">Weave Efficiency</span>
                          <p className="text-lg font-bold font-mono text-[#FF9FFC] mt-0.5">97.2%</p>
                          <span className="text-[10px] text-emerald-400 font-semibold font-mono">Top Quartile</span>
                        </div>
                        <div className="p-3 bg-[#090D18] border border-slate-800/90 rounded-lg">
                          <span className="text-[10px] uppercase font-rajdhani font-bold text-slate-400">Warp Tension</span>
                          <p className="text-lg font-bold font-mono text-white mt-0.5">320 cN</p>
                          <span className="text-[10px] text-slate-400 font-mono">Uniform Weave</span>
                        </div>
                        <div className="p-3 bg-[#090D18] border border-slate-800/90 rounded-lg">
                          <span className="text-[10px] uppercase font-rajdhani font-bold text-slate-400">Yarn Lot Batch</span>
                          <p className="text-sm font-bold font-mono text-white mt-1 truncate">YC-2026-904</p>
                          <span className="text-[10px] text-slate-400 font-mono">100% Combed Cotton</span>
                        </div>
                      </div>
                    </div>

                    {/* Inspected Rolls Table */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                          Inspected Fabric Rolls &bull; ASTM 4-Point Standard
                        </span>
                        <span className="text-[11px] font-mono font-bold text-emerald-400">
                          Optical Scanner Verified
                        </span>
                      </div>
                      <div className="border border-slate-800/80 rounded-lg overflow-hidden bg-[#090D18]">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#0B0F1C] border-b border-slate-800 text-slate-400 font-rajdhani font-bold uppercase text-[10px]">
                            <tr>
                              <th className="p-2.5">Roll Identification</th>
                              <th className="p-2.5 text-right">Length (m)</th>
                              <th className="p-2.5 text-right">Weight (kg)</th>
                              <th className="p-2.5 text-center">Defect Pts / 100m²</th>
                              <th className="p-2.5 text-center">Quality Grade</th>
                              <th className="p-2.5 text-center">Birth Certificate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono">
                            {[
                              { id: 'ROLL-9041-A', length: 104.5, weight: 26.2, pts: '0.8 pts', grade: 'Grade A Export', pass: true },
                              { id: 'ROLL-9042-A', length: 102.0, weight: 25.8, pts: '1.2 pts', grade: 'Grade A Export', pass: true },
                              { id: 'ROLL-9043-A', length: 98.5, weight: 24.9, pts: '0.4 pts', grade: 'Grade A (Flawless)', pass: true },
                              { id: 'ROLL-9044-A', length: 105.0, weight: 26.5, pts: '1.5 pts', grade: 'Grade A Export', pass: true }
                            ].map((r) => (
                              <tr key={r.id} className="hover:bg-slate-800/30">
                                <td className="p-2.5 font-bold text-white flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  {r.id}
                                </td>
                                <td className="p-2.5 text-right text-slate-200">{r.length.toFixed(1)} m</td>
                                <td className="p-2.5 text-right text-slate-200">{r.weight.toFixed(1)} kg</td>
                                <td className="p-2.5 text-center text-slate-300 font-semibold">{r.pts}</td>
                                <td className="p-2.5 text-center">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                                    {r.grade}
                                  </span>
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    onClick={() => setDocumentOrderId(selectedOrder._id)}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#5227FF]/20 text-[#FF9FFC] hover:bg-[#5227FF] hover:text-white border border-[#5227FF]/40 transition-colors"
                                  >
                                    QR PASSED ✓
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Buyer Quality & Compliance Certificate (AI-Powered) */}
                    <div>
                      <AiQualityConsole
                        persona="BUYER"
                        orderNumber={selectedOrder.orderNumber}
                        rollId="ROL-9041-A"
                        customerName={selectedOrder.customerId?.name || 'Valued Buyer Partner'}
                        loomId="LOOM-AJ-04"
                        initialData={{
                          fabric_type: 'Cotton',
                          colour: 'White',
                          yarn_batch_age_days: 10,
                          production_length_m: 1200,
                          downtime_min: 15,
                          production_duration_min: 130
                        }}
                      />
                    </div>

                    {/* Freight Manifest & Gate Pass */}
                    <div className="p-3.5 bg-[#090D18] border border-slate-800/80 rounded-lg flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/80 text-white">
                          <Truck className="h-5 w-5 text-[#FF9FFC]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold font-rajdhani uppercase text-white">
                            Dispatch Bay 03 &bull; Freight Manifest Verified
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Carrier: Blue Dart Express &bull; Truck Plate: MH-04-EB-8821 &bull; Container Seal: #TS-88912
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 font-mono font-bold">
                          E-Way Bill Active
                        </span>
                        <Button
                          size="sm"
                          onClick={() => setDocumentOrderId(selectedOrder._id)}
                          className="bg-[#5227FF] hover:bg-[#683DFF] text-white font-rajdhani font-bold uppercase tracking-wider text-xs"
                        >
                          View Gate Pass
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
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

// ==========================================
// 5. UNIFIED CUSTOMER PORTAL WRAPPER
// ==========================================

// ==========================================
// 5. CUSTOMER INVOICES & GST RECEIPTS PAGE
// ==========================================
export function CustomerInvoicesPage({ onNavigateSection }) {
  const [invoices, setInvoices] = useState([
    {
      id: 'INV-2026-081',
      orderNumber: 'ORD-2026-0018',
      date: '2026-10-04',
      dueDate: '2026-11-03',
      fabric: '40s Combed Poplin (5,000m)',
      subtotal: 750000,
      tax: 37500,
      total: 787500,
      status: 'PAID',
      paymentMode: 'RTGS / HDFC-8821',
      irnNumber: '4a9b...77f1'
    },
    {
      id: 'INV-2026-082',
      orderNumber: 'ORD-2026-0019',
      date: '2026-10-09',
      dueDate: '2026-11-08',
      fabric: 'Indigo Denim Warp 10s (2,500m)',
      subtotal: 425000,
      tax: 21250,
      total: 446250,
      status: 'DUE',
      paymentMode: 'Net 30 Days',
      irnNumber: '9c2d...33e4'
    },
    {
      id: 'INV-2026-079',
      orderNumber: 'ORD-2026-0015',
      date: '2026-09-22',
      dueDate: '2026-10-22',
      fabric: 'French Linen Slub (1,200m)',
      subtotal: 312000,
      tax: 15600,
      total: 327600,
      status: 'PAID',
      paymentMode: 'NEFT / ICICI-0192',
      irnNumber: '1e5a...88bc'
    }
  ]);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const filteredInvoices = invoices.filter(inv => {
    if (filter !== 'ALL' && inv.status !== filter) return false;
    if (search && !inv.id.toLowerCase().includes(search.toLowerCase()) && !inv.orderNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDownloadInvoice = (invId) => {
    setDownloadingId(invId);
    setTimeout(() => {
      setDownloadingId(null);
      alert(`Tax Invoice ${invId} has been generated and validated with IRN QR. Prepared for B2B export accounting.`);
    }, 900);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-opensans text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-rajdhani font-bold uppercase tracking-wider text-[#FF9FFC] bg-[#5227FF]/20 px-2.5 py-0.5 rounded border border-[#5227FF]/40">
              GST Tax Ledger
            </span>
            <span className="text-xs font-mono text-slate-400">Buyer: Apex Garments</span>
          </div>
          <h1 className="text-3xl font-bold font-rajdhani text-white mt-1">
            Invoices, Receipts &amp; GST Documents
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Download government e-Invoices with QR codes, monitor credit periods, and verify payment settlements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => onNavigateSection?.('my-orders')}
            className="text-xs border-slate-700 bg-slate-800/80 hover:bg-[#5227FF] text-white flex items-center gap-1.5"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>View Active Orders</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border border-slate-800/80 bg-[#0D1220]/80">
          <span className="text-[10px] uppercase font-rajdhani font-bold text-slate-400 tracking-wider">Total Invoiced (FY 2026)</span>
          <p className="text-3xl font-bold font-mono text-white mt-1">₹15,61,350</p>
          <span className="text-[11px] text-slate-400">3 Commercial Runs</span>
        </Card>
        <Card className="p-5 border border-slate-800/80 bg-[#0D1220]/80">
          <span className="text-[10px] uppercase font-rajdhani font-bold text-slate-400 tracking-wider">Cleared &amp; Settled</span>
          <p className="text-3xl font-bold font-mono text-emerald-400 mt-1">₹11,15,100</p>
          <span className="text-[11px] text-emerald-400 font-semibold font-mono">100% Tax Compliant</span>
        </Card>
        <Card className="p-5 border border-slate-800/80 bg-[#0D1220]/80">
          <span className="text-[10px] uppercase font-rajdhani font-bold text-slate-400 tracking-wider">Current Due (Net 30)</span>
          <p className="text-3xl font-bold font-mono text-[#FF9FFC] mt-1">₹4,46,250</p>
          <span className="text-[11px] text-amber-400 font-mono">Due in 28 Days</span>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0D1220]/80 border border-slate-800/80 p-3 rounded-xl">
        <div className="flex items-center gap-2">
          {['ALL', 'PAID', 'DUE'].map(st => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded text-xs font-rajdhani font-bold uppercase tracking-wider transition-all ${filter === st ? 'bg-[#5227FF] text-white shadow-sm' : 'bg-slate-800/60 text-slate-300 hover:text-white'}`}
            >
              {st}
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice or order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#070A12] border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#5227FF]"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <Card className="border border-slate-800/80 bg-[#0D1220]/90 text-white rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0B0F1C] border-b border-slate-800 text-slate-400 font-rajdhani font-bold uppercase text-[11px]">
              <tr>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Order Ref</th>
                <th className="p-3.5">Issue Date</th>
                <th className="p-3.5">Fabric &amp; Quantity</th>
                <th className="p-3.5 text-right">Subtotal</th>
                <th className="p-3.5 text-right">GST (5%)</th>
                <th className="p-3.5 text-right">Total Amount</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3.5 font-bold text-white flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-[#FF9FFC]" />
                    <span>{inv.id}</span>
                  </td>
                  <td className="p-3.5 text-[#FF9FFC]">{inv.orderNumber}</td>
                  <td className="p-3.5 text-slate-300 font-sans text-[11px]">{inv.date}</td>
                  <td className="p-3.5 text-slate-200 font-sans text-[11px]">{inv.fabric}</td>
                  <td className="p-3.5 text-right text-slate-300">₹{inv.subtotal.toLocaleString()}</td>
                  <td className="p-3.5 text-right text-slate-400">₹{inv.tax.toLocaleString()}</td>
                  <td className="p-3.5 text-right font-bold text-white">₹{inv.total.toLocaleString()}</td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${inv.status === 'PAID' ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50' : 'bg-amber-950/40 text-amber-300 border border-amber-800/50'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadInvoice(inv.id)}
                      disabled={downloadingId === inv.id}
                      className="text-[11px] border-slate-700 hover:border-[#5227FF] bg-slate-800/60 text-slate-200 hover:text-white flex items-center gap-1 mx-auto"
                    >
                      {downloadingId === inv.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      <span>Download Bill</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Settlement Bank Details */}
      <div className="p-4 bg-[#090D18] border border-slate-800/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#5227FF]/20 border border-[#5227FF]/40 text-[#FF9FFC]">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold font-rajdhani uppercase text-white">
              Official Mill Settlement Account (RTGS / NEFT)
            </p>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              HDFC Bank &bull; A/C: 50200088912401 &bull; IFSC: HDFC0001204 &bull; Everest Textile Mills Ltd.
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          GSTIN: <strong className="text-white">27AAACE8891M1ZU</strong>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. CUSTOMER COMPANY PROFILE & SETTINGS
// ==========================================
export function CustomerProfilePage({ onNavigateSection }) {
  const [profile, setProfile] = useState({
    companyName: 'Apex Garments Sourcing Pvt Ltd',
    brandName: 'Apex Garments',
    gstin: '27AABCA1234F1Z8',
    ieCode: '0388291048',
    panNumber: 'AABCA1234F',
    billingAddress: 'Plot 42, Andheri East Industrial Zone, Mumbai, Maharashtra 400093',
    shippingWharf: 'Nhava Sheva Port Dock 4 (Container Terminal Gate 2)',
    contactPerson: 'Aditi Rao',
    email: 'aditi@apexgarments.com',
    phone: '+91 98200 11223',
    creditTerms: 'Net 30 Days',
    approvedCreditLimit: '₹50,00,000',
    notifyWhatsapp: true,
    notifyEmailQc: true,
    notifyEwayBill: true,
  });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    }, 700);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-opensans text-slate-100">
      <div className="border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-rajdhani font-bold uppercase tracking-wider text-[#FF9FFC] bg-[#5227FF]/20 px-2.5 py-0.5 rounded border border-[#5227FF]/40">
            Verified Enterprise Account
          </span>
          <span className="text-xs font-mono text-emerald-400 font-semibold">KYC Approved</span>
        </div>
        <h1 className="text-3xl font-bold font-rajdhani text-white mt-1">
          Buyer Enterprise Profile &amp; Logistics Address
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your organization details, GSTIN tax credentials, primary dispatch wharf, and instant notification preferences.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Profile configuration saved and synchronized with Everest Mill ERP.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="border border-slate-800/80 bg-[#0D1220]/90 text-white rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold font-rajdhani uppercase tracking-wider text-[#FF9FFC] border-b border-slate-800 pb-2">
            1. Corporate Legal Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Company Legal Name</label>
              <input
                type="text"
                value={profile.companyName}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                className="w-full bg-[#070A12] border border-slate-700/80 rounded-lg px-3 py-2 text-white font-medium focus:border-[#5227FF] focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">GSTIN (Goods &amp; Services Tax ID)</label>
              <input
                type="text"
                value={profile.gstin}
                onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                className="w-full bg-[#070A12] border border-slate-700/80 rounded-lg px-3 py-2 text-white font-mono focus:border-[#5227FF] focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Import Export Code (IEC)</label>
              <input
                type="text"
                value={profile.ieCode}
                onChange={(e) => setProfile({ ...profile, ieCode: e.target.value })}
                className="w-full bg-[#070A12] border border-slate-700/80 rounded-lg px-3 py-2 text-white font-mono focus:border-[#5227FF] focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Approved Credit Term</label>
              <div className="p-2 bg-[#070A12] border border-slate-800 rounded-lg text-emerald-400 font-mono font-bold">
                {profile.creditTerms} &bull; Limit: {profile.approvedCreditLimit}
              </div>
            </div>
          </div>
        </Card>

        <Card className="border border-slate-800/80 bg-[#0D1220]/90 text-white rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold font-rajdhani uppercase tracking-wider text-[#FF9FFC] border-b border-slate-800 pb-2">
            2. Delivery Port &amp; Billing Destination
          </h3>
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Registered Billing Address</label>
              <input
                type="text"
                value={profile.billingAddress}
                onChange={(e) => setProfile({ ...profile, billingAddress: e.target.value })}
                className="w-full bg-[#070A12] border border-slate-700/80 rounded-lg px-3 py-2 text-white focus:border-[#5227FF] focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Primary Freight Wharf / Container Gate</label>
              <input
                type="text"
                value={profile.shippingWharf}
                onChange={(e) => setProfile({ ...profile, shippingWharf: e.target.value })}
                className="w-full bg-[#070A12] border border-slate-700/80 rounded-lg px-3 py-2 text-white focus:border-[#5227FF] focus:outline-none"
              />
            </div>
          </div>
        </Card>

        <Card className="border border-slate-800/80 bg-[#0D1220]/90 text-white rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold font-rajdhani uppercase tracking-wider text-[#FF9FFC] border-b border-slate-800 pb-2">
            3. Commercial Contact &amp; Dispatch Alerts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Primary Contact</label>
              <input
                type="text"
                value={profile.contactPerson}
                onChange={(e) => setProfile({ ...profile, contactPerson: e.target.value })}
                className="w-full bg-[#070A12] border border-slate-700/80 rounded-lg px-3 py-2 text-white focus:border-[#5227FF] focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full bg-[#070A12] border border-slate-800 rounded-lg px-3 py-2 text-slate-400 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Direct Telephone</label>
              <input
                type="text"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full bg-[#070A12] border border-slate-700/80 rounded-lg px-3 py-2 text-white font-mono focus:border-[#5227FF] focus:outline-none"
              />
            </div>
          </div>
          <div className="pt-2 flex flex-wrap gap-4 text-xs text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.notifyEmailQc}
                onChange={(e) => setProfile({ ...profile, notifyEmailQc: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-[#5227FF]"
              />
              <span>Email ASTM 4-Point Roll Inspection Reports</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.notifyEwayBill}
                onChange={(e) => setProfile({ ...profile, notifyEwayBill: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-[#5227FF]"
              />
              <span>Send E-Way Gate Pass upon Truck Dispatch</span>
            </label>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-[#5227FF] via-[#7B42FF] to-[#FF9FFC] hover:opacity-90 text-white font-rajdhani font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 shadow-lg"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Profile Preferences</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// 7. UNIFIED CUSTOMER PORTAL WRAPPER
// ==========================================
export default function CustomerPage({ section = 'catalog', onNavigateSection }) {
  if (section === 'my-quotes' || section === 'quotes' || section === 'request-quote') {
    return <CustomerQuotesPage onNavigateSection={onNavigateSection} />;
  }
  if (section === 'my-orders' || section === 'orders') {
    return <CustomerOrdersPage onNavigateSection={onNavigateSection} />;
  }
  if (section === 'invoices') {
    return <CustomerInvoicesPage onNavigateSection={onNavigateSection} />;
  }
  if (section === 'profile') {
    return <CustomerProfilePage onNavigateSection={onNavigateSection} />;
  }
  return <FabricCatalogPage onNavigateSection={onNavigateSection} />;
}
