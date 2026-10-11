import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Sparkles,
  Download,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  BarChart3,
  RefreshCw,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { api } from '../../lib/api';

const FABRIC_TYPES = ['Cotton', 'Cotton-Polyester', 'Denim', 'Linen', 'Polyester', 'Viscose'];
const COLOURS = ['Beige', 'Black', 'Blue', 'Green', 'Grey', 'Navy', 'Red', 'White', 'Yellow'];

export function AiQualityConsole({
  persona = 'MANAGER', // 'MANAGER' or 'BUYER'
  initialData = {},
  orderId = '',
  orderNumber = 'ORD-2026-0018',
  rollId = 'ROL-9041-A',
  customerName = 'Apex Garments Sourcing Pvt Ltd',
  loomId = 'LOOM-AJ-01',
}) {
  const [formData, setFormData] = useState({
    fabric_type: initialData.fabric_type || 'Cotton',
    colour: initialData.colour || 'White',
    yarn_batch_age_days: initialData.yarn_batch_age_days ?? 10,
    production_length_m: initialData.production_length_m ?? 1200,
    downtime_min: initialData.downtime_min ?? 15,
    production_duration_min: initialData.production_duration_min ?? 130,
    roll_id: rollId,
    order_number: orderNumber,
    loom_id: loomId,
    customer_name: customerName,
    target_persona: persona,
  });

  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Auto-run prediction on mount if initialData is provided
  useEffect(() => {
    handlePredict();
  }, []);

  const handlePredict = async (customParams = null) => {
    const paramsToSend = customParams || formData;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/ai/predict-quality', {
        ...paramsToSend,
        target_persona: persona,
      });

      if (res && res.predicted_status) {
        setPrediction(res);
      } else {
        throw new Error('Invalid prediction response');
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to AI Quality service.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setError(null);
    try {
      // Direct fetch to obtain binary blob
      const response = await fetch('/api/v1/ai/quality-report-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          target_persona: persona,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate PDF (${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FabricOps_QA_Report_${formData.roll_id}_${persona.toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setToastMessage(`Quality Assurance PDF downloaded successfully! (${persona === 'MANAGER' ? 'Plant Manager Audit' : 'Buyer Certificate'})`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to download Quality Assurance PDF report.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-950/50 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            PASS &bull; EXPORT COMPLIANT
          </span>
        );
      case 'REWORK':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-amber-950/50 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            REWORK &bull; RE-SHEARING NEEDED
          </span>
        );
      case 'REJECT':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono bg-red-950/50 text-red-300 border border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.3)]">
            <XCircle className="h-3.5 w-3.5 text-red-400" />
            REJECT &bull; QUARANTINED
          </span>
        );
    }
  };

  return (
    <Card className="border border-slate-800/80 bg-[#0D1220]/90 text-white rounded-xl shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-gradient-to-r from-[#5227FF]/20 via-[#FF9FFC]/10 to-transparent flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#5227FF]/25 border border-[#5227FF]/50 text-[#FF9FFC] shadow-[0_0_15px_rgba(82,39,255,0.4)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-rajdhani uppercase tracking-wider text-white">
                AI Fabric Quality Assurance Model &bull; {persona === 'MANAGER' ? 'Manager Audit' : 'Buyer Certificate'}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#5227FF]/20 border border-[#5227FF]/40 text-[#FF9FFC]">
                XGBoost ML v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {persona === 'MANAGER'
                ? 'Predicts PASS, REWORK, or REJECT outcomes based on batch parameters & downtime telemetry.'
                : 'Automated AI inspection audit & quality verification certificate for your ordered fabric.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || loading}
            className="bg-gradient-to-r from-[#5227FF] via-[#7B42FF] to-[#FF9FFC] hover:opacity-90 text-white text-xs font-rajdhani font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md"
          >
            {downloadingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>Generate QA Report PDF</span>
          </Button>
        </div>
      </div>

      {toastMessage && (
        <div className="mx-4 mt-4 p-2.5 bg-emerald-950/50 border border-emerald-800/60 rounded-lg text-xs text-emerald-300 flex items-center gap-2 font-mono">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-4 p-2.5 bg-red-950/50 border border-red-800/60 rounded-lg text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <CardContent className="p-5 space-y-6">
        {/* Prediction Results Banner */}
        {prediction && (
          <div className="p-4 rounded-xl bg-[#070A12] border border-slate-800/90 relative overflow-hidden space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-rajdhani font-bold uppercase tracking-widest text-slate-400 block mb-1">
                  PREDICTED INSPECTION STATUS
                </span>
                {getStatusBadge(prediction.predicted_status)}
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[10px] block">CONFIDENCE</span>
                  <span className="text-white font-bold text-base">
                    {(prediction.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">RISK LEVEL</span>
                  <span className={`font-bold text-base ${prediction.risk_level === 'LOW' ? 'text-emerald-400' : prediction.risk_level === 'MEDIUM' ? 'text-amber-400' : 'text-red-400'}`}>
                    {prediction.risk_level}
                  </span>
                </div>
              </div>
            </div>

            {/* Probability Bars */}
            {prediction.probabilities && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-rajdhani font-bold uppercase">
                  <span>Class Probabilities</span>
                  <span className="font-mono text-slate-500">Multiclass Softmax Distribution</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'PASS', val: prediction.probabilities.PASS || 0, color: 'bg-emerald-500', text: 'text-emerald-400' },
                    { label: 'REWORK', val: prediction.probabilities.REWORK || 0, color: 'bg-amber-500', text: 'text-amber-400' },
                    { label: 'REJECT', val: prediction.probabilities.REJECT || 0, color: 'bg-red-500', text: 'text-red-400' },
                  ].map((p) => (
                    <div key={p.label} className="p-2 bg-[#0D1220] rounded border border-slate-800">
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className={`font-bold font-rajdhani ${p.text}`}>{p.label}</span>
                        <span className="font-mono text-white">{(p.val * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${p.color} transition-all duration-500`}
                          style={{ width: `${Math.max(p.val * 100, 2)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation */}
            <div className="text-xs text-slate-300 bg-[#0B0F1C] p-2.5 rounded-lg border border-slate-800/60 flex items-start gap-2">
              <Info className="h-4 w-4 text-[#FF9FFC] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Guidance: </strong>
                {prediction.recommendation}
              </div>
            </div>
          </div>
        )}

        {/* Interactive Parameter Controls (Expanded for Manager, Compact for Buyer) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#FF9FFC]" />
              {persona === 'MANAGER' ? 'Simulate / Adjust Production Parameters' : 'Production Parameters Snapshot'}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePredict()}
              disabled={loading}
              className="text-xs border-slate-700 bg-slate-800/60 hover:bg-[#5227FF] text-white flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span>Re-evaluate Model</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-rajdhani font-bold uppercase text-slate-400">Fabric Type</label>
              <select
                value={formData.fabric_type}
                onChange={(e) => setFormData({ ...formData, fabric_type: e.target.value })}
                className="w-full bg-[#070A12] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#5227FF]"
              >
                {FABRIC_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-rajdhani font-bold uppercase text-slate-400">Weft Colour</label>
              <select
                value={formData.colour}
                onChange={(e) => setFormData({ ...formData, colour: e.target.value })}
                className="w-full bg-[#070A12] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#5227FF]"
              >
                {COLOURS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-rajdhani font-bold uppercase text-slate-400">Yarn Age (Days)</label>
              <input
                type="number"
                min="0"
                max="365"
                value={formData.yarn_batch_age_days}
                onChange={(e) => setFormData({ ...formData, yarn_batch_age_days: Number(e.target.value) })}
                className="w-full bg-[#070A12] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#5227FF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-rajdhani font-bold uppercase text-slate-400">Meters Produced</label>
              <input
                type="number"
                min="10"
                value={formData.production_length_m}
                onChange={(e) => setFormData({ ...formData, production_length_m: Number(e.target.value) })}
                className="w-full bg-[#070A12] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#5227FF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-rajdhani font-bold uppercase text-slate-400">Downtime (Mins)</label>
              <input
                type="number"
                min="0"
                value={formData.downtime_min}
                onChange={(e) => setFormData({ ...formData, downtime_min: Number(e.target.value) })}
                className="w-full bg-[#070A12] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#5227FF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-rajdhani font-bold uppercase text-slate-400">Duration (Mins)</label>
              <input
                type="number"
                min="1"
                value={formData.production_duration_min}
                onChange={(e) => setFormData({ ...formData, production_duration_min: Number(e.target.value) })}
                className="w-full bg-[#070A12] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#5227FF]"
              />
            </div>
          </div>
        </div>

        {/* Quick Simulation Presets for Manager */}
        {persona === 'MANAGER' && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800 text-xs">
            <span className="text-[10px] font-rajdhani font-bold uppercase text-slate-500">Test Scenarios:</span>
            <button
              type="button"
              onClick={() => {
                const s = { ...formData, fabric_type: 'Cotton', colour: 'White', yarn_batch_age_days: 5, downtime_min: 5, production_length_m: 2000, production_duration_min: 150 };
                setFormData(s);
                handlePredict(s);
              }}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/60 transition-colors"
            >
              Simulate High-Yield Run (Low Downtime)
            </button>
            <button
              type="button"
              onClick={() => {
                const s = { ...formData, fabric_type: 'Denim', colour: 'Blue', yarn_batch_age_days: 45, downtime_min: 25, production_length_m: 800, production_duration_min: 110 };
                setFormData(s);
                handlePredict(s);
              }}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/40 text-amber-300 border border-amber-800/40 hover:bg-amber-900/60 transition-colors"
            >
              Simulate Moderate Slub Risk (Rework)
            </button>
            <button
              type="button"
              onClick={() => {
                const s = { ...formData, fabric_type: 'Linen', colour: 'Grey', yarn_batch_age_days: 120, downtime_min: 80, production_length_m: 500, production_duration_min: 220 };
                setFormData(s);
                handlePredict(s);
              }}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950/40 text-red-300 border border-red-800/40 hover:bg-red-900/60 transition-colors"
            >
              Simulate High Stoppage Anomaly (Reject)
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
