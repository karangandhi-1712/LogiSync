import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { MarketplaceEvent, SocketState } from '../types';
import { createEventSocket, type EventSocketHandle } from '../services/api';
import { useAuth } from './AuthContext';

interface MarketplaceContextValue {
  state: SocketState;
  /** True whenever the socket is down - pages poll REST instead. */
  isFallback: boolean;
  lastEvent: MarketplaceEvent | null;
  /** Subscribe to one event type; returns an unsubscribe fn. */
  subscribe: (type: string, handler: (data: any) => void) => () => void;
  send: (type: string, data?: unknown) => void;
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

/**
 * Single authenticated socket shared by every ops screen.
 *
 * Consumers of events use `subscribe(type, handler)` rather than reading
 * `lastEvent`, so a page that mounts after a broadcast already fired still gets
 * subsequent ones without a render-time race.
 */
export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [state, setState] = useState<SocketState>('connecting');
  const [isFallback, setIsFallback] = useState(true);
  const [lastEvent, setLastEvent] = useState<MarketplaceEvent | null>(null);
  const handlers = useRef(new Map<string, Set<(data: any) => void>>());
  const socketRef = useRef<EventSocketHandle | null>(null);

  const subscribe = useCallback((type: string, handler: (data: any) => void) => {
    const set = handlers.current.get(type) ?? new Set();
    set.add(handler);
    handlers.current.set(type, set);
    return () => {
      set.delete(handler);
    };
  }, []);

  useEffect(() => {
    // No session yet - don't open a socket that would be rejected anyway.
    // `token` is a dependency, not a mount-time read: signing in swaps the token
    // and we must open the socket *then*. Reading localStorage in a `[]`-dep
    // effect silently left every fresh login running on REST fallback.
    if (!token) {
      setState('disconnected');
      setIsFallback(true);
      return;
    }

    const socket = createEventSocket(
      (event) => {
        setLastEvent(event);
        handlers.current.get(event.type)?.forEach((fn) => {
          try {
            fn(event.data);
          } catch (err) {
            console.error('[marketplace] subscriber threw', err);
          }
        });
        // Also fan out to wildcard subscribers.
        handlers.current.get('*')?.forEach((fn) => fn(event));
      },
      setState,
      setIsFallback,
    );
    socketRef.current = socket;

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [token]);

  const send = useCallback((type: string, data?: unknown) => {
    socketRef.current?.send(type as any, data);
  }, []);

  const value = useMemo(
    () => ({ state, isFallback, lastEvent, subscribe, send }),
    [state, isFallback, lastEvent, subscribe, send],
  );

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error('useMarketplace must be used inside MarketplaceProvider');
  return ctx;
}

/**
 * Run `handler` whenever `type` arrives. Re-subscribes when `type` changes, and
 * does not re-run on every parent render (the handler goes through a ref).
 */
export function useMarketplaceEvent(type: string, handler: (data: any) => void) {
  const { subscribe } = useMarketplace();
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!type || type === '*') return;
    return subscribe(type, (data) => ref.current(data));
  }, [type, subscribe]);
}