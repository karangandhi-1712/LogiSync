export interface City {
  id: string;
  name: string;
  state: string;
  country: string;
  center: [number, number]; // [longitude, latitude]
  zoom: number;
  bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  description: string;
  type: 'mmlp' | 'port' | 'icd' | 'metro' | 'custom';
  defaultWaypoints?: Omit<Waypoint, 'id'>[];
}

export interface Waypoint {
  id: string;
  label: string; // 'A', 'B', 'C', 'D', 'E'
  name: string;
  coordinates: [number, number]; // [lon, lat]
  address?: string;
  role?: 'origin' | 'checkpoint' | 'crossdock' | 'customs' | 'destination';
}

export interface RouteStep {
  instruction: string;
  distance: number; // in meters
  duration: number; // in seconds
  name: string;
}

export interface RouteLeg {
  distance: number;
  duration: number;
  summary: string;
  steps: RouteStep[];
}

export interface RouteResult {
  coordinates: [number, number][]; // [lon, lat][]
  totalDistanceKm: number;
  totalDurationMins: number;
  freeFlowDurationMins: number;
  trafficDelayMins: number;
  legs: RouteLeg[];
  status: 'optimal' | 'rerouted' | 'blocked' | 'calculating';
  avoidedIncidentsCount?: number;
}

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

export interface SimulationState {
  isPlaying: boolean;
  progress: number; // 0.0 to 1.0
  playbackSpeed: number; // 1, 2, 5, 10
  currentCoord: [number, number];
  currentHeading: number;
  currentSpeedKmH: number;
  currentLegIndex: number;
}

export type TruckStatus = 'inbound' | 'at_gate' | 'in_yard' | 'loading' | 'outbound' | 'in_transit';
export type TruckType = 'container_chassis' | 'reefer' | 'flatbed' | 'hazmat';

export interface Truck {
  id: string;
  plate_number: string;
  city_id: string;
  carrier: string;
  truck_type: TruckType;
  status: TruckStatus;
  driver_name: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading: number;
  fuel_pct: number;
  temperature_c: number;
  assigned_mission: string;
  data_source: string;
}

export interface Container {
  id: string;
  container_number: string;
  city_id: string;
  iso_size: '20ft' | '40ft' | '40ft_HC' | 'reefer';
  gross_weight_tonnes: number;
  contents: string;
  yard_zone_id: string;
  tier: number;
  dwell_hours: number;
  customs_status: 'cleared' | 'inspection_required' | 'hold';
  data_source: string;
}

export interface Shipment {
  id: string;
  tracking_code: string;
  city_id: string;
  origin_name: string;
  destination_name: string;
  status: 'scheduled' | 'in_transit' | 'customs_hold' | 'delivered';
  eta_minutes: number;
  priority: 'standard' | 'express' | 'critical';
  weight_tonnes: number;
  assigned_truck_id?: string;
  data_source: string;
}

export interface TelemetryStats {
  connected_clients: number;
  total_packets_processed: number;
  active_tracked_trucks: number;
  last_packet_timestamp: number;
  protocol: string;
  broker_status: string;
}

