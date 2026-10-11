// ─── AvailableJobsPage - the broadcast feed + atomic claim ────────────────────
// Schedules arrive over the authenticated socket. Claiming is a single
// conditional UPDATE server-side, so a 409 here means another driver genuinely
// won - we drop just that card and leave the rest of the feed alone.

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CircleSlash,
  Coins,
  Clock,
  Hand,
  Loader2,
  MapPin,
  Package,
  Radio,
  RefreshCw,
  Truck,
  WifiOff,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ScheduleStatusBadge, formatINR, formatWindow } from '../components/marketplace/Badges';
import { AvailabilityControl } from '../components/marketplace/AvailabilityControl';
import { useAuth } from '../context/AuthContext';
import { useMarketplace, useMarketplaceEvent } from '../context/MarketplaceContext';
import { useToast } from '../context/ToastContext';
import { claimSchedule, fetchJobFeed } from '../services/api';
import type { DeliverySchedule } from '../types';

export default function AvailableJobsPage() {
  const { user, setAvailability } = useAuth();
  const { isFallback, state } = useMarketplace();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<DeliverySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [lostRace, setLostRace] = useState<string[]>([]);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const rows = await fetchJobFeed();
      setJobs(rows);
      setLostRace((prev) => prev.filter((id) => rows.some((r) => r.id === id)));
    } catch {
      if (!quiet) showToast({ type: 'error', title: 'Could not load jobs', message: 'Check your connection.' });
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  // New broadcast: prepend it, de-duplicated.
  useMarketplaceEvent('schedule:broadcast', (data) => {
    const schedule = data as DeliverySchedule;
    if (!schedule?.id) return;
    setJobs((prev) => (prev.some((j) => j.id === schedule.id) ? prev : [schedule, ...prev]));
    showToast({
      type: 'info',
      title: 'New job nearby',
      message: `${schedule.area_label} · ${schedule.stop_count ?? 0} stops · ${formatINR(schedule.estimated_earnings)}`,
    });
  });

  // Somebody else claimed it: remove it from our feed instantly.
  useMarketplaceEvent('schedule:claimed', (data) => {
    const id = data?.schedule_id as string | undefined;
    if (!id) return;
    if (data?.claimed_by_driver_id === user?.sub) {
      // Ours landed - the Home tab takes over.
      setJobs((prev) => prev.filter((j) => j.id !== id));
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setLostRace((prev) => [...prev, id]);
    showToast({
      type: 'warning',
      title: 'Job taken',
      message: 'Another driver claimed that batch a moment before you.',
    });
  });

  // REST fallback while the socket is down.
  useEffect(() => {
    if (!isFallback) return;
    const timer = setInterval(() => load(true), 10000);
    return () => clearInterval(timer);
  }, [isFallback, load]);

  async function handleClaim(schedule: DeliverySchedule) {
    setClaimingId(schedule.id);
    try {
      const claimed = await claimSchedule(schedule.id);
      showToast({
        type: 'success',
        title: 'Batch claimed',
        message: `${claimed.stop_count ?? 0} stops · ${formatINR(claimed.estimated_earnings)} · ${claimed.area_label}`,
      });
      setJobs((prev) => prev.filter((j) => j.id !== schedule.id));
      navigate('/home');
    } catch (e: any) {
      if (e?.response?.status === 409) {
        // The spec's explicit case: remove only this card, keep the list.
        setJobs((prev) => prev.filter((j) => j.id !== schedule.id));
        setLostRace((prev) => [...prev, schedule.id]);
        showToast({
          type: 'warning',
          title: 'This job was just claimed by another driver',
          message: 'The rest of your feed is unchanged.',
        });
      } else {
        const detail = e?.response?.data?.detail;
        showToast({
          type: 'error',
          title: 'Could not claim',
          message: typeof detail === 'string' ? detail : 'Please try again.',
        });
      }
    } finally {
      setClaimingId(null);
    }
  }

  const offline = user?.availability_status !== 'available';

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg-canvas)]">
      <div className="px-4 sm:px-6 py-4 border-b border-white/40 dark:border-white/8 flex-shrink-0 flex items-center gap-3">
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            Available Jobs
            {state === 'connected' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 border border-emerald-400/30 text-[9px] font-black uppercase">
                <Radio className="w-2.5 h-2.5" /> Live
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Broadcast batches you can claim. First to claim keeps it.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isFallback && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-400/30 text-[10px] font-bold">
              <WifiOff className="w-3 h-3" /> Polling
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => load()} isLoading={loading}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div id="tutorial-availability" className="px-4 sm:px-6 py-3 border-b border-white/40 dark:border-white/8 flex-shrink-0">
        <AvailabilityControl
          current={user?.availability_status ?? 'available'}
          onChange={(next, cutoff) => setAvailability(next, cutoff)}
        />
      </div>

      <div id="tutorial-job-feed" className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-4">
        {offline && (
          <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/8 p-3.5 flex items-start gap-2.5">
            <CircleSlash className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 dark:text-slate-300">
              You&rsquo;re offline, so new broadcasts won&rsquo;t reach you. Set yourself{' '}
              <button className="font-black underline" onClick={() => setAvailability('available')}>
                available
              </button>{' '}
              to start receiving work.
            </p>
          </div>
        )}

        {loading && jobs.length === 0 ? (
          <div className="h-40 grid place-items-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="h-64 grid place-items-center text-center">
            <div>
              <div className="inline-flex p-3.5 rounded-2xl bg-slate-500/10 text-slate-400 mb-3">
                <Package className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                No open batches right now
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                When a fleet manager broadcasts a batch in your area it appears here instantly.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {jobs.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 p-4 flex flex-col"
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {job.area_label}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {job.port?.name ?? job.port_id}
                    </p>
                  </div>
                  <ScheduleStatusBadge status={job.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 my-3">
                  <Stat
                    icon={<Package className="w-3 h-3" />}
                    label="Stops"
                    value={`${job.stop_count ?? 0}/${job.max_batch_size}`}
                  />
                  <Stat
                    icon={<Coins className="w-3 h-3" />}
                    label="Est. earnings"
                    value={formatINR(job.estimated_earnings)}
                    accent
                  />
                  <Stat
                    icon={<Clock className="w-3 h-3" />}
                    label="Departure"
                    value={formatWindow(job.departure_window_start, job.departure_window_end)}
                  />
                  <Stat
                    icon={<MapPin className="w-3 h-3" />}
                    label="Radius"
                    value={`${job.radius_km} km`}
                  />
                </div>

                <Button
                  variant="primary"
                  className="w-full mt-auto"
                  isLoading={claimingId === job.id}
                  disabled={claimingId !== null || offline}
                  onClick={() => handleClaim(job)}
                  icon={<Hand className="w-3.5 h-3.5" />}
                >
                  Claim this batch
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="px-2.5 py-2 rounded-xl bg-slate-500/6 border border-slate-200/50 dark:border-white/6">
      <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
        {icon} {label}
      </p>
      <p
        className={`mt-0.5 text-xs font-black font-mono truncate ${
          accent ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-100'
        }`}
      >
        {value}
      </p>
    </div>
  );
}