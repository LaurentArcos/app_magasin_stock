"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextValue {
  isAdmin: boolean;
  // code conservé en mémoire pour l'envoyer lors des modifications de prix
  adminCode: string | null;
  login: (code: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "admin_code";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [adminCode, setAdminCode] = useState<string | null>(null);

  // Restaure le code depuis la session (onglet courant uniquement).
  useEffect(() => {
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    if (saved) setAdminCode(saved);
  }, []);

  const login = useCallback(async (code: string) => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      setAdminCode(code);
      window.sessionStorage.setItem(STORAGE_KEY, code);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setAdminCode(null);
    window.sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAdmin: adminCode !== null, adminCode, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return ctx;
}
