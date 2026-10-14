// ─── Marketplace types ─────────────────────────────────────────────────────────
// Wire vocabulary for the broadcast / claim / batch delivery mechanic.
// Mirrors backend/app/constants.py and app/serializers.py.

export type UserRole = 'port_admin' | 'fleet_manager' | 'driver' | 'consumer';
export type AvailabilityStatus = 'available' | 'busy' | 'offline';

export type PriorityTier = 'standard' | 'express' | 'urgent';

export type DeliveryStatus =
  | 'pending'
  | 'batched'
  | 'assigned'
  | 'picked_up'
  | 'en_route'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type ScheduleStatus =
  | 'broadcasting'
  | 'claimed'
  | 'locked'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/** Legal per-stop transitions the driver can drive. Mirrors REQUEST_TRANSITIONS. */
export const DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ['batched', 'cancelled'],
  batched: ['assigned', 'cancelled'],
  assigned: ['picked_up', 'cancelled'],
  picked_up: ['en_route', 'cancelled'],
  en_route: ['delivered', 'failed', 'cancelled'],
  delivered: [],
  failed: [],
  cancelled: [],
};

/** Consumer-facing stepper labels, in order. Mirrors REQUEST_STEPPER. */
export const DELIVERY_STEPPER: { status: DeliveryStatus; label: string }[] = [
  { status: 'pending', label: 'Pending' },
  { status: 'batched', label: 'Batched' },
  { status: 'assigned', label: 'Driver Assigned' },
  { status: 'picked_up', label: 'Picked Up' },
  { status: 'en_route', label: 'Out for Delivery' },
  { status: 'delivered', label: 'Delivered' },
];

export interface PortSummary {
  id: string;
  code: string | null;
  name: string;
  short: string | null;
  city: string | null;
  state: string | null;
  lat: number;
  lng: number;
  zoom: number | null;
  corridor: string | null;
}

// ─── Map primitives ───────────────────────────────────────────────────────────

export type MapMode = 'roadmap' | 'satellite' | 'hybrid';
export type TruckStatus =
  | 'in_transit'
  | 'at_gate'
  | 'queued'
  | 'loading'
  | 'delayed'
  | 'idle'
  | 'outbound';

/**
 * Vehicle marker shape. The marketplace only ever renders the driver's own
 * vehicle, but the marker tooltip is reused from the fleet tracker and expects
 * the full descriptive set - all optional so a driver-only vehicle still fits.
 */
export interface Truck {
  id?: string;
  plate?: string;
  truckType?: string;
  vehicleMake?: string;
  status: TruckStatus;
  speedKmh?: number;
  heading?: number;
  fuelPct?: number;
  latitude?: number;
  longitude?: number;
  assigned_gate?: string;
  driver?: { name?: string; rating?: number; dutyHours?: number; phone?: string };
  mission?: {
    origin?: string;
    destination?: string;
    progressPct?: number;
    etaTime?: string;
  };
}

export interface Consumer {
  id: string;
  name: string;
  mobile_number: string;
}

export interface Driver {
  id: string;
  full_name: string;
  role: string;
  vehicle_number: string | null;
  vehicle_type: string | null;
  mobile_number: string | null;
  photo_url: string | null;
  availability_status: AvailabilityStatus | null;
}

export interface DeliveryRequest {
  id: string;
  token_number: string;
  consumer_id: string;
  created_by: 'consumer' | 'fleet_manager';
  created_by_user_id: string | null;
  pickup_port_id: string;
  pickup_port?: { id: string; name: string; short: string | null };
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  package_type: string | null;
  package_weight: number | null;
  special_handling: string | null;
  handling_flags: HandlingFlag[];
  priority_tier: PriorityTier;
  tier_fee: number;
  requested_window_start: string | null;
  requested_window_end: string | null;
status: DeliveryStatus;
    failure_reason: string | null;
    payment_status: PaymentStatus;
    payment_method: string | null;
    payment_amount: number;
    paid_at: string | null;
    schedule_id: string | null;
    stop_sequence: number | null;
    out_for_delivery_at: string | null;
    delivered_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  }

export interface OptimizedRoute {
  order: string[];
  polyline: [number, number][];
  legs: {
    from_request_id: string | null;
    to_request_id: string;
    distance_m: number | null;
    duration_s: number | null;
    simulated: boolean;
  }[];
  total_distance_km: number;
  total_duration_s: number;
  /** True when Geoapify was unreachable and geometry is a straight connector. */
  simulated: boolean;
}

export interface DeliverySchedule {
  id: string;
  fleet_manager_id: string;
  port_id: string;
  port?: { id: string; name: string; short: string | null; lat: number; lng: number };
  area_label: string;
  area_center_lat: number;
  area_center_lng: number;
  radius_km: number;
  departure_window_start: string;
  departure_window_end: string;
  max_batch_size: number;
  status: ScheduleStatus;
  claimed_by_driver_id: string | null;
  claimed_at: string | null;
  locked_at: string | null;
  departed_at: string | null;
  completed_at: string | null;
  estimated_earnings: number;
  final_earnings: number | null;
  stop_count: number | null;
  driver: Driver | null;
  driver_lat: number | null;
  driver_lng: number | null;
  driver_heading: number | null;
  driver_updated_at: string | null;
  optimized_route?: OptimizedRoute | null;
  stops?: DeliveryRequest[];
  created_at: string | null;
}

export interface ConsumerRequestIn {
  name: string;
  mobile: string;
  pickup_port_id: string;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  package_type?: string | null;
  package_weight?: number | null;
  special_handling?: string | null;
  handling_flags?: HandlingFlag[];
  priority_tier?: PriorityTier;
  requested_window_start?: string | null;
  requested_window_end?: string | null;
}

export interface ConsumerSubmission {
  token_number: string;
  track_url: string;
  status: DeliveryStatus;
  priority_tier: PriorityTier;
  tier_fee: number;
  pickup_port_id: string;
  delivery_lat: number;
  delivery_lng: number;
  payment_status: PaymentStatus;
  payment_method: string | null;
  payment_amount: number;
  payment_provider: string;
  /** True when the parcel must be paid before the depot will act on it. */
  requires_payment: boolean;
  /** "geoapify" when the address was really resolved, "fallback" when approximated. */
  geocode_source: string;
  created_at: string | null;
}

export interface TrackingPayload {
  token_number: string;
  status: DeliveryStatus;
  priority_tier: PriorityTier;
  tier_fee: number;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  requested_window_start: string | null;
  requested_window_end: string | null;
  package_type: string | null;
  package_weight: number | null;
  special_handling: string | null;
  handling_flags: HandlingFlag[];
  stop_sequence: number | null;
  payment_status: PaymentStatus;
  payment_method: string | null;
  payment_amount: number;
  paid_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  /** Whether the driver's phone number is released to this customer yet. */
  driver_contact_visible: boolean;
  created_at: string | null;
  updated_at: string | null;
  failure_reason: string | null;
  pickup_port?: { id: string; name: string; short: string | null; lat: number; lng: number };
  schedule?: {
    id: string;
    area_label: string;
    status: ScheduleStatus;
    departure_window_start: string;
    departure_window_end: string;
    driver_lat: number | null;
    driver_lng: number | null;
    driver_updated_at: string | null;
    driver?: DriverCard;
    route?: { polyline: [number, number][]; simulated: boolean };
  };
  /** True while the stop is still cancellable by the customer from their account. */
  is_cancellable?: boolean;
}

/**
 * The driver, as a customer is allowed to see them.
 *
 * `phone` is absent — not null — until `contact_visible` is true. Treat the field
 * as undefined as "not released", never as "no number on file".
 */
export interface DriverCard {
  name: string;
  vehicle_number: string | null;
  vehicle_type?: string | null;
  contact_visible: boolean;
  phone?: string | null;
}

// ─── Customer account ────────────────────────────────────────────────────────

/** One row on the signed-in customer's "My Deliveries" list. */
export interface ConsumerOrder extends DeliveryRequest {
  /** Assigned / picked up / en route - the stop has a driver and is moving. */
  is_live: boolean;
  is_cancellable: boolean;
}

/** The signed-in customer's own identity, used to pre-fill the booking form. */
export interface ConsumerAccount {
  user_id: string;
  full_name: string;
  email: string;
  mobile_number: string;
  photo_url: string | null;
  customer_since: string | null;
  consumer: { id: string; name: string; mobile_number: string; created_at: string | null } | null;
}

export interface ConsumerOrderHistoryEntry {
  id: string;
  old_status: string | null;
  new_status: string;
  reason: string | null;
  timestamp: string | null;
}

// ─── Earnings & payments ─────────────────────────────────────────────────────

/** One stop's contribution to a driver's payout, itemised. */
export interface StopEarning {
  reference: string;
  priority_tier: PriorityTier;
  weight_kg: number;
  handling_flags: HandlingFlag[];
  base_pay: number;
  weight_pay: number;
  handling_pay: number;
  stop_total: number;
}

/** What a driver earns for a prospective batch. Served by POST /schedules/quote. */
export interface EarningsQuote {
  stops: StopEarning[];
  stop_count: number;
  route_km: number;
  stops_pay: number;
  distance_pay: number;
  batch_bonus: number;
  total: number;
}

export interface PaymentConfig {
  provider: 'razorpay' | 'cash_on_depot';
  enabled: boolean;
  key_id: string;
  currency: string;
  cod_enabled: boolean;
}

export interface PaymentQuoteLine {
  label: string;
  amount: number;
  emphasis?: boolean;
}

export interface PaymentState {
  token_number: string;
  status: PaymentStatus;
  amount: number;
  method: string | null;
  ref: string | null;
  paid_at: string | null;
  provider: string;
  breakdown: PaymentQuoteLine[];
  /** Paid, still pending, and not on a batch yet - i.e. ready for the FM. */
  releaseable: boolean;
  released?: boolean;
  auto_attached?: boolean;
  already_paid?: boolean;
}

export interface RazorpayOrder {
  provider: 'razorpay';
  order_id: string;
  key_id: string;
  amount: number;
  amount_paise: number;
  currency: string;
  token_number: string;
  prefill: { name: string; contact: string };
  notes: Record<string, string>;
}

/** A parcel's price, computed server-side before the order exists. */
export interface PaymentEstimate {
  tier: PriorityTier;
  base_fee: number;
  weight_kg: number;
  weight_component: number;
  handling_flags: HandlingFlag[];
  handling_fee: number;
  /** True when the quote fell under the floor and was lifted to it. */
  min_charge_applied: boolean;
  total: number;
  provider: string;
  lines: PaymentQuoteLine[];
}

export interface PendingQueue {
  requests: DeliveryRequest[];
  /** Urgent requests with no open batch - drive the FM's immediate-schedule prompt. */
  urgent_without_batch: DeliveryRequest[];
}

/** A parcel's machine-readable handling requirements. Mirrors VALID_HANDLING. */
export type HandlingFlag = 'fragile' | 'upright' | 'refrigerated' | 'liquid';

export const HANDLING_OPTIONS: {
  id: HandlingFlag;
  label: string;
  hint: string;
}[] = [
  { id: 'fragile', label: 'Fragile', hint: 'Glass, porcelain, breakable' },
  { id: 'upright', label: 'Keep upright', hint: 'No top-load, do not tilt' },
  { id: 'refrigerated', label: 'Refrigerated', hint: 'Cold chain, perishable' },
  { id: 'liquid', label: 'Liquid', hint: 'Drums, canisters, bottles' },
];

export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded';

/** Payment fields returned on every request and tracking payload. */
export interface PaymentState {
  payment_status: PaymentStatus;
  payment_method: string | null;
  payment_amount: number;
  paid_at: string | null;
}

export interface MarketplaceKpis {
  port_id: string | null;
  period: string;
  total_requests: number;
  requests_per_day: number;
  total_schedules: number;
  active_batches: number;
  completed_schedules: number;
  cancelled_schedules: number;
  avg_time_to_claim_min: number;
  avg_batch_fill_pct: number;
  on_time_rate_by_tier: Record<string, {
    delivered: number;
    /** Deliveries that actually had a window to be scored against. */
    measured: number;
    on_time: number;
    /** null, not 0 — a tier with no deliveries has no rate, not a zero rate. */
    on_time_pct: number | null;
  }> & { overall_pct: number | null };
  on_time_rate_overall: number;
  drivers_total: number;
  drivers_active: number;
  drivers_available_now: number;
  driver_utilisation_pct: number;
  delivered: number;
  failed: number;
  cancelled: number;
  pending: number;
}

export interface VolumeSeries {
  period: string;
  port_id: string | null;
  dates: string[];
  submitted: number[];
  delivered: number[];
  cancelled: number[];
  failed: number[];
}

export interface AreaStat {
  area_label: string;
  port_id: string;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  schedules: number;
  completed: number;
  stop_total: number;
  avg_stops: number;
  earnings_total: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  groups: string[];
  assigned_port_id?: string | null;
  availability_status?: AvailabilityStatus;
  vehicle_number?: string | null;
  vehicle_type?: string | null;
  mobile_number?: string | null;
  photo_url?: string | null;
  must_change_password?: boolean;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type MarketplaceEventType =
  | 'connection:ready'
  | 'schedule:broadcast'
  | 'schedule:claimed'
  | 'schedule:stop_added'
  | 'schedule:locked'
  | 'schedule:driver_position'
| 'delivery:status_changed'
    | 'delivery:out_for_delivery'
    | 'driver:position:ack'
  | 'pong'
  | 'error';

export interface MarketplaceEvent {
  type: MarketplaceEventType;
  data: any;
}

export type SocketState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface TierOption {
  id: PriorityTier;
  label: string;
  fee: number;
  desc: string;
}

export const TIER_OPTIONS: TierOption[] = [
  { id: 'standard', label: 'Standard', fee: 0, desc: 'Best-effort batching' },
  { id: 'express', label: 'Express', fee: 500, desc: 'Next broadcasting batch' },
  { id: 'urgent', label: 'Urgent', fee: 1000, desc: 'Immediate single-stop run' },
];