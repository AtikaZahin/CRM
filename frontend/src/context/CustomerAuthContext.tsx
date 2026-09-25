import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';

import { api } from '../services/api';

interface CustomerProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

interface CustomerAuthContextType {
  user: CustomerProfile | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const CustomerAuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('customer_token'));
  const [user, setUser] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!localStorage.getItem('customer_token'));
  const navigate = useNavigate();

  const fetchProfile = async (authToken: string) => {
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      const res = await api.get('/customer/me', { headers });
      setUser(res.data);
    } catch (err) {
      console.error('Failed to fetch customer profile:', err);
      localStorage.removeItem('customer_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [token]);

  const login = async (newToken: string) => {
    localStorage.setItem('customer_token', newToken);
    setIsLoading(true);
    setToken(newToken);
    navigate('/shop/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('customer_token');
    setToken(null);
    setUser(null);
    navigate('/shop/login');
  };

  return (
    <CustomerAuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token && !!user, isLoading }}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};

export const ProtectedCustomerRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading, token } = useCustomerAuth();
  const location = useLocation();

  if (isLoading || (token && !isAuthenticated)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/shop/login" state={{ from: location }} replace />;
  }
  return children;
};
