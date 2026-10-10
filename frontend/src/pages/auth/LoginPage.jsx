import React, { useState } from 'react';
import {
  Factory,
  LogIn,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import AeroShards from '../../components/ui/AeroShards';

export function LoginPage({ onNavigateToRegister }) {
  const { login, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [shardFlow, setShardFlow] = useState('stream');
  const [shardMaterial, setShardMaterial] = useState('pearl');
  const [shardPaused, setShardPaused] = useState(false);
  const [gpuAvailable, setGpuAvailable] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setLocalError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setLocalError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none">
      {/* Living WebGPU Procedural Shards / Yarn Filaments Background */}
      <div className="absolute inset-0 z-0">
        <AeroShards
          backgroundColor="#070b14"
          shardColor="#111c33"
          accentColor="#3b82f6"
          placement="full"
          flow={shardFlow}
          material={shardMaterial}
          detail="balanced"
          effect="none"
          scale={1.05}
          spread={1}
          depth={1.25}
          speed={0.8}
          spin={0.85}
          interaction="repel"
          density={1.15}
          shardSize={1.1}
          stretch={1.1}
          turbulence={0.4}
          glow={1.2}
          edgeSoftness={2}
          bloom={1.1}
          grain={0.04}
          chromaticAberration={0.006}
          transitionDuration={1.2}
          interactionRadius={1.5}
          interactionStrength={0.55}
          rippleIntensity={1.2}
          holdToGather
          paused={shardPaused}
          onError={() => setGpuAvailable(false)}
        />
      </div>

      {/* Subtle overlay gradients for depth */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.4)_0%,rgba(2,6,23,0.85)_100%)] z-[1]" />

      <div className="w-full max-w-md relative z-10 space-y-4">
        {/* Weave Simulator Interactive Bar */}
        <div className="flex items-center justify-between px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800/80 backdrop-blur-md shadow-lg text-[11px]">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="font-semibold text-slate-300">Yarn Simulation:</span>
          </div>

          <div className="flex items-center gap-1">
            {(['stream', 'vortex', 'ribbon']).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setShardFlow(mode)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
                  shardFlow === mode
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {mode}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShardPaused((p) => !p)}
              title={shardPaused ? 'Resume Simulation' : 'Pause Simulation'}
              className="ml-1 p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              {shardPaused ? <Play className="h-3 w-3 text-emerald-400" /> : <Pause className="h-3 w-3" />}
            </button>
          </div>
        </div>
        {/* Mill Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-2">
            <Factory className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">FabricOps</h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Manufacturing Operating System &bull; FabricOps Mills
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur text-slate-100 shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-white">Sign In to Station</CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono border-slate-700 text-slate-400">
                JWT HTTP-Only
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Enter your credentials to access your authorized factory workspace.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {displayError && (
              <div className="rounded-lg bg-rose-950/60 border border-rose-800/80 p-3 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{displayError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@fabricops.com"
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">Password</label>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 text-sm shadow-md transition-all mt-1"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" /> Secure Sign In
                  </span>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pt-0 flex flex-col space-y-2 border-t border-slate-800/80 p-6">
            <div className="text-center text-xs text-slate-400">
              New B2B Apparel Buyer?{' '}
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="text-blue-400 font-semibold hover:underline"
              >
                Register Customer Account
              </button>
            </div>
          </CardFooter>
        </Card>

        {/* Security Notice & Interactive Hint */}
        <div className="space-y-1 text-center">
          <p className="text-[11px] text-slate-500">
            Protected by FabricOps Sentinel. All sessions authenticated via HTTP-Only encrypted cookies.
          </p>
          <p className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1.5">
            <Sparkles className="h-3 w-3 text-blue-400" />
            <span>Interactive Shard Field: Hold click to gather filaments &bull; Move cursor to repel</span>
          </p>
        </div>
      </div>
    </div>
  );
}
