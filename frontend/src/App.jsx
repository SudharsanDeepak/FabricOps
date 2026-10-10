import React, { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';

export function App() {
  const [activeRole, setActiveRole] = useState('ADMIN');
  const [currentSection, setCurrentSection] = useState('dashboard');

  const handleRoleChange = (role) => {
    setActiveRole(role);
    if (role === 'ADMIN') setCurrentSection('dashboard');
    if (role === 'CUSTOMER') setCurrentSection('catalog');
    if (role === 'OPERATOR') setCurrentSection('my-machines');
  };

  return (
    <AppShell
      activeRole={activeRole}
      onRoleChange={handleRoleChange}
      currentSection={currentSection}
      onSectionChange={setCurrentSection}
    >
      <DashboardPage
        activeRole={activeRole}
        currentSection={currentSection}
      />
    </AppShell>
  );
}

export default App;

