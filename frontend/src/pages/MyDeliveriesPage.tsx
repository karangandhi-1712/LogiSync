// ─── MyDeliveriesPage - the driver's batch history ────────────────────────────
// Renamed from MyBookings: the unit here is a batch (a claimed schedule) with
// its individual stops underneath, not a gate booking.

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import L from 'leaflet';
import {
  ChevronDown,
  Coins,
  Loader2,
  Package,
  Route,
  Truck,
} from 'lucide-react';
import { GoogleMapCanvas, isMapAlive } from '../components/map/GoogleMapCanvas';
import { Button } from '../components/ui/Button';
import {
  DeliveryStatusBadge,
  ScheduleStatusBadge,
  TierBadge,
  formatClockTime,
  formatDistance,
  formatINR,
} from '../components/marketplace/Badges';
import { useToast } from '../context/ToastContext';
import { useMarketplaceEvent } from '../context/MarketplaceContext';
import { fetchMySchedules } from '../services/api';
import type { DeliverySchedule } from '../types';

export default function MyDeliveriesPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<DeliverySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mapFor, setMapFor] = useState<DeliverySchedule | null>(null);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        setRows(await fetchMySchedules());
      } catch {
        if (!quiet) showToast({ type: 'error', title: 'Could not load your deliveries', message: 'Check your connection and retry.' });
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    load();
  }, [load]);

  useMarketplaceEvent('delivery:status_changed', () => load(true));
  useMarketplaceEvent('schedule:stop_added', () => load(true));

  const active = rows.filter((r) => ['claimed', 'locked', 'in_progress'].includes(r.status));
  const history = rows.filter((r) => !['claimed', 'locked', 'in_progress'].includes(r.status));

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg-canvas)]">
      <div id="tutorial-deliveries" className="px-4 sm:px-6 py-4 border-b border-white/40 dark:border-white/8 flex-shrink-0">
        <h1 className="text-lg font-black text-slate-900 dark:text-white">My Deliveries</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Every batch you have claimed, with its individual stops.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-4 space-y-6">
        {loading && rows.length === 0 ? (
          <div className="h-40 grid place-items-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="h-64 grid place-items-center text-center">
            <div>
              <div className="inline-flex p-3.5 rounded-2xl bg-slate-500/10 text-slate-400 mb-3">
                <Route className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                No deliveries yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                Batches you claim show up here with every stop and its outcome.
              </p>
              <Button variant="primary" className="mt-4" onClick={() => navigate('/jobs')}>
                Find work
              </Button>
            </div>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <Section title="In progress" rows={active}>
                {(s) => (
                  <Card
                    schedule={s}
                    expanded={expanded === s.id}
                    onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
                    onShowMap={() => setMapFor(s)}
                    onOpen={() => navigate('/home')}
                  />
                )}
              </Section>
            )}
            {history.length > 0 && (
              <Section title="Completed" rows={history}>
                {(s) => (
                  <Card
                    schedule={s}
                    expanded={expanded === s.id}
                    onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
                    onShowMap={() => setMapFor(s)}
                    onOpen={() => navigate('/home')}
                  />
                )}
              </Section>
            )}
          </>
        )}
      </div>

      {/* Route preview */}
      {mapFor?.optimized_route?.polyline?.length ? (
        <div className="fixed inset-0 z-[1400] grid place-items-center p-4">
          <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" onClick={() => setMapFor(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-2xl rounded-2xl overflow-hidden liquid-glass-elevated border border-white/50 dark:border-white/10 shadow-2xl"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/40 dark:border-white/8">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {mapFor.area_label}
              </h3>
              <span className="ml-auto text-[11px] font-mono text-slate-500">
                {formatDistance(mapFor.optimized_route.total_distance_km)} ·{' '}
                {Math.round(mapFor.optimized_route.total_duration_s / 60)} min
                {mapFor.optimized_route.simulated && ' · approx'}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setMapFor(null)}>
                Close
              </Button>
            </div>
            <div className="h-[420px]">
              <RoutePreview schedule={mapFor} />
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  rows,
  children,
}: {
  title: string;
  rows: DeliverySchedule[];
  children: (s: DeliverySchedule) => React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
        {title} · {rows.length}
      </h2>
      <div className="space-y-2">{rows.map(children)}</div>
    </div>
  );
}

function Card({
  schedule,
  expanded,
  onToggle,
  onShowMap,
  onOpen,
}: {
  schedule: DeliverySchedule;
  expanded: boolean;
  onToggle: () => void;
  onShowMap: () => void;
  onOpen: () => void;
}) {
  const live = ['claimed', 'locked', 'in_progress'].includes(schedule.status);
  const stops = schedule.stops ?? [];
  const done = stops.filter((s) => ['delivered', 'failed', 'cancelled'].includes(s.status)).length;

  return (
    <div className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 text-left flex items-start gap-3">
        <div className="p-2 rounded-xl bg-sky-500/12 text-sky-600 dark:text-cyan-300 shrink-0">
          <Truck className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-black text-slate-900 dark:text-white truncate">
              {schedule.area_label}
            </p>
            <ScheduleStatusBadge status={schedule.status} />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {schedule.port?.name ?? schedule.port_id} ·{' '}
            {schedule.departure_window_start}–{schedule.departure_window_end}
            {schedule.completed_at ? ` · finished ${formatClockTime(schedule.completed_at)}` : ''}
          </p>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase">
              <Package className="w-2.5 h-2.5" /> {done}/{stops.length} stops
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 text-[10px] font-black uppercase">
              <Coins className="w-2.5 h-2.5" />
              {formatINR(schedule.final_earnings ?? schedule.estimated_earnings)}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-slate-200/50 dark:border-white/6"
          >
            <ol className="divide-y divide-slate-200/40 dark:divide-white/5">
              {stops.map((stop) => (
                <li key={stop.id} className="px-4 py-2.5 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-500/12 text-slate-500 text-[10px] font-black grid place-items-center shrink-0 mt-0.5">
                    {stop.stop_sequence ?? '·'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 break-words">
                      {stop.delivery_address}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">{stop.token_number}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <TierBadge tier={stop.priority_tier} />
                    <DeliveryStatusBadge status={stop.status} />
                  </div>
                </li>
              ))}
            </ol>
            <div className="px-4 py-3 flex gap-2 border-t border-slate-200/50 dark:border-white/6">
              {schedule.optimized_route && (
                <Button variant="ghost" size="sm" onClick={onShowMap}>
                  View route
                </Button>
              )}
              {live && (
                <Button variant="primary" size="sm" onClick={onOpen}>
                  Open checklist
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Draws the stored optimised polyline; no live position on a historical batch. */
function RoutePreview({ schedule }: { schedule: DeliverySchedule }) {
  const [map, setMap] = useState<any>(null);
  const route = schedule.optimized_route!;
  const start: [number, number] = route.polyline[0] ?? [0, 0];

  useEffect(() => {
    if (!map || !isMapAlive(map) || route.polyline.length < 2) return;
    const line = L.polyline(route.polyline, {
      color: route.simulated ? '#94a3b8' : '#0284c7',
      weight: 5,
      opacity: 0.9,
      dashArray: route.simulated ? '7 9' : undefined,
    }).addTo(map);
    if (route.simulated) {
      line.bindTooltip('Indicative path - routing unavailable', { sticky: true });
    }
    try {
      map.fitBounds(line.getBounds().pad(0.2), { animate: false });
    } catch {
      /* degenerate geometry */
    }
    return () => {
      try {
        map.removeLayer(line);
      } catch {
        /* already gone */
      }
    };
  }, [map, route]);

  useEffect(() => {
    if (!map || !isMapAlive(map)) return;
    const pins = (schedule.stops ?? []).map((s) => {
      const pin = L.marker([s.delivery_lat, s.delivery_lng], {
        icon: L.divIcon({
          className: '',
          html:
            `<div style="background:#0f172a;color:#fff;width:24px;height:24px;border-radius:50%;` +
            `border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:grid;place-items:center;` +
            `font:700 10px/1 Inter,sans-serif">${s.stop_sequence ?? '?'}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        }),
        zIndexOffset: 900,
      }).addTo(map);
      pin.bindTooltip(`Stop ${s.stop_sequence ?? '?'} - ${s.delivery_address}`, {
        direction: 'top',
      });
      return pin;
    });
    return () => {
      pins.forEach((p) => {
        try {
          map.removeLayer(p);
        } catch {
          /* already gone */
        }
      });
    };
  }, [map, schedule]);

  return (
    <GoogleMapCanvas
      center={{ lat: start[0], lng: start[1] }}
      zoom={11}
      onMapReady={setMap}
    />
  );
}