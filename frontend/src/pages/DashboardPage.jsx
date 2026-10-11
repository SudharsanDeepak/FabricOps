import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Radio,
  FileCode2,
  Workflow,
  Sparkles,
  Info,
  Building,
  User,
  CreditCard,
  AlertTriangle,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  PackageCheck,
  Factory,
  Wrench,
  Truck,
  Users,
  Search,
  Filter,
  Download,
  Printer,
  History,
  ShieldAlert,
  Plus,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import AeroShards from '../components/ui/AeroShards';
import { AiQualityConsole } from '../components/common/AiQualityConsole';

export function DashboardPage({ currentSection, onNavigateSection }) {
  const { user, profile, role } = useAuth();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bannerFlow, setBannerFlow] = useState('stream');
  const [bannerMaterial, setBannerMaterial] = useState('pearl');
  const [bannerPaused, setBannerPaused] = useState(false);

  useEffect(() => {
    api.get('/health')
      .then((res) => {
        setHealthData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setHealthData(err.details?.data || null);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-opensans">
      {/* Everest Textile Mills Industrial Banner */}
      <div className="relative border border-slate-800/80 bg-[#0D1220]/90 p-6 sm:p-8 text-white rounded-xl shadow-xl overflow-hidden backdrop-blur-md">
        {/* Subtle Textile Weave Grid Texture */}
        <div className="absolute inset-0 opacity-20 bg-twill pointer-events-none"></div>
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#5227FF] via-[#FF9FFC] to-[#FFFFFF]"></div>
        {/* Glow Accent */}
        <div className="absolute right-0 top-1/4 w-[350px] h-[350px] bg-[#5227FF]/15 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#5227FF]/20 border border-[#5227FF]/40 text-[#FF9FFC] font-rajdhani font-bold text-xs uppercase tracking-wider rounded-full">
                <span className="h-2 w-2 rounded-full bg-[#FF9FFC] animate-pulse" />
                DIGITAL LOOM OPERATING SYSTEM &bull; {role}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Operator: <strong className="text-white font-semibold">{user?.name}</strong>
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-rajdhani">
              {role === 'ADMIN' && 'Executive Mill Command Center'}
              {role === 'CUSTOMER' && `Welcome, ${profile?.companyName || user?.name}`}
              {role === 'OPERATOR' && `Loom Operator Terminal — ${profile?.department || 'Weaving'} Shed`}
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              {role === 'ADMIN' && 'Real-time orchestration of yarn silo inventory, loom telemetry, ASTM 4-point defect scoring, export containers, and worker wages.'}
              {role === 'CUSTOMER' && 'Monitor your custom woven fabrics, review quotes, track roll production stages, and download tax invoices.'}
              {role === 'OPERATOR' && 'View assigned loom machines, log shift production meters, and report mechanical breakdown halts.'}
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
            <div className="p-4 bg-[#0B0F1C]/90 border border-slate-700/80 rounded-xl shadow-md w-full sm:w-auto text-left lg:text-right space-y-1">
              <p className="text-[11px] font-rajdhani font-bold uppercase tracking-wider text-slate-400">
                ACTIVE LOOM FLEET
              </p>
              <p className="text-2xl font-bold font-rajdhani text-white">
                18 / 20 Running
              </p>
              <p className="text-[11px] font-mono font-bold text-emerald-400">
                94.2% Fleet OEE
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Specific Live Console */}
      {role === 'ADMIN' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:border-[#5227FF] transition-all">
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-400">Active Looms Running</CardDescription>
              <CardTitle className="text-3xl font-bold font-rajdhani text-white">18 / 20</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs text-emerald-400 font-semibold font-mono flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> 94.2% Fleet Efficiency
            </CardContent>
          </Card>

          <Card
            onClick={() => onNavigateSection('quotations')}
            className="cursor-pointer hover:border-[#FF9FFC] hover:shadow-[0_4px_25px_rgba(255,159,252,0.2)] transition-all"
          >
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-400">Pending Quotations</CardDescription>
              <CardTitle className="text-3xl font-bold font-rajdhani text-[#FF9FFC]">3 Inquiries</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs text-[#FF9FFC] font-bold font-rajdhani uppercase tracking-wider flex items-center gap-1">
              <span>Open Studio &rarr;</span>
            </CardContent>
          </Card>

          <Card
            onClick={() => onNavigateSection('orders')}
            className="cursor-pointer hover:border-[#5227FF] hover:shadow-[0_4px_25px_rgba(82,39,255,0.2)] transition-all"
          >
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-400">Daily Woven Output</CardDescription>
              <CardTitle className="text-3xl font-bold font-rajdhani text-white">14,850 m</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs text-slate-400 font-mono">
              Target: 15,000 m (99%)
            </CardContent>
          </Card>

          <Card className="hover:border-[#5227FF] transition-all">
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-400">4-Point QC Pass Rate</CardDescription>
              <CardTitle className="text-3xl font-bold font-rajdhani text-emerald-400">97.8%</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs text-slate-400 font-mono">
              Grade A: 93% &bull; Grade B: 4.8%
            </CardContent>
          </Card>
        </div>
      )}

      {role === 'CUSTOMER' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            onClick={() => onNavigateSection('catalog')}
            className="cursor-pointer hover:border-[#5227FF] hover:shadow-[0_4px_25px_rgba(82,39,255,0.2)] transition-all"
          >
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-400">Fabric Catalog & ATP</CardDescription>
                <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">Published</Badge>
              </div>
              <CardTitle className="text-2xl font-bold font-rajdhani text-white">Explore Range</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs text-slate-300 flex items-center justify-between">
              <span>Poplin, Twill, Denim</span>
              <span className="font-bold font-rajdhani uppercase tracking-wider text-[#FF9FFC]">Browse &rarr;</span>
            </CardContent>
          </Card>

          <Card
            onClick={() => onNavigateSection('my-quotes')}
            className="cursor-pointer hover:border-[#FF9FFC] hover:shadow-[0_4px_25px_rgba(255,159,252,0.2)] transition-all"
          >
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-400">Inquiries & Quotations</CardDescription>
                <Badge variant="success" className="text-xs">1 Offer Ready</Badge>
              </div>
              <CardTitle className="text-2xl font-bold font-rajdhani text-white">Negotiate Quotes</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs text-slate-300 flex items-center justify-between">
              <span>Counter-offer, Accept, Confirm</span>
              <span className="font-bold font-rajdhani uppercase tracking-wider text-[#FF9FFC]">View &rarr;</span>
            </CardContent>
          </Card>

          <Card
            onClick={() => onNavigateSection('my-orders')}
            className="cursor-pointer hover:border-[#5227FF] hover:shadow-[0_4px_25px_rgba(82,39,255,0.2)] transition-all"
          >
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-400">Active Production Order</CardDescription>
              <CardTitle className="text-2xl font-bold font-rajdhani text-[#FF9FFC]">ORD-2026-0018</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs text-slate-300 flex items-center justify-between">
              <span>5,000m Poplin (Weaving 24%)</span>
              <span className="font-bold font-rajdhani uppercase tracking-wider text-[#FF9FFC]">Track &rarr;</span>
            </CardContent>
          </Card>
        </div>
      )}

      {role === 'OPERATOR' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-[#5227FF]/50 bg-[#0D1220]/80 hover:border-[#FF9FFC] transition-all">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-rajdhani font-bold uppercase tracking-wider text-[#FF9FFC]">Assigned Loom Station</CardDescription>
                <Badge variant="success">RUNNING</Badge>
              </div>
              <CardTitle className="text-2xl font-bold font-rajdhani text-white">LOOM-AJ-01 (Air-Jet)</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs text-slate-300 space-y-1">
              <div>Shed 1 &bull; Bay 104 &bull; Reed Space 75"</div>
              <div className="font-mono text-[#FF9FFC] font-bold">Speed: 850 RPM &bull; 820 Picks/Min</div>
            </CardContent>
          </Card>

          <Card className="hover:border-[#5227FF] transition-all">
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-400">Current Shift Target</CardDescription>
              <CardTitle className="text-2xl font-bold font-rajdhani text-white">420 / 600 Meters</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs text-slate-300 font-mono">
              Progress: 70% &bull; Waste: 1.2% (Well within standard)
            </CardContent>
          </Card>

          <Card className="hover:border-[#5227FF] transition-all">
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-xs font-rajdhani font-bold uppercase tracking-wider text-slate-400">Shift Timings & Base Rate</CardDescription>
              <CardTitle className="text-2xl font-bold font-rajdhani text-[#FF9FFC]">₹{(profile?.hourlyWageRate || 180)} / hr</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs text-slate-300 font-mono">
              Morning Shift (06:00 - 14:00) &bull; Incentive Bonus Active
            </CardContent>
          </Card>
        </div>
      )}

      
      {/* 1. MACHINES & LOOM FLEET SUB-VIEW */}
      {currentSection === 'machines' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-rajdhani font-bold uppercase tracking-wider text-[#FF9FFC] bg-[#5227FF]/20 px-2.5 py-0.5 rounded border border-[#5227FF]/40">
                  Fleet Registry
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">18 / 20 Looms Active</span>
              </div>
              <h2 className="text-2xl font-bold font-rajdhani text-white mt-1">
                Loom &amp; Machinery Fleet Master Console
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time motor telemetry, picks per minute, reed space width, and preventative lubrication schedules.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-[#5227FF] hover:bg-[#683DFF] text-white text-xs flex items-center gap-1.5 font-rajdhani font-bold uppercase">
                <Plus className="h-3.5 w-3.5" /> Register Loom
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { code: 'LOOM-AJ-01', make: 'Tsudakoma ZAX-9200', type: 'Airjet Loom', shed: 'Shed A - Bay 04', speed: '865 PPM', oee: '96.2%', status: 'RUNNING', order: 'ORD-2026-0018 (Poplin)' },
              { code: 'LOOM-AJ-02', make: 'Picanol OmniPlus-i', type: 'Airjet Loom', shed: 'Shed A - Bay 05', speed: '840 PPM', oee: '94.8%', status: 'RUNNING', order: 'ORD-2026-0018 (Poplin)' },
              { code: 'LOOM-RP-03', make: 'Itema R9500-2', type: 'Rapier Loom', shed: 'Shed B - Bay 11', speed: '620 PPM', oee: '92.5%', status: 'RUNNING', order: 'ORD-2026-0019 (Denim)' },
              { code: 'LOOM-JC-04', make: 'Bonas Ji Jacquard', type: 'Jacquard Weft', shed: 'Shed B - Bay 12', speed: '510 PPM', oee: '91.0%', status: 'RUNNING', order: 'ORD-2026-0016 (Damask)' },
              { code: 'SPIN-RF-05', make: 'Rieter G38 Compact', type: 'Ring Spinning', shed: 'Spinning Shed 1', speed: '18,500 RPM', oee: '97.5%', status: 'RUNNING', order: 'Lot #YC-2026-904' },
              { code: 'LOOM-AJ-06', make: 'Toyota JAT810', type: 'Airjet Loom', shed: 'Shed A - Bay 08', speed: '0 PPM', oee: '0.0%', status: 'MAINTENANCE', order: 'Warp Beam Loading' },
            ].map((m) => (
              <Card key={m.code} className="border border-slate-800/80 bg-[#0D1220]/80 p-5 hover:border-[#5227FF] transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4 text-[#FF9FFC]" />
                    <span className="font-mono font-bold text-white text-sm">{m.code}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${m.status === 'RUNNING' ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'bg-amber-950/40 text-amber-300 border border-amber-800/40'}`}>
                    {m.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                  <p className="text-slate-400 font-sans">{m.make} &bull; <span className="text-[#FF9FFC]">{m.type}</span></p>
                  <p className="font-mono text-[11px] text-slate-400">{m.shed}</p>
                  <div className="flex justify-between pt-2 border-t border-slate-800 font-mono text-[11px]">
                    <span>Speed: <strong className="text-white">{m.speed}</strong></span>
                    <span>OEE: <strong className="text-emerald-400">{m.oee}</strong></span>
                  </div>
                  <div className="p-2 bg-[#070A12] rounded border border-slate-800 font-mono text-[10px] text-slate-300 truncate">
                    Allocated: {m.order}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 2. ASTM 4-POINT QUALITY CONTROL SUB-VIEW */}
      {currentSection === 'qc' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-rajdhani font-bold uppercase tracking-wider text-[#FF9FFC] bg-[#5227FF]/20 px-2.5 py-0.5 rounded border border-[#5227FF]/40">
                  Optical Inspection
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">ASTM D5430 Standard</span>
              </div>
              <h2 className="text-2xl font-bold font-rajdhani text-white mt-1">
                ASTM 4-Point Fabric Defect &amp; Inspection Console
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Penalty point calculations per 100 square meters, selvedge slub tracing, and instant tamper-evident birth certificates.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-gradient-to-r from-[#5227FF] to-[#FF9FFC] text-white text-xs font-rajdhani font-bold uppercase">
                <Printer className="h-3.5 w-3.5 mr-1" /> Print Daily QC Summary
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-[#0D1220]/80 border-slate-800">
              <span className="text-[10px] uppercase font-rajdhani font-bold text-slate-400">Total Rolls Scanned</span>
              <p className="text-3xl font-bold font-mono text-white mt-1">142 Rolls</p>
              <span className="text-[11px] text-emerald-400 font-semibold font-mono">14,850 Meters</span>
            </Card>
            <Card className="p-4 bg-[#0D1220]/80 border-slate-800">
              <span className="text-[10px] uppercase font-rajdhani font-bold text-slate-400">Grade A Yield</span>
              <p className="text-3xl font-bold font-mono text-emerald-400 mt-1">94.8%</p>
              <span className="text-[11px] text-slate-400 font-mono">&lt; 4.0 pts / 100m²</span>
            </Card>
            <Card className="p-4 bg-[#0D1220]/80 border-slate-800">
              <span className="text-[10px] uppercase font-rajdhani font-bold text-slate-400">Grade B Secondary</span>
              <p className="text-3xl font-bold font-mono text-amber-400 mt-1">4.2%</p>
              <span className="text-[11px] text-slate-400 font-mono">Commercial Grade</span>
            </Card>
            <Card className="p-4 bg-[#0D1220]/80 border-slate-800">
              <span className="text-[10px] uppercase font-rajdhani font-bold text-slate-400">Total Rejections</span>
              <p className="text-3xl font-bold font-mono text-red-400 mt-1">1.0%</p>
              <span className="text-[11px] text-red-400 font-mono">Re-spooled / Rags</span>
            </Card>
          </div>

          <Card className="border border-slate-800/80 bg-[#0D1220]/90 text-white rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0B0F1C] border-b border-slate-800 text-slate-400 font-rajdhani font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Roll ID</th>
                    <th className="p-3">Fabric Construction</th>
                    <th className="p-3 text-right">Length (m)</th>
                    <th className="p-3 text-right">Weight (kg)</th>
                    <th className="p-3 text-center">Defect Pts</th>
                    <th className="p-3 text-center">Quality Grade</th>
                    <th className="p-3 text-center">Assigned Loom</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {[
                    { id: 'ROL-9041-A', spec: '40s Combed Poplin (120 GSM)', m: 104.5, kg: 26.2, pts: '0.8', grade: 'Grade A', loom: 'LOOM-AJ-01', status: 'PASS' },
                    { id: 'ROL-9042-A', spec: '40s Combed Poplin (120 GSM)', m: 102.0, kg: 25.8, pts: '1.2', grade: 'Grade A', loom: 'LOOM-AJ-02', status: 'PASS' },
                    { id: 'ROL-9043-B', spec: 'Indigo Denim Warp 10s (380 GSM)', m: 98.5, kg: 38.4, pts: '3.1', grade: 'Grade B', loom: 'LOOM-RP-03', status: 'PASS' },
                    { id: 'ROL-9044-A', spec: 'French Linen Slub (180 GSM)', m: 105.0, kg: 29.5, pts: '0.4', grade: 'Grade A+', loom: 'LOOM-JC-04', status: 'PASS' },
                  ].map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-white">{r.id}</td>
                      <td className="p-3 text-slate-200 font-sans">{r.spec}</td>
                      <td className="p-3 text-right text-slate-300">{r.m} m</td>
                      <td className="p-3 text-right text-slate-300">{r.kg} kg</td>
                      <td className="p-3 text-center text-[#FF9FFC] font-bold">{r.pts} pts</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">{r.grade}</span>
                      </td>
                      <td className="p-3 text-center text-slate-400">{r.loom}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#5227FF]/20 text-[#FF9FFC] border border-[#5227FF]/40">CERTIFIED ✓</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          
          {/* AI-Powered Quality Assurance & XGBoost Prediction Console */}
          <div>
            <AiQualityConsole
              persona="MANAGER"
              rollId="ROL-9041-A"
              orderNumber="ORD-2026-0018"
              customerName="Apex Garments Sourcing Pvt Ltd"
              loomId="LOOM-AJ-01"
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
        </div>
      )}

      {/* 3. DISPATCH BAY & LOGISTICS SUB-VIEW */}
      {currentSection === 'dispatch' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-rajdhani font-bold uppercase tracking-wider text-[#FF9FFC] bg-[#5227FF]/20 px-2.5 py-0.5 rounded border border-[#5227FF]/40">
                  Gate Weighbridge
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">Bay 01 - 04 Active</span>
              </div>
              <h2 className="text-2xl font-bold font-rajdhani text-white mt-1">
                Dispatch Bay Scanning &amp; Logistics Control
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Barcode verification against buyer sales orders, truck tare/gross weighing, and digital gate pass authorization.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-[#5227FF] hover:bg-[#683DFF] text-white text-xs font-rajdhani font-bold uppercase">
                <Truck className="h-3.5 w-3.5 mr-1" /> New Gate Pass
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5 border-slate-800 bg-[#0D1220]/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#FF9FFC]" />
                  <span className="font-rajdhani font-bold text-white text-sm">TRUCK MH-04-EB-8821 &bull; Blue Dart</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">LOADED</span>
              </div>
              <div className="space-y-1 text-xs font-mono text-slate-300">
                <p>Consignee: <strong className="text-white">Apex Garments Sourcing Pvt Ltd</strong></p>
                <p>Dest: Nhava Sheva Port Dock 4 &bull; Seal: TS-88912</p>
                <p>Gross Weight: 1,280.5 kg &bull; Pallets: 2 Heavy Pine</p>
              </div>
              <Button size="sm" className="w-full bg-slate-800 hover:bg-[#5227FF] text-white text-xs">
                Print Official Gate Pass (IRN Verified)
              </Button>
            </Card>

            <Card className="p-5 border-slate-800 bg-[#0D1220]/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-emerald-400" />
                  <span className="font-rajdhani font-bold text-white text-sm">TRUCK GJ-01-AX-9014 &bull; VRL Logistics</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/40 text-amber-300 border border-amber-800/40">IN BAY (LOADING)</span>
              </div>
              <div className="space-y-1 text-xs font-mono text-slate-300">
                <p>Consignee: <strong className="text-white">Levi Strauss India Pvt Ltd</strong></p>
                <p>Dest: Ahmedabad Central Hub &bull; Seal: Pending</p>
                <p>Gross Weight: 3,420.0 kg &bull; Pallets: 6 Heavy Pine</p>
              </div>
              <Button size="sm" className="w-full bg-slate-800 hover:bg-[#5227FF] text-white text-xs">
                Authorize Weighbridge Scale
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* 4. WORKFORCE & STAFF SUB-VIEW */}
      {currentSection === 'staff' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-rajdhani font-bold uppercase tracking-wider text-[#FF9FFC] bg-[#5227FF]/20 px-2.5 py-0.5 rounded border border-[#5227FF]/40">
                  Human Resources
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">24 Active Personnel</span>
              </div>
              <h2 className="text-2xl font-bold font-rajdhani text-white mt-1">
                Factory Staff &amp; Operator Accounts
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Role-based access credentials, certified weaver assignments, and shift hourly wage matrices.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-[#5227FF] hover:bg-[#683DFF] text-white text-xs font-rajdhani font-bold uppercase">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Staff Account
              </Button>
            </div>
          </div>

          <Card className="border border-slate-800/80 bg-[#0D1220]/90 text-white rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0B0F1C] border-b border-slate-800 text-slate-400 font-rajdhani font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Staff Name</th>
                    <th className="p-3">System Role</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3 text-right">Hourly Wage</th>
                    <th className="p-3 text-center">Shift Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {[
                    { name: 'Prakash Sharma', role: 'ADMIN', dept: 'Plant Executive', email: 'admin@fabricops.com', wage: '₹450 / hr', status: 'ACTIVE (Shift A)' },
                    { name: 'Rajesh Kumar', role: 'OPERATOR', dept: 'Airjet Weaving Bay', email: 'rajesh.weaver@fabricops.com', wage: '₹180 / hr', status: 'CLOCKED IN' },
                    { name: 'Arvind Verma', role: 'OPERATOR', dept: 'ASTM 4-Point QC', email: 'arvind.qc@fabricops.com', wage: '₹210 / hr', status: 'CLOCKED IN' },
                    { name: 'Ramesh Singh', role: 'OPERATOR', dept: 'Gate Weighbridge', email: 'ramesh.gate@fabricops.com', wage: '₹175 / hr', status: 'STANDBY' },
                  ].map(s => (
                    <tr key={s.email} className="hover:bg-slate-800/30">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-[#FF9FFC]" />
                        <span>{s.name}</span>
                      </td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/40 text-purple-300 border border-purple-800/40">{s.role}</span></td>
                      <td className="p-3 text-slate-300 font-sans">{s.dept}</td>
                      <td className="p-3 text-slate-400">{s.email}</td>
                      <td className="p-3 text-right text-emerald-400 font-bold">{s.wage}</td>
                      <td className="p-3 text-center"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 5. OPERATIONAL AUDITS & IMMUTABLE LOGS SUB-VIEW */}
      {currentSection === 'audits' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-rajdhani font-bold uppercase tracking-wider text-[#FF9FFC] bg-[#5227FF]/20 px-2.5 py-0.5 rounded border border-[#5227FF]/40">
                  Compliance Audit Trail
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">Immutable Ledger</span>
              </div>
              <h2 className="text-2xl font-bold font-rajdhani text-white mt-1">
                Operational Audit Logs &amp; Traceability
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                ISO 9001:2015 audit records with cryptographic actor IDs, timestamps, IP addresses, and state changes.
              </p>
            </div>
          </div>

          <Card className="border border-slate-800/80 bg-[#0D1220]/90 text-white rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0B0F1C] border-b border-slate-800 text-slate-400 font-rajdhani font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Actor Role</th>
                    <th className="p-3">Entity Type</th>
                    <th className="p-3">Notes &amp; Details</th>
                    <th className="p-3 text-right">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {[
                    { ts: '2026-10-11 08:24:12', action: 'USER_LOGIN', role: 'ADMIN', entity: 'User', notes: 'Successful password verification against MongoDB Atlas', ip: '127.0.0.1' },
                    { ts: '2026-10-11 07:55:04', action: 'ORDER_FULFILLMENT_UPDATE', role: 'ADMIN', entity: 'SalesOrder', notes: 'Milestone advanced to Weaving (Airjet AJ-04 allocated)', ip: '127.0.0.1' },
                    { ts: '2026-10-11 07:12:30', action: 'QC_ROLL_INSPECTED', role: 'OPERATOR', entity: 'RollQC', notes: 'Roll #ROL-9041-A passed ASTM 4-point test (0.8 pts)', ip: '192.168.1.42' },
                    { ts: '2026-10-11 06:00:15', action: 'SHIFT_CLOCK_IN', role: 'OPERATOR', entity: 'Attendance', notes: 'Rajesh Kumar clocked into Shift A', ip: '192.168.1.42' },
                  ].map((a, i) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="p-3 text-slate-400 font-sans text-[11px]">{a.ts}</td>
                      <td className="p-3 font-bold text-[#FF9FFC]">{a.action}</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">{a.role}</span></td>
                      <td className="p-3 text-slate-300">{a.entity}</td>
                      <td className="p-3 text-slate-200 font-sans text-[11px]">{a.notes}</td>
                      <td className="p-3 text-right text-slate-400">{a.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Subsystem Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* API Core */}
        <Card className="hover:border-[#5227FF] transition-all">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold font-rajdhani uppercase tracking-wider flex items-center gap-2 text-white">
                <Server className="h-4 w-4 text-[#FF9FFC]" />
                Express.js REST API
              </CardTitle>
              <Badge variant="success">Active</Badge>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Port: 5000 &bull; Modular MVC & RBAC
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-xs text-slate-300 space-y-1.5 font-opensans">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Session Auth:</span>
              <span className="font-semibold text-emerald-400">HTTP-Only JWT Cookie</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Server Uptime:</span>
              <span className="font-mono text-slate-200">{healthData?.uptime || 'Starting...'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Health Endpoint:</span>
              <code className="text-[#FF9FFC] font-mono font-bold">/api/v1/health</code>
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card className="hover:border-[#5227FF] transition-all">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold font-rajdhani uppercase tracking-wider flex items-center gap-2 text-white">
                <Database className="h-4 w-4 text-emerald-400" />
                MongoDB & Mongoose
              </CardTitle>
              <Badge variant={healthData?.database?.isConnected ? 'success' : 'warning'}>
                {healthData?.database?.state || 'Checking'}
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-400">
              All 9 Collections & Schemas Active
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-xs text-slate-300 space-y-1.5 font-opensans">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Connection State:</span>
              <span className="font-semibold text-slate-200 capitalize">
                {healthData?.database?.state || 'Awaiting Mongo'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Target Database:</span>
              <span className="font-mono text-slate-200">{healthData?.database?.name || 'fabricops'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">ACID Transactions:</span>
              <span className="text-emerald-400 font-medium">Replica-Set Supported</span>
            </div>
          </CardContent>
        </Card>

        {/* Security / RBAC */}
        <Card className="hover:border-[#5227FF] transition-all">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold font-rajdhani uppercase tracking-wider flex items-center gap-2 text-white">
                <Cpu className="h-4 w-4 text-purple-400" />
                Security & RBAC Layer
              </CardTitle>
              <Badge variant="success">Enforced</Badge>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Server-Side Isolation & Audit Logging
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 text-xs text-slate-300 space-y-1.5 font-opensans">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Tenant Isolation:</span>
              <span className="text-emerald-400 font-medium">Mongoose Scoped Query</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Audit Trail:</span>
              <span className="text-emerald-400 font-medium">Immutable AuditLog Model</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Role Escalation:</span>
              <span className="text-emerald-400 font-medium">Server-Side Blocked</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
