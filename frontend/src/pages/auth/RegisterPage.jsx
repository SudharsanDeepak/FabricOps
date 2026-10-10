import React, { useState } from 'react';
import {
  Factory,
  Building,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  FileText,
  AlertCircle,
  Loader2,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

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
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <div className="w-full max-w-2xl relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Sign In
          </button>
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-blue-500" />
            <span className="text-xs font-bold tracking-tight text-white">FabricOps</span>
          </div>
        </div>

        <Card className="border-slate-800 bg-slate-900/95 backdrop-blur text-slate-100 shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-white">B2B Customer Onboarding</CardTitle>
              <Badge variant="outline" className="text-blue-400 border-blue-500/30 bg-blue-500/10 text-xs">
                Apparel Buyer Account
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Register your manufacturing firm to browse fabric specs, request quotations, and track loom batches.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {displayError && (
              <div className="rounded-lg bg-rose-950/60 border border-rose-800/80 p-3 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{displayError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Company Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="e.g. Apex Garments Ltd."
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Tax ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Tax ID / GSTIN</label>
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    placeholder="33AABCA1234F1Z5"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Contact Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Primary Contact Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Aditi Rao"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98450 33445"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Corporate Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="procurement@apexgarments.com"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-slate-300">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Address Fields */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-blue-400" /> Delivery & Billing Address
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      name="street"
                      value={formData.street}
                      onChange={handleChange}
                      placeholder="Street Address / Industrial Shed"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="City"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="State"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="Postal Code"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 text-sm shadow-md transition-all mt-4"
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

          <CardFooter className="pt-0 flex justify-center border-t border-slate-800/80 p-4">
            <span className="text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-blue-400 font-semibold hover:underline"
              >
                Sign In
              </button>
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
