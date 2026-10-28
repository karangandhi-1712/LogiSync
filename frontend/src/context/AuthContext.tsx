import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { AuthUser, AvailabilityStatus } from '../types';
import api, { fetchMe, login as loginRequest } from '../services/api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<string>;
  /** Adopt a token issued by a signup/refresh endpoint, without a re-login. */
  adoptSession: (accessToken: string) => Promise<string>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  setAvailability: (status: AvailabilityStatus, goingOfflineAt?: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = 'logisync_token';

function toAuthUser(data: any): AuthUser {
  return {
    sub: data.id,
    email: data.email,
    name: data.full_name,
    role: data.role,
    groups: [data.role],
    assigned_port_id: data.assigned_port_id ?? null,
    availability_status: data.availability_status ?? 'available',
    vehicle_number: data.vehicle_number ?? null,
    vehicle_type: data.vehicle_type ?? null,
    mobile_number: data.mobile_number ?? null,
    photo_url: data.photo_url ?? null,
    must_change_password: data.must_change_password ?? false,
  } as AuthUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setLoading] = useState(false);
  const [isRestoring, setRestoring] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const [error, setError] = useState<string | null>(null);

  const refreshMe = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      setRestoring(false);
      return;
    }
    setRestoring(true);
    setError(null);
    try {
      const me = await fetchMe();
      setUser(toAuthUser(me));
      setToken(t);
    } catch (e: any) {
      // A backend restart is a transient network failure, not proof that the
      // saved session is invalid. Keep the token so the user can retry restore.
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setToken(null);
      } else {
        setError(apiErrorMessage(e, 'Could not restore your session. Check that the backend is running on port 8000.'));
      }
    } finally {
      setRestoring(false);
    }
  }, []);

  useEffect(() => {
    if (token && !user) refreshMe();
  }, [token, user, refreshMe]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      setLoading(true);
      setError(null);
      // Clear any stale session (e.g. a previous fleet_manager) before
      // authenticating so the UI never renders the old role while /me resolves.
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      try {
        const data = await loginRequest(identifier, password);
        localStorage.setItem(TOKEN_KEY, data.access_token);
        const me = await fetchMe();
        setToken(data.access_token);
        setUser(toAuthUser(me));
        return me.role as string;
      } catch (e: any) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setError(apiErrorMessage(e, 'Login failed'));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const adoptSession = useCallback(
    async (accessToken: string) => {
      localStorage.setItem(TOKEN_KEY, accessToken);
      setToken(accessToken);
      const me = await fetchMe();
      setUser(toAuthUser(me));
      return me.role as string;
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setToken(null);
  }, []);

  const setAvailability = useCallback(
    async (status: AvailabilityStatus, goingOfflineAt?: string | null) => {
      const { setAvailability: call } = await import('../services/api');
      const res = await call(status, goingOfflineAt ?? null);
      setUser((prev) => (prev ? { ...prev, availability_status: res.availability_status } : prev));
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, isRestoring, error, login, adoptSession, logout, refreshMe, setAvailability }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function apiErrorMessage(error: any, fallback: string): string {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (error?.code === 'ECONNABORTED') return 'The backend did not respond in time. Please check your connection and try again.';
  if (!error?.response) return 'Cannot reach the backend. Please check your network connection and verify the backend status.';
  return fallback;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
