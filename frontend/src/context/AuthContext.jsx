import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { resetSocket } from '../lib/socket';

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
        resetSocket();
      } else {
        setUser(null);
        setProfile(null);
        resetSocket();
      }
    } catch (err) {
      // 401 simply means not logged in
      setUser(null);
      setProfile(null);
      resetSocket();
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
      resetSocket();
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
      resetSocket();
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
      resetSocket();
      setIsLoading(false);
    }
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
