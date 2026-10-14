import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useTheme } from '../../context/ThemeContext';
import { FALLBACK_PORT_INFOS, type PortInfo } from '../../data/ports';

const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || '';

/**
 * Keeps the viewport on the Indian mainland. Deliberately tighter than the
 * political outline: the earlier bounds reached down to Sri Lanka and east into
 * Malaysia, which put half the frame on ocean and made India read as a small
 * shape adrift in the middle rather than the subject of the composition.
 */
const INDIA_BOUNDS = L.latLngBounds([7.0, 67.5], [36.5, 90.5]);

const BRAND = {
  ink: '#0f172a',
  blue: '#2563eb',
  blueDeep: '#1d4ed8',
  paper: '#ffffff',
  ring: 'rgba(37,99,235,0.18)',
  home: '#f59e0b',
} as const;

/**
 * Depot marker.
 *
 * This replaces a red teardrop with a heavy black outline, which fought the
 * muted OSM basemap and read as a stock Google Maps pin dropped onto the page.
 *
 * The mark now carries the same visual language as the rest of the site: a
 * white squircle with a blue ring and a blue anchor, sitting on a short stem and
 * a ground dot. The stem is what keeps it reading as a *point* rather than a
 * badge — a bare circle floating on a map gives no sense of where the coordinate
 * actually is. The palette comes from the brand tokens rather than being baked
 * per-marker, so it tracks the rest of the page.
 */
function portIcon(isHome: boolean, active: boolean) {
  const size = active ? 40 : 34;
  const body = active ? BRAND.blue : BRAND.paper;
  const glyph = active ? BRAND.paper : BRAND.blue;
  const stroke = active ? BRAND.blueDeep : BRAND.blue;
  const ground = active ? BRAND.blue : BRAND.blue;

  // A second, thinner ring in the home depot's amber so the default depot is
  // distinguishable at a glance without needing the tooltip.
  const homeRing = isHome
    ? `<circle cx="20" cy="18" r="15.5" fill="none" stroke="${BRAND.home}" stroke-width="1.5" stroke-opacity="0.85"/>`
    : '';

  // Selected markers get a breathing halo so the open fact sheet is reflected
  // back onto the map. Purely decorative — the icon itself already reads
  // selected through its fill inversion.
  const halo = active
    ? `<circle cx="20" cy="18" r="15.5" fill="none" stroke="${BRAND.blue}" stroke-width="2" stroke-opacity="0.5">
         <animate attributeName="r" values="15.5;23;15.5" dur="2.4s" repeatCount="indefinite"/>
         <animate attributeName="stroke-opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite"/>
       </circle>`
    : '';

  const anchor = active
    ? `<g fill="none" stroke="${glyph}" stroke-width="2" stroke-linecap="round">
         <circle cx="20" cy="12.5" r="2.6" fill="${glyph}" stroke="none"/>
         <path d="M20 15.5v9M14.5 18.5c0 3.4 2.5 6 5.5 6s5.5-2.6 5.5-6"/>
         <path d="M12.5 18.5h4M23.5 18.5h4"/>
       </g>`
    : `<g fill="none" stroke="${glyph}" stroke-width="2.2" stroke-linecap="round">
         <circle cx="20" cy="12.5" r="2.8" fill="${glyph}" stroke="none"/>
         <path d="M20 15.5v10M14 18.8c0 3.8 2.7 6.7 6 6.7s6-2.9 6-6.7"/>
         <path d="M11.8 18.8h4.4M23.8 18.8h4.4"/>
       </g>`;

  return L.divIcon({
    className: '',
    html: `<svg width="${size}" height="${size + 12}" viewBox="0 0 40 52" fill="none"
             xmlns="http://www.w3.org/2000/svg"
             style="display:block;filter:drop-shadow(0 6px 10px rgba(15,23,42,.28));transition:transform .18s ease"
             onmouseover="this.style.transform='scale(1.16)'"
             onmouseout="this.style.transform='scale(1)'">
        ${halo}
        <circle cx="20" cy="43" r="2.6" fill="${ground}" fill-opacity="0.32"/>
        <path d="M20 27v14" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
        <rect x="4" y="2" width="32" height="32" rx="12" fill="${body}"/>
        <rect x="4" y="2" width="32" height="32" rx="12" fill="none"
              stroke="${stroke}" stroke-width="${active ? 2.4 : 2}"/>
        ${homeRing}
        ${anchor}
      </svg>`,
    iconSize: [size, size + 12],
    iconAnchor: [size / 2, size + 12],
  });
}

/**
 * Hero map: the 12 depot markers on India, and nothing else.
 *
 * There are no connecting lines. Each port is an independent point, so hovering
 * one is unambiguous and there is no implied route through the network.
 *
 * Scroll wheel zoom stays off so the map never swallows page scroll.
 *
 * `fitBounds` is asymmetric on wide viewports: the hero copy occupies the left
 * of the frame, so padding is loaded onto the left edge to push India clear of
 * it rather than centring the country underneath the headline.
 */
export function HeroNetwork({
  ports = FALLBACK_PORT_INFOS,
  selectedId,
  onSelect,
  className = '',
}: {
  ports?: PortInfo[];
  selectedId?: string | null;
  onSelect?: (port: PortInfo) => void;
  className?: string;
}) {
  const { isDark } = useTheme();
  const holderRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder || mapRef.current) return;

    const tone = isDark ? '#38bdf8' : BRAND.blue;

    const map = L.map(holder, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomAnimation: false,
      fadeAnimation: false,
      preferCanvas: true,
      maxBounds: INDIA_BOUNDS,
      maxBoundsViscosity: 1,
    });

    L.tileLayer(
      isDark
        ? `https://maps.geoapify.com/v1/tile/dark-matter/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`
        : `https://maps.geoapify.com/v1/tile/osm-bright-smooth/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`,
      { maxZoom: 20, crossOrigin: true },
    ).addTo(map);

    const applyBounds = () => {
      const { clientWidth: w, clientHeight: h } = holder;
      // Reserve the left third for the headline on a wide frame; on a narrow
      // one (mobile, where the map sits in its own panel below the copy) the
      // padding would swallow the country, so fall back to symmetric.
      const reserveLeft = w >= 900 ? Math.round(w * 0.42) : 24;
      map.fitBounds(INDIA_BOUNDS, {
        paddingTopLeft: [reserveLeft, 56],
        paddingBottomRight: [56, 56],
        animate: false,
      });
    };

    applyBounds();

    ports.forEach((p) => {
      const marker = L.marker([p.lat, p.lng], {
        icon: portIcon(p.id === 'voc', false),
        zIndexOffset: p.id === selectedRef.current ? 900 : 0,
        riseOnHover: true,
        keyboard: true,
        title: p.name,
        alt: p.name,
      })
        .bindTooltip(
          `<span style="font:600 13px/1.3 Inter,system-ui,sans-serif">${p.short}</span>` +
            `<span style="display:block;font:500 11px/1.4 Inter,system-ui,sans-serif;opacity:.7">${p.city}, ${p.state}</span>` +
            `<span style="display:block;margin-top:6px;font:600 11px/1 Inter,system-ui,sans-serif;color:${tone}">View facts</span>`,
          { direction: 'top', offset: [0, -18], className: 'lw-port-tip', opacity: 1 },
        )
        .addTo(map);

      marker.on('click', () => onSelect?.(p));
      markersRef.current[p.id] = marker;
    });

    mapRef.current = map;

    // Leaflet measures the container before fonts and the hero have settled,
    // which is what pushed the view out past India. Re-measure once laid out.
    const t = setTimeout(() => {
      map.invalidateSize();
      applyBounds();
    }, 120);

    const onResize = () => {
      map.invalidateSize();
      applyBounds();
    };
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
    // Mount-only by design: rebuilding the tile layer on a theme flip flashes
    // the whole hero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect the open popup back onto its marker so the selected port reads as
  // selected while its modal is up.
  useEffect(() => {
    ports.forEach((p) => {
      markersRef.current[p.id]?.setIcon(
        portIcon(p.id === 'voc', p.id === selectedId),
      );
      markersRef.current[p.id]
        ?.setZIndexOffset(p.id === selectedId ? 900 : 0);
    });
  }, [selectedId, isDark, ports]);

  return (
    <div
      ref={holderRef}
      className={`absolute inset-0 z-0 ${className}`}
      style={{ background: isDark ? '#0B1B3A' : '#eef2f7' }}
      role="group"
      aria-label="Map of LogiSync port depots"
    />
  );
}