import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, getToken, setToken, User, Role } from '../api';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (p: { name: string; username: string; password: string; role: Role }) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const r = await api.login(username, password);
    setToken(r.token);
    setUser(r.user);
    return r.user;
  };

  const register = async (p: { name: string; username: string; password: string; role: Role }) => {
    const r = await api.register(p);
    setToken(r.token);
    setUser(r.user);
    return r.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const refresh = async () => {
    try {
      const r = await api.me();
      setUser(r.user);
    } catch {
      /* ignore */
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
