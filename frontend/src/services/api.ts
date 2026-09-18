import axios from 'axios';
import type { Truck, Gate, Slot, KPIData, TelemetryStats, RouteResult, Notification } from '../types';
import { getCognitoToken } from './auth';

// VITE_API_URL is baked at build time. Empty string means same-origin (Nginx
// proxies /api/ in prod), so use nullish coalescing: explicit "" stays "".
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const api = axios.create({ baseURL: BASE });

const KNOWN_TRUCK_STATUSES = new Set(['in_transit', 'at_gate', 'queued', 'loading', 'delayed', 'idle', 'outbound']);

export interface RouteGeometry {
  type: 'Feature';
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  properties: { distance_m: number | null; duration_s: number | null; mode: string };
  simulated: boolean;
}

export async function fetchRoute(
  fromLat: number, fromLng: number, toLat: number, toLng: number, mode = 'drive'
): Promise<RouteGeometry> {
  const { data } = await api.get('/api/maps/route', {
    params: { from_lat: fromLat, from_lng: fromLng, to_lat: toLat, to_lng: toLng, mode },
  });
  return data;
}

function normalizeTruck(raw: any): Truck {
  const driver = raw.driver || {};
  const mission = raw.mission || {};
  const rawStatus = String(raw.status || 'in_transit').toLowerCase();
  return {
    id: raw.id,
    plate: raw.plate,
    truckType: raw.truckType || (raw.reefer_temp != null ? 'reefer' : 'container_chassis'),
    vehicleMake: raw.vehicleMake || raw.vehicle_make || 'Port Fleet Vehicle',
    containerSize: raw.containerSize || raw.container_size || '40ft HC',
    vin: raw.vin || '',
    status: (KNOWN_TRUCK_STATUSES.has(rawStatus) ? rawStatus : 'in_transit') as Truck['status'],
    cityId: raw.cityId || 'thoothukudi',
    assigned_gate: raw.assigned_gate || raw.assignedGate,
    driver: {
      id: driver.id || raw.id,
      name: driver.name || raw.driver_name || 'Driver',
      rating: driver.rating ?? raw.driver_rating ?? 4.5,
      dutyHours: driver.dutyHours ?? Math.floor(raw.duty_hours ?? 0),
      dutyMinutes: driver.dutyMinutes ?? Math.round(((raw.duty_hours ?? 0) % 1) * 60),
      phone: driver.phone || raw.driver_phone || '',
      kyc_verified: driver.kyc_verified ?? true,
    },
    latitude: raw.latitude ?? raw.lat ?? 0,
    longitude: raw.longitude ?? raw.lng ?? 0,
    heading: raw.heading ?? 0,
    speedKmh: raw.speedKmh ?? raw.speed ?? 0,
    fuelPct: raw.fuelPct ?? raw.fuel_level ?? 0,
    reeferTempC: raw.reeferTempC ?? raw.reefer_temp,
    reeferSetTempC: raw.reeferSetTempC,
    mission: {
      origin: mission.origin || 'Thoothukudi Logistics Corridor',
      destination: mission.destination || raw.destination || 'VOC Port',
      progressPct: mission.progressPct ?? 50,
      distanceClearedKm: mission.distanceClearedKm ?? 0,
      distanceRemainingKm: mission.distanceRemainingKm ?? 0,
      etaTime: mission.etaTime || raw.eta || '--:--',
      etaStatus: mission.etaStatus || (raw.status === 'delayed' ? 'delayed' : 'on_time'),
    },
    gnssLocked: raw.gnssLocked ?? true,
  };
}

function normalizeSlot(raw: any): Slot {
  const startTime = raw.slot_time || raw.startTime || '00:00';
  return {
    id: raw.id,
    gateId: raw.gate_id || raw.gateId,
    date: raw.date,
    startTime,
    endTime: raw.end_time || startTime,
    status: raw.status || 'available',
    tier: raw.tier || 'standard',
    cargo: raw.cargo_type,
    isAiTopPick: raw.status === 'ai_suggested',
    gate_id: raw.gate_id,
    slot_time: raw.slot_time,
    truck_plate: raw.truck_plate,
    driver_name: raw.driver_name,
    cargo_type: raw.cargo_type,
    dwell_estimate_min: raw.dwell_estimate_min,
  };
}

function normalizeGate(raw: any): Gate {
  const status = String(raw.status || '').toLowerCase();
  return {
    id: raw.id || raw.gate_id,
    name: raw.name || raw.gate_id,
    status: status.includes('hold') || status.includes('severe') || status.includes('congest') ? 'congested' :
      status.includes('fast') || status.includes('optimal') || status.includes('low') ? 'optimal' :
      status.includes('moderate') ? 'moderate' : 'normal',
    queueCount: raw.queue_count ?? raw.queue_length ?? raw.queue ?? 0,
    waitMinutes: raw.avg_wait_min ?? raw.wait ?? 0,
    avgDwellMinutes: raw.avg_dwell_min ?? raw.avg_wait_min ?? 0,
  };
}

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
  const { data } = await api.get(`/api/maps/places/${placeId}`);
  return data;
}

// ─── Ports ─────────────────────────────────────────────────────────────────
export interface PortSummary {
  id: string; name: string; short: string; city: string; state: string;
  lat: number; lng: number; zoom: number;
}

export async function fetchPorts(): Promise<PortSummary[]> {
  const { data } = await api.get('/api/ports');
  return data;
}

// ─── Fleet ─────────────────────────────────────────────────────────────────
export async function fetchFleet(portId?: string): Promise<Truck[]> {
  const { data } = await api.get('/api/fleet/trucks', { params: portId ? { port: portId } : {} });
  return data.map(normalizeTruck);
}

export async function fetchTruck(id: string): Promise<Truck> {
  const { data } = await api.get(`/api/fleet/trucks/${id}`);
  return normalizeTruck(data);
}

export async function triggerReroute(truckId: string): Promise<{
  message: string;
  status: string;
  delay_avoided_min?: number;
  fuel_saved_litres?: number;
  co2_reduction_kg?: number;
  instruction?: string;
  recommended_route?: string;
  newRoute?: RouteResult;
}> {
  const { data } = await api.post(`/api/fleet/trucks/${truckId}/reroute`);
  return data;
}

// ─── Gates & Slots ─────────────────────────────────────────────────────────
export async function fetchGates(): Promise<Gate[]> {
  const { data } = await api.get('/api/gis/gates');
  return data.map(normalizeGate);
}

export async function fetchSlots(gateId?: string, date?: string, portId?: string): Promise<Slot[]> {
  const { data } = await api.get('/api/slots', { params: { gate_id: gateId, date, port: portId } });
  return data.map(normalizeSlot);
}

export async function bookSlot(payload: {
  gateId: string; date: string; slotTime?: string; startTime?: string;
  truckId?: string; truckPlate?: string; tier?: string; cargo?: string; cargoType?: string;
  driverName?: string; driverPhone?: string; dwellMinutes?: number; dwellEstimateMin?: number;
  port?: string;
}): Promise<Slot> {
  const body = {
    gateId: payload.gateId,
    date: payload.date,
    slotTime: payload.slotTime || payload.startTime || '14:00',
    truckPlate: payload.truckPlate || payload.truckId || 'TN-04-E-8821',
    driverName: payload.driverName || 'R. Kumar',
    driverPhone: payload.driverPhone || '+91 98401 10001',
    cargoType: payload.cargoType || payload.cargo || 'Container',
    dwellEstimateMin: payload.dwellEstimateMin || payload.dwellMinutes || 25,
    tier: payload.tier || 'standard',
    port: payload.port || 'voc',
  };
  const { data } = await api.post('/api/slots/book', body);
  return normalizeSlot(data);
}

export async function rescheduleSlot(slotId: string, newTime: string): Promise<Slot> {
  const { data } = await api.put(`/api/slots/${slotId}/reschedule`, { new_time: newTime });
  return normalizeSlot(data);
}

export async function cancelSlot(slotId: string): Promise<{ message: string }> {
  const { data } = await api.delete(`/api/slots/${slotId}`);
  return data;
}

export async function getAiSlotSuggestion(gateId: string, date: string, preferredTime: string = '14:00', cargoType: string = 'Container', portId?: string): Promise<{
  recommended_gate: string; recommended_time: string; confidence_score: number; expected_savings_minutes: number;
  turnaround_improvement_pct: number; reasoning: string;
}> {
  const { data } = await api.post('/api/slots/ai-suggest', { gateId, date, preferredTime, cargoType, port: portId || 'voc' });
  return data;
}

export async function getGateCongestion(portId?: string): Promise<any> {
  const { data } = await api.get('/api/slots/congestion', { params: portId ? { port: portId } : {} });
  return data.map(normalizeGate);
}

// ─── Analytics / KPIs ──────────────────────────────────────────────────────
export async function fetchKPIs(period: '24h' | '7d' | '30d' = '24h', portId?: string): Promise<KPIData & Record<string, any>> {
  const { data } = await api.get('/api/analytics/kpis', { params: { period, port: portId } });
  // Backend speaks snake_case; expose camelCase aliases so all consumers work.
  return {
    ...data,
    avgQueueWaitMin: data.avg_queue_wait_min,
    queueWaitTrend: data.avg_queue_wait_delta,
    gateUtilizationPct: data.gate_utilization_pct,
    throughputTrucksPerHr: data.active_trucks_in_port,
    reroutesToday: data.reroutes_triggered_today,
    timeSavedHrs: data.fuel_saved_litres_today != null ? data.fuel_saved_litres_today / 34 : undefined,
    fuelSavedINR: data.fuel_saved_litres_today != null ? Math.round(data.fuel_saved_litres_today * 94) : undefined,
    co2MitigatedKg: data.co2_saved_kg_today,
    slotAdherencePct: data.slot_adherence_pct,
  };
}

export async function fetchHeatmapData(period: string = '24h', portId?: string): Promise<any> {
  const { data } = await api.get('/api/analytics/charts/congestion-heatmap', { params: { period, port: portId } });
  return data;
}

export async function fetchTurnaroundData(period: string = '7d', portId?: string): Promise<any> {
  const { data } = await api.get('/api/analytics/charts/turnaround', { params: { period, port: portId } });
  return data;
}

export async function fetchQueueDepth(gate?: string, portId?: string): Promise<any> {
  const { data } = await api.get('/api/analytics/charts/queue-depth', { params: { gate, port: portId } });
  return data;
}

export async function fetchRerouteImpact(portId?: string): Promise<any> {
  const { data } = await api.get('/api/analytics/charts/reroute-impact', { params: portId ? { port: portId } : {} });
  return data;
}

export async function runSimulation(params: {
  num_trucks?: number;
  arrival_distribution?: string;
  gate_capacity_multiplier?: number;
  dynamic_rerouting_enabled?: boolean;
  time_horizon_hours?: number;
}): Promise<any> {
  const { data } = await api.post('/api/analytics/simulate', params);
  // Backend returns {status, simulation_parameters, results:{mean_wait_*, wait_time_reduction_pct, ...}}.
  // Flatten to the shape AnalyticsPage consumes, with a human-readable summary.
  const r = data?.results || {};
  const p = data?.simulation_parameters || {};
  const meanWithAi = r.mean_wait_with_ai_min;
  const meanWithoutAi = r.mean_wait_without_ai_min;
  const reduction = r.wait_time_reduction_pct;
  return {
    ...data,
    avg_queue_wait: meanWithAi,
    mean_wait_with_ai_min: meanWithAi,
    mean_wait_without_ai_min: meanWithoutAi,
    wait_reduction_pct: reduction,
    num_trucks: p.num_trucks ?? params.num_trucks,
    summary: (meanWithAi != null && reduction != null)
      ? `${p.num_trucks ?? params.num_trucks ?? 200} trucks simulated over ${p.time_horizon_hours ?? params.time_horizon_hours ?? 8}h · Avg wait with AI: ${meanWithAi} min (vs ${meanWithoutAi} min, −${reduction}%) · Expected throughput: ${r.expected_throughput_trucks ?? 'N/A'} trucks`
      : undefined,
  };
}

// ─── GIS Layers ────────────────────────────────────────────────────────────
export async function fetchGisLayers(portId?: string): Promise<any> {
  const { data } = await api.get('/api/gis/layers', { params: portId ? { port: portId } : {} });
  return data;
}

export async function fetchGisGates(portId?: string): Promise<any[]> {
  const { data } = await api.get('/api/gis/gates', { params: portId ? { port: portId } : {} });
  return data;
}

// ─── Telemetry Stats ────────────────────────────────────────────────────────
export async function fetchTelemetryStats(): Promise<TelemetryStats> {
  const { data } = await api.get('/api/analytics/telemetry-stats');
  return data;
}

// ─── Notifications ─────────────────────────────────────────────────────────
export async function fetchNotifications(): Promise<Notification[]> {
  const { data } = await api.get('/api/notifications');
  return data;
}

export async function markNotificationRead(id: string): Promise<any> {
  const { data } = await api.post(`/api/notifications/${id}/read`);
  return data;
}

// ─── User Settings ─────────────────────────────────────────────────────────
export async function fetchUserSettings(): Promise<any> {
  const { data } = await api.get('/api/settings');
  return data;
}

export async function updateUserSettings(settings: any): Promise<any> {
  const { data } = await api.put('/api/settings', settings);
  return data;
}

// ─── WebSocket with Exponential Backoff Auto-Reconnect ─────────────────────
export interface TelemetrySocketHandle {
  close: () => void;
  send: (data: any) => void;
}

export function createTelemetryWebSocket(
  cityId: string,
  onMessage: (data: Partial<Truck>) => void,
  onStats?: (stats: any) => void,
  onStatusChange?: (status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void
): TelemetrySocketHandle {
  let ws: WebSocket | null = null;
  let retryCount = 0;
  let isClosedManually = false;
  let reconnectTimeout: any = null;

  // Default WS derives from the page origin (wss on https) so prod builds
  // work without rebuilding per-domain; explicit VITE_WS_URL still wins.
  const wsBase = (() => {
    const configured = import.meta.env.VITE_WS_URL as string | undefined;
    if (configured) return configured.replace(/^http/, 'ws');
    if (typeof window !== 'undefined') {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      return `${proto}://${window.location.host}`;
    }
    return 'ws://localhost:8000';
  })();
  const url = `${wsBase}/ws/telemetry?city=${cityId}`;

  function connect() {
    if (isClosedManually) return;
    onStatusChange?.(retryCount === 0 ? 'connecting' : 'reconnecting');

    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        // Closed while connecting (e.g. port switch unmounted us): shut down
        // silently now that the handshake completed — avoids the browser's
        // "closed before the connection is established" console error.
        if (isClosedManually) {
          try { ws?.close(); } catch { /* ignore */ }
          onStatusChange?.('disconnected');
          return;
        }
        retryCount = 0;
        onStatusChange?.('connected');
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'truck_update' && msg.data) onMessage(msg.data);
          if (msg.type === 'stats' && msg.data && onStats) onStats(msg.data);
        } catch { /* ignore parse error */ }
      };

      ws.onclose = () => {
        if (isClosedManually) {
          onStatusChange?.('disconnected');
          return;
        }
        onStatusChange?.('reconnecting');
        // Exponential backoff: min 1s, max 16s
        const backoff = Math.min(1000 * Math.pow(2, retryCount), 16000);
        retryCount++;
        reconnectTimeout = setTimeout(connect, backoff);
      };

      ws.onerror = () => {
        ws?.close();
      };
    } catch {
      const backoff = Math.min(1000 * Math.pow(2, retryCount), 16000);
      retryCount++;
      reconnectTimeout = setTimeout(connect, backoff);
    }
  }

  connect();

  return {
    close: () => {
      isClosedManually = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      // Never close mid-handshake: that logs "closed before the connection
      // is established". onopen above will close silently once established.
      if (ws && ws.readyState !== WebSocket.CONNECTING) {
        try { ws.close(); } catch { /* ignore */ }
        onStatusChange?.('disconnected');
      }
    },
    send: (data: any) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    }
  };
}

export default api;

