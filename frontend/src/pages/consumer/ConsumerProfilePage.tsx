// ─── ConsumerProfilePage - customer account details ──────────────────────────
// Read-only identity (it is the key the depot calls, and the dedupe key on the
// server) plus the one thing a customer can actually change: their password.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  Settings,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { changePassword, fetchConsumerAccount } from '../../services/api';
import type { ConsumerAccount } from '../../types';

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 ' +
  'text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20';

export default function ConsumerProfilePage() {
  const { showToast } = useToast();
  const [account, setAccount] = useState<ConsumerAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchConsumerAccount()
      .then((a) => {
        if (!cancelled) setAccount(a);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your account details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function savePassword() {
    setError(null);
    if (!current || !next) {
      setError('Fill in your current and new password.');
      return;
    }
    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await changePassword({ current_password: current, new_password: next });
      showToast({ type: 'success', title: 'Password updated', message: 'Use it next time you sign in.' });
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (detail?.password_errors) setError(detail.password_errors.join(' · '));
      else setError(typeof detail === 'string' ? detail : 'Could not update your password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-3xl mx-auto">
      <header>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">Profile</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Your account details and preferences
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center gap-2.5 py-16 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs font-bold">Loading your profile…</span>
        </div>
      ) : (
        <>
          <section className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/50 dark:border-white/6">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Account
              </h2>
            </div>
            <div className="divide-y divide-slate-200/50 dark:divide-white/6">
              <Field icon={<User className="w-3.5 h-3.5" />} label="Full name" value={account?.full_name ?? '-'} />
              <Field icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={account?.email ?? '-'} />
              <Field icon={<Phone className="w-3.5 h-3.5" />} label="Mobile" value={account?.mobile_number ?? '-'} mono />
              <Field
                icon={<ShieldCheck className="w-3.5 h-3.5" />}
                label="Role"
                value="Customer"
              />
              <Field
                icon={<CalendarDays className="w-3.5 h-3.5" />}
                label="Customer since"
                value={
                  account?.customer_since
                    ? new Date(account.customer_since).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'
                }
              />
            </div>
          </section>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Name and mobile are the keys your driver uses to reach you, so they are managed by the
            depot rather than editable here. Contact your port if they need correcting.
          </p>

          <section className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Change password
              </h2>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="Current password"
                  className={`${inputCls} pl-10`}
                  autoComplete="current-password"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder="New password"
                  className={`${inputCls} pl-10`}
                  autoComplete="new-password"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  className={`${inputCls} pl-10`}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-xl px-3.5 py-2.5">
                {error}
              </p>
            )}

            <Button variant="primary" onClick={savePassword} isLoading={saving} disabled={saving}>
              Update password
            </Button>
          </section>

          <section className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 p-5">
            <div className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Preferences
              </h2>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Theme, map style, units and notification channels live in settings.
            </p>
            <Link to="/settings" className="inline-block mt-3">
              <Button variant="ghost">Open settings</Button>
            </Link>
          </section>
        </>
      )}
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <p className={`text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 ${mono ? 'font-mono' : ''}`}>
          {value}
        </p>
      </div>
      {label === 'Mobile' && (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-label="Verified" />
      )}
    </div>
  );
}