import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Plus, Minus, Navigation } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { MapMode } from '../../types';
import { clsx } from 'clsx';

// Geoapify key comes from env only (root .env via envDir). No hardcoded fallback:
// a leaked key in the bundle cannot be rotated without a rebuild.
const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || '';
if (!GEOAPIFY_API_KEY && typeof console !== 'undefined') {
  console.warn('[LogiSync] VITE_GEOAPIFY_API_KEY is not set — map tiles will fail to load.');
}

// VOC Port Thoothukudi center coordinates
const VOC_PORT_CENTER = { lat: 8.7642, lng: 78.1348 };

interface GoogleMapCanvasProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  children?: React.ReactNode;
  onMapReady?: (map: any) => void;
  className?: string;
}

export function GoogleMapCanvas({
  center = VOC_PORT_CENTER,
  zoom = 13,
  onMapReady,
  className,
}: GoogleMapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const { isDark } = useTheme();
  const [mapMode, setMapMode] = useState<MapMode>('roadmap');

  // Determine Geoapify Tile URL based on mode & theme
  const getTileUrl = useCallback((mode: MapMode, dark: boolean): { url: string; maxZoom: number } => {
    if (mode === 'satellite' || mode === 'hybrid') {
      return {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
      };
    }
    if (dark) {
      return {
        url: `https://maps.geoapify.com/v1/tile/dark-matter-purple-roads/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`,
        maxZoom: 20,
      };
    }
    return {
      url: `https://maps.geoapify.com/v1/tile/osm-bright-smooth/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`,
      maxZoom: 20,
    };
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstance.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    // Provide Google Maps panTo compatibility adapter so existing page code works seamlessly
    const origPanTo = map.panTo.bind(map);
    (map as any).panTo = (target: any, options?: any) => {
      if (target && typeof target === 'object') {
        if ('lat' in target && 'lng' in target) {
          return origPanTo([target.lat, target.lng], options);
        }
      }
      return origPanTo(target, options);
    };

    const initialTiles = getTileUrl(mapMode, isDark);
    const tileLayer = L.tileLayer(initialTiles.url, {
      maxZoom: initialTiles.maxZoom,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstance.current = map;

    onMapReady?.(map);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []); // eslint-disable-line

  // Recenter when the requested center/zoom changes (e.g. port switch).
  // User pans in between are left alone until props actually change.
  const centerLat = center.lat;
  const centerLng = center.lng;
  useEffect(() => {
    mapInstance.current?.setView([centerLat, centerLng], zoom);
  }, [centerLat, centerLng, zoom]);

  // Update tile layer on theme or mode switch
  useEffect(() => {
    if (!mapInstance.current || !tileLayerRef.current) return;

    const { url, maxZoom } = getTileUrl(mapMode, isDark);
    mapInstance.current.removeLayer(tileLayerRef.current);

    const newTileLayer = L.tileLayer(url, {
      maxZoom,
      subdomains: ['a', 'b', 'c'],
    }).addTo(mapInstance.current);

    tileLayerRef.current = newTileLayer;
  }, [isDark, mapMode, getTileUrl]);

  // Zoom controls
  const handleZoomIn = () => mapInstance.current?.zoomIn();
  const handleZoomOut = () => mapInstance.current?.zoomOut();
  const handleRecenter = () => mapInstance.current?.setView([center.lat, center.lng], zoom);

  const MAP_MODES: { id: MapMode; label: string }[] = [
    { id: 'roadmap',   label: isDark ? 'Cyber Dark' : 'Bright Map' },
    { id: 'satellite', label: 'Satellite' },
  ];

  return (
    <div className={clsx('relative w-full h-full overflow-hidden select-none', className)}>
      {/* Leaflet Map Div */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Map Mode Switcher — minimal white control */}
      <div
        role="group"
        aria-label="Map style"
        className="absolute top-4 right-4 z-10 flex items-center gap-1 p-1 rounded-2xl bg-white/95 dark:bg-[#101828]/95 border border-[#E8E8E5] dark:border-white/10 backdrop-blur-xl"
        style={{ boxShadow: 'var(--shadow-2)' }}
      >
        {MAP_MODES.map(m => (
          <button
            key={m.id}
            aria-pressed={mapMode === m.id}
            onClick={() => setMapMode(m.id)}
            className={clsx(
              'px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-150 active:scale-[0.98]',
              mapMode === m.id
                ? 'bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F]'
                : 'text-[#6B7280] dark:text-slate-300 hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/10'
            )}
          >
            {m.label}
          </button>
        ))}

        <div className="w-px h-5 bg-[#E8E8E5] dark:bg-white/10 mx-0.5" />

        <button
          onClick={handleRecenter}
          title="Recenter on selected port"
          aria-label="Recenter on selected port"
          className="p-1.5 rounded-xl text-[#6B7280] hover:text-[#1D4ED8] hover:bg-black/[0.04] dark:hover:bg-white/10 transition-all active:scale-[0.95]"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom Controls — minimal white */}
      <div className="absolute bottom-20 right-5 z-10 flex flex-col gap-1.5">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          aria-label="Zoom in"
          className="w-9 h-9 rounded-xl bg-white/95 dark:bg-[#101828]/95 border border-[#E8E8E5] dark:border-white/10 flex items-center justify-center text-[#3A3A3C] dark:text-slate-200 transition-all hover:-translate-y-px active:scale-[0.95] active:translate-y-0"
          style={{ boxShadow: 'var(--shadow-2)' }}
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          aria-label="Zoom out"
          className="w-9 h-9 rounded-xl bg-white/95 dark:bg-[#101828]/95 border border-[#E8E8E5] dark:border-white/10 flex items-center justify-center text-[#3A3A3C] dark:text-slate-200 transition-all hover:-translate-y-px active:scale-[0.95] active:translate-y-0"
          style={{ boxShadow: 'var(--shadow-2)' }}
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Powered by Geoapify Watermark Badge */}
      <div className="absolute bottom-1 right-2 z-10 px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border border-white/40 dark:border-white/10 text-[9px] text-slate-500 dark:text-slate-400 font-medium">
        Tiles by <span className="font-bold text-cyan-600 dark:text-cyan-400">Geoapify</span> & Leaflet
      </div>
    </div>
  );
}

/**
 * True when the Leaflet map instance is still attached to the DOM.
 * Guards overlay/marker effects against the port-switch remount window, where
 * an async fetch can resolve after map.remove() destroyed the panes (which
 * otherwise crashes inside Leaflet with "cannot read appendChild").
 */
export function isMapAlive(map: any): boolean {
  try {
    if (!map || typeof map.getPane !== 'function') return false;
    if ((map as any)._loaded === false) return false;
    const pane = (map as L.Map).getPane('overlayPane');
    if (!pane || !(pane as HTMLElement).isConnected) return false;
    const container = (map as L.Map).getContainer?.();
    if (container && !container.isConnected) return false;
    return true;
  } catch {
    return false;
  }
}

export type { GoogleMapCanvasProps };
