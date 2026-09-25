import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';

import { api } from '../services/api';

interface UserProfile {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  profile?: string;
  role: string;
  lead_id?: number | null;
  is_active: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('staff_token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!localStorage.getItem('staff_token'));
  const navigate = useNavigate();

  const fetchProfile = async (authToken?: string) => {
    try {
      const headers = authToken
        ? { Authorization: `Bearer ${authToken}` }
        : undefined;
      const res = await api.get('/staff/me', { headers });
      setUser(res.data);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      localStorage.removeItem('staff_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [token]);

  const login = async (newToken: string) => {
    localStorage.setItem('staff_token', newToken);
    setIsLoading(true);
    setToken(newToken);
    navigate('/');
  };

  const logout = () => {
    localStorage.removeItem('staff_token');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token && !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading, token } = useAuth();

  if (isLoading || (token && !isAuthenticated)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};
