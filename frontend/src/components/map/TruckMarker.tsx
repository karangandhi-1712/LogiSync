import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Truck } from '../../types';
import { isMapAlive } from './GoogleMapCanvas';

interface TruckMarkerProps {
  map: any;
  truck: Truck;
  selected?: boolean;
  onClick?: (truck: Truck) => void;
}

// Restrained status system: blue = active/info, green = operational,
// amber = delayed, red = critical, gray = offline/inactive.
const STATUS_STYLE: Record<string, { color: string; label: string; cls: string }> = {
  in_transit: { color: '#22c55e', label: 'En Route',   cls: 'pulse-active' },
  at_gate:    { color: '#3b82f6', label: 'At Gate',    cls: '' },
  queued:     { color: '#f97316', label: 'Queued',     cls: '' },
  loading:    { color: '#06b6d4', label: 'Loading',    cls: '' },
  delayed:    { color: '#f59e0b', label: 'Delayed',    cls: 'pulse-warn' },
  idle:       { color: '#94a3b8', label: 'Offline',    cls: 'is-idle' },
  outbound:   { color: '#8b5cf6', label: 'Outbound',   cls: '' },
};

function statusOf(status: string) {
  return STATUS_STYLE[status] || STATUS_STYLE.outbound;
}

// Small white cargo glyph for cold-chain / liquid / hazmat trucks only —
// operationally meaningful types stay identifiable, everything else is clean.
function typeGlyph(truckType: string): string {
  switch (truckType) {
    case 'reefer': // snowflake
      return `<g stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity="0.95">
        <line x1="7.5" y1="9.5" x2="7.5" y2="14.5"/>
        <line x1="5.3" y1="10.75" x2="9.7" y2="13.25"/>
        <line x1="9.7" y1="10.75" x2="5.3" y2="13.25"/>
      </g>`;
    case 'tanker': // droplet
      return `<path d="M7.5 9.4c1.3 1.6 2.1 2.7 2.1 3.7a2.1 2.1 0 0 1-4.2 0c0-1 .8-2.1 2.1-3.7z" fill="#ffffff" opacity="0.95"/>`;
    case 'hazmat': // flame
      return `<path d="M7.5 9.3c.6 1 1.6 1.7 1.6 2.9a1.6 1.6 0 0 1-3.2 0c0-.6.3-1.2.7-1.6.2.4.5.6.8.7-.1-.7 0-1.4.1-2z" fill="#ffffff" opacity="0.95"/>`;
    default:
      return '';
  }
}

function createTruckDivIcon(truck: Truck, selected: boolean): L.DivIcon {
  const st = statusOf(truck.status);

  // Markers stay upright — GPS heading is shown in the tooltip + inspector,
  // never baked into the marker angle.
  const html = `
    <div class="ls-marker ${st.cls}${selected ? ' sel' : ''}" style="color: ${st.color};">
      <div class="ls-badge" style="background: ${st.color}; box-shadow: 0 2px 8px -1px ${st.color}66, 0 1px 3px rgba(16,24,40,0.3);">
        <div class="ls-rot">
          <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24"
            fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2.5 7.5h11v9h-11z"/>
            <path d="M13.5 10.5h3.6l2.9 3.2v2.8h-6.5"/>
            <circle cx="7" cy="18" r="1.9" fill="#0f172a" stroke="#ffffff" stroke-width="1.4"/>
            <circle cx="17" cy="18" r="1.9" fill="#0f172a" stroke="#ffffff" stroke-width="1.4"/>
            ${typeGlyph(truck.truckType)}
          </svg>
        </div>
      </div>
    </div>
  `.trim();

  return L.divIcon({
    html,
    className: 'custom-truck-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export function TruckMarker({ map, truck, selected = false, onClick }: TruckMarkerProps) {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!map || !isMapAlive(map)) return;

    const st = statusOf(truck.status);
    const icon = createTruckDivIcon(truck, selected);
    let marker: L.Marker;
    try {
      marker = L.marker([truck.latitude, truck.longitude], {
        icon,
        keyboard: false,
        zIndexOffset: selected ? 1200 : truck.status === 'delayed' ? 1000 : 500,
      }).addTo(map);
    } catch {
      return;
    }

    // Premium tooltip card: identity, status, telemetry, route.
    const mission = truck.mission;
    marker.bindTooltip(
      `<div class="tt-title"><span class="tt-dot" style="background:${st.color};"></span>${truck.id}</div>` +
      `<div class="tt-sub">${truck.vehicleMake || ''} · ${truck.plate || ''}</div>` +
      `<div class="tt-status" style="color:${st.color};"><span class="tt-dot" style="background:${st.color};"></span>${st.label}</div>` +
      `<div class="tt-meta">${Math.round(truck.speedKmh)} km/h · HDG ${Math.round(truck.heading)}° · Fuel ${truck.fuelPct}%</div>` +
      (mission ? `<div class="tt-route">${mission.origin} → ${mission.destination}</div>` : ''),
      { direction: 'top', offset: [0, -18], className: 'truck-tip', opacity: 1 }
    );

    if (onClick) {
      marker.on('click', () => onClick(truck));
    }

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, selected]); // eslint-disable-line

  // Smooth-glide position updates + heading/status refresh on live telemetry.
  // setLatLng is GPU-friendly; the icon (heading ring) refreshes in place so
  // markers never teleport and the map never re-renders markers wholesale.
  useEffect(() => {
    if (!markerRef.current || !isMapAlive(map)) return;
    try {
      markerRef.current.setLatLng([truck.latitude, truck.longitude]);
      markerRef.current.setIcon(createTruckDivIcon(truck, selected));
      markerRef.current.setZIndexOffset(selected ? 1200 : truck.status === 'delayed' ? 1000 : 500);
    } catch {
      // Map was torn down mid-update (port switch) — marker cleans up on unmount.
    }
  }, [map, selected, truck.latitude, truck.longitude, truck.status, truck.speedKmh]);

  return null;
}
