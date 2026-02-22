"use client";

/**
 * Global Application Context
 * Manages global state following the Context API pattern
 * Provides authentication and user information to the entire app
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { User } from "../types/domain";
import { AUTH_CONFIG } from "../constants/app";

interface AppContextType {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // User actions
  setUser: (user: User | null) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;

  // Auth state
  token: string | null;
  setToken: (token: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * App Context Provider Component
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Initialize app state from storage on mount
   */
  useEffect(() => {
    const initializeApp = async () => {
      if (typeof window === "undefined") return;

      try {
        const storedToken = localStorage.getItem(AUTH_CONFIG.TOKEN_STORAGE_KEY);
        const storedUser = localStorage.getItem(AUTH_CONFIG.USER_STORAGE_KEY);

        if (storedToken) {
          setTokenState(storedToken);
        }

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser) as User;
          setUserState(parsedUser);
          return;
        }

        if (storedToken) {
          const headers: HeadersInit = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${storedToken}`,
          };

          const response = await fetch("/api/auth/me", {
            method: "GET",
            headers,
            cache: "no-store",
          });

          if (response.ok) {
            const restoredUser = (await response.json()) as User;
            setUserState(restoredUser);
            localStorage.setItem(AUTH_CONFIG.USER_STORAGE_KEY, JSON.stringify(restoredUser));
          } else if (response.status === 401) {
            localStorage.removeItem(AUTH_CONFIG.TOKEN_STORAGE_KEY);
            localStorage.removeItem(AUTH_CONFIG.USER_STORAGE_KEY);
            setTokenState(null);
            setUserState(null);
          }
        }
      } catch (error) {
        console.error("Failed to initialize app state:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  /**
   * Set user and persist to storage
   */
  const setUser = useCallback((user: User | null) => {
    setUserState(user);
    if (typeof window === "undefined") return;

    if (user) {
      localStorage.setItem(AUTH_CONFIG.USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_CONFIG.USER_STORAGE_KEY);
    }
  }, []);

  /**
   * Set token and persist to storage
   */
  const setToken = useCallback((token: string | null) => {
    setTokenState(token);
    if (typeof window === "undefined") return;

    if (token) {
      localStorage.setItem(AUTH_CONFIG.TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(AUTH_CONFIG.TOKEN_STORAGE_KEY);
    }
  }, []);

  /**
   * Handle user logout
   */
  const logout = useCallback(() => {
    setUserState(null);
    setTokenState(null);

    if (typeof window === "undefined") return;

    localStorage.removeItem(AUTH_CONFIG.TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_CONFIG.USER_STORAGE_KEY);
  }, []);

  /**
   * Update user data
   */
  const updateUser = useCallback(
    (userData: Partial<User>) => {
      setUserState((prev) => (prev ? { ...prev, ...userData } : null));

      if (typeof window === "undefined" || !user) return;

      const updatedUser = { ...user, ...userData };
      localStorage.setItem(AUTH_CONFIG.USER_STORAGE_KEY, JSON.stringify(updatedUser));
    },
    [user],
  );

  const value: AppContextType = {
    user,
    isAuthenticated: !!token && !!user,
    isLoading,
    setUser,
    logout,
    updateUser,
    token,
    setToken,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Hook to use app context
 * Ensures context is only used within provider
 */
export function useApp(): AppContextType {
  const context = useContext(AppContext);

  if (context === undefined) {
    throw new Error("useApp must be used within AppProvider");
  }

  return context;
}

/**
 * Hook for authentication tracking
 */
export function useAuth() {
  const { user, isAuthenticated, isLoading, token, setUser, setToken, logout } = useApp();

  return {
    user,
    isAuthenticated,
    isLoading,
    token,
    setUser,
    setToken,
    logout,
  };
}

/**
 * Hook for user data
 */
export function useUser() {
  const { user, setUser, updateUser } = useApp();

  return {
    user,
    setUser,
    updateUser,
  };
}
