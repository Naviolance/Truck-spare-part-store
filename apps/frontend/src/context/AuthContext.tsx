"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiFetch, setAccessToken, refreshSession, onSessionExpire } from "@/lib/api";

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchMe() {
    const res = await apiFetch("/users/me");
    setUser(res.ok ? await res.json() : null);
  }

  useEffect(() => {
    // If the session ever expires later — e.g. some unrelated page's API
    // call gets a 401, tries a silent refresh, and THAT fails because 15
    // minutes of real inactivity have passed — this is what flips the
    // navbar back to logged-out, without needing a page reload.
    onSessionExpire(() => setUser(null));

    let cancelled = false;

    // refreshSession() is the single shared, module-level, single-flight
    // refresh call (see lib/api.ts) — used here for the initial mount-time
    // restore, and reused by apiFetch's silent 401-retry elsewhere. Sharing
    // one implementation is what stops two near-simultaneous refresh
    // attempts (Strict Mode's double-invoke in dev, or a genuine race
    // between this and some other page's request) from ever racing on the
    // same not-yet-rotated cookie.
    refreshSession()
      .then(async (restored) => {
        if (cancelled) return;
        if (restored) await fetchMe();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string) {
    const res = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Login failed");
    }
    const data = await res.json();
    setAccessToken(data.accessToken);
    await fetchMe();
  }

  async function register(data: { email: string; password: string; firstName: string; lastName: string }) {
    const res = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuth: true,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Registration failed");
    }
    const resData = await res.json();
    setAccessToken(resData.accessToken);
    await fetchMe();
  }

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" });
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}