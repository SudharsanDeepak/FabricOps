import React, { useState } from 'react';
import {
  Factory,
  LogIn,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  Sparkles,
  Building,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  FileText,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  Home,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import AeroShards from '../components/ui/AeroShards';

// ==========================================
// 1. ACCESS DENIED PAGE
// ==========================================
export function AccessDeniedPage({ requiredRole, onReturnHome }) {
  const { user, role } = useAuth();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto font-opensans text-slate-100">
      <div className="h-16 w-16 bg-red-950/40 text-red-400 flex items-center justify-center mb-4 border border-red-800/50 rounded-xl shadow-lg">
        <ShieldAlert className="h-8 w-8" />
      </div>

      <span className="mb-2 text-xs font-rajdhani font-bold uppercase tracking-wider px-2.5 py-0.5 bg-red-950/40 text-red-300 border border-red-800/50 rounded">
        403 Forbidden &bull; Access Denied
      </span>

      <h2 className="text-2xl font-bold text-white font-rajdhani mt-2">
        Restricted Operational Zone
      </h2>

      <p className="text-sm text-slate-300 mt-2 leading-relaxed">
        Your authenticated identity (<strong>{user?.name}</strong>, Role:{' '}
        <span className="font-mono text-xs font-bold text-[#FF9FFC] ml-1">{role}</span>) does not possess sufficient authorizations to view or execute operations in this section.
      </p>

      {requiredRole && (
        <div className="mt-4 p-3 bg-[#5227FF]/15 border border-[#5227FF]/40 text-xs text-[#FF9FFC] font-medium rounded-lg">
          This resource is strictly designated for <strong>{requiredRole}</strong> personnel.
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={onReturnHome} className="text-xs flex items-center gap-2 shadow-md">
          <Home className="h-4 w-4" /> Return to My Workspace
        </Button>
      </div>
    </div>
  );
}

// ==========================================
// 2. LOGIN PAGE
// ==========================================
export function LoginPage({ onNavigateToRegister, onNavigateToLanding, defaultEmail = '' }) {
  const { login, error: authError } = useAuth();
  const [email, setEmail] = useState(defaultEmail || 'admin@fabricops.com');
  const [password, setPassword] = useState('FabricOps@123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  React.useEffect(() => {
    if (defaultEmail) {
      setEmail(defaultEmail);
      setPassword('FabricOps@123456');
      setLocalError('');
    }
  }, [defaultEmail]);

  const fillCredentials = (userEmail, userPass = 'FabricOps@123456') => {
    setEmail(userEmail);
    setPassword(userPass);
    setLocalError('');
  };

  const handleQuickLogin = async (userEmail, userPass = 'FabricOps@123456') => {
    setEmail(userEmail);
    setPassword(userPass);
    setLocalError('');
    setLoading(true);
    try {
      await login(userEmail, userPass);
    } catch (err) {
      setLocalError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen bg-[#070A12] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative font-opensans selection:bg-[#5227FF] selection:text-white text-slate-100">
      {/* Subtle Textile Weave Grid Texture */}
      <div className="absolute inset-0 opacity-20 bg-twill pointer-events-none"></div>
      <div className="absolute right-0 top-1/4 w-[450px] h-[450px] bg-[#5227FF]/15 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 space-y-4">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          {onNavigateToLanding ? (
            <button
              type="button"
              onClick={onNavigateToLanding}
              className="text-xs font-rajdhani font-bold uppercase tracking-wider text-[#FF9FFC] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Mill Overview</span>
            </button>
          ) : (
            <div />
          )}

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#5227FF]/20 border border-[#5227FF]/40 text-[#FF9FFC] text-[11px] font-rajdhani font-bold uppercase tracking-wider rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#FF9FFC] animate-ping"></span>
            <span>MONGODB CONNECTED</span>
          </div>
        </div>

        {/* Mill Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center bg-[#5227FF]/15 border border-[#5227FF]/30 text-[#FF9FFC] rounded-xl shadow-md mb-1">
            <Factory className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-rajdhani">
            EVEREST TEXTILE MILLS
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            FabricOps Digital Loom Operating System &bull; Station Sign In
          </p>
        </div>

        {/* Quick Persona Fill Pills */}
        <div className="bg-[#0D1220]/80 border border-slate-800/80 p-3 rounded-xl shadow-md space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-rajdhani font-bold uppercase tracking-widest text-slate-400">
              Verified MongoDB Accounts
            </p>
            <span className="text-[10px] font-mono text-[#FF9FFC] font-semibold">Pass: FabricOps@123456</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('admin@fabricops.com')}
              className={`p-2 text-center rounded border transition-all ${email === 'admin@fabricops.com' ? 'bg-[#5227FF]/30 border-[#5227FF] text-white shadow-[0_0_15px_rgba(82,39,255,0.4)]' : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'}`}
            >
              <span className="block text-[11px] font-bold font-rajdhani uppercase text-purple-300">Admin</span>
              <span className="block text-[9px] font-mono text-slate-400 truncate">admin@...</span>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('rajesh.weaver@fabricops.com')}
              className={`p-2 text-center rounded border transition-all ${email === 'rajesh.weaver@fabricops.com' ? 'bg-[#5227FF]/30 border-[#5227FF] text-white shadow-[0_0_15px_rgba(82,39,255,0.4)]' : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'}`}
            >
              <span className="block text-[11px] font-bold font-rajdhani uppercase text-emerald-300">Operator</span>
              <span className="block text-[9px] font-mono text-slate-400 truncate">rajesh...</span>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('aditi@apexgarments.com')}
              className={`p-2 text-center rounded border transition-all ${email === 'aditi@apexgarments.com' ? 'bg-[#5227FF]/30 border-[#5227FF] text-white shadow-[0_0_15px_rgba(82,39,255,0.4)]' : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'}`}
            >
              <span className="block text-[11px] font-bold font-rajdhani uppercase text-sky-300">Customer</span>
              <span className="block text-[9px] font-mono text-slate-400 truncate">aditi@...</span>
            </button>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border border-slate-800/80 bg-[#0D1220]/90 text-white rounded-xl shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#5227FF] via-[#FF9FFC] to-[#FFFFFF]"></div>

          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-white font-rajdhani">Sign In to Station</CardTitle>
              <span className="text-[10px] font-mono border border-slate-700 bg-slate-800/60 text-slate-300 px-2 py-0.5 rounded font-bold uppercase">
                Bcrypt + JWT
              </span>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Validates credentials against MongoDB database before redirecting to authorized workspace.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {displayError && (
              <div className="bg-red-950/40 border border-red-800/50 p-3 text-xs text-red-300 flex items-start gap-2.5 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{displayError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold font-rajdhani uppercase tracking-wider text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@fabricops.com"
                  disabled={loading}
                  className="w-full border border-slate-700/80 bg-[#0A0E1A] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#5227FF] focus:outline-none focus:ring-1 focus:ring-[#5227FF] rounded-lg transition-colors font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold font-rajdhani uppercase tracking-wider text-slate-300">Password</label>
                  <span className="text-[10px] text-slate-400 font-mono">Bcrypt Hashed</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={loading}
                    className="w-full border border-slate-700/80 bg-[#0A0E1A] px-3 py-2 pr-10 text-sm text-white placeholder-slate-500 focus:border-[#5227FF] focus:outline-none focus:ring-1 focus:ring-[#5227FF] rounded-lg transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-sm bg-gradient-to-r from-[#5227FF] via-[#7B42FF] to-[#FF9FFC] hover:shadow-[0_6px_25px_rgba(82,39,255,0.4)] text-white font-bold rounded-lg transition-all mt-2 font-rajdhani uppercase tracking-wider"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking with MongoDB...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" /> Verify &amp; Sign In
                  </span>
                )}
              </Button>
            </form>

            <div className="p-3 bg-[#5227FF]/10 border border-[#5227FF]/30 rounded-lg text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-[#FF9FFC] font-rajdhani font-bold uppercase tracking-wider text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Live MongoDB Authentication
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                Credentials are validated against the real MongoDB database. Only authenticated accounts will be redirected to their role's workspace.
              </p>
            </div>
          </CardContent>

          <CardFooter className="pt-0 flex flex-col space-y-2 border-t border-slate-800 p-6">
            <div className="text-center text-xs text-slate-400">
              New B2B Apparel Buyer?{' '}
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="text-[#FF9FFC] font-bold font-rajdhani uppercase tracking-wider hover:underline ml-1"
              >
                Register Customer Account →
              </button>
            </div>
          </CardFooter>
        </Card>

        {/* Security Notice */}
        <div className="space-y-1 text-center">
          <p className="text-[11px] text-slate-500 font-mono">
            Everest MillOS &bull; ISO 9001:2015 &bull; Encrypted Session Cookie
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. REGISTER PAGE
// ==========================================
export function RegisterPage({ onNavigateToLogin }) {
  const { registerCustomer, error: authError } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    companyName: '',
    taxId: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
  });

  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.companyName) {
      setLocalError('Please complete all required fields.');
      return;
    }

    if (formData.password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setLocalError('');
    setLoading(true);

    try {
      await registerCustomer({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        companyName: formData.companyName,
        taxId: formData.taxId,
        billingAddress: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: 'India',
        },
        shippingAddress: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: 'India',
        },
      });
    } catch (err) {
      setLocalError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-[#070A12] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative font-opensans selection:bg-[#5227FF] selection:text-white text-slate-100">
      {/* Subtle Textile Weave Grid Texture */}
      <div className="absolute inset-0 opacity-20 bg-twill pointer-events-none"></div>

      <div className="w-full max-w-2xl relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="flex items-center gap-1.5 text-xs font-rajdhani font-bold uppercase tracking-wider text-[#FF9FFC] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#5227FF]/15 border border-[#5227FF]/30 rounded-lg flex items-center justify-center text-[#FF9FFC]">
              <Factory className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold font-rajdhani uppercase tracking-wider text-white">EVEREST TEXTILE MILLS</span>
          </div>
        </div>

        <Card className="border border-slate-800/80 bg-[#0D1220]/90 text-white rounded-xl shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#5227FF] via-[#FF9FFC] to-[#FFFFFF]"></div>

          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-white font-rajdhani">B2B Customer Onboarding</CardTitle>
              <span className="text-[#FF9FFC] border border-[#5227FF]/40 bg-[#5227FF]/20 px-2 py-0.5 text-xs font-rajdhani font-bold uppercase tracking-wider rounded">
                Apparel Buyer Account
              </span>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Register your manufacturing firm to browse fabric specs, request quotations, and track loom batches.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {displayError && (
              <div className="bg-red-950/40 border border-red-800/50 p-3 text-xs text-red-300 flex items-start gap-2.5 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{displayError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold font-rajdhani uppercase tracking-wider text-slate-300">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="e.g. Apex Garments Ltd."
                    required
                    className="w-full border border-slate-700/80 bg-[#0A0E1A] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#5227FF] focus:outline-none focus:ring-1 focus:ring-[#5227FF] rounded-lg transition-colors"
                  />
                </div>

                {/* Tax ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold font-rajdhani uppercase tracking-wider text-slate-300">Tax ID / GSTIN</label>
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    placeholder="33AABCA1234F1Z5"
                    className="w-full border border-slate-700/80 bg-[#0A0E1A] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#5227FF] focus:outline-none focus:ring-1 focus:ring-[#5227FF] rounded-lg transition-colors"
                  />
                </div>

                {/* Contact Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold font-rajdhani uppercase tracking-wider text-slate-300">
                    Primary Contact Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Aditi Rao"
                    required
                    className="w-full border border-slate-700/80 bg-[#0A0E1A] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#5227FF] focus:outline-none focus:ring-1 focus:ring-[#5227FF] rounded-lg transition-colors"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold font-rajdhani uppercase tracking-wider text-slate-300">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98450 33445"
                    className="w-full border border-slate-700/80 bg-[#0A0E1A] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#5227FF] focus:outline-none focus:ring-1 focus:ring-[#5227FF] rounded-lg transition-colors"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold font-rajdhani uppercase tracking-wider text-slate-300">
                    Corporate Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="procurement@apexgarments.com"
                    required
                    className="w-full border border-slate-700/80 bg-[#0A0E1A] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#5227FF] focus:outline-none focus:ring-1 focus:ring-[#5227FF] rounded-lg transition-colors"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold font-rajdhani uppercase tracking-wider text-slate-300">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
                    required
                    className="w-full border border-slate-700/80 bg-[#0A0E1A] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#5227FF] focus:outline-none focus:ring-1 focus:ring-[#5227FF] rounded-lg transition-colors"
                  />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold font-rajdhani uppercase tracking-wider text-slate-300">
                    Confirm Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    required
                    className="w-full border border-slate-700/80 bg-[#0A0E1A] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#5227FF] focus:outline-none focus:ring-1 focus:ring-[#5227FF] rounded-lg transition-colors"
                  />
                </div>
              </div>

              {/* Address Fields */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <p className="text-xs font-bold font-rajdhani uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#FF9FFC]" /> Delivery & Billing Address
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      name="street"
                      value={formData.street}
                      onChange={handleChange}
                      placeholder="Street Address / Industrial Shed"
                      className="w-full border border-slate-700/80 bg-[#0A0E1A] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#5227FF] focus:outline-none focus:ring-1 focus:ring-[#5227FF] rounded-lg transition-colors"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="City"
                      className="w-full border border-slate-700/80 bg-[#0A0E1A] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#5227FF] focus:outline-none focus:ring-1 focus:ring-[#5227FF] rounded-lg transition-colors"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="State"
                      className="w-full border border-slate-700/80 bg-[#0A0E1A] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#5227FF] focus:outline-none focus:ring-1 focus:ring-[#5227FF] rounded-lg transition-colors"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="Postal Code"
                      className="w-full border border-slate-700/80 bg-[#0A0E1A] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#5227FF] focus:outline-none focus:ring-1 focus:ring-[#5227FF] rounded-lg transition-colors"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-sm bg-gradient-to-r from-[#5227FF] via-[#7B42FF] to-[#FF9FFC] hover:shadow-[0_6px_25px_rgba(82,39,255,0.4)] text-white font-bold rounded-lg transition-all mt-4"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Provisioning Account...
                  </span>
                ) : (
                  'Complete Registration & Enter Portal'
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pt-0 flex justify-center border-t border-slate-800 p-4">
            <span className="text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-[#FF9FFC] font-bold font-rajdhani uppercase tracking-wider hover:underline ml-1"
              >
                Sign In →
              </button>
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// Default export combining Auth routing if needed
export default function AuthPage({ view = 'login', onToggleView }) {
  if (view === 'register') {
    return <RegisterPage onNavigateToLogin={() => onToggleView?.('login')} />;
  }
  return <LoginPage onNavigateToRegister={() => onToggleView?.('register')} />;
}
