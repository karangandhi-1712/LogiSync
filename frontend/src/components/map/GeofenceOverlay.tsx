import { useEffect, useState } from 'react';
import L from 'leaflet';
import { useTheme } from '../../context/ThemeContext';
import { fetchGisLayers, fetchGisGates } from '../../services/api';
import { isMapAlive } from './GoogleMapCanvas';

// Legacy VOC fallback shapes (used while the per-port GIS payload loads,
// and permanently if the backend is unreachable).
const VOC_GEOFENCE: [number, number][] = [
  [8.780, 78.155],
  [8.780, 78.195],
  [8.745, 78.200],
  [8.738, 78.190],
  [8.735, 78.165],
  [8.745, 78.150],
];

const TERMINAL_ZONES: { id: string; label: string; coords: [number, number][]; color: string }[] = [
  {
    id: 'cold_storage_alpha',
    label: 'Cold Storage Alpha',
    coords: [
      [8.768, 78.165],
      [8.768, 78.172],
      [8.763, 78.172],
      [8.763, 78.165],
    ],
    color: '#00f5d4',
  },
  {
    id: 'cy_block_b',
    label: 'CY-Block B',
    coords: [
      [8.758, 78.170],
      [8.758, 78.180],
      [8.752, 78.180],
      [8.752, 78.170],
    ],
    color: '#10b981',
  },
  {
    id: 'hazmat_yard',
    label: 'HazMat Yard 2',
    coords: [
      [8.772, 78.178],
      [8.772, 78.184],
      [8.768, 78.184],
      [8.768, 78.178],
    ],
    color: '#ef4444',
  },
  {
    id: 'wh_east_berth',
    label: 'WH-East Berth 4',
    coords: [
      [8.762, 78.185],
      [8.762, 78.193],
      [8.756, 78.193],
      [8.756, 78.185],
    ],
    color: '#f59e0b',
  },
];

const FALLBACK_GATES = [
  { id: 'G-01', label: 'Gate 1', lat: 8.765, lng: 78.157, queue: 8, status: 'HOLD' },
  { id: 'G-02', label: 'Gate 2', lat: 8.758, lng: 78.160, queue: 6, status: 'NORMAL' },
  { id: 'G-03', label: 'Gate 3', lat: 8.752, lng: 78.163, queue: 2, status: 'FAST-PASS' },
  { id: 'G-04', label: 'Gate 4', lat: 8.746, lng: 78.166, queue: 9, status: 'MODERATE' },
];

const ZONE_COLORS = ['#00f5d4', '#10b981', '#ef4444', '#f59e0b'];

function gateColor(status: string): string {
  const s = (status || '').toUpperCase();
  if (s.includes('HOLD') || s.includes('SEVERE') || s.includes('CONGEST')) return '#ef4444';
  if (s.includes('FAST') || s.includes('OPTIMAL') || s.includes('LOW')) return '#10b981';
  if (s.includes('MODERATE')) return '#f59e0b';
  return '#00f5d4';
}

interface GeofenceOverlayProps {
  map: any;
  portId?: string;
  portName?: string;
}

export function GeofenceOverlay({ map, portId = 'voc', portName = 'VOC Port' }: GeofenceOverlayProps) {
  const { isDark } = useTheme();
  const [layers, setLayers] = useState<any>(null);
  const [gates, setGates] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLayers(null);
    setGates([]);
    Promise.all([fetchGisLayers(portId).catch(() => null), fetchGisGates(portId).catch(() => [])])
      .then(([l, g]) => {
        if (cancelled) return;
        if (l) setLayers(l);
        if (Array.isArray(g) && g.length > 0) setGates(g);
      });
    return () => { cancelled = true; };
  }, [portId]);

  useEffect(() => {
    if (!map || !isMapAlive(map)) return;

    let layerGroup: L.LayerGroup;
    try {
      layerGroup = L.layerGroup().addTo(map);
    } catch {
      return;
    }
    const boundaryColor = isDark ? '#00f5d4' : '#0284c7';

    if (layers && Array.isArray(layers.features)) {
      // Live per-port GeoJSON from backend.
      let zoneIdx = 0;
      for (const f of layers.features) {
        const geom = f.geometry || {};
        const props = f.properties || {};
        if (geom.type === 'Polygon' && Array.isArray(geom.coordinates?.[0])) {
          const ring: [number, number][] = geom.coordinates[0].map((pt: number[]) => [pt[1], pt[0]]);
          const isBoundary = props.type === 'boundary';
          const color = isBoundary ? boundaryColor : ZONE_COLORS[zoneIdx % ZONE_COLORS.length];
          if (!isBoundary) zoneIdx++;
          const poly = L.polygon(ring, {
            color,
            weight: isBoundary ? 2 : 1.5,
            opacity: 0.9,
            dashArray: isBoundary ? '6, 6' : undefined,
            fillColor: color,
            fillOpacity: isBoundary ? 0.05 : 0.18,
          }).addTo(layerGroup);
          poly.bindTooltip(`<b>${props.name || 'Zone'}</b>`, {
            sticky: isBoundary,
            direction: isBoundary ? 'top' : 'center',
            className: 'liquid-map-tooltip',
          });
        } else if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
          const [lng, lat] = geom.coordinates;
          const c = gateColor('');
          L.circleMarker([lat, lng], {
            radius: 8, color: '#ffffff', weight: 2, fillColor: c, fillOpacity: 0.95,
          }).addTo(layerGroup).bindTooltip(`<b>${props.name || 'Gate'}</b>`, { className: 'liquid-map-tooltip' });
        }
      }
    } else {
      // Static VOC fallback (only correct for voc; replaced once live data arrives).
      const boundary = L.polygon(VOC_GEOFENCE, {
        color: boundaryColor,
        weight: 2,
        opacity: 0.85,
        dashArray: '6, 6',
        fillColor: boundaryColor,
        fillOpacity: 0.05,
      }).addTo(layerGroup);
      boundary.bindTooltip(`${portName} Main Maritime Geofence`, { sticky: true, className: 'liquid-map-tooltip' });

      for (const zone of TERMINAL_ZONES) {
        const poly = L.polygon(zone.coords, {
          color: zone.color,
          weight: 1.5,
          opacity: 0.9,
          fillColor: zone.color,
          fillOpacity: 0.18,
        }).addTo(layerGroup);
        poly.bindTooltip(`<b>${zone.label}</b>`, {
          permanent: false,
          direction: 'center',
          className: 'liquid-map-tooltip',
        });
      }
    }

    // Gate points (live per-port list, or VOC fallback).
    const gateList = gates.length > 0
      ? gates.map((g: any, i: number) => ({
          id: g.id || `G-0${i + 1}`,
          label: g.name || g.gate_id || `Gate ${i + 1}`,
          lat: g.lat ?? g.coordinates?.[1],
          lng: g.lng ?? g.coordinates?.[0],
          queue: g.queue_count ?? g.queue ?? 0,
          status: g.status || 'NORMAL',
        })).filter(g => g.lat != null && g.lng != null)
      : FALLBACK_GATES;

    for (const gate of gateList) {
      const gc = gateColor(gate.status);
      const circle = L.circleMarker([gate.lat, gate.lng], {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: gc,
        fillOpacity: 0.95,
      }).addTo(layerGroup);

      const popupContent = `
        <div style="
          font-family: 'Inter', sans-serif;
          padding: 8px 4px;
          min-width: 140px;
        ">
          <div style="font-weight: 800; font-size: 13px; color: ${gc}; margin-bottom: 3px;">
            ${gate.id} — ${gate.label}
          </div>
          <div style="font-size: 11px; color: #334155; margin-bottom: 4px;">
            <b>${gate.queue}</b> trucks in queue
          </div>
          <div style="
            display: inline-block;
            font-size: 9px;
            font-weight: 700;
            color: ${gc};
            background: ${gc}18;
            border: 1px solid ${gc}40;
            padding: 2px 6px;
            border-radius: 9999px;
            text-transform: uppercase;
          ">
            ${gate.status}
          </div>
        </div>
      `;

      circle.bindPopup(popupContent, {
        className: 'liquid-map-popup',
        closeButton: false,
      });
    }

    return () => {
      layerGroup.remove();
    };
  }, [map, isDark, layers, gates, portName]);

  return null;
}
