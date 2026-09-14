import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, Layers } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { MapMode } from '../../types';
import { clsx } from 'clsx';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// VOC Port Thoothukudi center
const VOC_PORT_CENTER = { lat: 8.7642, lng: 78.1348 };

// Dark map style for Google Maps
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#051424' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#051424' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8d9aac' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1c30' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0d1c2d' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#243447' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#162030' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#0d1c2d' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0a1e12' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1e3a5f' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#162030' }] },
];

const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cce5ff' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#d4f0d4' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ saturation: -60 }] },
];

interface GoogleMapCanvasProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  children?: React.ReactNode;
  onMapReady?: (map: google.maps.Map) => void;
  className?: string;
}

export function GoogleMapCanvas({
  center = VOC_PORT_CENTER,
  zoom = 13,
  onMapReady,
  className,
}: GoogleMapCanvasProps) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const { isDark }  = useTheme();
  const [mapMode, setMapMode] = useState<MapMode>('roadmap');
  const [loaded, setLoaded]   = useState(false);
  const [noKey, setNoKey]     = useState(false);

  // Load Google Maps API
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
      setNoKey(true);
      return;
    }
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places', 'geometry'],
    });
    loader.load().then(() => setLoaded(true)).catch(() => setNoKey(true));
  }, []);

  // Initialize map
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    if (mapInstance.current) return; // already initialized

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeId: mapMode,
      styles: isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
    });

    mapInstance.current = map;
    onMapReady?.(map);
  }, [loaded]); // eslint-disable-line

  // React to theme changes
  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.setOptions({
      styles: isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
    });
  }, [isDark]);

  // React to map type changes
  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.setMapTypeId(mapMode);
    if (mapMode !== 'roadmap' && mapMode !== 'terrain') {
      mapInstance.current.setOptions({ styles: [] });
    } else {
      mapInstance.current.setOptions({ styles: isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE });
    }
  }, [mapMode, isDark]);

  const MAP_MODES: { id: MapMode; label: string }[] = [
    { id: 'roadmap',  label: 'Road' },
    { id: 'satellite',label: 'Satellite' },
    { id: 'hybrid',   label: 'Hybrid' },
    { id: 'terrain',  label: 'Terrain' },
  ];

  return (
    <div className={clsx('relative w-full h-full overflow-hidden', className)}>
      {/* Map Container */}
      <div ref={mapRef} className="absolute inset-0" />

      {/* No-Key Placeholder */}
      {noKey && (
        <div className="absolute inset-0 flex flex-col items-center justify-center
          bg-slate-100 dark:bg-navy-800 gap-4 text-center px-8"
        >
          <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <MapPin className="w-7 h-7 text-slate-400 dark:text-slate-500" />
          </div>
          <div>
            <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">Google Maps API Key Required</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
              Add <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">VITE_GOOGLE_MAPS_API_KEY</code> to your <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-xs">.env</code> file to enable the live map.
            </p>
          </div>
          {/* Preview Port Location */}
          <div className="px-4 py-2 rounded-xl bg-sky-50 dark:bg-cyan-500/10 border border-sky-200 dark:border-cyan-500/30">
            <p className="text-xs font-mono text-sky-600 dark:text-cyan-400">
              VOC Port Thoothukudi — 8.7642°N, 78.1348°E
            </p>
          </div>
        </div>
      )}

      {/* Map Type Switcher (top-right) */}
      {loaded && !noKey && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 p-1 rounded-xl
          bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700"
        >
          {MAP_MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMapMode(m.id)}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all duration-200',
                mapMode === m.id
                  ? 'bg-sky-500 dark:bg-cyan-500 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              {m.label}
            </button>
          ))}
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
          <button className="p-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            <Layers className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export type { GoogleMapCanvasProps };
