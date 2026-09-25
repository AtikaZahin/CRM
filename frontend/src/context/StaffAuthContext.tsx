import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';

import { api } from '../services/api';

interface StaffProfile {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  profile?: string;
  role: string;
  lead_id?: number | null;
  is_active: boolean;
}

interface StaffAuthContextType {
  user: StaffProfile | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

export const StaffAuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('staff_token'));
  const [user, setUser] = useState<StaffProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!localStorage.getItem('staff_token'));
  const navigate = useNavigate();

  const fetchProfile = async (authToken: string) => {
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      const res = await api.get('/staff/me', { headers });
      setUser(res.data);
    } catch (err) {
      console.error('Failed to fetch staff profile:', err);
      localStorage.removeItem('staff_token');
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
    localStorage.setItem('staff_token', newToken);
    setIsLoading(true);
    setToken(newToken);
    navigate('/staff/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('staff_token');
    setToken(null);
    setUser(null);
    navigate('/staff/login');
  };

  return (
    <StaffAuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token && !!user, isLoading }}>
      {children}
    </StaffAuthContext.Provider>
  );
};

export const useStaffAuth = () => {
  const context = useContext(StaffAuthContext);
  if (context === undefined) {
    throw new Error('useStaffAuth must be used within a StaffAuthProvider');
  }
  return context;
};

export const ProtectedStaffRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading, token } = useStaffAuth();
  const location = useLocation();

  if (isLoading || (token && !isAuthenticated)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/staff/login" state={{ from: location }} replace />;
  }
  return children;
};
