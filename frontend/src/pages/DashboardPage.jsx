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
  PackageCheck
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import AeroShards from '../components/ui/AeroShards';

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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Living WebGPU Textile Yarn Banner */}
      <div className="relative rounded-2xl bg-slate-950 border border-slate-800/80 p-6 sm:p-7 text-white shadow-xl overflow-hidden group">
        {/* Living Shards Background Canvas */}
        <div className="absolute inset-0 z-0 opacity-80 pointer-events-none">
          <AeroShards
            backgroundColor="#080e1e"
            shardColor="#13233e"
            accentColor="#3b82f6"
            placement="full"
            flow={bannerFlow}
            material={bannerMaterial}
            detail="balanced"
            effect="none"
            scale={1.05}
            spread={0.9}
            depth={1.15}
            speed={0.75}
            spin={0.7}
            interaction="repel"
            density={1.1}
            shardSize={1.0}
            stretch={1.1}
            turbulence={0.35}
            glow={1.15}
            edgeSoftness={2}
            bloom={1.0}
            grain={0.03}
            chromaticAberration={0.005}
            transitionDuration={1.1}
            interactionRadius={1.4}
            interactionStrength={0.5}
            rippleIntensity={1.0}
            holdToGather
            paused={bannerPaused}
          />
        </div>

        {/* Ambient Dark Gradient Wash for Legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-transparent pointer-events-none z-[1]" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-900/80 border border-blue-400/40 px-2.5 py-0.5 text-xs text-blue-200 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Verified Session &bull; {role}
              </span>
              <span className="text-xs text-blue-200/90">
                Logged in as <strong>{user?.name}</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
              {role === 'ADMIN' && 'FabricOps Executive Console'}
              {role === 'CUSTOMER' && `Welcome, ${profile?.companyName || user?.name}`}
              {role === 'OPERATOR' && `Loom Operator Terminal — ${profile?.department || 'Weaving'} Shed`}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed drop-shadow-xs">
              {role === 'ADMIN' && 'Real-time orchestration of yarn inventory, loom capacity, quality scoring, dispatches, and operator wages.'}
              {role === 'CUSTOMER' && 'Monitor your custom woven fabrics, review quotes, track roll production stages, and download tax invoices.'}
              {role === 'OPERATOR' && 'View assigned loom machines, log shift production meters, and report mechanical breakdown halts.'}
            </p>
          </div>

          {/* Interactive Simulation Controls & Telemetry Pill */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 text-xs text-blue-200 shadow-sm backdrop-blur">
              <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
              <span>Real-time Subsystem Active</span>
            </span>

            {/* Weave Flow Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2 py-1 rounded-lg backdrop-blur shadow-sm text-xs">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider pl-1">Filaments:</span>
              {(['stream', 'vortex', 'ribbon']).map((flow) => (
                <button
                  key={flow}
                  type="button"
                  onClick={() => setBannerFlow(flow)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
                    bannerFlow === flow
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {flow}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setBannerPaused((p) => !p)}
                title={bannerPaused ? 'Resume Shard Animation' : 'Pause Shard Animation'}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              >
                {bannerPaused ? <Play className="h-3 w-3 text-emerald-400" /> : <Pause className="h-3 w-3" />}
              </button>
            </div>

            <span className="text-[10px] text-slate-400/90 font-mono hidden lg:block">
              Click & drag to create yarn ripples
            </span>
          </div>
        </div>
      </div>

      {/* Role-Specific Live Console */}
      {role === 'ADMIN' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">Active Looms Running</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-800">18 / 20</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> 94.2% Fleet Efficiency
            </CardContent>
          </Card>

          <Card
            onClick={() => onNavigateSection('quotations')}
            className="cursor-pointer hover:border-amber-300 hover:shadow-xs transition-all"
          >
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">Pending Quotations</CardDescription>
              <CardTitle className="text-2xl font-bold text-amber-600">3 Inquiries</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-blue-600 font-semibold flex items-center gap-1">
              <span>Open Studio &rarr;</span>
            </CardContent>
          </Card>

          <Card
            onClick={() => onNavigateSection('orders')}
            className="cursor-pointer hover:border-blue-300 hover:shadow-xs transition-all"
          >
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">Daily Woven Output</CardDescription>
              <CardTitle className="text-2xl font-bold text-blue-600">14,850 m</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-500">
              Target: 15,000 m (99%)
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">4-Point QC Pass Rate</CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-600">97.8%</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-500">
              Grade A: 93% &bull; Grade B: 4.8%
            </CardContent>
          </Card>
        </div>
      )}

      {role === 'CUSTOMER' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            onClick={() => onNavigateSection('catalog')}
            className="cursor-pointer hover:border-blue-300 hover:shadow-xs transition-all"
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">Fabric Catalog & ATP</CardDescription>
                <Badge variant="outline" className="text-xs">Published</Badge>
              </div>
              <CardTitle className="text-xl font-bold text-blue-700">Explore Range</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-500 flex items-center justify-between">
              <span>Poplin, Twill, Denim</span>
              <span className="font-semibold text-blue-600">Browse &rarr;</span>
            </CardContent>
          </Card>

          <Card
            onClick={() => onNavigateSection('my-quotes')}
            className="cursor-pointer hover:border-blue-300 hover:shadow-xs transition-all"
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">Inquiries & Quotations</CardDescription>
                <Badge variant="success" className="text-xs">1 Offer Ready</Badge>
              </div>
              <CardTitle className="text-xl font-bold text-slate-800">Negotiate Quotes</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-500 flex items-center justify-between">
              <span>Counter-offer, Accept, Confirm</span>
              <span className="font-semibold text-blue-600">View &rarr;</span>
            </CardContent>
          </Card>

          <Card
            onClick={() => onNavigateSection('my-orders')}
            className="cursor-pointer hover:border-blue-300 hover:shadow-xs transition-all"
          >
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">Active Production Order</CardDescription>
              <CardTitle className="text-xl font-bold text-blue-600">ORD-2026-0018</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-600 flex items-center justify-between">
              <span>5,000m Poplin (Weaving 24%)</span>
              <span className="font-semibold text-blue-600">Track &rarr;</span>
            </CardContent>
          </Card>
        </div>
      )}


      {role === 'OPERATOR' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-blue-200 bg-blue-50/40">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs font-semibold text-blue-700">Assigned Loom Station</CardDescription>
                <Badge variant="success">RUNNING</Badge>
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">LOOM-AJ-01 (Air-Jet)</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-600 space-y-1">
              <div>Shed 1 &bull; Bay 104 &bull; Reed Space 75"</div>
              <div className="font-mono text-blue-700 font-semibold">Speed: 850 RPM &bull; 820 Picks/Min</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">Current Shift Target</CardDescription>
              <CardTitle className="text-xl font-bold text-slate-800">420 / 600 Meters</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-600">
              Progress: 70% &bull; Waste: 1.2% (Well within standard)
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">Shift Timings & Base Rate</CardDescription>
              <CardTitle className="text-xl font-bold text-purple-700">₹{(profile?.hourlyWageRate || 180)} / hr</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs text-slate-600">
              Morning Shift (06:00 - 14:00) &bull; Incentive Bonus Active
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subsystem Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* API Core */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-600" />
                Express.js REST API
              </CardTitle>
              <Badge variant="success">Active</Badge>
            </div>
            <CardDescription className="text-xs">
              Port: 5000 &bull; Modular MVC & RBAC
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Session Auth:</span>
              <span className="font-semibold text-emerald-700">HTTP-Only JWT Cookie</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Server Uptime:</span>
              <span className="font-mono">{healthData?.uptime || 'Starting...'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Health Endpoint:</span>
              <code className="text-blue-600 font-mono">/api/v1/health</code>
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-600" />
                MongoDB & Mongoose
              </CardTitle>
              <Badge variant={healthData?.database?.isConnected ? 'success' : 'warning'}>
                {healthData?.database?.state || 'Checking'}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              All 9 Collections & Schemas Active
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Connection State:</span>
              <span className="font-semibold text-slate-700 capitalize">
                {healthData?.database?.state || 'Awaiting Mongo'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Target Database:</span>
              <span className="font-mono">{healthData?.database?.name || 'fabricops'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">ACID Transactions:</span>
              <span className="text-emerald-700 font-medium">Replica-Set Supported</span>
            </div>
          </CardContent>
        </Card>

        {/* Pluggable Stubs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-600" />
                Security & RBAC Layer
              </CardTitle>
              <Badge variant="success">Enforced</Badge>
            </div>
            <CardDescription className="text-xs">
              Server-Side Isolation & Audit Logging
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Tenant Isolation:</span>
              <span className="text-emerald-700 font-medium">Mongoose Scoped Query</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Audit Trail:</span>
              <span className="text-emerald-700 font-medium">Immutable AuditLog Model</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Role Escalation:</span>
              <span className="text-emerald-700 font-medium">Server-Side Blocked</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
