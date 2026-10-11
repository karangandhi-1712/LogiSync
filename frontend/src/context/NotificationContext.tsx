import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMarketplaceEvent } from './MarketplaceContext';
import type { DeliverySchedule } from '../types';

export type NotificationType = 'broadcast' | 'claimed' | 'stop' | 'urgent' | 'system';

export interface TerminalNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
}

interface NotificationContextValue {
  notifications: TerminalNotification[];
  unreadCount: number;
  addNotification: (n: { type: NotificationType; title: string; body: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const MAX = 60;

/**
 * In-app activity feed, fed by the marketplace event socket rather than a
 * hard-coded list. Kept client-side deliberately: these are transient
 * operational pings, not durable records - the audit trail lives in
 * `status_update_log` on the server.
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<TerminalNotification[]>([]);
  const idRef = useRef(0);

  const addNotification = useCallback(
    ({ type, title, body }: { type: NotificationType; title: string; body: string }) => {
      idRef.current += 1;
      const item: TerminalNotification = {
        id: `n-${Date.now()}-${idRef.current}`,
        type,
        title,
        body,
        timestamp: Date.now(),
        read: false,
      };
      setNotifications((prev) => [item, ...prev].slice(0, MAX));
    },
    [],
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  // Mirror the socket events into the bell feed.
  useMarketplaceEvent('schedule:broadcast', (d: DeliverySchedule) => {
    addNotification({
      type: 'broadcast',
      title: `New batch - ${d?.area_label ?? 'unknown area'}`,
      body: `${d?.stop_count ?? 0} stops · departs ${d?.departure_window_start}–${d?.departure_window_end}`,
    });
  });

  useMarketplaceEvent('schedule:claimed', (d) => {
    addNotification({
      type: 'claimed',
      title: 'Batch claimed',
      body: `${d?.schedule?.area_label ?? 'A batch'} is no longer open for claiming.`,
    });
  });

  useMarketplaceEvent('schedule:stop_added', (d) => {
    addNotification({
      type: 'stop',
      title: 'Stop added to a batch',
      body: d?.request?.delivery_address ?? 'A new delivery joined a running batch.',
    });
  });

  useMarketplaceEvent('delivery:status_changed', (d) => {
    addNotification({
      type: 'stop',
      title: `Stop ${d?.request?.stop_sequence ?? '?'} - ${String(d?.request?.status ?? '').replace('_', ' ')}`,
      body: d?.request?.delivery_address ?? '',
    });
  });

  // Clear stale pings on sign-out so the next session starts clean.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'logisync_token' && !e.newValue) setNotifications([]);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      addNotification,
      markRead,
      markAllRead,
      clearAll,
    }),
    [notifications, addNotification, markRead, markAllRead, clearAll],
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}