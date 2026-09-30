import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { apiClient, authHeader } from "../api/client";

export interface CustomerUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  created_at?: string;
}

interface CustomerAuthContextType {
  user: CustomerUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const STORAGE_KEY = "customer_token";

const CustomerAuthContext = createContext<CustomerAuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomerUser = async (authToken: string) => {
    try {
      const res = await apiClient.get<CustomerUser>("/customer/me", {
        headers: authHeader(authToken),
      });
      setUser(res.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        // Only 401 logs the user out
        await SecureStore.deleteItemAsync(STORAGE_KEY);
        setToken(null);
        setUser(null);
      }
      // Network error or server error keeps saved session
    }
  };

  useEffect(() => {
    async function loadSession() {
      try {
        const savedToken = await SecureStore.getItemAsync(STORAGE_KEY);
        if (savedToken) {
          setToken(savedToken);
          await fetchCustomerUser(savedToken);
        }
      } catch (e) {
        console.error("Failed to load customer session", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  const login = async (newToken: string) => {
    await SecureStore.setItemAsync(STORAGE_KEY, newToken);
    setToken(newToken);
    await fetchCustomerUser(newToken);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCustomerUser(token);
    }
  };

  return (
    <CustomerAuthContext.Provider
      value={{ user, token, isLoading, login, logout, refreshUser }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  return useContext(CustomerAuthContext);
}
