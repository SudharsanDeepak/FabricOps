import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

const MillContext = createContext(null);

export function MillProvider({ children, onOpenAuthModal, onSelectRole }) {
  const { user, role, login } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentRole, setCurrentRoleState] = useState(role || 'manager');

  const [yarnInventory, setYarnInventory] = useState([
    { id: 1, yarnType: 'Cotton 30s Combed', currentStockKg: 5200 },
    { id: 2, yarnType: 'Denim Warp 10s Ring Spun', currentStockKg: 4100 },
    { id: 3, yarnType: 'French Organic Linen 40s', currentStockKg: 1950 },
    { id: 4, yarnType: 'Polyester Microfilament 50D', currentStockKg: 1200 },
  ]);

  const [machines, setMachines] = useState([
    { id: 1, code: 'LOOM-AJ-01', type: 'Air-Jet', metersToday: 540, status: 'RUNNING' },
    { id: 2, code: 'LOOM-RP-02', type: 'Rapier', metersToday: 480, status: 'RUNNING' },
    { id: 3, code: 'LOOM-JC-03', type: 'Jacquard', metersToday: 410, status: 'RUNNING' },
    { id: 4, code: 'SPIN-RF-04', type: 'Ring Frame', metersToday: 680, status: 'RUNNING' },
    { id: 5, code: 'DYE-JT-05', type: 'Jet Vessel', metersToday: 790, status: 'RUNNING' },
  ]);

  const [inspectedRolls, setInspectedRolls] = useState([
    { id: 1, rollId: 'ROL-901', status: 'PASS', grade: 'Grade A+' },
    { id: 2, rollId: 'ROL-902', status: 'PASS', grade: 'Grade A' },
    { id: 3, rollId: 'ROL-903', status: 'PASS', grade: 'Grade A+' },
    { id: 4, rollId: 'ROL-904', status: 'PASS', grade: 'Grade A' },
    { id: 5, rollId: 'ROL-905', status: 'PASS', grade: 'Grade A+' },
    { id: 6, rollId: 'ROL-906', status: 'REJECT', grade: 'Grade C' },
    { id: 7, rollId: 'ROL-907', status: 'PASS', grade: 'Grade A' },
  ]);

  const [orders, setOrders] = useState([
    { id: 1, code: 'ORD-2026-0018', buyer: 'Zara Global Sourcing', meters: 50000, status: 'IN_PRODUCTION' },
    { id: 2, code: 'ORD-2026-0019', buyer: 'Levi Strauss & Co.', meters: 24000, status: 'WEAVING' },
  ]);

  // Optionally enrich with live data if available for authorized internal staff
  useEffect(() => {
    if (role === 'ADMIN' || role === 'OPERATOR') {
      api.get('/inventory')
        .then((res) => {
          if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
            const mapped = res.data.map((item, idx) => ({
              id: item._id || idx,
              yarnType: item.itemDescription || item.itemCode || `Lot #${idx + 1}`,
              currentStockKg: item.currentStock || item.stockKg || 1200,
            }));
            setYarnInventory(mapped);
          }
        })
        .catch(() => {
          // Retain initial realistic mill stock
        });
    }
  }, [role]);

  const calculateMonthEndFinancials = () => {
    return {
      totalRevenue: 4850000,
      yarnCost: 1980000,
      powerCost: 450000,
      workerWages: 760000,
      netOperatingMargin: 1660000,
      marginPct: 34.2,
      currency: 'INR',
    };
  };

  const showToast = (message) => {
    console.log(`[FabricOps Mill Toast]: ${message}`);
  };

  const setCurrentRole = (newRole) => {
    setCurrentRoleState(newRole);
    if (onSelectRole) {
      onSelectRole(newRole);
    }
  };

  const loginAsRole = async (targetRole) => {
    try {
      if (targetRole === 'admin' || targetRole === 'manager') {
        await login('admin@fabricops.com', 'FabricOps@123456');
      } else if (targetRole === 'employee') {
        await login('rajesh.weaver@fabricops.com', 'FabricOps@123456');
      } else if (targetRole === 'buyer') {
        if (onOpenAuthModal) {
          onOpenAuthModal('buyer');
        } else {
          setIsAuthModalOpen(true);
        }
      }
    } catch {
      // If login fails, open the auth portal
      setIsAuthModalOpen(true);
      if (onOpenAuthModal) onOpenAuthModal(targetRole);
    }
  };

  const handleSetIsAuthModalOpen = (open) => {
    setIsAuthModalOpen(open);
    if (onOpenAuthModal && open) {
      onOpenAuthModal();
    }
  };

  const value = {
    currentUser: user,
    currentRole,
    setCurrentRole,
    loginAsRole,
    isAuthModalOpen,
    setIsAuthModalOpen: handleSetIsAuthModalOpen,
    yarnInventory,
    machines,
    inspectedRolls,
    orders,
    calculateMonthEndFinancials,
    showToast,
  };

  return <MillContext.Provider value={value}>{children}</MillContext.Provider>;
}

export function useMill() {
  const context = useContext(MillContext);
  if (!context) {
    // Provide safe fallback defaults so LandingPage never crashes even if rendered standalone
    return {
      currentUser: null,
      currentRole: 'manager',
      setCurrentRole: () => {},
      loginAsRole: () => {},
      isAuthModalOpen: false,
      setIsAuthModalOpen: () => {},
      yarnInventory: [
        { id: 1, yarnType: 'Cotton 30s', currentStockKg: 12450 }
      ],
      machines: [
        { id: 1, code: 'LOOM-01', metersToday: 14850 }
      ],
      inspectedRolls: [
        { id: 1, status: 'PASS' },
        { id: 2, status: 'PASS' }
      ],
      orders: [],
      calculateMonthEndFinancials: () => ({ marginPct: 34.2 }),
      showToast: () => {},
    };
  }
  return context;
}
