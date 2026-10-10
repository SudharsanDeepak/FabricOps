import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Filter,
  Layers,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';
import { RequestQuoteModal } from './RequestQuoteModal';

export function FabricCatalogPage({ onNavigateSection }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
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
      {/* Banner */}
      <div className="rounded-xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-900/80 border border-blue-400/40 px-2.5 py-0.5 text-xs text-blue-200 font-medium mb-2">
              <Package className="h-3.5 w-3.5" /> Published Fabric Catalog
            </span>
            <h1 className="text-2xl font-bold tracking-tight">
              FabricOps Range & Specifications
            </h1>
            <p className="mt-1 text-xs text-blue-100 max-w-2xl leading-relaxed">
              Explore our mill-woven combed poplin, organic chinos, and ring-spun denim lines. View real-time Available-to-Promise (ATP) stock, MOQ, shade cards, and indicative delivery lead times.
            </p>
          </div>
          <Button
            onClick={() => onNavigateSection('my-quotes')}
            variant="outline"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs shrink-0"
          >
            Track My Inquiries & Quotes &rarr;
          </Button>
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
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by fabric name, product code (e.g. POP-40S), weave type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
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
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
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
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
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

                  <CardTitle className="text-base font-bold text-slate-900 mt-2">
                    {product.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {product.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4">
                  {/* Technical Specifications Matrix */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">GSM / Weight:</span>
                      <span className="font-bold text-slate-800">{spec.gsm || 'N/A'} GSM</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Weave Type:</span>
                      <span className="font-bold text-slate-800">{spec.weaveType || 'PLAIN'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Composition:</span>
                      <span className="font-bold text-slate-800 truncate block">{spec.composition || '100% Cotton'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Width:</span>
                      <span className="font-bold text-slate-800">{spec.widthInches || 58} Inches</span>
                    </div>
                    {spec.yarnCountWarp && (
                      <div className="col-span-2 pt-1 border-t border-slate-200/60 flex justify-between text-[11px] text-slate-600">
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
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-200 bg-white text-[10px] font-medium text-slate-700 shadow-2xs"
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-slate-300"
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
                      <span className="text-base font-bold font-mono text-slate-900">
                        ₹{product.pricing?.basePricePerUnit} <span className="text-xs font-normal text-slate-500">/ {product.measurementUnit}</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">MOQ:</span>
                      <span className="font-bold text-slate-700 font-mono">
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

