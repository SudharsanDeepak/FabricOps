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
  Info
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';

export function DashboardPage({ activeRole, currentSection }) {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      {/* Welcome Banner */}
      <div className="rounded-xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-white border-blue-400 bg-blue-600/50 text-xs">
                Active Perspective: {activeRole}
              </Badge>
              <Badge variant="outline" className="text-white border-blue-400 bg-blue-600/50 text-xs">
                Section: {currentSection}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Everest Textile OS</h1>
            <p className="mt-1 text-sm text-blue-100 max-w-2xl">
              Unified Manufacturing Operating System replacing paper slips, telephone registers, and manual tracking for Everest Textile Mills.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-900/60 border border-blue-400/40 px-3 py-1.5 text-xs text-blue-200">
              <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
              Real-time Subsystem Active
            </span>
          </div>
        </div>
      </div>

      {/* Subsystem Architecture Grid */}
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
              Port: 5000 &bull; Modular MVC & Services
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Uptime:</span>
              <span className="font-mono">{healthData?.uptime || 'Starting...'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Node Runtime:</span>
              <span className="font-mono">{healthData?.system?.nodeVersion || process.version || 'v22'}</span>
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
              ODM Layer with Transactions & Auditing
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Connection:</span>
              <span className="font-semibold text-slate-700 capitalize">
                {healthData?.database?.state || 'Awaiting Mongo'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Target Database:</span>
              <span className="font-mono">everest_textile_os</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Replica Set Mode:</span>
              <span>Enabled in URI / Dev fallback</span>
            </div>
          </CardContent>
        </Card>

        {/* Pluggable Stubs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-600" />
                IoT & AI Adapters
              </CardTitle>
              <Badge variant="secondary">Stubs Ready</Badge>
            </div>
            <CardDescription className="text-xs">
              Pluggable hardware & vision interfaces
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">IoT Defect Scanner:</span>
              <span className="text-emerald-700 font-medium">Adapter Interface Ready</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">AI Quality Vision:</span>
              <span className="text-emerald-700 font-medium">Adapter Interface Ready</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Real-time Socket:</span>
              <span className="text-blue-700 font-medium">Socket.IO Rooms</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role-Specific Overview Panels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Workflow className="h-5 w-5 text-blue-600" />
            Core Business Workflow & Role Responsibilities
          </CardTitle>
          <CardDescription>
            How Everest Textile OS coordinates work between Customers, Mill Administration, and Loom Operators.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border ${activeRole === 'CUSTOMER' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm text-slate-900">1. Customer Role</h4>
                {activeRole === 'CUSTOMER' && <Badge variant="default">Active</Badge>}
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>Browses published fabric catalogue and weave types</li>
                <li>Submits quotation inquiry with specifications & quantities</li>
                <li>Negotiates price and proposed delivery date</li>
                <li>Tracks live loom production stage and accesses invoices</li>
              </ul>
            </div>

            <div className={`p-4 rounded-lg border ${activeRole === 'ADMIN' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm text-slate-900">2. Admin Role</h4>
                {activeRole === 'ADMIN' && <Badge variant="default">Active</Badge>}
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>Reviews inquiries, checks yarn inventory & loom capacity</li>
                <li>Triggers procurement orders for missing yarn raw material</li>
                <li>Proposes terms, schedules jobs onto weaving looms</li>
                <li>Oversees 4-point QC, dispatches, gate passes & invoices</li>
              </ul>
            </div>

            <div className={`p-4 rounded-lg border ${activeRole === 'OPERATOR' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm text-slate-900">3. Operator Role</h4>
                {activeRole === 'OPERATOR' && <Badge variant="default">Active</Badge>}
              </div>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li>Views assigned loom numbers and work orders</li>
                <li>Records meters produced, machine speed, and waste per shift</li>
                <li>Logs mechanical or yarn breakage breakdown alerts</li>
                <li>Performs structured shift handovers with remarks</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

