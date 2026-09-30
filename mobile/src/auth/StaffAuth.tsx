import React, { createContext, useContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { apiClient, authHeader } from "../api/client";

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "LEAD" | "EMPLOYEE";
  is_active: boolean;
  team_id?: number | null;
}

interface StaffAuthContextType {
  user: StaffUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const STORAGE_KEY = "staff_token";

const StaffAuthContext = createContext<StaffAuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function StaffAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStaffUser = async (authToken: string) => {
    try {
      const res = await apiClient.get<StaffUser>("/staff/me", {
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
      // Network error or server error keeps the saved token session
    }
  };

  useEffect(() => {
    async function loadSession() {
      try {
        const savedToken = await SecureStore.getItemAsync(STORAGE_KEY);
        if (savedToken) {
          setToken(savedToken);
          await fetchStaffUser(savedToken);
        }
      } catch (e) {
        console.error("Failed to load staff session", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  const login = async (newToken: string) => {
    await SecureStore.setItemAsync(STORAGE_KEY, newToken);
    setToken(newToken);
    await fetchStaffUser(newToken);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchStaffUser(token);
    }
  };

  return (
    <StaffAuthContext.Provider
      value={{ user, token, isLoading, login, logout, refreshUser }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  return useContext(StaffAuthContext);
}
