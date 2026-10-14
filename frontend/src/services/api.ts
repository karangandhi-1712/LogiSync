import axios from 'axios';
import type {
  AuthUser,
  ConsumerAccount,
  ConsumerOrder,
  ConsumerOrderHistoryEntry,
  ConsumerRequestIn,
  ConsumerSubmission,
  DeliveryRequest,
  DeliverySchedule,
  Driver,
  EarningsQuote,
  MarketplaceEvent,
  MarketplaceEventType,
  MarketplaceKpis,
  PaymentConfig,
  PaymentEstimate,
  PaymentState,
  PendingQueue,
  PortSummary,
  RazorpayOrder,
  SocketState,
  TrackingPayload,
  VolumeSeries,
  AreaStat,
  AvailabilityStatus,
} from '../types';

// VITE_API_URL is baked at build time. Empty string means same-origin (Nginx
// proxies /api/ in prod), so use nullish coalescing: explicit "" stays "".
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
});

const TOKEN_KEY = 'logisync_token';

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// ─── Consumer (public, no auth) ───────────────────────────────────────────────

export async function fetchPorts(): Promise<PortSummary[]> {
  const { data } = await api.get('/api/ports');
  return data;
}

export async function fetchNearestPort(lat: number, lng: number): Promise<PortSummary & { distance_km: number }> {
  const { data } = await api.get('/api/ports/nearest', { params: { lat, lng } });
  return data;
}

export async function fetchCoastalPorts(): Promise<PortSummary[]> {
  const { data } = await api.get('/api/ports/coastal');
  return data;
}

export async function submitConsumerRequest(payload: ConsumerRequestIn): Promise<ConsumerSubmission> {
  const { data } = await api.post('/api/consumer/requests', payload);
  return data;
}

/** Fleet-manager walk-in / phone order. Pinned server-side to their own depot. */
export async function submitManualRequest(payload: ConsumerRequestIn): Promise<DeliveryRequest> {
  const { data } = await api.post('/api/consumer/requests/manual', payload);
  return data;
}

/** Anonymous tracking by token - backs shareable links. */
export async function fetchTracking(token: string): Promise<TrackingPayload> {
  const { data } = await api.get(`/api/track/${encodeURIComponent(token)}`);
  return data;
}

export async function fetchUrgentAlerts(port?: string): Promise<{ total: number; by_port: { port_id: string; count: number }[] }> {
  const { data } = await api.get('/api/consumer/urgent-alerts', { params: port ? { port } : {} });
  return data;
}

// ─── Customer account (JWT-scoped - never keyed off a client-supplied id) ──────

export async function fetchConsumerAccount(): Promise<ConsumerAccount> {
  const { data } = await api.get('/api/consumer/account/profile');
  return data;
}

/** Place a delivery on the signed-in customer's behalf. Identity comes from the token. */
export async function placeConsumerOrder(
  payload: Omit<ConsumerRequestIn, 'name' | 'mobile'>,
): Promise<ConsumerSubmission> {
  const { data } = await api.post('/api/consumer/account/orders', payload);
  return data;
}

export async function fetchMyOrders(): Promise<ConsumerOrder[]> {
  const { data } = await api.get('/api/consumer/account/orders');
  return data;
}

/** One of your own deliveries. 404 for anyone else's token - never a 403. */
export async function fetchMyOrder(token: string): Promise<TrackingPayload> {
  const { data } = await api.get(`/api/consumer/account/orders/${encodeURIComponent(token)}`);
  return data;
}

export async function cancelMyOrder(token: string, reason?: string): Promise<DeliveryRequest> {
  const { data } = await api.post(
    `/api/consumer/account/orders/${encodeURIComponent(token)}/cancel`,
    { reason: reason ?? null },
  );
  return data;
}

export async function fetchMyOrderHistory(token: string): Promise<ConsumerOrderHistoryEntry[]> {
  const { data } = await api.get(`/api/consumer/account/orders/${encodeURIComponent(token)}/history`);
  return data;
}

// ─── Fleet manager: schedules ─────────────────────────────────────────────────

export async function fetchPendingQueue(): Promise<PendingQueue> {
  const { data } = await api.get('/api/schedules/pending');
  return data;
}

export interface CreateScheduleInput {
  port_id: string;
  area_label: string;
  area_center_lat: number;
  area_center_lng: number;
  radius_km: number;
  departure_window_start: string;
  departure_window_end: string;
  max_batch_size: number;
  request_ids: string[];
}

export async function createSchedule(payload: CreateScheduleInput): Promise<DeliverySchedule> {
  const { data } = await api.post('/api/schedules', payload);
  return data;
}

/**
 * Price a prospective batch without creating it.
 *
 * The fleet manager's estimate comes from the server rather than a local copy of
 * the earnings formula, which is what used to drift: the panel showed one figure
 * and the driver was offered another as soon as a constant changed.
 */
export async function quoteSchedule(payload: {
  request_ids: string[];
  area_center_lat?: number | null;
  area_center_lng?: number | null;
}): Promise<EarningsQuote> {
  const { data } = await api.post('/api/schedules/quote', payload);
  return data;
}

export async function fetchSchedules(status?: string): Promise<DeliverySchedule[]> {
  const { data } = await api.get('/api/schedules', { params: status ? { status } : {} });
  return data;
}

export async function fetchSchedule(id: string): Promise<DeliverySchedule> {
  const { data } = await api.get(`/api/schedules/${id}`);
  return data;
}

export async function attachStops(id: string, requestIds: string[]): Promise<DeliverySchedule> {
  const { data } = await api.post(`/api/schedules/${id}/attach`, { request_ids: requestIds });
  return data;
}

export async function forceLockSchedule(id: string): Promise<DeliverySchedule> {
  const { data } = await api.post(`/api/schedules/${id}/force-lock`);
  return data;
}

export async function reassignSchedule(id: string): Promise<DeliverySchedule> {
  const { data } = await api.post(`/api/schedules/${id}/reassign`);
  return data;
}

export async function cancelSchedule(id: string): Promise<DeliverySchedule> {
  const { data } = await api.post(`/api/schedules/${id}/cancel`);
  return data;
}

export async function fetchDrivers(): Promise<Driver[]> {
  const { data } = await api.get('/api/drivers');
  return data;
}

// ─── Driver ───────────────────────────────────────────────────────────────────

export async function fetchJobFeed(): Promise<DeliverySchedule[]> {
  const { data } = await api.get('/api/schedules/feed/broadcasting');
  return data;
}

/** Atomically claims a batch. Throws 409 when another driver won the race. */
export async function claimSchedule(id: string): Promise<DeliverySchedule> {
  const { data } = await api.post(`/api/schedules/${id}/claim`);
  return data;
}

export async function fetchMySchedules(): Promise<DeliverySchedule[]> {
  const { data } = await api.get('/api/schedules/feed/mine');
  return data;
}

export async function departDepot(id: string): Promise<DeliverySchedule> {
  const { data } = await api.post(`/api/schedules/${id}/depart`);
  return data;
}

export async function updateDriverPosition(
  id: string,
  latitude: number,
  longitude: number,
  heading?: number,
): Promise<{ ok: boolean }> {
  const { data } = await api.post(`/api/schedules/${id}/position`, {
    latitude,
    longitude,
    heading,
  });
  return data;
}

export async function setAvailability(
  availability_status: AvailabilityStatus,
  going_offline_at?: string | null,
): Promise<{ availability_status: AvailabilityStatus; going_offline_at: string | null }> {
  const { data } = await api.patch('/api/auth/availability', {
    availability_status,
    going_offline_at: going_offline_at ?? null,
  });
  return data;
}

// ─── Delivery execution ───────────────────────────────────────────────────────

export async function fetchDeliveries(params: {
  port?: string;
  status?: string;
  schedule_id?: string;
} = {}): Promise<DeliveryRequest[]> {
  const { data } = await api.get('/api/deliveries', { params });
  return data;
}

export async function advanceStop(
  id: string,
  status: string,
  reason?: string,
): Promise<DeliveryRequest & { schedule_completed: boolean }> {
  const { data } = await api.patch(`/api/deliveries/${id}/status`, { status, reason });
  return data;
}

export async function cancelStop(id: string, reason?: string): Promise<DeliveryRequest> {
  const { data } = await api.post(`/api/deliveries/${id}/cancel`, { status: 'cancelled', reason });
  return data;
}

export async function fetchStopHistory(id: string) {
  const { data } = await api.get(`/api/deliveries/${id}/history`);
  return data;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function fetchPaymentConfig(): Promise<PaymentConfig> {
  const { data } = await api.get('/api/payments/config');
  return data;
}

export async function fetchPaymentState(token: string): Promise<PaymentState> {
  const { data } = await api.get(`/api/payments/${token}`);
  return data;
}

/** Price a parcel before creating the order, for the checkout review step. */
export async function estimatePayment(payload: {
  priority_tier: string;
  package_weight?: number | null;
  package_type?: string | null;
  handling_flags?: string[];
  special_handling?: string | null;
}): Promise<PaymentEstimate> {
  const { data } = await api.post('/api/payments/estimate', payload);
  return data;
}

/** Open a gateway order. Resolves to a COD state when no gateway is configured. */
export async function createPaymentOrder(token: string): Promise<RazorpayOrder | PaymentState> {
  const { data } = await api.post('/api/payments/order', { token_number: token });
  return data;
}

/**
 * Hand the checkout result to the server for signature verification.
 *
 * The browser's own success callback is never trusted — Razorpay's signature is
 * checked server-side against the API secret before the parcel is released.
 */
export async function verifyPayment(payload: {
  token_number: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<PaymentState> {
  const { data } = await api.post('/api/payments/verify', payload);
  return data;
}

/** Acknowledge pay-on-collection. 409s when a gateway is live. */
export async function confirmPayOnDepot(token: string): Promise<PaymentState> {
  const { data } = await api.post('/api/payments/cod/confirm', { token_number: token });
  return data;
}

/**
 * Load Razorpay's checkout script once.
 *
 * Returns null when the gateway is disabled or the CDN is unreachable — callers
 * treat that as "fall back to pay at depot" rather than an error, so a blocked
 * CDN degrades the flow instead of breaking the page.
 */
let _razorpayPromise: Promise<boolean> | null = null;
export function loadRazorpay(): Promise<boolean> {
  if (_razorpayPromise) return _razorpayPromise;
  _razorpayPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(Boolean((window as any).Razorpay));
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
  return _razorpayPromise;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function fetchMarketplaceKpis(
  period = '7d',
  portId?: string,
): Promise<MarketplaceKpis> {
  const { data } = await api.get('/api/analytics/delivery/kpis', {
    params: { period, port: portId || undefined },
  });
  return data;
}

export async function fetchVolumeSeries(period = '7d', portId?: string): Promise<VolumeSeries> {
  const { data } = await api.get('/api/analytics/delivery/volume', {
    params: { period, port: portId || undefined },
  });
  return data;
}

export async function fetchAreaStats(period = '30d', portId?: string): Promise<{ areas: AreaStat[] }> {
  const { data } = await api.get('/api/analytics/delivery/areas', {
    params: { period, port: portId || undefined },
  });
  return data;
}

export async function fetchBatchDistribution(period = '30d', portId?: string) {
  const { data } = await api.get('/api/analytics/delivery/batches', {
    params: { period, port: portId || undefined },
  });
  return data;
}

export async function fetchPerPortOverview(period = '7d') {
  const { data } = await api.get('/api/analytics/delivery/ports', { params: { period } });
  return data;
}

// ─── Auth (driver + customer sign-up, session) ─────────────────────────────────

export async function registerDriver(payload: {
  full_name: string;
  vehicle_number: string;
  vehicle_type?: string;
  photo_url?: string;
  mobile: string;
  email: string;
  password: string;
}): Promise<{ access_token: string; role: string; user_id: string }> {
  const { data } = await api.post('/api/auth/register', { ...payload, role: 'driver' });
  return data;
}

/** Customer self-signup. Claims any guest orders already filed under this mobile. */
export async function registerConsumer(payload: {
  full_name: string;
  mobile: string;
  email: string;
  password: string;
  photo_url?: string;
}): Promise<{ access_token: string; role: string; user_id: string; returning_customer: boolean }> {
  const { data } = await api.post('/api/auth/register/consumer', payload);
  return data;
}

export async function login(identifier: string, password: string) {
  const { data } = await api.post('/api/auth/login', { identifier, password });
  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get('/api/auth/me');
  return data;
}

export async function sendOtp(target_type: 'mobile' | 'email', target_value: string, purpose = 'signup') {
  const { data } = await api.post('/api/auth/send-otp', { target_type, target_value, purpose });
  return data;
}

export async function verifyOtp(target_type: 'mobile' | 'email', target_value: string, code: string) {
  const { data } = await api.post('/api/auth/verify-otp', { target_type, target_value, code });
  return data;
}

export async function checkMobile(mobile: string) {
  const { data } = await api.get('/api/auth/check-mobile', { params: { mobile } });
  return data;
}

export async function changePassword(payload: {
  current_password: string;
  new_password: string;
}): Promise<{ changed: boolean }> {
  const { data } = await api.post('/api/auth/change-password', payload);
  return data;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function fetchUserSettings() {
  const { data } = await api.get('/api/settings');
  return data;
}

export async function updateUserSettings(settings: Record<string, unknown>) {
  const { data } = await api.put('/api/settings', settings);
  return data;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  role: string;
  full_name: string;
  email: string;
  mobile_number: string;
  assigned_port_id: string | null;
  availability_status: AvailabilityStatus | null;
  going_offline_at: string | null;
  is_active: boolean;
  /** Added so the dashboard can sort by newest without a second request. */
  created_at: string | null;
}

export async function fetchAdminUsers(role?: string, port?: string): Promise<AdminUser[]> {
  const { data } = await api.get('/api/admin/users', {
    params: { role: role || undefined, port: port || undefined },
  });
  return data;
}

export async function createFleetManager(payload: {
  full_name: string;
  email: string;
  mobile: string;
  temp_password: string;
  assigned_port_id: string;
}) {
  const { data } = await api.post('/api/admin/fleet-managers', payload);
  return data as Promise<{ id: string; email: string; assigned_port_id: string; temp_password: string }>;
}

export async function deactivateUser(id: string) {
  const { data } = await api.patch(`/api/admin/users/${id}/deactivate`);
  return data;
}

export async function activateUser(id: string) {
  const { data } = await api.patch(`/api/admin/users/${id}/activate`);
  return data;
}

export async function deleteUser(id: string) {
  const { data } = await api.delete(`/api/admin/users/${id}`);
  return data;
}

// ─── Maps ─────────────────────────────────────────────────────────────────────

export interface RouteGeometry {
  type: 'Feature';
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  properties: { distance_m: number | null; duration_s: number | null; mode: string };
  simulated: boolean;
}

/** Single-leg road geometry. Used when a batch has no locked route yet. */
export async function fetchRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode = 'drive',
): Promise<RouteGeometry> {
  const { data } = await api.get('/api/maps/route', {
    params: { from_lat: fromLat, from_lng: fromLng, to_lat: toLat, to_lng: toLng, mode },
  });
  return data;
}

export async function geocodeAddress(address: string, portId?: string) {
  const { data } = await api.get('/api/maps/geocode', {
    params: { address, port_id: portId },
  });
  return data as Promise<{ lat: number; lng: number; resolved: boolean; source: string }>;
}

// ─── Marketplace event socket ─────────────────────────────────────────────────

export interface EventSocketHandle {
  close: () => void;
  send: (type: MarketplaceEventType, data?: unknown) => void;
}

/**
 * Authenticated event socket with exponential-backoff reconnect.
 *
 * The handshake carries the JWT because every event is targeted: broadcasts go
 * only to available drivers, stop-added goes only to the claiming driver and the
 * owning fleet manager. An unauthenticated socket would receive everything.
 *
 * `onFallbackNeeded` fires whenever the socket is not `connected`, which is the
 * signal for a page to switch to REST polling.
 */
export function createEventSocket(
  onEvent: (event: MarketplaceEvent) => void,
  onStateChange?: (state: SocketState) => void,
  onFallbackNeeded?: (down: boolean) => void,
): EventSocketHandle {
  let ws: WebSocket | null = null;
  let retryCount = 0;
  let closedManually = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let wasConnected = false;

  const wsBase = (() => {
    const configured = import.meta.env.VITE_WS_URL as string | undefined;
    if (configured) return configured.replace(/^http/, 'ws');
    if (typeof window !== 'undefined') {
      // The local Vite app runs on 5173 and the API/WebSocket server on 8000.
      // In production, use the same origin (typically reverse-proxied by Nginx).
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:8000`;
      }
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      return `${proto}://${window.location.host}`;
    }
    return 'ws://localhost:8000';
  })();

  function token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  function connect() {
    if (closedManually) return;
    const jwt = token();
    if (!jwt) {
      onStateChange?.('disconnected');
      return;
    }
    onStateChange?.(retryCount === 0 ? 'connecting' : 'reconnecting');

    try {
      ws = new WebSocket(`${wsBase}/ws/events?token=${encodeURIComponent(jwt)}`);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      if (closedManually) {
        try {
          ws?.close();
        } catch {
          /* ignore */
        }
        onStateChange?.('disconnected');
        return;
      }
      retryCount = 0;
      wasConnected = true;
      onFallbackNeeded?.(false);
      onStateChange?.('connected');
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg && typeof msg.type === 'string') {
          onEvent(msg as MarketplaceEvent);
        }
      } catch {
        /* ignore parse error */
      }
    };

    ws.onclose = () => {
      if (closedManually) {
        onFallbackNeeded?.(true);
        onStateChange?.('disconnected');
        return;
      }
      onFallbackNeeded?.(true);
      onStateChange?.('reconnecting');
      scheduleReconnect();
    };

    ws.onerror = () => {
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  }

  function scheduleReconnect() {
    if (closedManually) return;
    const backoff = Math.min(1000 * Math.pow(2, retryCount), 16000);
    retryCount += 1;
    reconnectTimer = setTimeout(connect, backoff);
  }

  connect();

  return {
    close: () => {
      closedManually = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      // Never close mid-handshake: that logs "closed before the connection was
      // established". onopen above closes silently once it settles.
      if (ws && ws.readyState !== WebSocket.CONNECTING) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }
      if (!wasConnected) onFallbackNeeded?.(true);
      onStateChange?.('disconnected');
    },
    send: (type: MarketplaceEventType, data?: unknown) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, data: data ?? {} }));
      }
    },
  };
}

export default api;
