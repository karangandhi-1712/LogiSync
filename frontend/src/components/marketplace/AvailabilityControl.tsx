import { useEffect, useState } from 'react';
import { Clock, Wifi, WifiOff } from 'lucide-react';
import type { AvailabilityStatus } from '../../types';

const OPTIONS: { id: AvailabilityStatus; label: string; hint: string }[] = [
  { id: 'available', label: 'Available', hint: 'Receiving broadcasts' },
  { id: 'busy', label: 'On a batch', hint: 'Paused until you finish' },
  { id: 'offline', label: 'Offline', hint: 'No broadcasts' },
];

/**
 * Driver broadcast state, plus the optional "going offline at" cutoff.
 *
 * The cutoff matters beyond cosmetics: a claimed batch stops auto-accepting new
 * stops once either the departure window closes or this time passes, whichever
 * comes first (see backend schedule_engine.can_accept_stop).
 */
export function AvailabilityControl({
  current,
  onChange,
}: {
  current: AvailabilityStatus;
  onChange: (status: AvailabilityStatus, goingOfflineAt?: string | null) => Promise<void> | void;
}) {
  const [status, setStatus] = useState<AvailabilityStatus>(current);
  const [cutoffEnabled, setCutoffEnabled] = useState(false);
  const [cutoffTime, setCutoffTime] = useState('18:00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(current);
  }, [current]);

  // Rebuild the cutoff as a UTC ISO string the backend can parse. The depot is
  // IST (UTC+5:30), so 18:00 local is 12:30 UTC.
  function toUtcIso(hhmm: string): string {
    const [h, m] = hhmm.split(':').map(Number);
    const now = new Date();
    const utc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h - 5, m - 30),
    );
    return utc.toISOString();
  }

  async function commit(next: AvailabilityStatus) {
    setSaving(true);
    try {
      await onChange(next, cutoffEnabled && next === 'available' ? toUtcIso(cutoffTime) : null);
      setStatus(next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-500/8 border border-slate-200/60 dark:border-white/8">
        {OPTIONS.map((opt) => {
          const active = status === opt.id;
          const Icon = opt.id === 'available' ? Wifi : opt.id === 'busy' ? Clock : WifiOff;
          return (
            <button
              key={opt.id}
              onClick={() => commit(opt.id)}
              disabled={saving}
              title={opt.hint}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition disabled:opacity-50 ${
                active
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-500/10'
              }`}
            >
              <Icon className="w-3 h-3" />
              {opt.label}
            </button>
          );
        })}
      </div>

      <label className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer">
        <input
          type="checkbox"
          checked={cutoffEnabled}
          onChange={(e) => {
            const next = e.target.checked;
            setCutoffEnabled(next);
            if (status === 'available') commit(status);
          }}
          className="accent-sky-500"
        />
        Stop accepting new stops after
        <input
          type="time"
          value={cutoffTime}
          disabled={!cutoffEnabled}
          onChange={(e) => {
            setCutoffTime(e.target.value);
            if (status === 'available') commit(status);
          }}
          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-800 dark:text-slate-100 outline-none focus:border-sky-400 disabled:opacity-40 font-mono"
        />
      </label>
    </div>
  );
}