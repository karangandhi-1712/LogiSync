import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AuthUser } from '../types';
import { isDemoMode } from '../config/aws';
import { cognitoLogin, cognitoSignup, cognitoLogout } from '../services/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  isDemoMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: (role?: string) => void;
  signup: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      if (isDemoMode) {
        // Demo mode — bypass Cognito
        setUser({
          sub: 'demo-user-001',
          email,
          name: email.split('@')[0].toUpperCase(),
          role: 'port_admin',
          groups: ['port_admin'],
        });
      } else {
        const authUser = await cognitoLogin(email, password);
        setUser(authUser);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginDemo = useCallback((role = 'port_admin') => {
    setUser({
      sub: 'demo-karanesh-001',
      email: 'karanesh@vocport.gov.in',
      name: 'KARANESH G.',
      role: role as AuthUser['role'],
      groups: [role],
    });
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string, role: string) => {
    setLoading(true);
    setError(null);
    try {
      await cognitoSignup(email, password, name, role);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Signup failed');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    cognitoLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, isDemoMode, login, loginDemo, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
