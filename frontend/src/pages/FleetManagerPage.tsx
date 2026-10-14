// ─── FleetManagerPage - the fleet manager console ─────────────────────────────
// Three jobs: see what is pending at your depot, turn a cluster of it into a
// broadcast batch, and keep an eye on the batches already running.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  AlertTriangle,
  Crosshair,
  Layers,
  Loader2,
  Lock,
  MapPin,
  Package,
  Radio,
  RefreshCw,
  Truck,
  UserRoundX,
  Zap,
} from 'lucide-react';
import { GoogleMapCanvas, isMapAlive } from '../components/map/GoogleMapCanvas';
import { Button } from '../components/ui/Button';
import { ScheduleCreator } from '../components/marketplace/ScheduleCreator';
import {
  DeliveryStatusBadge,
  ScheduleStatusBadge,
  TierBadge,
  formatDistance,
  formatINR,
} from '../components/marketplace/Badges';
import { useAuth } from '../context/AuthContext';
import { usePort } from '../context/PortContext';
import { useToast } from '../context/ToastContext';
import { useMarketplace, useMarketplaceEvent } from '../context/MarketplaceContext';
import {
  cancelSchedule,
  createSchedule,
  fetchPendingQueue,
  fetchSchedules,
  forceLockSchedule,
  reassignSchedule,
} from '../services/api';
import { haversineKm } from '../data/ports';
import type { DeliveryRequest, DeliverySchedule } from '../types';

export default function FleetManagerPage() {
  const { user } = useAuth();
  const { ports, setPortId } = usePort();
  const { showToast } = useToast();
  const { isFallback } = useMarketplace();

  const [pending, setPending] = useState<DeliveryRequest[]>([]);
  const [urgent, setUrgent] = useState<DeliveryRequest[]>([]);
  const [schedules, setSchedules] = useState<DeliverySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [zoom, setZoom] = useState(12);
  const layersRef = useRef<L.Layer[]>([]);

  const portId = user?.assigned_port_id ?? null;
  const port = ports.find((p) => p.id === portId) ?? null;

  // Fleet managers are scoped to their own depot, everywhere.
  useEffect(() => {
    if (portId) setPortId(portId);
  }, [portId, setPortId]);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const [queue, active] = await Promise.all([fetchPendingQueue(), fetchSchedules()]);
        setPending(queue.requests);
        setUrgent(queue.urgent_without_batch);
        setSchedules(active);
      } catch {
        if (!quiet) {
          showToast({ type: 'error', title: 'Could not load your depot', message: 'Check your connection and retry.' });
        }
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
    const t = setInterval(() => load(true), 10000);
    return () => clearInterval(t);
  }, [isFallback, load]);

  useMarketplaceEvent('delivery:status_changed', () => load(true));
  useMarketplaceEvent('schedule:claimed', () => load(true));
  useMarketplaceEvent('schedule:stop_added', () => load(true));

  // Recentre when the FM's depot resolves.
  useEffect(() => {
    if (port && !center) {
      setCenter({ lat: port.lat, lng: port.lng });
      setZoom(port.zoom ?? 12);
    }
  }, [port, center]);

  // ── Map: click to set batch centre ───────────────────────────────────────
  useEffect(() => {
    if (!map || !isMapAlive(map)) return;
    const onMapClick = (e: any) => {
      if (e.latlng) {
        setCenter({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    };
    map.on('click', onMapClick);
    return () => {
      try {
        map.off('click', onMapClick);
      } catch {
        /* already destroyed */
      }
    };
  }, [map]);

  // ── Map: pending pins + live driver markers + running-batch circles ────────
  useEffect(() => {
    if (!map || !isMapAlive(map)) return;
    layersRef.current.forEach((l) => {
      try {
        map.removeLayer(l);
      } catch {
        /* already gone */
      }
    });
    layersRef.current = [];

    if (port) {
      const depot = L.circleMarker([port.lat, port.lng], {
        radius: 10,
        color: '#334155',
        weight: 3,
        fillColor: '#0284c7',
        fillOpacity: 0.9,
      }).addTo(map);
      depot.bindTooltip(`Depot: ${port.name}`, { direction: 'top' });
      layersRef.current.push(depot);
    }

    pending.forEach((req) => {
      const isUrgent = req.priority_tier === 'urgent';
      const pin = L.marker([req.delivery_lat, req.delivery_lng], {
        icon: L.divIcon({
          className: '',
          html:
            `<div style="background:${isUrgent ? '#dc2626' : '#0f172a'};color:#fff;` +
            `width:24px;height:24px;border-radius:50%;border:3px solid #fff;` +
            `box-shadow:0 2px 8px rgba(0,0,0,.3);display:grid;place-items:center">` +
            `<svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M3 13h18v-2l-3-4H7l-3 4v2zm2 .8V19h3v-5.2h8V19h3v-5.2"/></svg></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        }),
        zIndexOffset: isUrgent ? 950 : 900,
      }).addTo(map);
      pin.bindTooltip(
        `<b>${req.token_number}</b><br/>${req.delivery_address}<br/>${req.priority_tier}`,
        { direction: 'top' },
      );
      layersRef.current.push(pin);
    });

    // Running batches: the area circle plus the driver's live position.
    schedules
      .filter((s) => s.status !== 'cancelled')
      .forEach((s) => {
        const area = L.circle([s.area_center_lat, s.area_center_lng], {
          radius: s.radius_km * 1000,
          color: s.status === 'broadcasting' ? '#0284c7' : '#059669',
          weight: 1.5,
          fillColor: s.status === 'broadcasting' ? '#0284c7' : '#059669',
          fillOpacity: 0.08,
        }).addTo(map);
        area.bindTooltip(`${s.area_label} · ${s.status} · ${s.stop_count ?? 0} stops`, {
          sticky: true,
        });
        layersRef.current.push(area);

        if (s.driver_lat != null && s.driver_lng != null) {
          const driverMarker = L.marker([s.driver_lat, s.driver_lng], {
            icon: L.divIcon({
              className: '',
              html:
                `<div style="background:#059669;width:26px;height:26px;border-radius:50%;` +
                `border:3px solid #fff;box-shadow:0 2px 8px rgba(5,150,105,.5);display:grid;place-items:center">` +
                `<svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm6.9 9h-3a15.6 15.6 0 00-1.4-6.1A8 8 0 0118.9 11zM12 4c.9 1.4 1.7 3.8 1.8 7h-3.6C10.3 7.8 11.1 5.4 12 4z"/></svg></div>`,
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            }),
            zIndexOffset: 1100,
          }).addTo(map);
          driverMarker.bindTooltip(
            `${s.driver?.full_name ?? 'Driver'} · ${s.stop_count ?? 0} stops`,
            { direction: 'top' },
          );
          layersRef.current.push(driverMarker);
        }
      });

    if (pending.length || schedules.length) {
      try {
        const pts: [number, number][] = [
          ...(port ? ([[port.lat, port.lng]] as [number, number][]) : []),
          ...pending.map((r) => [r.delivery_lat, r.delivery_lng] as [number, number]),
        ];
        if (pts.length > 1) map.fitBounds(L.latLngBounds(pts).pad(0.15), { animate: false });
      } catch {
        /* single point */
      }
    }
  }, [map, pending, schedules, port]);

  async function handleCreate(input: {
    area_label: string;
    area_center_lat: number;
    area_center_lng: number;
    radius_km: number;
    departure_window_start: string;
    departure_window_end: string;
    max_batch_size: number;
    request_ids: string[];
  }) {
    if (!portId) return;
    setBusy(true);
    try {
      const created = await createSchedule({ port_id: portId, ...input });
      showToast({
        type: 'success',
        title: 'Batch broadcast',
        message: `${created.stop_count ?? 0} stops · ${formatINR(created.estimated_earnings)} · pushed to available drivers`,
      });
      await load(true);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      showToast({
        type: 'error',
        title: 'Could not create the batch',
        message: typeof detail === 'string' ? detail : 'Please retry.',
      });
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function handleUrgentNow(req: DeliveryRequest) {
    await handleCreate({
      area_label: `Urgent - ${req.delivery_address.slice(0, 40)}`,
      area_center_lat: req.delivery_lat,
      area_center_lng: req.delivery_lng,
      radius_km: 3,
      departure_window_start: '00:00',
      departure_window_end: '23:59',
      max_batch_size: 1,
      request_ids: [req.id],
    }).catch(() => {});
  }

  async function act(fn: () => Promise<DeliverySchedule>, okMsg: string) {
    setBusy(true);
    try {
      await fn();
      showToast({ type: 'success', title: okMsg, message: 'The batch has been updated.' });
      await load(true);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      showToast({
        type: 'error',
        title: 'Action failed',
        message: typeof detail === 'string' ? detail : 'Please retry.',
      });
    } finally {
      setBusy(false);
    }
  }

  const tierCounts = useMemo(() => {
    const c = { standard: 0, express: 0, urgent: 0 };
    pending.forEach((p) => {
      c[p.priority_tier as 'standard' | 'express' | 'urgent'] += 1;
    });
    return c;
  }, [pending]);

  if (!portId) {
    return (
      <div className="h-full grid place-items-center bg-[var(--bg-canvas)] p-6 text-center">
        <div>
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <h1 className="text-lg font-black text-slate-900 dark:text-white">No depot assigned</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Ask the port admin to assign you to a port.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg-canvas)]">
      <div className="px-4 sm:px-6 py-3.5 border-b border-white/40 dark:border-white/8 flex-shrink-0 flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-base font-black text-slate-900 dark:text-white">
            {port?.name ?? portId} - Delivery Console
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {pending.length} pending · {tierCounts.urgent} urgent · {schedules.length} active batches
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-400/25 text-[10px] font-black uppercase">
            <Package className="w-3 h-3" /> {tierCounts.standard} std
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/12 text-sky-600 dark:text-cyan-300 border border-sky-400/30 text-[10px] font-black uppercase">
            <Zap className="w-3 h-3" /> {tierCounts.express} exp
          </span>
          <Button variant="ghost" size="sm" onClick={() => load()} isLoading={loading}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid lg:grid-cols-[1fr_420px]">
        {/* Map */}
        <div className="relative min-h-[300px] lg:min-h-0">
          <GoogleMapCanvas
            center={center ?? { lat: 8.7642, lng: 78.1348 }}
            zoom={zoom}
            onMapReady={setMap}
          />
          <div className="absolute bottom-3 left-3 z-[500] flex flex-col gap-1.5">
            <button
              onClick={() => {
                if (!map || !port) return;
                map.setView([port.lat, port.lng], port.zoom ?? 12);
              }}
              className="p-2.5 rounded-xl liquid-glass border border-white/50 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-sky-500"
              aria-label="Recentre on depot"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Side panel */}
        <div className="overflow-y-auto border-t lg:border-t-0 lg:border-l border-white/40 dark:border-white/8 min-h-0">
          {/* Urgent prompt */}
          {urgent.length > 0 && (
            <div className="m-4 p-3.5 rounded-2xl border border-amber-400/35 bg-amber-500/10">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-amber-800 dark:text-amber-200">
                    {urgent.length} Urgent request{urgent.length === 1 ? '' : 's'} ha
                    {urgent.length === 1 ? 's' : 've'} no open batch
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    Create an immediate single-stop run for {urgent.length === 1 ? 'it' : 'them'}.
                  </p>
                </div>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {urgent.map((u) => (
                  <button
                    key={u.id}
                    disabled={busy}
                    onClick={() => handleUrgentNow(u)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white/60 dark:bg-white/5 border border-amber-400/30 text-left hover:bg-amber-500/15 transition disabled:opacity-50"
                  >
                    <TierBadge tier="urgent" />
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate flex-1">
                      {u.delivery_address}
                    </span>
                    <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 shrink-0">
                      Run now
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create batch */}
          <div id="tutorial-schedule-creator" className="p-4 border-b border-white/40 dark:border-white/8">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2.5">
              Create a broadcast batch
            </h2>
            <ScheduleCreator
              port={port}
              pending={pending}
              externalCentre={center}
              onMapCentre={setCenter}
              onCreate={handleCreate}
              busy={busy}
            />
          </div>

          {/* Pending list */}
          <div id="tutorial-fm-pending" className="p-4 border-b border-white/40 dark:border-white/8">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
              Pending requests · {pending.length}
            </h2>
            {pending.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
                Nothing waiting - new consumer requests land here.
              </p>
            ) : (
              <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                {pending.map((r) => (
                  <li
                    key={r.id}
                    className="px-2.5 py-2 rounded-xl bg-slate-500/6 border border-slate-200/50 dark:border-white/6"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 break-words flex-1">
                            {r.delivery_address}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const c = { lat: r.delivery_lat, lng: r.delivery_lng };
                              setCenter(c);
                              if (map && isMapAlive(map)) {
                                map.setView([r.delivery_lat, r.delivery_lng], 13);
                              }
                            }}
                            className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-sky-600 dark:text-cyan-300 hover:bg-sky-50 dark:hover:bg-white/10 transition"
                            title="Center batch circle on this delivery request"
                          >
                            <Crosshair className="w-3 h-3" /> Centre batch
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <TierBadge tier={r.priority_tier} />
                          <DeliveryStatusBadge status={r.status} />
                          <span className="text-[10px] font-mono text-slate-400">
                            {r.token_number}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Active batches */}
          <div id="tutorial-fm-batches" className="p-4">
            <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
              Active batches · {schedules.length}
            </h2>
            {schedules.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
                No batches running.
              </p>
            ) : (
              <ul className="space-y-2">
                {schedules.map((s) => (
                  <li
                    key={s.id}
                    className="p-3 rounded-xl bg-slate-500/6 border border-slate-200/50 dark:border-white/6"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-900 dark:text-white break-words">
                          {s.area_label}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <ScheduleStatusBadge status={s.status} />
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            {s.stop_count ?? 0}/{s.max_batch_size} stops
                          </span>
                          {s.final_earnings != null && (
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                              {formatINR(s.final_earnings)}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400 font-mono">
                          {s.departure_window_start}–{s.departure_window_end} ·{' '}
                          {formatDistance(s.radius_km)} radius
                        </p>
                        {s.driver && (
                          <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            <Truck className="w-3 h-3" /> {s.driver.full_name}
                            {s.driver.vehicle_number ? ` · ${s.driver.vehicle_number}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {['claimed', 'locked'].includes(s.status) && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => act(() => forceLockSchedule(s.id), 'Batch locked')}
                            icon={<Lock className="w-3 h-3" />}
                          >
                            Force-lock
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              act(() => reassignSchedule(s.id), 'Batch back in the feed')
                            }
                            icon={<UserRoundX className="w-3 h-3" />}
                          >
                            Reassign
                          </Button>
                        </>
                      )}
                      {s.status !== 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => act(() => cancelSchedule(s.id), 'Batch cancelled')}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}