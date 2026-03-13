'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { apiLogin, apiRegister, apiGetMe, ApiError } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'oranje-auth-token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      apiGetMe(stored)
        .then((res) => {
          setUser(res.user);
          setToken(stored);
          setStatus('authenticated');
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          setStatus('unauthenticated');
        });
    } else {
      setStatus('unauthenticated');
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiLogin(email, password);
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem(TOKEN_KEY, res.token);
      setStatus('authenticated');
      return {};
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed';
      return { error: message };
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await apiRegister(name, email, password);
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem(TOKEN_KEY, res.token);
      setStatus('authenticated');
      return {};
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Registration failed';
      return { error: message };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    setStatus('unauthenticated');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, status, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
