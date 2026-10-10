import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { AccessDeniedPage } from './pages/auth/AccessDeniedPage';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { Loader2, Factory } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [currentSection, setCurrentSection] = useState('dashboard');

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-4 animate-bounce">
          <Factory className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span>Verifying Everest Mill Sentinel Session...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated views
  if (!isAuthenticated) {
    if (authView === 'register') {
      return <RegisterPage onNavigateToLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onNavigateToRegister={() => setAuthView('register')} />;
  }

  // RBAC Section Access Check
  const isSectionPermitted = () => {
    const adminAllowed = ['dashboard', 'quotations', 'orders', 'inventory', 'machines', 'qc', 'dispatch', 'attendance', 'staff', 'audits'];
    const customerAllowed = ['catalog', 'request-quote', 'my-quotes', 'my-orders', 'invoices', 'profile'];
    const operatorAllowed = ['my-machines', 'shift-log', 'breakdowns', 'handover', 'attendance'];

    if (role === 'ADMIN') return adminAllowed.includes(currentSection);
    if (role === 'CUSTOMER') return customerAllowed.includes(currentSection);
    if (role === 'OPERATOR') return operatorAllowed.includes(currentSection);
    return false;
  };

  return (
    <AppShell
      currentSection={currentSection}
      onSectionChange={setCurrentSection}
    >
      {isSectionPermitted() ? (
        <DashboardPage
          currentSection={currentSection}
          onNavigateSection={setCurrentSection}
        />
      ) : (
        <AccessDeniedPage
          requiredRole={currentSection.startsWith('my-') ? 'CUSTOMER / OPERATOR' : 'ADMIN'}
          onReturnHome={() => {
            if (role === 'ADMIN') setCurrentSection('dashboard');
            if (role === 'CUSTOMER') setCurrentSection('catalog');
            if (role === 'OPERATOR') setCurrentSection('my-machines');
          }}
        />
      )}
    </AppShell>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
