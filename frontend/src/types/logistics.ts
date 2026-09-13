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
  fuelBurned?: number; // litres consumed so far
  fuelTotal?: number;  // total fuel estimate for trip
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

// ==================== PHASE 5-6: Optimization Types ====================

export type OptimizationMode = 'fuel_efficient' | 'time_efficient' | 'balanced';

export interface TruckProfile {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  max_payload_tonnes: number;
  gross_vehicle_weight_tonnes: number;
  tare_weight_tonnes: number;
  axle_count: number;
  length_m: number;
  width_m: number;
  height_m: number;
  turning_radius_m: number;
  engine_power_hp: number;
  fuel_tank_capacity_L: number;
  fuel_type: string;
  base_fuel_rate_L_per_100km: number;
  loaded_fuel_rate_L_per_100km: number;
  max_speed_kmh: number;
  optimal_speed_kmh: number;
  drag_coefficient: number;
  frontal_area_m2: number;
  rolling_resistance: number;
  drivetrain_efficiency: number;
  fuel_cost_per_litre_INR: number;
  toll_class: string;
  co2_emission_factor_kg_per_L: number;
  refrigeration_fuel_overhead_pct?: number;
}

export interface OptimizationLeg {
  from_idx: number;
  to_idx: number;
  distance_km: number;
  time_mins: number;
  fuel_litres: number;
  co2_kg: number;
}

export interface OptimizationResult {
  optimized_order: number[];
  optimized_waypoint_names: string[];
  total_distance_km: number;
  total_time_mins: number;
  total_fuel_L: number;
  total_co2_kg: number;
  total_cost_inr: number;
  fuel_rate_L_per_100km: number;
  efficiency_score: number;
  legs: OptimizationLeg[];
  generations_run: number;
  improvement_pct: number;
  truck_type: string;
  payload_tonnes: number;
  optimization_mode: OptimizationMode;
  // Original route comparison
  original_distance_km: number;
  original_time_mins: number;
  original_fuel_L: number;
  original_co2_kg: number;
  original_cost_inr: number;
  fuel_saved_L: number;
  time_saved_mins: number;
  cost_saved_inr: number;
}
