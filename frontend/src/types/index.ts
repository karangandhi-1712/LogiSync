// ─── All TypeScript Interfaces for LogiSync v2.0 ─────────────────────────

export type UserRole = 'port_admin' | 'fleet_manager' | 'dispatcher' | 'driver' | 'analyst';

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  groups: string[];
}

// ─── City / Hub ────────────────────────────────────────────────────────────
export interface City {
  id: string;
  name: string;
  state: string;
  country: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
  bbox?: [number, number, number, number];
  description: string;
  type: 'mmlp' | 'port' | 'icd' | 'metro' | 'custom';
  defaultWaypoints?: Omit<Waypoint, 'id'>[];
}

// ─── Waypoints / Routing ───────────────────────────────────────────────────
export interface Waypoint {
  id: string;
  label: string;        // 'A', 'B', 'C' …
  name: string;
  coordinates: [number, number]; // [lng, lat]
  address?: string;
  role?: 'origin' | 'checkpoint' | 'crossdock' | 'customs' | 'destination';
}

export interface RouteResult {
  coordinates: [number, number][];
  totalDistanceKm: number;
  totalDurationMins: number;
  trafficDelayMins: number;
  legs: RouteLeg[];
  status: 'optimal' | 'rerouted' | 'blocked' | 'calculating';
}

export interface RouteLeg {
  distance: number;
  duration: number;
  summary: string;
  steps: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  name: string;
}

// ─── Traffic / Incidents ───────────────────────────────────────────────────
export interface TrafficIncident {
  id: string;
  title: string;
  type: 'roadblock' | 'construction' | 'congestion' | 'accident' | 'hazard';
  severity: 'low' | 'moderate' | 'critical';
  coordinates: [number, number];
  roadName?: string;
  description: string;
  delayMins: number;
  isBlockingRoute?: boolean;
}

// ─── Fleet / Trucks ────────────────────────────────────────────────────────
export type TruckStatus = 'in_transit' | 'at_gate' | 'queued' | 'loading' | 'delayed' | 'idle' | 'outbound';
export type TruckType   = 'container_chassis' | 'reefer' | 'flatbed' | 'tanker' | 'hazmat' | 'heavy_trailer';

export interface Driver {
  id: string;
  name: string;
  rating: number;
  dutyHours: number;
  dutyMinutes: number;
  phone: string;
  kyc_verified: boolean;
}

export interface Truck {
  id: string;            // e.g. 'TRK-8821'
  plate: string;         // e.g. 'TN-04-E-8821'
  truckType: TruckType;
  vehicleMake: string;   // e.g. 'Scania R500'
  containerSize: string; // e.g. 'High Cube 40ft'
  vin: string;
  status: TruckStatus;
  cityId: string;
  assigned_gate?: string;
  driver: Driver;
  latitude: number;
  longitude: number;
  heading: number;       // degrees 0-360
  speedKmh: number;
  fuelPct: number;
  reeferTempC?: number;
  reeferSetTempC?: number;
  mission: {
    origin: string;
    destination: string;
    progressPct: number;
    distanceClearedKm: number;
    distanceRemainingKm: number;
    etaTime: string;       // e.g. '14:15'
    etaStatus: 'on_time' | 'delayed' | 'early';
  };
  bookedSlot?: {
    gateId: string;
    slotTime: string;
  };
  alertTag?: string;     // e.g. 'NH-44 Bypass Bottleneck • Missed Window'
  gnssLocked: boolean;
}

// ─── Gate Slots ────────────────────────────────────────────────────────────
export type SlotStatus = 'available' | 'booked' | 'active' | 'congested' | 'completed';
export type SlotTier   = 'standard' | 'express' | 'critical';
export type GateStatus = 'optimal' | 'normal' | 'moderate' | 'congested';

export interface Gate {
  id: string;       // 'G-01' … 'G-04'
  name: string;     // 'Main Entry', 'Container Term' …
  status: GateStatus;
  queueCount: number;
  waitMinutes: number;
  avgDwellMinutes: number;
}

export interface Slot {
  id: string;
  gateId: string;
  date: string;          // 'YYYY-MM-DD'
  startTime: string;     // 'HH:mm'
  endTime: string;       // 'HH:mm'
  status: SlotStatus;
  tier: SlotTier;
  truck?: Pick<Truck, 'id' | 'plate' | 'truckType' | 'containerSize'>;
  driver?: Pick<Driver, 'name' | 'kyc_verified'>;
  cargo?: string;
  isAiTopPick?: boolean;
  surgeWarning?: string;

  // ── Backend snake_case fields ───────────────────────────────────────────
  gate_id?: string;
  slot_time?: string;
  truck_plate?: string;
  driver_name?: string;
  cargo_type?: string;
  dwell_estimate_min?: number;
}


// ─── Analytics / KPIs ─────────────────────────────────────────────────────
export interface KPIData {
  avgQueueWaitMin: number;
  queueWaitTrend: number;        // % change vs last period
  gateUtilizationPct: number;
  throughputTrucksPerHr: number;
  maxThroughputTrucksPerHr: number;
  reroutesToday: number;
  timeSavedHrs: number;
  fuelSavedINR: number;
  co2MitigatedKg: number;
  slotAdherencePct: number;
  slotsTotal: number;
  slotsAdherent: number;
}

export interface HeatmapCell {
  gate: string;
  hour: string;
  score: number;   // 0–100
}

export interface ChartDataPoint {
  time: string;
  value: number;
  predicted?: number;
}

// ─── GIS Layers ────────────────────────────────────────────────────────────
export interface GisFeature {
  id: string;
  type: 'warehouse' | 'yard' | 'gate' | 'road' | 'boundary';
  name: string;
  geometry: {
    type: string;
    coordinates: unknown;
  };
  properties: Record<string, unknown>;
}

// ─── Telemetry ─────────────────────────────────────────────────────────────
export interface TelemetryStats {
  connectedClients: number;
  totalPackets: number;
  activeTrucks: number;
  gnssLocked: number;
  latencyMs: number;
  uptimePct: number;
}

// ─── Notifications ─────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  type: 'reroute' | 'congestion' | 'slot' | 'delay' | 'system';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

// ─── Map Types ─────────────────────────────────────────────────────────────
export type MapMode = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
