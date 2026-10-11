import { useEffect, useState, useCallback } from 'react';
import { fetchAdminUsers, createFleetManager, deactivateUser, activateUser, deleteUser } from '../services/api';
import { usePort } from '../context/PortContext';
import { useToast } from '../context/ToastContext';
import { X, UserPlus, ShieldOff, ShieldCheck, Trash2, Eye, User, Mail, Phone, MapPin, Clock, Shield } from 'lucide-react';

interface UserRow {
  id: string;
  role: string;
  full_name: string;
  email: string;
  mobile_number: string;
  assigned_port_id: string | null;
  is_active: boolean;
}

// Shared liquid-glass sunken field (mirrors FleetTracker search-well pattern)
const fieldCls =
  'px-3.5 py-2.5 rounded-xl border border-white/70 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl neu-inset shadow-inner text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40 transition-all [&>option]:text-slate-900';

export default function AdminUsersPage() {
  const { ports: PORTS } = usePort();
  const { showToast } = useToast();
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

        {/* ─── Create Fleet Manager Form ─────────────────────────────── */}
        <div className="p-5 rounded-3xl liquid-glass-elevated border border-white/70 dark:border-white/15 backdrop-blur-2xl neu-flat-sm">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-bold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              {creating ? 'Creating...' : 'Create Fleet Manager'}
            </button>
          </div>
        </div>

        {/* ─── Fleet Managers Table ───────────────────────────────────── */}
        <div className="p-5 rounded-3xl liquid-glass-elevated border border-white/70 dark:border-white/15 backdrop-blur-2xl neu-flat-sm">
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
          <div className="p-5 rounded-3xl liquid-glass border border-white/70 dark:border-white/15 backdrop-blur-2xl neu-flat-sm">
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
