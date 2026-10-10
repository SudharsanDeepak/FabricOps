import React, { useState } from 'react';
import {
  Factory,
  Shield,
  UserCheck,
  Cpu,
  LogIn,
  AlertCircle,
  Loader2,
  Building,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

export function LoginPage({ onNavigateToRegister }) {
  const { login, demoLogin, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

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

  const handleQuickDemo = async (role) => {
    setLocalError('');
    setLoading(true);
    try {
      await demoLogin(role);
    } catch (err) {
      setLocalError(err.message || `Failed to log in as ${role}. Please ensure database is seeded.`);
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Subtle Gradient & Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Mill Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-2">
            <Factory className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Everest Textile OS</h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Manufacturing Operating System &bull; Everest Textile Mills
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
                  placeholder="name@everesttextiles.com"
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

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-slate-900 px-2 text-slate-500 font-semibold tracking-wider">
                  Or Fast Demo Sign In
                </span>
              </div>
            </div>

            {/* 1-Click Fast Demo Buttons */}
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('ADMIN')}
                disabled={loading}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-blue-500/50 text-left transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Factory Supervisor (Admin)</p>
                    <p className="text-[11px] text-slate-500">admin@everesttextiles.com</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('CUSTOMER')}
                disabled={loading}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-emerald-500/50 text-left transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <Building className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Apex Garments Ltd (Customer)</p>
                    <p className="text-[11px] text-slate-500">aditi@apexgarments.com</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('OPERATOR')}
                disabled={loading}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-purple-500/50 text-left transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-md bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Loom Master Rajesh (Operator)</p>
                    <p className="text-[11px] text-slate-500">rajesh.weaver@everesttextiles.com</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
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

        {/* Security Notice */}
        <p className="text-center text-[11px] text-slate-500">
          Protected by Everest Mill Sentinel. All sessions authenticated via HTTP-Only encrypted cookies.
        </p>
      </div>
    </div>
  );
}
