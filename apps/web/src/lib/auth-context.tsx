"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser } from "@rr-kitchen/shared";
import { apiFetch, ApiError } from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/me");
      setUser(data.user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
