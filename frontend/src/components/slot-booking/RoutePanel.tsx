// ─── RoutePanel — embedded Geoapify map with geocoded real-world routing ──────
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Navigation, Clock, Truck, AlertTriangle, CheckCircle2, MapPin, Layers, Loader2 } from 'lucide-react';
import L from 'leaflet';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import type { BookingRecord } from '../../data/portServiceData';
import { getPort } from '../../data/ports';

const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || '';

interface RouteOption {
  name: string;
  tag: 'fastest' | 'shortest' | 'scenic';
  color: string;
  dashArray?: string;
  tollLabel: string;
  congestionNote: string;
  // Route mode sent to Geoapify
  mode: 'drive' | 'truck' | 'bus';
}

const ROUTE_OPTIONS: RouteOption[] = [
  {
    name: 'National Highway (Recommended)',
    tag: 'fastest',
    color: '#06b6d4',
    tollLabel: '₹220',
    congestionNote: 'Moderate traffic on NH bypass 14:00–17:00',
    mode: 'drive',
  },
  {
    name: 'State Highway via City Bypass',
    tag: 'shortest',
    color: '#10b981',
    tollLabel: '₹80',
    congestionNote: 'Light traffic, narrow stretches near industrial zones',
    mode: 'truck',
  },
  {
    name: 'Inner Ring Road (Toll-Free)',
    tag: 'scenic',
    color: '#f59e0b',
    dashArray: '8 10',
    tollLabel: '₹0',
    congestionNote: 'No tolls, some road work reported near km 47',
    mode: 'bus',
  },
];

const TAG_CFG: Record<string, { label: string; cls: string }> = {
  fastest:  { label: 'FASTEST',  cls: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-400/30' },
  shortest: { label: 'SHORTEST', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-400/30' },
  scenic:   { label: 'TOLL-FREE', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-400/30' },
};

interface FetchedRoute {
  latlngs: [number, number][];
  distanceKm: number;
  etaMin: number;
}

interface RoutePanelProps {
  booking: BookingRecord | null;
  onClose: () => void;
}

// Geocode a place name → lat/lng using Geoapify
async function geocodePlace(place: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(place)}&limit=1&apiKey=${GEOAPIFY_API_KEY}`
    );
    const data = await res.json();
    const feat = data?.features?.[0];
    if (!feat) return null;
    const [lng, lat] = feat.geometry.coordinates;
    return [lat, lng];
  } catch {
    return null;
  }
}

// Fetch a real road route between two points using Geoapify Routing API
async function fetchGeoapifyRoute(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
  mode: string
): Promise<FetchedRoute | null> {
  try {
    const res = await fetch(
      `https://api.geoapify.com/v1/routing?waypoints=${fromLat},${fromLng}|${toLat},${toLng}&mode=${mode}&apiKey=${GEOAPIFY_API_KEY}`
    );
    const data = await res.json();
    const leg = data?.features?.[0]?.properties?.legs?.[0];
    const coords: [number, number][][] = data?.features?.[0]?.geometry?.coordinates || [];
    if (!coords.length) return null;

    // Flatten MultiLineString → [lat, lng][]
    const flat: [number, number][] = coords.flat().map(([lng, lat]) => [lat, lng]);
    return {
      latlngs: flat,
      distanceKm: Math.round((leg?.distance ?? 0) / 1000),
      etaMin: Math.round((leg?.time ?? 0) / 60),
    };
  } catch {
    return null;
  }
}

export function RoutePanel({ booking, onClose }: RoutePanelProps) {
  const { showToast } = useToast();
  const { isDark } = useTheme();
  const [activeRouteIndex, setActiveRouteIndex] = useState<number>(0);
  const [routes, setRoutes] = useState<(FetchedRoute | null)[]>([null, null, null]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<L.Polyline[]>([]);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  const port = booking ? getPort(booking.portId) : null;

  // ── 1. Geocode destination when booking changes ─────────────────────────
  useEffect(() => {
    if (!booking?.destination) return;
    setRoutes([null, null, null]);
    setDestCoords(null);

    geocodePlace(booking.destination).then(coords => {
      if (coords) {
        setDestCoords(coords);
      } else {
        // Fallback: place destination ~200km from port in a random direction
        const portLat = getPort(booking.portId).lat;
        const portLng = getPort(booking.portId).lng;
        setDestCoords([portLat + (Math.random() - 0.5) * 3, portLng + (Math.random() - 0.5) * 3]);
        showToast({ type: 'warning', title: 'Geocode Notice', message: `Could not pinpoint "${booking.destination}". Showing approximate route.` });
      }
    });
  }, [booking?.destination, booking?.portId]);

  // ── 2. Fetch all 3 routes once we have origin + destination coords ──────
  useEffect(() => {
    if (!destCoords || !port) return;
    setLoadingRoute(true);

    Promise.all(
      ROUTE_OPTIONS.map(opt =>
        fetchGeoapifyRoute(port.lat, port.lng, destCoords[0], destCoords[1], opt.mode)
      )
    ).then(results => {
      setRoutes(results);
      setLoadingRoute(false);
    }).catch(() => setLoadingRoute(false));
  }, [destCoords, port]);

  // ── 3. Initialize Leaflet map ────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || !port) return null;

    const map = L.map(mapContainerRef.current, {
      center: [port.lat, port.lng],
      zoom: 8,
      zoomControl: false,
      attributionControl: false,
    });

    const tileUrl = isDark
      ? `https://maps.geoapify.com/v1/tile/dark-matter-purple-roads/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`
      : `https://maps.geoapify.com/v1/tile/osm-bright-smooth/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`;

    L.tileLayer(tileUrl, { maxZoom: 18 }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    markersGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    return map;
  }, [port, isDark]);

  // ── 4. Draw routes on map whenever routes or activeRouteIndex changes ───
  const drawRoutes = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !port) return;

    // Remove old route layers
    routeLayersRef.current.forEach(l => { try { l.remove(); } catch { /* */ } });
    routeLayersRef.current = [];
    markersGroupRef.current?.clearLayers();

    const allBounds: [number, number][] = [];

    routes.forEach((route, i) => {
      if (!route || route.latlngs.length < 2) return;
      const opt = ROUTE_OPTIONS[i];
      const isActive = i === activeRouteIndex;

      const poly = L.polyline(route.latlngs, {
        color: isActive ? opt.color : '#94a3b8',
        weight: isActive ? 5 : 2,
        opacity: isActive ? 0.88 : 0.3,
        dashArray: !isActive && opt.dashArray ? opt.dashArray : undefined,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      const dist = route.distanceKm ? `${route.distanceKm} km` : '';
      const dur = route.etaMin ? `~${Math.floor(route.etaMin / 60)}h ${route.etaMin % 60}m` : '';
      poly.bindTooltip(
        `<b>${opt.name}</b><br/><span style="font-size:10px">${dist} · ${dur} · Tolls: ${opt.tollLabel}</span>`,
        { sticky: true, opacity: 1 }
      );
      routeLayersRef.current.push(poly);

      if (isActive) {
        route.latlngs.forEach(ll => allBounds.push(ll));
      }
    });

    // Port origin marker (blue)
    const portMarker = L.circleMarker([port.lat, port.lng], {
      radius: 9, color: '#fff', weight: 2.5, fillColor: '#1d4ed8', fillOpacity: 1,
    });
    portMarker.bindTooltip(`<b>${port.name}</b>`, { permanent: false });
    markersGroupRef.current?.addLayer(portMarker);

    // Destination marker (red)
    if (destCoords) {
      const destMarker = L.circleMarker(destCoords, {
        radius: 9, color: '#fff', weight: 2.5, fillColor: '#dc2626', fillOpacity: 1,
      });
      destMarker.bindTooltip(`<b>${booking?.destination || 'Destination'}</b>`, { permanent: false });
      markersGroupRef.current?.addLayer(destMarker);
      allBounds.push(destCoords);
    }

    // Fit map to active route bounds
    if (allBounds.length > 1) {
      try {
        map.fitBounds(allBounds as L.LatLngBoundsExpression, { padding: [30, 30] });
      } catch { /* ignore if map is gone */ }
    } else if (destCoords) {
      map.setView([(port.lat + destCoords[0]) / 2, (port.lng + destCoords[1]) / 2], 7);
    }
  }, [routes, activeRouteIndex, port, destCoords, booking?.destination]);

  // Init map when modal opens
  useEffect(() => {
    if (!booking) return;
    const t = setTimeout(() => {
      if (!mapInstanceRef.current) initMap();
      drawRoutes();
    }, 150);
    return () => clearTimeout(t);
  }, [booking, initMap, drawRoutes]);

  // Redraw when routes or active index changes
  useEffect(() => {
    if (mapInstanceRef.current) drawRoutes();
  }, [routes, activeRouteIndex, drawRoutes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { mapInstanceRef.current?.remove(); } catch { /* */ }
      mapInstanceRef.current = null;
    };
  }, []);

  const handleSelectRoute = (index: number) => {
    setActiveRouteIndex(index);
    const route = routes[index];
    const opt = ROUTE_OPTIONS[index];
    if (route) {
      showToast({
        type: 'success',
        title: 'Route Selected',
        message: `${opt.name} — ${route.distanceKm} km, ~${Math.floor(route.etaMin / 60)}h ${route.etaMin % 60}m`,
      });
    }
  };

  const activeRoute = routes[activeRouteIndex];
  const activeOpt = ROUTE_OPTIONS[activeRouteIndex];

  return (
    <AnimatePresence>
      {booking && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto w-full max-w-3xl rounded-3xl
                bg-white/95 dark:bg-[#0d1526]/98 backdrop-blur-2xl
                border border-white/70 dark:border-white/15
                shadow-[0_32px_80px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col"
              style={{ maxHeight: '88vh' }}
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-slate-200/60 dark:border-white/10 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <Navigation className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">Route Navigation</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-2.5 h-2.5" />
                        <span className="font-semibold">{port?.name || 'Port'}</span>
                        <span>→</span>
                        <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{booking.destination}</span>
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-black bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-400/30">
                          GEOAPIFY
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl flex items-center justify-center
                      bg-slate-100 dark:bg-slate-800/60 text-slate-500
                      hover:bg-slate-200 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body: map (left) + route cards (right) */}
              <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                {/* ── Embedded Geoapify Map ─────────────────────────── */}
                <div className="relative md:w-[55%] h-64 md:h-auto flex-shrink-0 bg-slate-100 dark:bg-slate-900/60">
                  <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

                  {/* Loading overlay */}
                  {loadingRoute && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                        <span className="text-[11px] font-semibold">Fetching real road routes…</span>
                      </div>
                    </div>
                  )}

                  {/* Watermark */}
                  <div className="absolute bottom-1 left-2 z-10 px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-slate-900/70 text-[8px] text-slate-400 font-medium pointer-events-none">
                    Tiles by <span className="font-bold text-cyan-600 dark:text-cyan-400">Geoapify</span>
                  </div>
                </div>

                {/* ── Route option cards ───────────────────────────── */}
                <div className="flex-1 p-4 flex flex-col gap-2.5 overflow-y-auto">
                  {ROUTE_OPTIONS.map((opt, i) => {
                    const r = routes[i];
                    const isActive = activeRouteIndex === i;
                    return (
                      <div
                        key={i}
                        onClick={() => handleSelectRoute(i)}
                        className={clsx(
                          'rounded-2xl border p-3.5 cursor-pointer transition-all duration-150',
                          isActive
                            ? 'bg-white/80 dark:bg-slate-800/60 shadow-[0_0_16px_rgba(6,182,212,0.15)]'
                            : 'bg-white/40 dark:bg-slate-800/30 border-white/60 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20',
                          isActive ? `border-[${opt.color}]/50` : ''
                        )}
                        style={isActive ? { borderColor: `${opt.color}55` } : {}}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                              <span className={clsx('text-[8px] font-black px-1.5 py-0.5 rounded-full border', TAG_CFG[opt.tag].cls)}>
                                {TAG_CFG[opt.tag].label}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                              {opt.name}
                            </p>
                          </div>
                          {isActive && <CheckCircle2 className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: opt.color }} />}
                        </div>

                        {/* Distance / ETA / Toll */}
                        <div className="flex items-center gap-4 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3 h-3 text-slate-400" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono">
                              {r ? `${r.distanceKm} km` : '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                              {r ? `~${Math.floor(r.etaMin / 60)}h ${r.etaMin % 60}m` : '—'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">Tolls: {opt.tollLabel}</span>
                        </div>

                        {/* Congestion note */}
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">{opt.congestionNote}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Origin / destination summary */}
                  <div className="mt-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 space-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
                      <span className="font-bold text-slate-700 dark:text-slate-300">From:</span>
                      {port?.name}, {port?.city}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
                      <span className="font-bold text-slate-700 dark:text-slate-300">To:</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{booking.destination}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-slate-200/60 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] flex items-center justify-between flex-shrink-0">
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeRoute
                    ? `${activeOpt.name} · ${activeRoute.distanceKm} km · ~${Math.floor(activeRoute.etaMin / 60)}h ${activeRoute.etaMin % 60}m ETA`
                    : loadingRoute ? 'Fetching routes via Geoapify…' : 'Select a route above'
                  }
                </span>
                <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
