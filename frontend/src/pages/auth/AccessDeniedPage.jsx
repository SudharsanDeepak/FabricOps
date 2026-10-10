import React from 'react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useAuth } from '../../context/AuthContext';

export function AccessDeniedPage({ requiredRole, onReturnHome }) {
  const { user, role } = useAuth();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto">
      <div className="h-16 w-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-sm border border-rose-200">
        <ShieldAlert className="h-8 w-8" />
      </div>

      <Badge variant="destructive" className="mb-2 uppercase text-xs tracking-wider">
        403 Forbidden &bull; Access Denied
      </Badge>

      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
        Restricted Operational Zone
      </h2>

      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
        Your authenticated identity (<strong>{user?.name}</strong>, Role:{' '}
        <Badge variant="outline" className="font-mono text-xs ml-1">{role}</Badge>) does not possess sufficient authorizations to view or execute operations in this section.
      </p>

      {requiredRole && (
        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          This resource is strictly designated for <strong>{requiredRole}</strong> personnel.
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={onReturnHome} className="bg-slate-900 text-white hover:bg-slate-800 text-xs flex items-center gap-2">
          <Home className="h-4 w-4" /> Return to My Workspace
        </Button>
      </div>
    </div>
  );
}
