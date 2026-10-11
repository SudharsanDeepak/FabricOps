import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage, RegisterPage, AccessDeniedPage } from './pages/auth';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import {
  FabricCatalogPage,
  CustomerQuotesPage,
  CustomerOrdersPage,
  CustomerInvoicesPage,
  CustomerProfilePage
} from './pages/customer';
import {
  AdminControlTowerPage,
  AdminQuotationsPage,
  AdminOrdersPage,
  AdminInventoryPage,
  AdminProcurementPage,
  AdminProductionPlanningPage,
  AdminAttendancePage
} from './pages/admin';
import { OperatorDashboardPage } from './pages/operator';
import { Loader2, Factory } from 'lucide-react';

import { MillProvider, useMill } from './context/MillContext';
import { LandingPage } from './components/landing/LandingPage';

function AppContent({
  authView: parentAuthView,
  setAuthView: parentSetAuthView,
  prefillEmail: parentPrefillEmail,
  setPrefillEmail: parentSetPrefillEmail,
}) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const [internalAuthView, setInternalAuthView] = useState('landing');
  const authView = parentAuthView !== undefined ? parentAuthView : internalAuthView;
  const setAuthView = parentSetAuthView || setInternalAuthView;

  const [internalPrefillEmail, setInternalPrefillEmail] = useState('');
  const prefillEmail = parentPrefillEmail !== undefined ? parentPrefillEmail : internalPrefillEmail;
  const setPrefillEmail = parentSetPrefillEmail || setInternalPrefillEmail;

  const [currentSection, setCurrentSection] = useState('dashboard');

  // RBAC Allowed Sections
  const adminAllowed = [
    'dashboard',
    'control-tower',
    'quotations',
    'orders',
    'inventory',
    'procurement',
    'planning',
    'machines',
    'qc',
    'dispatch',
    'attendance',
    'staff',
    'audits',
  ];
  const customerAllowed = ['catalog', 'request-quote', 'my-quotes', 'my-orders', 'invoices', 'profile'];
  const operatorAllowed = ['my-machines', 'task-board', 'shift-log', 'breakdowns', 'handover', 'attendance'];

  // Automatic routing on login based on authenticated MongoDB user role
  useEffect(() => {
    if (isAuthenticated) {
      if (role === 'CUSTOMER' && (currentSection === 'dashboard' || !customerAllowed.includes(currentSection))) {
        setCurrentSection('catalog');
      } else if (role === 'OPERATOR' && (currentSection === 'dashboard' || !operatorAllowed.includes(currentSection))) {
        setCurrentSection('my-machines');
      } else if (role === 'ADMIN' && !adminAllowed.includes(currentSection)) {
        setCurrentSection('dashboard');
      }
    }
  }, [isAuthenticated, role]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-[#5227FF] selection:text-white">
        <div className="flex h-14 w-14 items-center justify-center bg-[#0D1220] border border-[#5227FF]/60 text-[#FF9FFC] shadow-[0_0_30px_rgba(82,39,255,0.4)] mb-4 animate-bounce">
          <Factory className="h-7 w-7" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300 font-rajdhani font-bold uppercase tracking-wider">
          <Loader2 className="h-4 w-4 animate-spin text-[#FF9FFC]" />
          <span>Validating Everest MillOS MongoDB Session...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated views
  if (!isAuthenticated) {
    if (authView === 'register') {
      return (
        <RegisterPage
          onNavigateToLogin={() => {
            setAuthView('login');
          }}
        />
      );
    }
    if (authView === 'login') {
      return (
        <LoginPage
          defaultEmail={prefillEmail}
          onNavigateToRegister={() => setAuthView('register')}
          onNavigateToLanding={() => setAuthView('landing')}
        />
      );
    }
    return (
      <LandingPage
        onNavigateToLogin={(email) => {
          setPrefillEmail(email || 'admin@fabricops.com');
          setAuthView('login');
        }}
        onNavigateToRegister={() => setAuthView('register')}
      />
    );
  }

  // RBAC Section Access Check
  const isSectionPermitted = () => {
    if (role === 'ADMIN') return adminAllowed.includes(currentSection);
    if (role === 'CUSTOMER') return customerAllowed.includes(currentSection);
    if (role === 'OPERATOR') return operatorAllowed.includes(currentSection);
    return false;
  };

  const renderActiveSection = () => {
    // Customer Sections
    if (currentSection === 'catalog' || currentSection === 'request-quote') {
      return <FabricCatalogPage onNavigateSection={setCurrentSection} />;
    }
    if (currentSection === 'my-quotes') {
      return <CustomerQuotesPage onNavigateSection={setCurrentSection} />;
    }
    if (currentSection === 'my-orders') {
      return <CustomerOrdersPage onNavigateSection={setCurrentSection} />;
    }
    if (currentSection === 'invoices') {
      return <CustomerInvoicesPage onNavigateSection={setCurrentSection} />;
    }
    if (currentSection === 'profile') {
      return <CustomerProfilePage onNavigateSection={setCurrentSection} />;
    }

    // Admin Sections
    if (currentSection === 'control-tower') {
      return <AdminControlTowerPage onNavigateSection={setCurrentSection} />;
    }
    if (currentSection === 'quotations') {
      return <AdminQuotationsPage />;
    }
    if (currentSection === 'orders') {
      return <AdminOrdersPage />;
    }
    if (currentSection === 'inventory') {
      return <AdminInventoryPage />;
    }
    if (currentSection === 'procurement') {
      return <AdminProcurementPage />;
    }
    if (currentSection === 'planning') {
      return <AdminProductionPlanningPage />;
    }
    if (role === 'ADMIN' && currentSection === 'attendance') {
      return <AdminAttendancePage onNavigateSection={setCurrentSection} />;
    }

    // Operator Sections
    if (
      role === 'OPERATOR' ||
      currentSection === 'my-machines' ||
      currentSection === 'task-board' ||
      currentSection === 'shift-log' ||
      currentSection === 'breakdowns' ||
      currentSection === 'handover' ||
      currentSection === 'attendance'
    ) {
      return (
        <OperatorDashboardPage
          activeTab={currentSection}
          onNavigateSection={setCurrentSection}
        />
      );
    }

    // Default / Dashboard & Sub-consoles (machines, qc, dispatch, staff, audits)
    return (
      <DashboardPage
        currentSection={currentSection}
        onNavigateSection={setCurrentSection}
      />
    );
  };

  return (
    <AppShell
      currentSection={currentSection}
      onSectionChange={setCurrentSection}
    >
      {isSectionPermitted() ? (
        renderActiveSection()
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
  const [authView, setAuthView] = useState('landing');
  const [prefillEmail, setPrefillEmail] = useState('');

  return (
    <AuthProvider>
      <MillProvider
        onOpenAuthModal={(role) => {
          const email = role === 'admin' || role === 'manager'
            ? 'admin@fabricops.com'
            : role === 'employee' || role === 'operator'
            ? 'rajesh.weaver@fabricops.com'
            : 'aditi@apexgarments.com';
          setPrefillEmail(email);
          setAuthView('login');
        }}
      >
        <AppContent
          authView={authView}
          setAuthView={setAuthView}
          prefillEmail={prefillEmail}
          setPrefillEmail={setPrefillEmail}
        />
      </MillProvider>
    </AuthProvider>
  );
}

export default App;
