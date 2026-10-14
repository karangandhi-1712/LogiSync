import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Bell,
  ChevronDown,
  FileText,
  LogOut,
  Moon,
  Package,
  Radio,
  ShieldCheck,
  Sun,
  Truck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useMarketplace, useMarketplaceEvent } from '../../context/MarketplaceContext';
import { useNotifications } from '../../context/NotificationContext';
import { fetchMarketplaceKpis } from '../../services/api';
import type { DeliverySchedule } from '../../types';

const NOTIF_STYLE: Record<string, { cls: string; Icon: any }> = {
  broadcast: { cls: 'bg-sky-500/12 text-sky-600 dark:text-cyan-300 border-sky-400/30', Icon: Radio },
  claimed: { cls: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 border-emerald-400/30', Icon: Truck },
  stop: { cls: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300 border-indigo-400/30', Icon: Package },
  urgent: { cls: 'bg-rose-500/12 text-rose-600 dark:text-rose-300 border-rose-400/30', Icon: Zap },
};

/**
 * Ops header.
 *
 * The KPI strip and live indicator used to read truck telemetry. It now reads
 * marketplace state - the driver's availability and whatever the event socket
 * last told us - and the bell is fed by MarketplaceContext rather than a
 * hard-coded in-memory list.
 */
export function TopBar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { state } = useMarketplace();
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const navigate = useNavigate();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [stats, setStats] = useState({ active: 0, pending: 0, drivers: 0 });
  const userBtnRef = useRef<HTMLButtonElement>(null);
  const bellBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Marketplace KPIs are available to port admins and fleet managers only.
    // Drivers and customers should not make a request that will be rejected.
    if (user?.role !== 'port_admin' && user?.role !== 'fleet_manager') return;
    let cancelled = false;
    fetchMarketplaceKpis('7d', user?.assigned_port_id ?? undefined)
      .then((k) => {
        if (cancelled) return;
        setStats({
          active: k.active_batches ?? 0,
          pending: k.pending ?? 0,
          drivers: k.drivers_total ?? 0,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.assigned_port_id, user?.role]);

  // Live counters follow the same events the pages subscribe to.
  useMarketplaceEvent('schedule:broadcast', (d: DeliverySchedule) => {
    setStats((s) => ({ ...s, active: s.active + 1 }));
  });
  useMarketplaceEvent('schedule:claimed', () => {
    setStats((s) => ({ ...s, active: Math.max(0, s.active - 1) }));
  });
  useMarketplaceEvent('delivery:status_changed', () => {
    setStats((s) => ({ ...s, pending: Math.max(0, s.pending - 1) }));
  });

  useEffect(() => {
    if (!showUserMenu && !showNotifPanel) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (showUserMenu && menuRef.current && !menuRef.current.contains(t) && !userBtnRef.current?.contains(t)) {
        setShowUserMenu(false);
      }
      if (showNotifPanel && panelRef.current && !panelRef.current.contains(t) && !bellBtnRef.current?.contains(t)) {
        setShowNotifPanel(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
        setShowNotifPanel(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [showUserMenu, showNotifPanel]);

  const ROLE_LABEL: Record<string, string> = {
  port_admin: 'Port Admin',
  fleet_manager: 'Fleet Manager',
  driver: 'Driver',
  consumer: 'Customer',
};
const roleLabel = ROLE_LABEL[user?.role ?? 'driver'] ?? 'Operator';

  // Batch/driver counters are depot telemetry - meaningless on a customer
  // account, so the strip is ops-only.
  const isOpsRole = user?.role === 'port_admin' || user?.role === 'fleet_manager';

  return (
    <header className="relative z-40 flex-shrink-0 px-4 sm:px-6 h-16 flex items-center gap-4 border-b border-white/40 dark:border-white/8 bg-white/25 dark:bg-white/[0.02] backdrop-blur-xl">
      <Link to="/" className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 grid place-items-center text-white shadow-sm">
          <Package className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-black text-slate-900 dark:text-white leading-none">
            LogiSync
          </h1>
          <p className="text-[9px] font-bold text-slate-400 tracking-wider mt-0.5">
            DELIVERY MARKETPLACE
          </p>
        </div>
      </Link>

      {/* KPI strip */}
      {isOpsRole && (
        <div className="hidden lg:flex items-center gap-4 ml-4 text-[11px]">
          <Pill label="Active batches" value={stats.active} tone="sky" />
          <Pill label="Pending requests" value={stats.pending} tone="amber" />
          <Pill label="Drivers" value={stats.drivers} tone="emerald" />
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span
          className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
            state === 'connected'
              ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 border-emerald-400/30'
              : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-400/25'
          }`}
        >
          <span className="relative flex w-1.5 h-1.5">
            {state === 'connected' && (
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            )}
            <span
              className={`relative inline-flex w-1.5 h-1.5 rounded-full ${
                state === 'connected' ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
          </span>
          {state === 'connected' ? 'Live' : state}
        </span>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-500/10 dark:text-slate-400 dark:hover:text-slate-200 transition"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
        </button>

        <button
          ref={bellBtnRef}
          id="notif-bell-btn"
          onClick={() => setShowNotifPanel((s) => !s)}
          className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-500/10 dark:text-slate-400 dark:hover:text-slate-200"
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black grid place-items-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          ref={userBtnRef}
          onClick={() => setShowUserMenu((s) => !s)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-500/10 transition"
        >
          <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-600 dark:text-cyan-300 grid place-items-center text-[11px] font-black">
            {(user?.name ?? 'O').charAt(0).toUpperCase()}
          </div>
          <span className="hidden sm:block text-[11px] font-bold text-slate-700 dark:text-slate-200 max-w-[130px] truncate">
            {user?.name ?? 'Operator'} · {roleLabel}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {showNotifPanel && (
        <div className="fixed inset-0 z-[50]" onClick={() => setShowNotifPanel(false)} />
      )}
      {showNotifPanel && createPortal(
        <div
          ref={panelRef}
          className="fixed top-[68px] right-4 w-[360px] max-w-[92vw] rounded-2xl liquid-glass-elevated border border-white/50 dark:border-white/10 shadow-2xl overflow-hidden"
          style={{ zIndex: 9999 }}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/40 dark:border-white/8">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Activity
            </h3>
            {notifications.length > 0 && (
              <div className="ml-auto flex gap-2">
                <button
                  onClick={markAllRead}
                  className="text-[10px] font-bold text-sky-600 dark:text-cyan-300 hover:underline"
                >
                  Mark all read
                </button>
                <button
                  onClick={clearAll}
                  className="text-[10px] font-bold text-slate-400 hover:underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                Nothing yet. Batches and stop updates land here.
              </p>
            ) : (
              notifications.map((n) => {
                const style = NOTIF_STYLE[n.type] ?? NOTIF_STYLE.stop;
                const Icon = style.Icon;
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 flex items-start gap-2.5 border-b border-slate-200/40 dark:border-white/5 ${
                      n.read ? 'opacity-60' : ''
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg border shrink-0 ${style.cls}`}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 break-words">
                        {n.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 break-words">
                        {n.body}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(n.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body,
      )}

      {showUserMenu && createPortal(
        <div
          ref={menuRef}
          className="fixed top-[68px] right-4 w-60 rounded-2xl liquid-glass-elevated border border-white/50 dark:border-white/10 shadow-2xl overflow-hidden"
          style={{ zIndex: 9999 }}
        >
          <div className="px-4 py-3 border-b border-white/40 dark:border-white/8">
            <p className="text-xs font-black text-slate-900 dark:text-white truncate">
              {user?.name}
            </p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-sky-500/12 text-sky-600 dark:text-cyan-300 text-[9px] font-black uppercase">
                {roleLabel}
              </span>
              {user?.vehicle_number && (
                <span className="px-1.5 py-0.5 rounded bg-slate-500/12 text-slate-500 dark:text-slate-400 text-[9px] font-mono">
                  {user.vehicle_number}
                </span>
              )}
            </div>
          </div>
          <div className="py-1 border-b border-white/40 dark:border-white/8 text-xs">
            <Link
              to="/privacy"
              onClick={() => setShowUserMenu(false)}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-500/10 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
              Privacy policy
            </Link>
            <Link
              to="/terms"
              onClick={() => setShowUserMenu(false)}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-500/10 transition"
            >
              <FileText className="w-3.5 h-3.5 text-sky-500" />
              Terms and conditions
            </Link>
          </div>
          <button
            onClick={() => {
              setShowUserMenu(false);
              logout();
              navigate('/');
            }}
            className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>,
        document.body,
      )}
    </header>
  );
}

function Pill({ label, value, tone }: { label: string; value: number; tone: string }) {
  const tones: Record<string, string> = {
    sky: 'text-sky-600 dark:text-cyan-300',
    amber: 'text-amber-600 dark:text-amber-300',
    emerald: 'text-emerald-600 dark:text-emerald-300',
  };
  return (
    <span className="flex items-baseline gap-1.5">
      <span className={`text-sm font-black font-mono ${tones[tone]}`}>{value}</span>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    </span>
  );
}
