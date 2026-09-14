import axios from 'axios';
import type { Truck, Gate, Slot, KPIData, GisFeature, TelemetryStats, RouteResult, Notification } from '../types';
import { getCognitoToken } from './auth';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: BASE });

// ─── JWT Interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use(cfg => {
  const token = getCognitoToken();
  if (token && cfg.headers) {
    cfg.headers['Authorization'] = `Bearer ${token}`;
  }
  return cfg;
});

// ─── Maps / Routing ────────────────────────────────────────────────────────
export async function getDirections(
  waypoints: [number, number][],
  travelMode: string = 'DRIVING'
): Promise<RouteResult> {
  const { data } = await api.post('/api/maps/directions', { waypoints, travelMode });
  return data;
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; formattedAddress: string }> {
  const { data } = await api.get('/api/maps/geocode', { params: { address } });
  return data;
}

export async function placesAutocomplete(input: string, sessionToken?: string): Promise<{ placeId: string; description: string }[]> {
  const { data } = await api.get('/api/maps/places/autocomplete', { params: { input, sessionToken } });
  return data;
}

export async function getPlaceDetails(placeId: string): Promise<{ lat: number; lng: number; name: string; address: string }> {
  const { data } = await api.get('/api/maps/places/details', { params: { placeId } });
  return data;
}

// ─── Fleet ─────────────────────────────────────────────────────────────────
export async function fetchFleet(cityId?: string): Promise<Truck[]> {
  const { data } = await api.get('/api/fleet', { params: { city: cityId } });
  return data;
}

export async function fetchTruck(id: string): Promise<Truck> {
  const { data } = await api.get(`/api/fleet/${id}`);
  return data;
}

export async function triggerReroute(truckId: string): Promise<{ message: string; newRoute: RouteResult }> {
  const { data } = await api.post(`/api/fleet/${truckId}/reroute`);
  return data;
}

// ─── Gates & Slots ─────────────────────────────────────────────────────────
export async function fetchGates(): Promise<Gate[]> {
  const { data } = await api.get('/api/slots/gates');
  return data;
}

export async function fetchSlots(gateId: string, date: string): Promise<Slot[]> {
  const { data } = await api.get('/api/slots', { params: { gate: gateId, date } });
  return data;
}

export async function bookSlot(payload: {
  gateId: string; date: string; startTime: string;
  truckId: string; tier: string; cargo: string; dwellMinutes: number;
}): Promise<Slot> {
  const { data } = await api.post('/api/slots/book', payload);
  return data;
}

export async function getAiSlotSuggestion(truckId: string, preferredDate: string): Promise<{
  suggestedGate: Gate; suggestedSlot: Slot; savingsMinutes: number; reasoning: string;
}> {
  const { data } = await api.post('/api/slots/ai-suggest', { truckId, preferredDate });
  return data;
}

export async function getGateCongestion(gateId: string): Promise<{ score: number; forecast: { hour: string; score: number }[] }> {
  const { data } = await api.get(`/api/slots/congestion/${gateId}`);
  return data;
}

// ─── Analytics / KPIs ──────────────────────────────────────────────────────
export async function fetchKPIs(period: '24h' | '7d' | '30d' = '24h'): Promise<KPIData> {
  const { data } = await api.get('/api/analytics/kpis', { params: { period } });
  return data;
}

export async function fetchHeatmapData(period: string): Promise<{ gate: string; hour: string; score: number }[]> {
  const { data } = await api.get('/api/analytics/heatmap', { params: { period } });
  return data;
}

export async function fetchTurnaroundData(): Promise<{ date: string; actual: number; predicted: number }[]> {
  const { data } = await api.get('/api/analytics/turnaround');
  return data;
}

export async function fetchQueueDepth(): Promise<{ time: string; g1: number; g2: number; g3: number; g4: number }[]> {
  const { data } = await api.get('/api/analytics/queue-depth');
  return data;
}

export async function fetchRerouteImpact(): Promise<{ day: string; withoutAi: number; withAi: number }[]> {
  const { data } = await api.get('/api/analytics/reroute-impact');
  return data;
}

// ─── GIS Layers ────────────────────────────────────────────────────────────
export async function fetchGisLayers(city: string): Promise<GisFeature[]> {
  const { data } = await api.get('/api/gis/layers', { params: { city } });
  return data;
}

// ─── Telemetry Stats ────────────────────────────────────────────────────────
export async function fetchTelemetryStats(): Promise<TelemetryStats> {
  const { data } = await api.get('/api/fleet/telemetry/stats');
  return data;
}

// ─── Notifications ─────────────────────────────────────────────────────────
export async function fetchNotifications(): Promise<Notification[]> {
  const { data } = await api.get('/api/notifications');
  return data;
}

// ─── WebSocket (Telemetry) ─────────────────────────────────────────────────
export function createTelemetryWebSocket(
  cityId: string,
  onMessage: (data: Partial<Truck>) => void,
  onStats?: (stats: TelemetryStats) => void
): WebSocket {
  const wsBase = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000').replace(/^http/, 'ws');
  const ws = new WebSocket(`${wsBase}/ws/telemetry?city=${cityId}`);

  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      if (msg.type === 'truck_update') onMessage(msg.data);
      if (msg.type === 'stats' && onStats) onStats(msg.data);
    } catch { /* ignore parse errors */ }
  };

  return ws;
}

export default api;
