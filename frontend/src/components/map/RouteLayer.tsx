import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { fetchRoute } from '../../services/api';
import { isMapAlive } from './GoogleMapCanvas';

interface RouteLayerProps {
  map: any;
  /** Changing this key refetches (truck switch). Position drift is throttled
   *  by rounding — refetch only after ~100m of movement. */
  routeKey: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  /** 'delayed' renders amber, everything else strong blue. */
  status?: string;
  label?: string;
}

/**
 * True road-geometry route for one leg (selected truck → destination gate).
 * Backend serves Geoapify geometry; when it flags `simulated`, the line is
 * dashed + labeled "indicative" so we never fake road geometry.
 */
export function RouteLayer({ map, routeKey, fromLat, fromLng, toLat, toLng, status, label }: RouteLayerProps) {
  const layerRef = useRef<L.LayerGroup | null>(null);
  const fetchedKeyRef = useRef<string>('');

  useEffect(() => {
    if (!map || !isMapAlive(map)) return;
    // Throttle: refetch only when the rounded origin moves (~110m grid).
    const key = `${routeKey}|${fromLat.toFixed(3)},${fromLng.toFixed(3)}|${toLat.toFixed(5)},${toLng.toFixed(5)}`;
    if (key === fetchedKeyRef.current) return;
    fetchedKeyRef.current = key;

    let cancelled = false;
    const group = L.layerGroup();
    layerRef.current = group;

    fetchRoute(fromLat, fromLng, toLat, toLng)
      .then(route => {
        if (cancelled || !isMapAlive(map)) return;
        let coords: any[] = route?.geometry?.coordinates || [];
        // Tolerate MultiLineString nesting (contract is flat LineString).
        if (coords.length > 0 && Array.isArray(coords[0]?.[0])) coords = coords.flat();
        if (coords.length < 2) return;
        const latlngs = coords.map(([lng, lat]) => [lat, lng] as [number, number]);
        const delayed = status === 'delayed';
        const color = delayed ? '#D97706' : '#1D4ED8';
        const line = L.polyline(latlngs, {
          color,
          weight: 4,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: route.simulated ? '7 9' : undefined,
        });
        const dist = route.properties?.distance_m;
        const dur = route.properties?.duration_s;
        const distTxt = dist != null ? `${(dist / 1000).toFixed(1)} km` : '';
        const durTxt = dur != null ? ` · ${Math.round(dur / 60)} min` : '';
        line.bindTooltip(
          `<b>${label || 'Active route'}</b><br/><span style="font-size:10px;">${distTxt}${durTxt}` +
          (route.simulated ? '<br/><span style="opacity:0.7;">Indicative path</span>' : '') + '</span>',
          { sticky: true, className: 'truck-tip', opacity: 1 }
        );
        line.addTo(group);
        // Destination endpoint dot.
        L.circleMarker(latlngs[latlngs.length - 1], {
          radius: 6, color: '#ffffff', weight: 2, fillColor: color, fillOpacity: 1,
        }).addTo(group);
        group.addTo(map);
      })
      .catch(() => { /* map keeps trucks + gates; route is enhancement */ });

    return () => {
      cancelled = true;
      try { group.remove(); } catch { /* map torn down */ }
      layerRef.current = null;
    };
  }, [map, routeKey, fromLat, fromLng, toLat, toLng, status, label]);

  // Remove the layer if the map dies beneath us.
  useEffect(() => () => {
    try { layerRef.current?.remove(); } catch { /* ignore */ }
  }, []);

  return null;
}
