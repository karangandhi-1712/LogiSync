// ─── DriverHomePage - the claimed batch: route map + per-stop checklist ───────
// The animated-marker engine is carried over from the previous driver home page
// (haversineM / posAt / one shared rAF loop), repointed at the batch's own
// optimised polyline instead of a per-booking fetched route.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleSlash,
  Coins,
  Loader2,
  MapPin,
  Navigation,
  Package,
  PlayCircle,
  Route,
  Truck,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { GoogleMapCanvas, isMapAlive } from '../components/map/GoogleMapCanvas';
import { createTruckDivIcon } from '../components/map/TruckMarker';
import { Button } from '../components/ui/Button';
import {
  DeliveryStatusBadge,
  ScheduleStatusBadge,
  TierBadge,
  formatDistance,
  formatINR,
} from '../components/marketplace/Badges';
import { useToast } from '../context/ToastContext';
import { useMarketplace, useMarketplaceEvent } from '../context/MarketplaceContext';
import {
  advanceStop,
  departDepot,
  fetchMySchedules,
  fetchSchedule,
  updateDriverPosition,
} from '../services/api';
import { DELIVERY_TRANSITIONS } from '../types';
import type { DeliveryRequest, DeliverySchedule, DeliveryStatus } from '../types';

// Glide speed for the simulated marker when we have no real GPS fix.
const SIM_SPEED_MPS = 300;

interface Sim {
  marker: L.Marker;
  latlngs: [number, number][];
  cum: number[];
  total: number;
  traveled: number;
}

function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function posAt(sim: Sim): [number, number] {
  const { latlngs, cum, total, traveled } = sim;
  if (traveled <= 0) return latlngs[0];
  if (traveled >= total) return latlngs[latlngs.length - 1];
  let i = 1;
  while (i < cum.length - 1 && cum[i] < traveled) i++;
  const segLen = cum[i] - cum[i - 1] || 1;
  const f = (traveled - cum[i - 1]) / segLen;
  const a = latlngs[i - 1];
  const b = latlngs[i];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

export default function DriverHomePage() {
  const { showToast } = useToast();
  const { isFallback, send } = useMarketplace();
  const navigate = useNavigate();

  const [batch, setBatch] = useState<DeliverySchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState<any>(null);
  const [busyStop, setBusyStop] = useState<string | null>(null);
  const [departing, setDeparting] = useState(false);
  const [locationSharing, setLocationSharing] = useState<'inactive' | 'requesting' | 'live' | 'denied' | 'unavailable'>('inactive');
  const [failureFor, setFailureFor] = useState<DeliveryRequest | null>(null);
  const [failureReason, setFailureReason] = useState('');

  const layersRef = useRef<L.Layer[]>([]);
  const simRef = useRef<Sim | null>(null);
  const rafRef = useRef(0);
  const gpsLiveRef = useRef(false);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const rows = await fetchMySchedules();
        const active = rows.find(
          (s) => ['claimed', 'locked', 'in_progress'].includes(s.status),
        );
        setBatch(active ?? null);
      } catch {
        if (!quiet) showToast({ type: 'error', title: 'Could not load your batch', message: 'Check your connection and retry.' });
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isFallback) return;
    const timer = setInterval(() => load(true), 10000);
    return () => clearInterval(timer);
  }, [isFallback, load]);

  const activeScheduleId = batch?.id;

  // Share actual device GPS once the driver has departed. The WebSocket path
  // persists and fans each fix out to customers on this batch; REST is the
  // fallback when the socket is unavailable.
  useEffect(() => {
    if (!activeScheduleId || batch?.status !== 'in_progress') {
      gpsLiveRef.current = false;
      setLocationSharing('inactive');
      return;
    }
    if (!navigator.geolocation) {
      gpsLiveRef.current = false;
      setLocationSharing('unavailable');
      return;
    }

    let lastSentAt = 0;
    setLocationSharing('requesting');
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading } = position.coords;
        gpsLiveRef.current = true;
        setLocationSharing('live');

        // Keep the driver's map marker on the device's real position as well.
        const sim = simRef.current;
        if (sim) {
          try {
            sim.marker.setLatLng([latitude, longitude]);
            let nearest = 0;
            let nearestDistance = Infinity;
            sim.latlngs.forEach((point, index) => {
              const distance = haversineM([latitude, longitude], point);
              if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = index;
              }
            });
            sim.traveled = sim.cum[nearest];
          } catch {
            /* The map may be closing while a GPS fix arrives. */
          }
        }

        // GPS devices can report very frequently; 3 seconds is responsive and
        // keeps socket and database traffic reasonable.
        const now = Date.now();
        if (now - lastSentAt < 3000) return;
        lastSentAt = now;
        const payload = {
          schedule_id: activeScheduleId,
          latitude,
          longitude,
          heading: heading == null || !Number.isFinite(heading) ? null : heading,
        };
        if (isFallback) {
          updateDriverPosition(activeScheduleId, latitude, longitude, payload.heading ?? undefined)
            .catch(() => setLocationSharing('unavailable'));
        } else {
          send('driver:position', payload);
        }
      },
      (error) => {
        gpsLiveRef.current = false;
        setLocationSharing(error.code === 1 ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      gpsLiveRef.current = false;
    };
  }, [activeScheduleId, batch?.status, isFallback, send]);

  useMarketplaceEvent('delivery:status_changed', () => load(true));
  useMarketplaceEvent('schedule:stop_added', () => load(true));
  useMarketplaceEvent('schedule:locked', () => load(true));

  const stops = useMemo<DeliveryRequest[]>(() => {
    const list = batch?.stops ?? [];
    return [...list].sort((a, b) => (a.stop_sequence ?? 999) - (b.stop_sequence ?? 999));
  }, [batch]);

  const route = batch?.optimized_route ?? null;

  // ── Map: polyline, depot, numbered stop pins, moving marker ───────────────
  useEffect(() => {
    if (!map || !isMapAlive(map) || !batch) return;

    cancelAnimationFrame(rafRef.current);
    layersRef.current.forEach((l) => {
      try {
        map.removeLayer(l);
      } catch {
        /* already removed */
      }
    });
    layersRef.current = [];
    if (simRef.current) {
      try {
        simRef.current.marker.remove();
      } catch {
        /* already removed */
      }
      simRef.current = null;
    }

    const bounds: [number, number][] = [];

    if (route?.polyline?.length >= 2) {
      const line = L.polyline(route.polyline, {
        color: route.simulated ? '#94a3b8' : '#0284c7',
        weight: 5,
        opacity: 0.9,
        dashArray: route.simulated ? '7 9' : undefined,
      }).addTo(map);
      if (route.simulated) {
        line.bindTooltip('Indicative path - routing unavailable', { sticky: true });
      }
      layersRef.current.push(line);
      bounds.push(...route.polyline);
    }

    if (batch.port) {
      const depot = L.circleMarker([batch.port.lat, batch.port.lng], {
        radius: 9,
        color: '#334155',
        weight: 3,
        fillColor: '#64748b',
        fillOpacity: 0.9,
      }).addTo(map);
      depot.bindTooltip(`Depot: ${batch.port.name}`, { direction: 'top' });
      layersRef.current.push(depot);
      bounds.push([batch.port.lat, batch.port.lng]);
    }

    stops.forEach((stop) => {
      const done = ['delivered', 'failed', 'cancelled'].includes(stop.status);
      const pin = L.marker([stop.delivery_lat, stop.delivery_lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:${done ? '#94a3b8' : '#0f172a'};color:#fff;width:26px;height:26px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:grid;place-items:center;font:700 11px/1 Inter,sans-serif">${stop.stop_sequence ?? '?'}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 26],
        }),
        zIndexOffset: 900,
      }).addTo(map);
      pin.bindTooltip(
        `<b>Stop ${stop.stop_sequence ?? '?'}</b><br/>${stop.delivery_address}`,
        { direction: 'top' },
      );
      layersRef.current.push(pin);
      bounds.push([stop.delivery_lat, stop.delivery_lng]);
    });

    // Driver marker. Prefer the server's last known position, else start at the
    // depot and glide along the polyline so the route reads as live.
    const latlngs: [number, number][] =
      route?.polyline?.length >= 2
        ? (route.polyline as [number, number][])
        : (bounds as [number, number][]);

    if (latlngs.length >= 2) {
      const start: [number, number] =
        batch.driver_lat != null && batch.driver_lng != null
          ? [batch.driver_lat, batch.driver_lng]
          : latlngs[0];
      const marker = L.marker(start, {
        icon: createTruckDivIcon({ truckType: 'container_chassis', status: 'in_transit' }),
        zIndexOffset: 1200,
        keyboard: false,
      }).addTo(map);
      marker.bindTooltip('You', { direction: 'top' });
      layersRef.current.push(marker);

      const cum = [0];
      for (let i = 1; i < latlngs.length; i++) {
        cum.push(cum[i - 1] + haversineM(latlngs[i - 1], latlngs[i]));
      }
      const total = cum[cum.length - 1] || 1;

      // How far along we already are, so a reload doesn't restart from the depot.
      let travelled = 0;
      if (batch.driver_lat != null) {
        let best = Infinity;
        latlngs.forEach((pt, i) => {
          const d = haversineM([batch.driver_lat!, batch.driver_lng!], pt);
          if (d < best) {
            best = d;
            travelled = cum[i];
          }
        });
      }

      simRef.current = { marker, latlngs, cum, total, traveled: travelled };
      marker.setLatLng(posAt(simRef.current));
    }

    if (bounds.length) {
      try {
        map.fitBounds(L.latLngBounds(bounds).pad(0.2), { animate: false });
      } catch {
        /* single point */
      }
    }

    // One frame-rate-independent loop for the marker.
    let last = performance.now();
    const tick = (now: number) => {
      const sim = simRef.current;
      if (!sim) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (batch.status === 'in_progress') {
        if (!gpsLiveRef.current) {
          sim.traveled = Math.min(sim.total, sim.traveled + SIM_SPEED_MPS * dt);
          try {
            sim.marker.setLatLng(posAt(sim));
          } catch {
            /* marker gone */
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [map, batch, route, stops.length, isFallback, send]);

  async function handleAdvance(stop: DeliveryRequest, next: DeliveryStatus) {
    setBusyStop(stop.id);
    try {
      // Lock and optimise the complete batch before its first stop is marked
      // out for delivery. This makes the multi-stop route available to the
      // driver map and starts GPS sharing for the customer tracking pages.
      if (next === 'en_route' && batch && batch.status !== 'in_progress') {
        const departed = await departDepot(batch.id);
        setBatch(departed);
      }
      const res = await advanceStop(stop.id, next);
      setBatch((prev) =>
        prev
          ? { ...prev, stops: prev.stops?.map((s) => (s.id === res.id ? res : s)) ?? [] }
          : prev,
      );
      if (res.schedule_completed) {
        showToast({
          type: 'success',
          title: 'Batch complete',
          message: 'All stops are closed out. You are available for new work again.',
        });
        await load(true);
        return;
      }
      showToast({
        type: 'success',
        title: `Stop ${stop.stop_sequence} - ${next.replace('_', ' ')}`,
        message: 'Consumers and the depot have been updated.',
      });
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      showToast({
        type: 'error',
        title: 'Update rejected',
        message: typeof detail === 'string' ? detail : 'Please retry.',
      });
    } finally {
      setBusyStop(null);
    }
  }

  async function handleFail() {
    if (!failureFor) return;
    const target = failureFor;
    const reason = failureReason.trim();
    if (!reason) return;
    setFailureFor(null);
    setFailureReason('');
    await handleAdvance(target, 'failed');
  }

  async function handleDepart() {
    if (!batch) return;
    setDeparting(true);
    try {
      const updated = await departDepot(batch.id);
      setBatch(updated);
      showToast({
        type: 'success',
        title: 'Route locked',
        message: `${stops.length} stops in order · ${formatDistance(updated.optimized_route?.total_distance_km)}`,
      });
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      showToast({
        type: 'error',
        title: 'Could not depart',
        message: typeof detail === 'string' ? detail : 'Please retry.',
      });
    } finally {
      setDeparting(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full grid place-items-center bg-[var(--bg-canvas)]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="h-full grid place-items-center bg-[var(--bg-canvas)] p-6">
        <div className="text-center max-w-sm">
          <div className="inline-flex p-4 rounded-2xl bg-slate-500/10 text-slate-400 mb-4">
            <Route className="w-8 h-8" />
          </div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">No active batch</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Claim a batch from Available Jobs and it will appear here with your route and
            per-stop checklist.
          </p>
          <Button variant="primary" className="mt-5" onClick={() => navigate('/jobs')}>
            Browse available jobs <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  const doneCount = stops.filter((s) => ['delivered', 'failed', 'cancelled'].includes(s.status)).length;
  const canDepart = batch.status === 'claimed';

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg-canvas)]">
      {/* Header */}
      <div id="tutorial-driver-home" className="px-4 sm:px-6 py-3.5 border-b border-white/40 dark:border-white/8 flex-shrink-0 flex items-center gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-base font-black text-slate-900 dark:text-white truncate">
            {batch.area_label}
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {batch.port?.name ?? batch.port_id} · departing{' '}
            {batch.departure_window_start}–{batch.departure_window_end}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <ScheduleStatusBadge status={batch.status} />
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-400/25 text-[10px] font-black uppercase">
            <Package className="w-3 h-3" /> {doneCount}/{stops.length}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase">
            <Coins className="w-3 h-3" />
            {formatINR(batch.final_earnings ?? batch.estimated_earnings)}
          </span>
          {isFallback && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/12 text-amber-700 dark:text-amber-300 border border-amber-400/30 text-[10px] font-bold">
              <WifiOff className="w-3 h-3" /> Polling
            </span>
          )}
        </div>
      </div>

      {batch.status === 'in_progress' && (
        <div className={`px-4 sm:px-6 py-2 text-[11px] font-semibold border-b ${
          locationSharing === 'live'
            ? 'text-emerald-700 dark:text-emerald-300 border-emerald-400/20 bg-emerald-500/5'
            : 'text-amber-700 dark:text-amber-300 border-amber-400/20 bg-amber-500/5'
        }`}>
          {locationSharing === 'live'
            ? 'Live GPS sharing is on. Customers with an out-for-delivery parcel can follow your location.'
            : locationSharing === 'requesting'
              ? 'Waiting for device location permission. Allow location access to share your live position.'
              : locationSharing === 'denied'
                ? 'Location access is blocked. Allow location access in your browser settings to share your live position.'
                : 'Live GPS is unavailable on this device. Customers will see the planned route without a live position.'}
        </div>
      )}

      <div className="flex-1 min-h-0 grid lg:grid-cols-[1fr_400px]">
        {/* Map */}
        <div id="tutorial-driver-map" className="relative min-h-[280px] lg:min-h-0">
          <GoogleMapCanvas
            center={
              batch.port
                ? { lat: batch.port.lat, lng: batch.port.lng }
                : { lat: batch.area_center_lat, lng: batch.area_center_lng }
            }
            zoom={12}
            onMapReady={setMap}
          />
          {canDepart && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[500]">
              <Button variant="primary" size="lg" isLoading={departing} onClick={handleDepart}>
                <PlayCircle className="w-4 h-4" /> Loaded up - depart &amp; lock route
              </Button>
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="overflow-y-auto border-t lg:border-t-0 lg:border-l border-white/40 dark:border-white/8 min-h-0">
          <div id="tutorial-stop-checklist" className="px-4 py-3 border-b border-white/40 dark:border-white/8 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Stop checklist
            </h2>
            {route && (
              <span className="text-[10px] font-mono text-slate-400">
                {formatDistance(route.total_distance_km)} ·{' '}
                {Math.round(route.total_duration_s / 60)} min
                {route.simulated && ' · approx'}
              </span>
            )}
          </div>

          {stops.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-slate-500">
              This batch has no stops attached.
            </p>
          ) : (
            <ol className="divide-y divide-slate-200/50 dark:divide-white/6">
              {stops.map((stop) => {
                const allowed = DELIVERY_TRANSITIONS[stop.status] ?? [];
                const terminal = allowed.length === 0;
                return (
                  <li key={stop.id} className="px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-black shrink-0 mt-0.5 ${
                          ['delivered', 'failed', 'cancelled'].includes(stop.status)
                            ? 'bg-slate-500/15 text-slate-500'
                            : 'bg-sky-500 text-white'
                        }`}
                      >
                        {stop.stop_sequence ?? '·'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-black text-slate-900 dark:text-white">
                            {stop.delivery_address}
                          </p>
                          <TierBadge tier={stop.priority_tier} />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {stop.token_number}
                          {stop.package_type ? ` · ${stop.package_type}` : ''}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <DeliveryStatusBadge status={stop.status} />
                          {stop.failure_reason && (
                            <span className="text-[10px] text-rose-600 dark:text-rose-300">
                              {stop.failure_reason}
                            </span>
                          )}
                        </div>

                        {!terminal && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {allowed
                              .filter((s) => s !== 'cancelled')
                              .map((next) => (
                                <button
                                  key={next}
                                  disabled={busyStop === stop.id}
                                  onClick={() =>
                                    next === 'failed'
                                      ? setFailureFor(stop)
                                      : handleAdvance(stop, next)
                                  }
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black border transition disabled:opacity-50 ${
                                    next === 'failed'
                                      ? 'border-rose-400/35 text-rose-600 dark:text-rose-300 hover:bg-rose-500/10'
                                      : next === 'picked_up'
                                        ? 'border-sky-400/35 text-sky-600 dark:text-cyan-300 hover:bg-sky-500/10'
                                        : 'border-emerald-400/35 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/10'
                                  }`}
                                >
                                  {busyStop === stop.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : next === 'picked_up' ? (
                                    'Picked up'
                                  ) : next === 'en_route' ? (
                                    batch.status === 'in_progress' ? 'Out for delivery' : 'Start route & deliver'
                                  ) : next === 'delivered' ? (
                                    'Delivered'
                                  ) : next === 'failed' ? (
                                    "Couldn't deliver"
                                  ) : (
                                    next.replace('_', ' ')
                                  )}
                                </button>
                              ))}
                            <button
                              disabled={busyStop === stop.id}
                              onClick={() => handleAdvance(stop, 'cancelled')}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-black border border-slate-300/60 dark:border-white/15 text-slate-500 dark:text-slate-400 hover:bg-slate-500/10 transition disabled:opacity-50"
                            >
                              Cancel stop
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      {/* Failure-reason dialog */}
      {failureFor && (
        <div className="fixed inset-0 z-[1500] grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setFailureFor(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl liquid-glass-elevated border border-white/50 dark:border-white/10 shadow-2xl p-5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Couldn&rsquo;t deliver stop {failureFor.stop_sequence}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  A short reason goes to the consumer and the depot.
                </p>
              </div>
            </div>
            <textarea
              autoFocus
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
              rows={3}
              placeholder="e.g. Customer not reachable, shop closed"
              className="mt-3 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-sky-400 resize-none"
            />
            <div className="mt-3 flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setFailureFor(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" disabled={!failureReason.trim()} onClick={handleFail}>
                <XCircle className="w-3.5 h-3.5" /> Mark failed
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
