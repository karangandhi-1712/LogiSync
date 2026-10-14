// ─── ConsumerTrackPage - live tracking for one of your own deliveries ────────
// The customer-facing equivalent of the driver map: same Leaflet canvas, same
// socket, but scoped to a single order and legible to a non-logistics audience.
//
// Two data paths feed the map:
//   * the REST snapshot on load, for a map that is never blank
//   * `schedule:driver_position` / `delivery:status_changed` over the socket
// `LiveTrackingMap` turns that discrete stream into smooth motion, and falls back
// to an explicitly-labelled simulated walk when the driver app goes quiet.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  SearchX,
  Truck,
  AlertCircle,
  Wallet,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { LiveTrackingMap } from '../../components/consumer/LiveTrackingMap';
import {
  DeliveryStatusBadge,
  TierBadge,
  formatClockTime,
  formatINR,
  formatWindow,
} from '../../components/marketplace/Badges';
import { useMarketplaceEvent } from '../../context/MarketplaceContext';
import { useToast } from '../../context/ToastContext';
import { cancelMyOrder, fetchMyOrder } from '../../services/api';
import { DELIVERY_STEPPER, type DeliveryStatus, type DriverCard, type TrackingPayload } from '../../types';
import type { TrackMode } from '../../lib/trackSimulation';

const POLL_MS = 15000;
const TERMINAL: DeliveryStatus[] = ['delivered', 'failed', 'cancelled'];

/** Index of the furthest step reached, so a skipped status still lights up. */
function stepperIndex(status: DeliveryStatus): number {
  if (status === 'failed' || status === 'cancelled') return -1;
  const idx = DELIVERY_STEPPER.findIndex((s) => s.status === status);
  if (idx >= 0) return idx;
  const order: DeliveryStatus[] = ['pending', 'batched', 'assigned', 'picked_up', 'en_route', 'delivered'];
  const at = order.indexOf(status);
  return at < 0 ? 0 : Math.min(at, DELIVERY_STEPPER.length - 1);
}

export default function ConsumerTrackPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [data, setData] = useState<TrackingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<TrackMode>('idle');
  const [driver, setDriver] = useState<{ lat: number; lng: number; heading: number | null } | null>(null);
  const [driverCard, setDriverCard] = useState<DriverCard | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Guards the position effect from re-running on every unrelated render.
  const scheduleIdRef = useRef<string | null>(null);

  const load = useCallback(
    async (quiet = false) => {
      if (!token) return;
      if (!quiet) setLoading(true);
      try {
        const payload = await fetchMyOrder(token);
        setData(payload);
        setError(null);
        scheduleIdRef.current = payload.schedule?.id ?? null;
        // The socket event may have arrived before the first REST load.
        setDriverCard(prev => payload.schedule?.driver ?? prev);
        // Only seed the marker when we do not already have a live one - a poll
        // landing mid-flight must not yank the truck back to a stale position.
        setDriver((prev) => {
          if (prev) return prev;
          const s = payload.schedule;
          if (s?.driver_lat != null && s.driver_lng != null) {
            return { lat: s.driver_lat, lng: s.driver_lng, heading: null };
          }
          return null;
        });
      } catch (e: any) {
        const status = e?.response?.status;
        if (status === 404) setError('That delivery is not on your account, or the code is wrong.');
        else if (status === 401) setError('Your session expired. Please sign in again.');
        else setError('Could not load this delivery.');
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Socket fallback: keeps status fresh even when live positions are flowing,
  // which is exactly when a status change may not have been in the last poll.
  useEffect(() => {
    if (!data || TERMINAL.includes(data.status)) return;
    const timer = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(timer);
  }, [data, load]);

  // Live driver position, filtered to this delivery's own batch.
  useMarketplaceEvent('schedule:driver_position', (d: { schedule_id?: string; latitude?: number; longitude?: number; heading?: number | null }) => {
    if (!d?.schedule_id || d.schedule_id !== scheduleIdRef.current) return;
    if (d.latitude == null || d.longitude == null) return;
    setDriver({ lat: d.latitude, lng: d.longitude, heading: d.heading ?? null });
  });

  // A status change can arrive from the driver without any position event.
  useMarketplaceEvent('delivery:status_changed', (d: { request?: { token_number?: string; status?: DeliveryStatus } }) => {
    if (d?.request?.token_number !== token || !d.request.status) return;
    setData((prev) => (prev ? { ...prev, status: d.request!.status as DeliveryStatus } : prev));
  });

  // Out for delivery. This is the moment the driver's contact details become the
  // customer's to use, so the event carries the card itself rather than making
  // the page wait for the next poll to discover it.
  useMarketplaceEvent(
    'delivery:out_for_delivery',
    (d: { request?: { token_number?: string; status?: DeliveryStatus }; driver?: DriverCard }) => {
      if (d?.request?.token_number !== token) return;
      if (d.driver) setDriverCard(d.driver);
      if (d.request?.status) {
        setData((prev) => (prev ? { ...prev, status: d.request!.status as DeliveryStatus } : prev));
      }
      showToast({
        type: 'success',
        title: 'Your driver is out for delivery',
        message: d.driver?.name
          ? `${d.driver.name} is on the way to your address.`
          : 'Your parcel is on the move.',
      });
      // Pull the authoritative payload too — the socket event is an optimisation,
      // not the source of truth, and a dropped frame must not hide the number.
      load(true);
    },
  );

  async function cancel() {
    if (cancelling) return;
    setCancelling(true);
    try {
      await cancelMyOrder(token, 'cancelled by customer');
      showToast({ type: 'info', title: 'Delivery cancelled', message: 'Your order has been cancelled.' });
      load(true);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      showToast({
        type: 'error',
        title: 'Could not cancel',
        message: typeof detail === 'string' ? detail : 'Please try again.',
      });
    } finally {
      setCancelling(false);
    }
  }

  const destination = useMemo(
    () => (data ? { lat: data.delivery_lat, lng: data.delivery_lng } : null),
    [data],
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
        <p className="mt-3 text-xs font-bold">Loading your delivery…</p>
      </div>
    );
  }

  if (error || !data || !destination) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-300">
          <SearchX className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-sm font-black text-slate-800 dark:text-slate-100">{error}</h2>
        <div className="mt-5 flex gap-2">
          <Button variant="ghost" onClick={() => navigate('/consumer/orders')}>
            Back to my deliveries
          </Button>
          <Button variant="primary" onClick={() => load()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const terminal = TERMINAL.includes(data.status);
  const reached = stepperIndex(data.status);
  const schedule = data.schedule;
  const hasRoute = Boolean(schedule?.route?.polyline?.length);
  // Always render the map at the out-for-delivery stage. It can show the
  // planned batch route while the first GPS fix is still being sent.
  const showMap = data.status === 'en_route';

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl mx-auto">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/consumer/orders')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-500/10 transition shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-mono text-lg font-black text-slate-900 dark:text-white truncate">
              {data.token_number}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Updated {formatClockTime(data.updated_at)}
              {!terminal && ' · refreshes automatically'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DeliveryStatusBadge status={data.status} />
          <TierBadge tier={data.priority_tier} />
        </div>
      </header>

      {data.status === 'failed' || data.status === 'cancelled' ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/8 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-rose-800 dark:text-rose-200">
              This delivery was {data.status}.
            </p>
            {data.failure_reason && (
              <p className="mt-1 text-xs text-rose-700 dark:text-rose-200/80">{data.failure_reason}</p>
            )}
            <p className="mt-1 text-[11px] text-rose-700/70 dark:text-rose-200/60">
              Contact your depot if you need this rebooked.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 p-5">
          <ol className="flex items-start">
            {DELIVERY_STEPPER.map((step, i) => {
              const done = i < reached;
              const active = i === reached;
              const isLast = i === DELIVERY_STEPPER.length - 1;
              return (
                <li key={step.status} className="flex-1 flex items-start min-w-0">
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <motion.div
                      initial={false}
                      animate={{ scale: active ? 1.08 : 1 }}
                      className={`w-7 h-7 rounded-full grid place-items-center text-[11px] font-black shrink-0 ${
                        done
                          ? 'bg-emerald-500 text-white'
                          : active
                            ? 'bg-sky-500 text-white ring-4 ring-sky-500/20'
                            : 'bg-slate-500/12 text-slate-400'
                      }`}
                    >
                      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                    </motion.div>
                    <span
                      className={`mt-1.5 text-[10px] font-bold text-center leading-tight ${
                        active
                          ? 'text-slate-900 dark:text-white'
                          : done
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`h-0.5 flex-1 mt-3.5 -mx-1 ${
                        i < reached ? 'bg-emerald-500' : 'bg-slate-300/60 dark:bg-white/10'
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {showMap && (
        <section aria-label="Live driver location" className="space-y-2">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Driver live location</h2>
            <span className={`text-[10px] font-black uppercase ${driver ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-400'}`}>
              {driver ? 'GPS connected' : hasRoute ? 'Waiting for first GPS update' : 'Waiting for route and GPS'}
            </span>
          </div>
        <LiveTrackingMap
          destination={destination}
          driverPosition={driver}
          driverHeading={driver?.heading ?? null}
          polyline={schedule?.route?.polyline ?? null}
          routeSimulated={schedule?.route?.simulated ?? false}
          onModeChange={setMode}
          className="h-80 sm:h-96"
        />
        </section>
      )}

      {mode === 'simulated' && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/8 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 dark:text-amber-200">
            Your driver&rsquo;s app is not reporting a position right now, so the marker is moving
            along the planned route as an estimate. It will switch back to the live position as soon
            as they resume reporting.
          </p>
        </div>
      )}

      {(schedule?.driver || driver || driverCard) && (
        <section
          aria-label="Your driver"
          className="relative overflow-hidden rounded-[28px] liquid-glass-elevated border border-white/70 dark:border-white/15 backdrop-blur-2xl neu-flat-sm p-5"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 shrink-0 rounded-[20px] bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
              <Truck className="w-7 h-7" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Your driver
              </p>
              <p className="text-base font-black text-slate-900 dark:text-white truncate">
                {driverCard?.name ?? schedule?.driver?.name ?? 'Being assigned'}
              </p>
              {(driverCard?.vehicle_number || schedule?.driver?.vehicle_number) && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  {driverCard?.vehicle_number ?? schedule?.driver?.vehicle_number}
                  {driverCard?.vehicle_type ? ` · ${driverCard.vehicle_type.replace(/_/g, ' ')}` : ''}
                </p>
              )}
            </div>

            {mode === 'real' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 text-[10px] font-black uppercase border border-emerald-400/30 shrink-0">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            ) : mode === 'simulated' ? (
              <span className="px-2.5 py-1 rounded-md bg-amber-500/12 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase border border-amber-400/30 shrink-0">
                Simulated
              </span>
            ) : null}
          </div>

          {/* Contact is released only once the parcel is genuinely out for
              delivery. Until then this explains the absence rather than leaving
              an empty gap where a number was expected. */}
          {driverCard?.contact_visible && driverCard.phone ? (
            <div className="mt-4 flex items-center gap-2">
              <a
                href={`tel:${driverCard.phone}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-black shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                <Phone className="w-4 h-4" />
                Call {driverCard.name.split(' ')[0]}
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(driverCard.phone!);
                  showToast({ type: 'info', title: 'Number copied', message: driverCard.phone! });
                }}
                className="px-4 py-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/70 dark:border-white/12 backdrop-blur-xl neu-flat-sm text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/70 transition-all text-xs font-black"
              >
                Copy
              </button>
            </div>
          ) : (
            <p className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              The driver's number appears here once your parcel is out for delivery.
            </p>
          )}
        </section>
      )}

      <div className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 divide-y divide-slate-200/50 dark:divide-white/6">
        <Row icon={<MapPin className="w-3.5 h-3.5" />} label="Delivering to">
          {data.delivery_address}
        </Row>
        {data.pickup_port && (
          <Row icon={<Navigation className="w-3.5 h-3.5" />} label="Picked up from">
            {data.pickup_port.name}
            {schedule ? ` · batch ${schedule.area_label}` : ''}
          </Row>
        )}
        {data.requested_window_start && (
          <Row icon={<Clock className="w-3.5 h-3.5" />} label="Your window">
            {formatWindow(data.requested_window_start, data.requested_window_end ?? '')}
          </Row>
        )}
        {schedule && (
          <Row icon={<Truck className="w-3.5 h-3.5" />} label="Depot dispatch window">
            {formatWindow(schedule.departure_window_start, schedule.departure_window_end)}
          </Row>
        )}
        {data.package_type && (
          <Row icon={<Package className="w-3.5 h-3.5" />} label="Package">
            {data.package_type}
          </Row>
        )}
        {data.stop_sequence != null && (
          <Row icon={<Navigation className="w-3.5 h-3.5" />} label="Stop">
            #{data.stop_sequence} on this run
          </Row>
        )}
        {data.tier_fee > 0 && (
          <Row icon={<Package className="w-3.5 h-3.5" />} label="Speed surcharge">
            {formatINR(data.tier_fee)}
          </Row>
        )}
        <Row icon={<Phone className="w-3.5 h-3.5" />} label="Need help">
          Contact your depot with code {data.token_number}
        </Row>
      </div>

      {data.special_handling && (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/6 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
            Handling instruction
          </p>
          <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-200">
            {data.special_handling}
          </p>
        </div>
      )}

      {data.payment_amount > 0 && (
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/6 px-4 py-3 flex items-center gap-3">
          <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-300 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              {data.payment_status === 'paid'
                ? data.payment_method === 'cash_on_depot'
                  ? 'Pay at the depot'
                  : 'Paid online'
                : 'Payment due'}
            </p>
            <p className="text-xs font-black text-slate-800 dark:text-slate-100 mt-0.5">
              ₹{data.payment_amount.toFixed(2)}
            </p>
          </div>
          {data.payment_status !== 'paid' && (
            <span className="px-2.5 py-1 rounded-md bg-amber-500/12 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase border border-amber-400/30 shrink-0">
              Awaiting payment
            </span>
          )}
        </div>
      )}

      {data.is_cancellable && (
        <div className="flex justify-end">
          <Button variant="danger" onClick={cancel} isLoading={cancelling} disabled={cancelling}>
            Cancel this delivery
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 break-words">
          {children}
        </div>
      </div>
    </div>
  );
}
