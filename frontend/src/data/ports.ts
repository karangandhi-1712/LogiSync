// ─── Depot registry ───────────────────────────────────────────────────────────
// The server owns the depot list (`/api/ports`, seeded from backend/app/ports.py).
// This module holds the offline fallback and the small amount of derivation the
// UI needs before the fetch resolves - no gates, no per-port congestion data,
// both of which went away with the slot-booking flow.

import type { PortSummary } from '../types';

export interface PortInfo {
  id: string;
  name: string;
  short: string;
  code: string | null;
  city: string;
  state: string;
  lat: number;
  lng: number;
  zoom: number;
  corridor: string;
  coast: 'West' | 'East';
}

/** East-coast states serve the consumer last-mile flow. */
const EAST_STATES = new Set(['Tamil Nadu', 'Andhra Pradesh', 'Odisha', 'West Bengal']);

export const DEFAULT_PORT_ID = 'voc';

export const FALLBACK_PORTS: PortSummary[] = [
  { id: 'voc',       code: 'INTUT', name: 'V.O. Chidambaranar Port',             short: 'VOC Port',    city: 'Thoothukudi',    state: 'Tamil Nadu',     lat: 8.7642,  lng: 78.1348, zoom: 12, corridor: 'Madurai-Thoothukudi Hwy (NH 38)' },
  { id: 'deendayal', code: 'INIXY', name: 'Deendayal Port (Kandla)',              short: 'Deendayal',   city: 'Kandla',         state: 'Gujarat',         lat: 23.0,    lng: 70.221,  zoom: 12, corridor: 'Kandla-Ahmedabad Hwy (NH 41)' },
  { id: 'mumbai',    code: 'INBOM', name: 'Mumbai Port',                          short: 'Mumbai',      city: 'Mumbai',         state: 'Maharashtra',     lat: 18.917,  lng: 72.833,  zoom: 12, corridor: 'Eastern Freeway / Harbour Link' },
  { id: 'jnpt',      code: 'INNSA', name: 'Jawaharlal Nehru Port (Nhava Sheva)',  short: 'JNPT',        city: 'Navi Mumbai',    state: 'Maharashtra',     lat: 18.945,  lng: 72.94,   zoom: 12, corridor: 'JNPT-Panvel Hwy (NH 348)' },
  { id: 'mormugao',  code: 'INMRM', name: 'Mormugao Port',                        short: 'Mormugao',    city: 'Vasco da Gama',  state: 'Goa',             lat: 15.419,  lng: 73.8,    zoom: 12, corridor: 'Vasco-Panaji Hwy (NH 66)' },
  { id: 'mangalore', code: 'INNML', name: 'New Mangalore Port',                   short: 'N. Mangalore', city: 'Mangaluru',      state: 'Karnataka',       lat: 12.915,  lng: 74.796,  zoom: 12, corridor: 'Mangaluru-Bengaluru Hwy (NH 75)' },
  { id: 'cochin',    code: 'INCOK', name: 'Cochin Port',                          short: 'Cochin',      city: 'Kochi',          state: 'Kerala',          lat: 9.967,   lng: 76.24,   zoom: 12, corridor: 'Kochi-Salem Hwy (NH 544)' },
  { id: 'haldia',    code: 'INHAL', name: 'Syama Prasad Mookerjee Port (Haldia)', short: 'Haldia',      city: 'Haldia',         state: 'West Bengal',     lat: 22.03,   lng: 88.065,  zoom: 12, corridor: 'Haldia-Kolkata Hwy (NH 116)' },
  { id: 'paradip',   code: 'INPRT', name: 'Paradip Port',                         short: 'Paradip',     city: 'Paradip',        state: 'Odisha',          lat: 20.262,  lng: 86.682,  zoom: 12, corridor: 'Paradip-Cuttack Hwy (NH 53)' },
  { id: 'vizag',     code: 'INVTZ', name: 'Visakhapatnam Port',                   short: 'Vizag',       city: 'Visakhapatnam',  state: 'Andhra Pradesh',  lat: 17.686,  lng: 83.283,  zoom: 12, corridor: 'Vizag-Raipur Hwy (NH 26)' },
  { id: 'chennai',   code: 'INMAA', name: 'Chennai Port',                         short: 'Chennai',     city: 'Chennai',        state: 'Tamil Nadu',     lat: 13.1,    lng: 80.293,  zoom: 12, corridor: 'Chennai-Bengaluru Hwy (NH 48)' },
  { id: 'ennore',    code: 'INENR', name: 'Kamarajar Port (Ennore)',              short: 'Ennore',      city: 'Ennore',         state: 'Tamil Nadu',     lat: 13.25,   lng: 80.32,   zoom: 12, corridor: 'Ennore-Chennai Port Corridor' },
];

export function toPortInfo(p: PortSummary): PortInfo {
  return {
    id: p.id,
    name: p.name,
    short: p.short ?? p.name,
    code: p.code,
    city: p.city ?? '',
    state: p.state ?? '',
    lat: p.lat,
    lng: p.lng,
    zoom: p.zoom ?? 12,
    corridor: p.corridor ?? '',
    coast: EAST_STATES.has(p.state ?? '') ? 'East' : 'West',
  };
}

export const FALLBACK_PORT_INFOS: PortInfo[] = FALLBACK_PORTS.map(toPortInfo);

export function getPortFrom(list: PortInfo[], portId: string | null | undefined): PortInfo | null {
  if (!portId) return null;
  return list.find((p) => p.id === portId) ?? null;
}

export const getPort = (portId: string): PortInfo =>
  FALLBACK_PORT_INFOS.find((p) => p.id === portId) ?? FALLBACK_PORT_INFOS[0];

/** Great-circle distance in km - mirrors backend/app/ports.py haversine_km. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371.0088;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, a)));
}

export function isWithinRadius(
  center: { lat: number; lng: number },
  lat: number,
  lng: number,
  radiusKm: number,
): boolean {
  return haversineKm(center.lat, center.lng, lat, lng) <= radiusKm;
}