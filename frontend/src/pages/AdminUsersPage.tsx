import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  fetchAdminUsers, createFleetManager, deactivateUser, activateUser, deleteUser,
} from '../services/api';
import { usePort } from '../context/PortContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import {
  X, UserPlus, ShieldOff, ShieldCheck, Trash2, Eye, User, Mail, Phone, MapPin,
  Clock, Shield, LayoutDashboard, Users as UsersIcon, Activity, Truck, ShoppingBag,
  UserCog, AlertTriangle,
} from 'lucide-react';
import type { AdminUser } from '../services/api';

interface UserRow extends AdminUser {}

// Shared liquid-glass sunken field (mirrors FleetTracker search-well pattern)
const fieldCls =
  'px-3.5 py-2.5 rounded-xl border border-white/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl neu-inset shadow-inner text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40 transition-all [&>option]:text-slate-900';

type Tab = 'dashboard' | 'users';

export default function AdminUsersPage() {
  const { ports: PORTS } = usePort();
  const { showToast } = useToast();
  const { isDark } = useTheme();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [rows, setRows] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ full_name: '', email: '', mobile: '', temp_password: '', assigned_port_id: 'voc' });
  const [creating, setCreating] = useState(false);
  const [detailUser, setDetailUser] = useState<UserRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    fetchAdminUsers()
      .then(data => setRows(data))
      .catch(() => {
        showToast({ type: 'error', title: 'Load Failed', message: 'Could not fetch users from backend.' });
      })
      .finally(() => setIsLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.full_name || !form.email || !form.mobile || !form.temp_password) {
      showToast({ type: 'warning', title: 'Missing Fields', message: 'Please fill all fields before creating.' });
      return;
    }
    setCreating(true);
    try {
      const r = await createFleetManager(form);
      showToast({ type: 'success', title: 'Fleet Manager Created', message: `${r.email} - temp password: ${r.temp_password}` });
      setForm({ full_name: '', email: '', mobile: '', temp_password: '', assigned_port_id: 'voc' });
      load();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : JSON.stringify(detail || 'Failed to create fleet manager');
      showToast({ type: 'error', title: 'Creation Failed', message: msg });
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(user: UserRow) {
    // Optimistic UI update
    setRows(prev => prev.map(u => u.id === user.id ? { ...u, is_active: false } : u));
    if (detailUser && detailUser.id === user.id) {
      setDetailUser({ ...detailUser, is_active: false });
    }
    try {
      await deactivateUser(user.id);
      showToast({ type: 'success', title: 'User Deactivated', message: `${user.full_name} has been deactivated.` });
      load();
    } catch (e: any) {
      // Revert optimistic update
      setRows(prev => prev.map(u => u.id === user.id ? { ...u, is_active: true } : u));
      if (detailUser && detailUser.id === user.id) {
        setDetailUser({ ...detailUser, is_active: true });
      }
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Failed to deactivate user. Check backend connection.';
      showToast({ type: 'error', title: 'Deactivate Failed', message: msg });
    }
  }

  async function handleActivate(user: UserRow) {
    // Optimistic UI update
    setRows(prev => prev.map(u => u.id === user.id ? { ...u, is_active: true } : u));
    if (detailUser && detailUser.id === user.id) {
      setDetailUser({ ...detailUser, is_active: true });
    }
    try {
      await activateUser(user.id);
      showToast({ type: 'success', title: 'User Activated', message: `${user.full_name} is now active.` });
      load();
    } catch (e: any) {
      // Revert optimistic update
      setRows(prev => prev.map(u => u.id === user.id ? { ...u, is_active: false } : u));
      if (detailUser && detailUser.id === user.id) {
        setDetailUser({ ...detailUser, is_active: false });
      }
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Failed to activate user.';
      showToast({ type: 'error', title: 'Activation Failed', message: msg });
    }
  }

  async function handleDelete(user: UserRow) {
    // Optimistic UI update
    setRows(prev => prev.filter(u => u.id !== user.id));
    setConfirmDelete(null);
    if (detailUser && detailUser.id === user.id) {
      setDetailUser(null);
    }
    try {
      await deleteUser(user.id);
      showToast({ type: 'success', title: 'User Deleted', message: `${user.full_name} has been permanently deleted.` });
      load();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Failed to delete user.';
      showToast({ type: 'error', title: 'Delete Failed', message: msg });
      load();
    }
  }

  const getPortName = (portId: string | null) => {
    if (!portId) return '-';
    return PORTS.find(p => p.id === portId)?.name || portId;
  };

  const fleetManagers = rows.filter(u => u.role === 'fleet_manager');
  const otherUsers = rows.filter(u => u.role !== 'fleet_manager');

  /**
   * Everything the dashboard shows is derived from the single `/admin/users`
   * payload rather than a second endpoint. These are counts over one already-
   * fetched list, so a dedicated stats route would add a request that could
   * disagree with the roster it is supposed to summarise.
   */
  const stats = useMemo(() => {
    const by = (role: string) => rows.filter(u => u.role === role);
    const activeIn = (list: UserRow[]) => list.filter(u => u.is_active).length;
    const drivers = by('driver');
    const consumers = by('consumer');
    const recent = [...rows]
      .filter(u => u.created_at)
      .sort((a, b) => (b.created_at! > a.created_at! ? 1 : -1))
      .slice(0, 5);

    // Depot coverage: a fleet manager owns one depot, so a port with none is a
    // gap the port admin needs to see rather than infer.
    const coverage = PORTS.map(p => ({
      port: p,
      managers: fleetManagers.filter(u => u.assigned_port_id === p.id && u.is_active).length,
    }));

    return {
      total: rows.length,
      active: activeIn(rows),
      suspended: rows.length - activeIn(rows),
      fleetManagers,
      fleetActive: activeIn(fleetManagers),
      drivers,
      driverAvailable: drivers.filter(u => u.availability_status === 'available').length,
      driverBusy: drivers.filter(u => u.availability_status === 'busy').length,
      driverOffline: drivers.filter(u => u.availability_status === 'offline').length,
      consumers,
      consumerActive: activeIn(consumers),
      portAdmins: by('port_admin').length,
      coverage,
      recent,
    };
  }, [rows, PORTS]);

  /* ── Liquid-glass tokens, matching LoginPage so the console and the sign-in
        screen read as one product rather than two. ── */
  const glass = isDark
    ? {
        surface: { background: 'rgba(18,18,28,0.55)', border: '1px solid rgba(255,255,255,0.12)' },
        inset: {
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 6px 22px rgba(0,0,0,0.28)',
        },
        active: {
          background: 'rgba(255,255,255,0.16)',
          border: '1px solid rgba(255,255,255,0.24)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.26), 0 0 0 1px rgba(255,255,255,0.05)',
        },
      }
    : {
        surface: { background: 'rgba(255,255,255,0.62)', border: '1px solid rgba(255,255,255,0.70)' },
        inset: {
          background: 'rgba(255,255,255,0.55)',
          border: '1px solid rgba(255,255,255,0.70)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.90), 0 6px 20px rgba(15,23,42,0.06)',
        },
        active: {
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(255,255,255,0.95)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), 0 0 0 1px rgba(2,132,199,0.18), 0 4px 14px rgba(15,23,42,0.10)',
        },
      };

  const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: UsersIcon },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-canvas)]">
      <div className="max-w-[1400px] mx-auto p-6 space-y-6">

        {/* ─── Page Header ───────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white chroma-text">
            User Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create fleet managers, manage access, and review user status across all connected ports.
          </p>
        </div>

        {/* ─── Tabs ───────────────────────────────────────────────────── */}
        <div
          className="relative p-1.5 rounded-2xl inline-flex gap-1.5 liquid-glass border border-white/70 dark:border-white/12"
          style={{ backdropFilter: 'blur(24px) saturate(180%)' }}
          role="tablist"
          aria-label="User management views"
        >
          {/* Edge sheen - the tell that this is glass and not a flat pill bar. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-white/80 via-white/20 to-transparent" />
          {TABS.map(t => {
            const on = tab === t.id;
            const TabIcon = t.icon;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative z-10 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                  on ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                style={on ? glass.active : undefined}
              >
                <TabIcon className={`w-4 h-4 ${on ? 'text-cyan-500 dark:text-cyan-300' : ''}`} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ══ DASHBOARD ══════════════════════════════════════════════ */}
        {tab === 'dashboard' && (
          <>
            {/* Headline tiles */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  icon: UsersIcon, label: 'Total accounts', value: stats.total,
                  foot: `${stats.active} active · ${stats.suspended} suspended`,
                  tone: 'text-cyan-600 dark:text-cyan-300',
                  bg: 'bg-cyan-500/15',
                },
                {
                  icon: Shield, label: 'Fleet managers', value: stats.fleetManagers.length,
                  foot: `${stats.fleetActive} active across ${PORTS.length} depots`,
                  tone: 'text-indigo-600 dark:text-indigo-300',
                  bg: 'bg-indigo-500/15',
                },
                {
                  icon: Truck, label: 'Drivers', value: stats.drivers.length,
                  foot: `${stats.driverAvailable} available now`,
                  tone: 'text-emerald-600 dark:text-emerald-300',
                  bg: 'bg-emerald-500/15',
                },
                {
                  icon: ShoppingBag, label: 'Customers', value: stats.consumers.length,
                  foot: `${stats.consumerActive} active`,
                  tone: 'text-sky-600 dark:text-sky-300',
                  bg: 'bg-sky-500/15',
                },
              ].map(tile => (
                <div
                  key={tile.label}
                  className="p-5 rounded-[26px] liquid-glass-elevated border border-white/70 dark:border-white/12 backdrop-blur-2xl neu-flat-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${tile.bg}`}>
                      <tile.icon className={`w-5 h-5 ${tile.tone}`} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {tile.label}
                    </p>
                  </div>
                  <p className="mt-4 text-4xl font-black text-slate-900 dark:text-white">
                    {isLoading ? '–' : tile.value}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{tile.foot}</p>
                </div>
              ))}
            </div>

            {/* Driver pool + admin accounts */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="p-5 rounded-[26px] liquid-glass border border-white/70 dark:border-white/12 backdrop-blur-2xl neu-flat-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
                  </div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Driver pool
                  </h2>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Available now', value: stats.driverAvailable, bar: 'bg-emerald-500', on: 'text-emerald-600 dark:text-emerald-300' },
                    { label: 'On a run', value: stats.driverBusy, bar: 'bg-amber-500', on: 'text-amber-600 dark:text-amber-300' },
                    { label: 'Offline', value: stats.driverOffline, bar: 'bg-slate-400', on: 'text-slate-500 dark:text-slate-300' },
                  ].map(row => (
                    <div
                      key={row.label}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl"
                      style={glass.inset}
                    >
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex-1">
                        {row.label}
                      </span>
                      <div className="w-24 h-1.5 rounded-full bg-slate-500/15 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.bar} transition-all duration-500`}
                          style={{
                            width: `${stats.drivers.length ? (row.value / stats.drivers.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className={`text-sm font-black w-7 text-right ${row.on}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
                {stats.drivers.length === 0 && !isLoading && (
                  <p className="mt-3 text-xs text-slate-400 text-center py-2">
                    No drivers have registered yet.
                  </p>
                )}
              </div>

              <div className="p-5 rounded-[26px] liquid-glass border border-white/70 dark:border-white/12 backdrop-blur-2xl neu-flat-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 flex items-center justify-center">
                    <UserCog className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
                  </div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Accounts
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Port admins', value: stats.portAdmins, tone: 'text-amber-600 dark:text-amber-300' },
                    { label: 'Fleet managers', value: stats.fleetManagers.length, tone: 'text-indigo-600 dark:text-indigo-300' },
                    { label: 'Drivers', value: stats.drivers.length, tone: 'text-emerald-600 dark:text-emerald-300' },
                    { label: 'Customers', value: stats.consumers.length, tone: 'text-sky-600 dark:text-sky-300' },
                  ].map(row => (
                    <div key={row.label} className="px-3.5 py-3 rounded-2xl" style={glass.inset}>
                      <p className={`text-2xl font-black ${row.tone}`}>{row.value}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {row.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Depot coverage + recent signups */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="p-5 rounded-[26px] liquid-glass border border-white/70 dark:border-white/12 backdrop-blur-2xl neu-flat-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-cyan-600 dark:text-cyan-300" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Depot coverage
                    </h2>
                    <p className="text-[10px] text-slate-400">A depot with no fleet manager has nobody dispatching it</p>
                  </div>
                </div>
                <ul className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-0.5">
                  {stats.coverage.map(({ port, managers }) => (
                    <li
                      key={port.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]"
                      style={glass.inset}
                    >
                      {managers === 0 && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-label="Unstaffed" />
                      )}
                      <span className="font-bold text-slate-700 dark:text-slate-200 truncate flex-1">
                        {port.name}
                      </span>
                      <span
                        className={`font-black ${
                          managers === 0 ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-300'
                        }`}
                      >
                        {managers}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 rounded-[26px] liquid-glass border border-white/70 dark:border-white/12 backdrop-blur-2xl neu-flat-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-2xl bg-sky-500/15 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-sky-600 dark:text-sky-300" />
                  </div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Recent accounts
                  </h2>
                </div>
                {stats.recent.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Nothing created yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {stats.recent.map(u => (
                      <li
                        key={u.id}
                        className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl"
                        style={glass.inset}
                      >
                        <div className="w-8 h-8 rounded-xl bg-slate-500/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {u.full_name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '–'} · {u.role.replace('_', ' ')}
                          </p>
                        </div>
                        {!u.is_active && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-300">
                            inactive
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══ USERS ═════════════════════════════════════════════════ */}
        {tab === 'users' && (
          <>
        {/* ─── Create Fleet Manager Form ─────────────────────────────── */}
        {/* Emerald, and with a hairline along its top edge, so it reads as a
            distinct provisioning step rather than as the header of the roster
            directly beneath it. */}
        <div className="relative p-5 rounded-[26px] liquid-glass-elevated border border-white/70 dark:border-white/15 backdrop-blur-2xl neu-flat-sm overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Create Fleet Manager
            </h2>
          </div>
          <div className="grid md:grid-cols-5 gap-3">
            <input
              placeholder="Full name"
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              className={fieldCls}
            />
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className={fieldCls}
            />
            <input
              placeholder="Mobile"
              value={form.mobile}
              onChange={e => setForm({ ...form, mobile: e.target.value })}
              className={fieldCls}
            />
            <input
              placeholder="Temp password"
              value={form.temp_password}
              onChange={e => setForm({ ...form, temp_password: e.target.value })}
              className={fieldCls}
            />
            <select
              value={form.assigned_port_id}
              onChange={e => setForm({ ...form, assigned_port_id: e.target.value })}
              className={fieldCls}
            >
              {PORTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="mt-4">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              {creating ? 'Creating...' : 'Create Fleet Manager'}
            </button>
          </div>
        </div>

        {/* ─── Fleet Managers Table ───────────────────────────────────── */}
        <div className="p-5 rounded-[26px] liquid-glass-elevated border border-white/70 dark:border-white/15 backdrop-blur-2xl neu-flat-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Fleet Managers
                </h2>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Click on a name to view details
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
              {fleetManagers.length} user{fleetManagers.length !== 1 ? 's' : ''}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-2xl skeleton" />
              ))}
            </div>
          ) : fleetManagers.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
              No fleet managers found. Create one above.
            </div>
          ) : (
            <div className="space-y-2">
              {fleetManagers.map(u => (
                <div
                  key={u.id}
                  className="p-3.5 rounded-2xl liquid-glass border border-white/70 dark:border-white/10 backdrop-blur-xl neu-flat-sm flex items-center gap-4 transition-all hover:bg-white/70 dark:hover:bg-slate-900/70 hover:-translate-y-px group"
                >
                  {/* Name (clickable) */}
                  <button
                    onClick={() => setDetailUser(u)}
                    className="flex items-center gap-2 min-w-[160px] text-left hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 cursor-pointer underline-offset-2 hover:underline">
                      {u.full_name}
                    </span>
                  </button>

                  {/* Email */}
                  <span className="hidden md:block text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                    {u.email}
                  </span>

                  {/* Port */}
                  <span className="hidden lg:block text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                    {getPortName(u.assigned_port_id)}
                  </span>

                  {/* Status */}
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border ${
                    u.is_active
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30'
                      : 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-400/30'
                  }`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>

                  {/* Actions */}
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => setDetailUser(u)}
                      className="p-2 rounded-xl text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {u.is_active ? (
                      <button
                        onClick={() => handleDeactivate(u)}
                        className="p-2 rounded-xl text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                        title="Deactivate"
                      >
                        <ShieldOff className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(u)}
                        className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                        title="Activate"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDelete(u)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Other Users Table ──────────────────────────────────────── */}
        {otherUsers.length > 0 && (
          <div className="p-5 rounded-[26px] liquid-glass border border-white/70 dark:border-white/15 backdrop-blur-2xl neu-flat-sm">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Other Users ({otherUsers.length})
            </h2>
            <div className="space-y-2">
              {otherUsers.map(u => (
                <div
                  key={u.id}
                  className="p-3 rounded-2xl liquid-glass border border-white/60 dark:border-white/10 backdrop-blur-xl neu-flat-sm flex items-center gap-4 text-xs"
                >
                  <button onClick={() => setDetailUser(u)} className="font-bold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline underline-offset-2 cursor-pointer">
                    {u.full_name}
                  </button>
                  <span className="text-slate-400 uppercase font-bold text-[10px] px-2 py-0.5 rounded-md border border-slate-300/30 dark:border-white/10">
                    {u.role}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">{u.email}</span>
                  <span className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                    u.is_active
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30'
                      : 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-400/30'
                  }`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* ─── Detail Modal ────────────────────────────────────────────── */}
      {detailUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
          onClick={() => setDetailUser(null)}
        >
          <div
            className="max-w-lg w-full p-6 rounded-3xl liquid-glass-elevated border border-white/80 dark:border-white/20 shadow-2xl space-y-5"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/40 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {detailUser.full_name}
                  </h3>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                    detailUser.is_active
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30'
                      : 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-400/30'
                  }`}>
                    {detailUser.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetailUser(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-500/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Shield, label: 'Role', value: detailUser.role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()), color: 'text-indigo-500' },
                { icon: Mail, label: 'Email', value: detailUser.email, color: 'text-cyan-500' },
                { icon: Phone, label: 'Mobile', value: detailUser.mobile_number || '-', color: 'text-emerald-500' },
                { icon: MapPin, label: 'Assigned Port', value: getPortName(detailUser.assigned_port_id), color: 'text-amber-500' },
                { icon: Clock, label: 'User ID', value: detailUser.id.slice(0, 8) + '...', color: 'text-sky-500' },
                { icon: Eye, label: 'Status', value: detailUser.is_active ? 'Active' : 'Inactive', color: detailUser.is_active ? 'text-emerald-500' : 'text-red-500' },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/70 dark:border-white/10 neu-flat-sm backdrop-blur-xl">
                  <div className="flex items-center gap-1.5 mb-1">
                    <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">{item.label}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-white/30 dark:border-white/10">
              {detailUser.role !== 'port_admin' && (
                detailUser.is_active ? (
                  <button
                    onClick={() => { handleDeactivate(detailUser); }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30 text-xs font-bold hover:bg-amber-500/25 transition-all"
                  >
                    <ShieldOff className="w-3.5 h-3.5" />
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => { handleActivate(detailUser); }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30 text-xs font-bold hover:bg-emerald-500/25 transition-all"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Activate
                  </button>
                )
              )}
              {detailUser.role !== 'port_admin' && (
                <button
                  onClick={() => { setDetailUser(null); setConfirmDelete(detailUser); }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/15 text-red-700 dark:text-red-300 border border-red-400/30 text-xs font-bold hover:bg-red-500/25 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
              <button
                onClick={() => setDetailUser(null)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 border border-white/60 dark:border-white/15 text-xs font-bold hover:bg-white/70 dark:hover:bg-slate-800/70 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ───────────────────────────────── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="max-w-sm w-full p-6 rounded-3xl liquid-glass-elevated border border-red-300/40 dark:border-red-500/20 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Delete User</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong>{confirmDelete.full_name}</strong> ({confirmDelete.email})?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/25 hover:bg-red-700 transition-all"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 border border-white/60 dark:border-white/15 text-xs font-bold hover:bg-white/70 dark:hover:bg-slate-800/70 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
