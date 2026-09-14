import { useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

// VOC Port geofence boundary coordinates
const VOC_GEOFENCE: google.maps.LatLngLiteral[] = [
  { lat: 8.780, lng: 78.155 },
  { lat: 8.780, lng: 78.195 },
  { lat: 8.745, lng: 78.200 },
  { lat: 8.738, lng: 78.190 },
  { lat: 8.735, lng: 78.165 },
  { lat: 8.745, lng: 78.150 },
];

// Terminal operational zones
const TERMINAL_ZONES = [
  {
    id: 'cold_storage_alpha',
    label: 'Cold Storage Alpha',
    coords: [
      { lat: 8.768, lng: 78.165 },
      { lat: 8.768, lng: 78.172 },
      { lat: 8.763, lng: 78.172 },
      { lat: 8.763, lng: 78.165 },
    ],
    color: '#06b6d4',
  },
  {
    id: 'cy_block_b',
    label: 'CY-Block B',
    coords: [
      { lat: 8.758, lng: 78.170 },
      { lat: 8.758, lng: 78.180 },
      { lat: 8.752, lng: 78.180 },
      { lat: 8.752, lng: 78.170 },
    ],
    color: '#10b981',
  },
  {
    id: 'hazmat_yard',
    label: 'HazMat Yard 2',
    coords: [
      { lat: 8.772, lng: 78.178 },
      { lat: 8.772, lng: 78.184 },
      { lat: 8.768, lng: 78.184 },
      { lat: 8.768, lng: 78.178 },
    ],
    color: '#ef4444',
  },
  {
    id: 'wh_east_berth',
    label: 'WH-East Berth 4',
    coords: [
      { lat: 8.762, lng: 78.185 },
      { lat: 8.762, lng: 78.193 },
      { lat: 8.756, lng: 78.193 },
      { lat: 8.756, lng: 78.185 },
    ],
    color: '#f59e0b',
  },
];

// Gate positions
const GATES = [
  { id: 'G-01', label: 'Gate 1', lat: 8.765, lng: 78.157, queue: 8, status: 'HOLD' },
  { id: 'G-02', label: 'Gate 2', lat: 8.758, lng: 78.160, queue: 6, status: 'NORMAL' },
  { id: 'G-03', label: 'Gate 3', lat: 8.752, lng: 78.163, queue: 2, status: 'FAST-PASS' },
  { id: 'G-04', label: 'Gate 4', lat: 8.746, lng: 78.166, queue: 9, status: 'MODERATE' },
];

interface GeofenceOverlayProps {
  map: google.maps.Map | null;
}

export function GeofenceOverlay({ map }: GeofenceOverlayProps) {
  const { isDark } = useTheme();

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    const overlays: (google.maps.Polygon | google.maps.Marker | google.maps.InfoWindow)[] = [];

    // VOC Port outer boundary
    const boundary = new google.maps.Polygon({
      paths: VOC_GEOFENCE,
      strokeColor: isDark ? '#06b6d4' : '#0284c7',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: isDark ? '#06b6d4' : '#0284c7',
      fillOpacity: 0.04,
      map,
    });
    overlays.push(boundary);

    // Terminal zones
    for (const zone of TERMINAL_ZONES) {
      const poly = new google.maps.Polygon({
        paths: zone.coords,
        strokeColor: zone.color,
        strokeOpacity: 0.7,
        strokeWeight: 1.5,
        fillColor: zone.color,
        fillOpacity: 0.18,
        map,
      });

      // Zone label
      const center = zone.coords.reduce(
        (acc, c) => ({ lat: acc.lat + c.lat / zone.coords.length, lng: acc.lng + c.lng / zone.coords.length }),
        { lat: 0, lng: 0 }
      );
      const label = new google.maps.Marker({
        position: center,
        map,
        icon: { url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', scaledSize: new google.maps.Size(0, 0) },
        label: { text: zone.label, color: zone.color, fontSize: '10px', fontWeight: '700' },
        zIndex: 10,
      });

      overlays.push(poly, label);
    }

    // Gate markers with pulsing rings
    for (const gate of GATES) {
      const gateColor =
        gate.status === 'HOLD'      ? '#ef4444' :
        gate.status === 'FAST-PASS' ? '#10b981' :
        gate.status === 'MODERATE'  ? '#f59e0b' : '#06b6d4';

      const marker = new google.maps.Marker({
        position: { lat: gate.lat, lng: gate.lng },
        map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: gateColor,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        title: `${gate.label}: ${gate.queue} trucks [${gate.status}]`,
        zIndex: 200,
      });

      const iw = new google.maps.InfoWindow({
        content: `
          <div style="font-family: Inter, sans-serif; padding: 8px 4px; min-width: 140px;">
            <div style="font-weight: 700; font-size: 12px; color: ${gateColor}; margin-bottom: 4px;">${gate.id} — ${gate.label}</div>
            <div style="font-size: 11px; color: #475569;"><b>${gate.queue}</b> trucks in queue</div>
            <div style="font-size: 10px; color: ${gateColor}; font-weight: 600; margin-top: 2px; text-transform: uppercase;">${gate.status}</div>
          </div>
        `,
      });

      marker.addListener('click', () => iw.open(map, marker));
      overlays.push(marker, iw);
    }

    return () => {
      overlays.forEach(o => {
        if (o instanceof google.maps.Polygon || o instanceof google.maps.Marker) {
          o.setMap(null);
        } else {
          (o as google.maps.InfoWindow).close();
        }
      });
    };
  }, [map, isDark]);

  return null;
}
