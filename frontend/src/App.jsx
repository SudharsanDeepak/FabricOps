import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { AccessDeniedPage } from './pages/auth/AccessDeniedPage';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { FabricCatalogPage } from './pages/customer/FabricCatalogPage';
import { CustomerQuotesPage } from './pages/customer/CustomerQuotesPage';
import { CustomerOrdersPage } from './pages/customer/CustomerOrdersPage';
import { AdminQuotationsPage } from './pages/admin/AdminQuotationsPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminInventoryPage } from './pages/admin/AdminInventoryPage';
import { AdminProcurementPage } from './pages/admin/AdminProcurementPage';
import { AdminProductionPlanningPage } from './pages/admin/AdminProductionPlanningPage';
import { AdminControlTowerPage } from './pages/admin/AdminControlTowerPage';
import { AdminQualityControlPage } from './pages/admin/AdminQualityControlPage';
import { AdminDispatchInvoicesPage } from './pages/admin/AdminDispatchInvoicesPage';
import { AdminAttendanceWagesPage } from './pages/admin/AdminAttendanceWagesPage';
import { CustomerInvoicesPage } from './pages/customer/CustomerInvoicesPage';
import { OperatorDashboardPage } from './pages/operator/OperatorDashboardPage';
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
          <span>Verifying FabricOps Sentinel Session...</span>
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
    const operatorAllowed = ['my-machines', 'task-board', 'shift-log', 'breakdowns', 'handover', 'attendance', 'qc'];

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

    // Admin & Floor QC Sections
    if (currentSection === 'qc') {
      return <AdminQualityControlPage />;
    }
    if (currentSection === 'dispatch') {
      return <AdminDispatchInvoicesPage />;
    }
    if (currentSection === 'attendance' && role === 'ADMIN') {
      return <AdminAttendanceWagesPage />;
    }
    if (currentSection === 'control-tower') {
      return <AdminControlTowerPage />;
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

    // Default / Dashboard
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
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
