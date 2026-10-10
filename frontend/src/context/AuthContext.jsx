import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check authenticated session on initial mount
  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get('/auth/me');
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        setProfile(res.data.profile || null);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      // 401 simply means not logged in
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      setUser(res.data.user);
      setProfile(res.data.profile || null);
      return res.data;
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const registerCustomer = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/register-customer', data);
      setUser(res.data.user);
      setProfile(res.data.profile || null);
      return res.data;
    } catch (err) {
      setError(err.message || 'Registration failed.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setProfile(null);
      setIsLoading(false);
    }
  };

  // 1-Click Demo Login utility for development and evaluators
  const demoLogin = async (role) => {
    const credentials = {
      ADMIN: { email: 'admin@fabricops.com', password: 'FabricOps@123456' },
      CUSTOMER: { email: 'aditi@apexgarments.com', password: 'FabricOps@123456' },
      OPERATOR: { email: 'rajesh.weaver@fabricops.com', password: 'FabricOps@123456' },
    };

    const target = credentials[role] || credentials.ADMIN;
    return login(target.email, target.password);
  };

  const value = {
    user,
    profile,
    role: user?.role || null,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    registerCustomer,
    logout,
    demoLogin,
    refreshUser: checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
