import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "../api";
import type { SessionUser } from "../types";

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = api.getStoredUser();
    if (!stored) {
      setLoading(false);
      return;
    }
    api
      .verify()
      .then(() => setUser(stored))
      .catch(() => {
        localStorage.removeItem("ma-las-token");
        localStorage.removeItem("ma-las-user");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const sessionUser = await api.login(username, password);
    setUser(sessionUser);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
