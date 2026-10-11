/**
 * LiveTrackingMap - the customer's view of their delivery on a map.
 *
 * Owns a Leaflet map plus a `DeliveryTracker`, and pumps the tracker from a
 * requestAnimationFrame loop. Nothing goes through React state per frame - the
 * marker moves directly via `setLatLng`, which is what keeps 60fps motion smooth
 * without thrashing the component tree.
 *
 * `driverPosition` / `driverHeading` are plain props: the tracking page updates
 * them from the socket, and this component turns that discrete event stream into
 * continuous motion.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { GoogleMapCanvas, isMapAlive } from '../map/GoogleMapCanvas';
import {
  DeliveryTracker,
  buildPolylineIndex,
  etaMinutes,
  haversineKm,
  type LatLng,
  type TrackMode,
} from '../../lib/trackSimulation';

interface LiveTrackingMapProps {
  destination: LatLng;
  /** Latest real driver position from the socket or the REST snapshot. */
  driverPosition: LatLng | null;
  driverHeading: number | null;
  polyline?: [number, number][] | null;
  /** True when Geoapify was unreachable and geometry is a straight connector. */
  routeSimulated?: boolean;
  onModeChange?: (mode: TrackMode) => void;
  className?: string;
}

const DRIVER_ICON = `<div style="background:#0ea5e9;width:34px;height:34px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 10px rgba(14,165,233,.55);display:grid;place-items-center">
  <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff">
    <path d="M2.5 7.5h11v9h-11z"/><path d="M13.5 10.5h3.6l2.9 3.2v2.8h-6.5"/>
  </svg></div>`;

const DRIVER_ICON_SIZE: [number, number] = [34, 34];
const DRIVER_ICON_ANCHOR: [number, number] = [17, 17];

export function LiveTrackingMap({
  destination,
  driverPosition,
  driverHeading,
  polyline,
  routeSimulated = false,
  onModeChange,
  className = 'h-80',
}: LiveTrackingMapProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);
  const markerRef = useRef<L.Marker | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);
  const trackerRef = useRef<DeliveryTracker | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const modeRef = useRef<TrackMode>('idle');

  // The frame loop reads these through refs so it never needs to re-subscribe.
  const onModeChangeRef = useRef(onModeChange);
  onModeChangeRef.current = onModeChange;

  const handleMapReady = useCallback((m: L.Map) => setMap(m), []);

  // ── Build the scene once per geometry change ──────────────────────────────
  useEffect(() => {
    if (!map || !isMapAlive(map)) return;

    const tracker = new DeliveryTracker({ polyline, destination });
    tracker.seed(driverPosition, driverHeading);
    trackerRef.current = tracker;

    const bounds: L.LatLngExpression[] = [[destination.lat, destination.lng]];
    const owned: L.Layer[] = [];

    const idx = buildPolylineIndex(polyline);
    if (idx) {
      const pts = idx.line.map((p) => [p.lat, p.lng] as [number, number]);
      const line = L.polyline(pts, {
        color: '#0ea5e9',
        weight: 4,
        opacity: 0.85,
        dashArray: routeSimulated ? '7 9' : undefined,
      }).addTo(map);
      owned.push(line);
      if (routeSimulated) {
        line.bindTooltip('Indicative path - live routing unavailable', { sticky: true });
      }
      bounds.push(...pts);
    }

    // Breadcrumb trail sits under the truck so motion reads as a path.
    const trail = L.polyline([], { color: '#0ea5e9', weight: 2, opacity: 0.35 }).addTo(map);
    owned.push(trail);
    trailRef.current = trail;

    const stop = L.marker([destination.lat, destination.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="background:#dc2626;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      }),
    }).addTo(map);
    stop.bindTooltip('Delivery address', { direction: 'top' });
    owned.push(stop);

    if (driverPosition) {
      const marker = L.marker([driverPosition.lat, driverPosition.lng], {
        icon: L.divIcon({ className: '', html: DRIVER_ICON, iconSize: DRIVER_ICON_SIZE, iconAnchor: DRIVER_ICON_ANCHOR }),
        zIndexOffset: 1000,
      }).addTo(map);
      marker.bindTooltip('Your driver', { direction: 'top' });
      owned.push(marker);
      markerRef.current = marker;
      bounds.push([driverPosition.lat, driverPosition.lng]);
    }

    try {
      map.fitBounds(L.latLngBounds(bounds).pad(0.25), { animate: false });
    } catch {
      /* a single point has degenerate bounds */
    }

    layersRef.current = owned;

    return () => {
      for (const layer of owned) {
        try {
          layer.remove();
        } catch {
          /* map may already be torn down */
        }
      }
      layersRef.current = [];
      markerRef.current = null;
      trailRef.current = null;
      trackerRef.current = null;
    };
  }, [map, destination.lat, destination.lng, polyline, routeSimulated]); // eslint-disable-line

  // ── Feed real pings in ────────────────────────────────────────────────────
  useEffect(() => {
    if (!driverPosition) return;
    trackerRef.current?.pushReal(driverPosition, driverHeading);
  }, [driverPosition, driverHeading]);

  // ── Frame loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !isMapAlive(map)) return;
    let raf = 0;
    const trail: [number, number][] = [];

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const tracker = trackerRef.current;
      if (!tracker || !tracker.tick(now)) return;

      const state = tracker.getState();
      if (state.position) {
        try {
          if (markerRef.current) {
            markerRef.current.setLatLng([state.position.lat, state.position.lng]);
          } else {
            const marker = L.marker([state.position.lat, state.position.lng], {
              icon: L.divIcon({ className: '', html: DRIVER_ICON, iconSize: DRIVER_ICON_SIZE, iconAnchor: DRIVER_ICON_ANCHOR }),
              zIndexOffset: 1000,
            }).addTo(map);
            marker.bindTooltip('Your driver', { direction: 'top' });
            markerRef.current = marker;
          }

          const last = trail[trail.length - 1];
          if (!last || haversineKm({ lat: last[0], lng: last[1] }, state.position) > 0.01) {
            trail.push([state.position.lat, state.position.lng]);
            if (trail.length > 500) trail.shift();
            trailRef.current?.setLatLngs(trail);
          }
        } catch {
          // Map torn down mid-frame; the cleanup effect handles teardown.
        }
      }

      if (state.mode !== modeRef.current) {
        modeRef.current = state.mode;
        onModeChangeRef.current?.(state.mode);
        if (badgeRef.current) {
          badgeRef.current.dataset.mode = state.mode;
          badgeRef.current.innerHTML = modeBadge(state.mode, state.position, destination);
        }
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [map, destination]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-white/50 dark:border-white/10 ${className}`}>
      <GoogleMapCanvas center={destination} zoom={13} onMapReady={handleMapReady} />
      <div ref={badgeRef} data-mode="idle" className="absolute top-3 left-3 z-[5] pointer-events-none" />
    </div>
  );
}

function modeBadge(mode: TrackMode, pos: LatLng | null, destination: LatLng): string {
  if (mode === 'real') {
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15
      text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase border border-emerald-400/30
      backdrop-blur-xl">
      <span class="relative flex w-1.5 h-1.5">
        <span class="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
        <span class="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
      </span>Live</span>`;
  }
  if (mode === 'simulated') {
    // Never let a synthetic position look real - label it inline on the map.
    const mins = pos ? etaMinutes(haversineKm(pos, destination)) : null;
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15
      text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase border border-amber-400/30
      backdrop-blur-xl" title="The driver app is not reporting a position, so this route is being
      estimated from the planned path.">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 9v4"/><path d="M12 17h.01"/>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>
      </svg>Simulated${mins != null ? ` · ETA ~${mins} min` : ''}</span>`;
  }
  return '';
}
