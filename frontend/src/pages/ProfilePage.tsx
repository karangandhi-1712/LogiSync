import { Truck, User, Mail, Phone, Radio, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AvailabilityControl } from '../components/marketplace/AvailabilityControl';

export default function ProfilePage() {
  const { user, setAvailability } = useAuth();

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-canvas)]">
      <div className="px-4 sm:px-6 py-4 border-b border-white/40 dark:border-white/8">
        <h1 className="text-lg font-black text-slate-900 dark:text-white">Profile</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Your driver account and job availability.
        </p>
      </div>

      <div className="px-4 sm:px-6 py-5 max-w-2xl space-y-4">
        <section className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 p-4">
          <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
            Account
          </h2>
          <div className="space-y-2.5">
            <Field icon={<User className="w-3.5 h-3.5" />} label="Name">
              {user?.name ?? '-'}
            </Field>
            <Field icon={<Mail className="w-3.5 h-3.5" />} label="Email">
              {user?.email ?? '-'}
              <span className="ml-1.5 text-[10px] text-slate-400">(locked)</span>
            </Field>
            <Field icon={<Phone className="w-3.5 h-3.5" />} label="Mobile">
              {user?.mobile_number ?? '-'}
            </Field>
            <Field icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Role">
              <span className="px-2 py-0.5 rounded bg-sky-500/12 text-sky-600 dark:text-cyan-300 text-[10px] font-black uppercase">
                {(user?.role ?? '').replace('_', ' ')}
              </span>
            </Field>
          </div>
        </section>

        <section className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 p-4">
          <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
            Vehicle
          </h2>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/12 text-sky-600 dark:text-cyan-300">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-black font-mono text-slate-900 dark:text-white">
                {user?.vehicle_number ?? '-'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {(user?.vehicle_type ?? '').replace('_', ' ') || 'Not specified'}
              </p>
            </div>
          </div>
          <p className="mt-2.5 text-[10px] text-slate-400">
            Vehicle details are fixed at sign-up so fleet managers know what is running.
          </p>
        </section>

        <section className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 p-4">
          <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
            Job availability
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
            Only available drivers receive new batch broadcasts.
          </p>
          <AvailabilityControl
            current={user?.availability_status ?? 'available'}
            onChange={(next, cutoff) => setAvailability(next, cutoff)}
          />
        </section>

        <section className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 p-4">
          <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
            How claiming works
          </h2>
          <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <li className="flex gap-2">
              <Radio className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
              Batches appear in <strong className="font-black">Available Jobs</strong> the moment a
              fleet manager broadcasts them - no refresh needed.
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
              The first driver to claim keeps it. If someone beats you, that job simply leaves your
              feed and the rest stays put.
            </li>
            <li className="flex gap-2">
              <Truck className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
              Once you load up and depart, the route locks, stop order is fixed, and every stop
              update reaches the consumer live.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <div className="text-sm font-bold text-slate-800 dark:text-slate-100 break-words">
          {children}
        </div>
      </div>
    </div>
  );
}