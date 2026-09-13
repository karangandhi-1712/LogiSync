import axios from 'axios';
import type { City, Waypoint, RouteResult, TrafficIncident, Truck, Container, Shipment, TelemetryStats } from '../types/logistics';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const PRESET_CITIES: City[] = [
  {
    id: 'thoothukudi',
    name: 'Thoothukudi MMLP & VOC Port',
    state: 'Tamil Nadu',
    country: 'India',
    center: [78.1348, 8.7642],
    zoom: 13,
    bbox: [78.08, 8.71, 78.20, 8.82],
    description: 'V.O. Chidambaranar Port & Multimodal Logistics Park corridor',
    type: 'mmlp',
    defaultWaypoints: [
      { label: 'A', name: 'VOC Port Terminal Gate 1', coordinates: [78.1750, 8.7520], role: 'origin' },
      { label: 'B', name: 'MMLP Inbound Container Yard', coordinates: [78.1460, 8.7630], role: 'crossdock' },
      { label: 'C', name: 'Cold Storage & Agro Warehouse C3', coordinates: [78.1320, 8.7710], role: 'checkpoint' },
      { label: 'D', name: 'Customs Clearance & Weighbridge #4', coordinates: [78.1250, 8.7850], role: 'customs' },
      { label: 'E', name: 'NH-38 National Freight Highway Interchange', coordinates: [78.0980, 8.7980], role: 'destination' }
    ]
  },
  {
    id: 'chennai',
    name: 'Chennai Port & Sriperumbudur MMLP',
    state: 'Tamil Nadu',
    country: 'India',
    center: [80.2450, 13.0650],
    zoom: 12,
    bbox: [80.15, 12.95, 80.32, 13.15],
    description: 'Automotive & Electronics industrial multimodal freight expressway',
    type: 'mmlp',
    defaultWaypoints: [
      { label: 'A', name: 'Chennai Port Container Terminal', coordinates: [80.2980, 13.0920], role: 'origin' },
      { label: 'B', name: 'Ennore High Road Freight Junction', coordinates: [80.2750, 13.1150], role: 'checkpoint' },
      { label: 'C', name: 'Sriperumbudur Auto Logistics Hub', coordinates: [79.9450, 12.9680], role: 'crossdock' },
      { label: 'D', name: 'Oragadam Mega Industrial Park', coordinates: [79.9120, 12.8350], role: 'destination' }
    ]
  },
  {
    id: 'mumbai',
    name: 'JNPT / Navi Mumbai Multi-Modal Hub',
    state: 'Maharashtra',
    country: 'India',
    center: [72.9780, 18.9550],
    zoom: 12,
    bbox: [72.85, 18.85, 73.10, 19.10],
    description: "India's premier container transshipment and freight corridor",
    type: 'port',
    defaultWaypoints: [
      { label: 'A', name: 'JNPT Main Gate & Rail Yard', coordinates: [72.9510, 18.9480], role: 'origin' },
      { label: 'B', name: 'Uran Container Freight Station', coordinates: [72.9730, 18.9220], role: 'checkpoint' },
      { label: 'C', name: 'Dronagiri Logistics Park Zone 2', coordinates: [72.9850, 18.9680], role: 'crossdock' },
      { label: 'D', name: 'Taloja MIDC Freight Terminal', coordinates: [73.0950, 19.0850], role: 'destination' }
    ]
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru ICD Whitefield & Logistics Park',
    state: 'Karnataka',
    country: 'India',
    center: [77.7200, 12.9800],
    zoom: 12,
    bbox: [77.55, 12.85, 77.85, 13.10],
    description: 'Inland Container Depot (ICD) connecting Southern rail and highway corridors',
    type: 'icd',
    defaultWaypoints: [
      { label: 'A', name: 'Whitefield Inland Container Depot (ICD)', coordinates: [77.7480, 12.9890], role: 'origin' },
      { label: 'B', name: 'Hosakote Industrial Cross-Dock Hub', coordinates: [77.7950, 13.0720], role: 'crossdock' },
      { label: 'C', name: 'Devanahalli Airport Cargo Gateway', coordinates: [77.7120, 13.2050], role: 'destination' }
    ]
  },
  {
    id: 'delhi',
    name: 'Delhi NCR Multimodal Hub / Dadri ICD',
    state: 'Delhi NCR',
    country: 'India',
    center: [77.5200, 28.5200],
    zoom: 11,
    bbox: [77.30, 28.30, 77.75, 28.75],
    description: 'Western Dedicated Freight Corridor (WDFC) nexus and mega logistics hub',
    type: 'icd',
    defaultWaypoints: [
      { label: 'A', name: 'Dadri Integrated Logistics Hub', coordinates: [77.5580, 28.5450], role: 'origin' },
      { label: 'B', name: 'Greater Noida Eastern Peripheral Expressway', coordinates: [77.5020, 28.4680], role: 'checkpoint' },
      { label: 'C', name: 'Tughlakabad Inland Container Depot', coordinates: [77.2910, 28.5120], role: 'destination' }
    ]
  },
  {
    id: 'mundra',
    name: 'Mundra Port & Special Economic Zone',
    state: 'Gujarat',
    country: 'India',
    center: [69.7200, 22.8400],
    zoom: 12,
    bbox: [69.60, 22.75, 69.85, 22.95],
    description: "Largest private commercial port & multi-product SEZ",
    type: 'port',
    defaultWaypoints: [
      { label: 'A', name: 'Mundra Container Terminal 4', coordinates: [69.7050, 22.8120], role: 'origin' },
      { label: 'B', name: 'Adani Logistics Park Yard B', coordinates: [69.7350, 22.8480], role: 'crossdock' },
      { label: 'C', name: 'Mundra-Barmer Rail Freight Siding', coordinates: [69.7620, 22.8950], role: 'destination' }
    ]
  }
];

export async function fetchCities(): Promise<City[]> {
  try {
    const res = await axios.get(`${BACKEND_URL}/api/cities`, { timeout: 3000 });
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('Backend cities API offline, using high-speed embedded presets:', err);
  }
  return PRESET_CITIES;
}

export async function searchLocations(query: string, cityBBox?: [number, number, number, number]): Promise<Array<{
  name: string;
  city: string;
  country: string;
  coordinates: [number, number];
}>> {
  if (!query || query.trim().length < 2) return [];

  // 1. Try Backend Geocoder Proxy
  try {
    const bboxParam = cityBBox ? `&bbox=${cityBBox.join(',')}` : '';
    const res = await axios.get(`${BACKEND_URL}/api/geocode?q=${encodeURIComponent(query)}${bboxParam}`, { timeout: 3000 });
    if (res.data && res.data.length > 0) {
      return res.data;
    }
  } catch {
    // fallback to direct Photon API
  }

  // 2. Direct Photon API (No API key required, fast OSM geocoder)
  try {
    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`;
    if (cityBBox) {
      const [minLon, minLat, maxLon, maxLat] = cityBBox;
      const lon = (minLon + maxLon) / 2;
      const lat = (minLat + maxLat) / 2;
      url += `&lat=${lat}&lon=${lon}`;
    }
    const res = await axios.get(url, { timeout: 4000 });
    if (res.data?.features) {
      return res.data.features.map((f: any) => ({
        name: f.properties.name || f.properties.street || query,
        city: f.properties.city || f.properties.state || f.properties.district || '',
        country: f.properties.country || '',
        coordinates: f.geometry.coordinates as [number, number]
      }));
    }
  } catch (e) {
    console.error('Geocoding error:', e);
  }

  return [];
}

export async function calculateMultiPointRoute(
  waypoints: Waypoint[],
  avoidIncidents: TrafficIncident[] = []
): Promise<RouteResult> {
  if (waypoints.length < 2) {
    throw new Error('At least 2 waypoints (Origin and Destination) are required');
  }

  // Coordinates string format: "lon1,lat1;lon2,lat2;lon3,lat3"
  const coordsParam = waypoints.map(w => `${w.coordinates[0].toFixed(6)},${w.coordinates[1].toFixed(6)}`).join(';');

  // Call OSRM public API or backend
  let routeData: any = null;
  try {
    const backendRes = await axios.post(`${BACKEND_URL}/api/route`, {
      coordinates: waypoints.map(w => w.coordinates),
      avoidRoadblocks: avoidIncidents.map(i => i.coordinates)
    }, { timeout: 4000 });
    routeData = backendRes.data;
  } catch {
    // Fallback directly to OSRM demo server
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson&steps=true&annotations=distance,duration`;
    const res = await axios.get(osrmUrl, { timeout: 6000 });
    if (res.data?.routes?.length > 0) {
      const route = res.data.routes[0];
      routeData = {
        coordinates: route.geometry.coordinates,
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        legs: route.legs.map((leg: any, i: number) => ({
          distance: leg.distance,
          duration: leg.duration,
          summary: leg.summary || `Stop ${waypoints[i]?.label || i + 1} to ${waypoints[i + 1]?.label || i + 2}`,
          steps: (leg.steps || []).map((s: any) => ({
            instruction: s.maneuver?.type ? `${s.maneuver.type} ${s.maneuver.modifier || ''} onto ${s.name || 'road'}` : s.name || 'Proceed',
            distance: s.distance,
            duration: s.duration,
            name: s.name || 'Main Road'
          }))
        }))
      };
    }
  }

  if (!routeData) {
    // Synthetic straight-line interpolation fallback if network is constrained
    const straightCoords: [number, number][] = [];
    let totalDist = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i].coordinates;
      const p2 = waypoints[i + 1].coordinates;
      const steps = 20;
      for (let s = 0; s <= steps; s++) {
        straightCoords.push([
          p1[0] + (p2[0] - p1[0]) * (s / steps),
          p1[1] + (p2[1] - p1[1]) * (s / steps)
        ]);
      }
      const dx = (p2[0] - p1[0]) * 111.32;
      const dy = (p2[1] - p1[1]) * 110.57;
      totalDist += Math.sqrt(dx * dx + dy * dy) * 1000;
    }
    routeData = {
      coordinates: straightCoords,
      distanceMeters: totalDist,
      durationSeconds: (totalDist / 12) * 1.5, // ~45 km/h
      legs: []
    };
  }

  const distKm = +(routeData.distanceMeters / 1000).toFixed(2);
  const freeFlowMins = Math.max(1, Math.round(routeData.durationSeconds / 60));

  // Calculate realistic traffic delays based on route incidents
  let trafficDelayMins = 0;
  let hasCriticalBlock = false;

  for (const inc of avoidIncidents) {
    if (inc.isBlockingRoute) {
      hasCriticalBlock = true;
      trafficDelayMins += inc.delayMins;
    }
  }

  // Add realistic baseline peak delay factor (~12-18%)
  const baselineDelay = Math.round(freeFlowMins * 0.15);
  trafficDelayMins += baselineDelay;

  return {
    coordinates: routeData.coordinates,
    totalDistanceKm: distKm,
    totalDurationMins: freeFlowMins + trafficDelayMins,
    freeFlowDurationMins: freeFlowMins,
    trafficDelayMins,
    legs: routeData.legs || [],
    status: hasCriticalBlock ? 'blocked' : avoidIncidents.length > 0 ? 'rerouted' : 'optimal'
  };
}

export async function fetchCityIncidents(city: City): Promise<TrafficIncident[]> {
  try {
    const res = await axios.get(`${BACKEND_URL}/api/traffic/incidents?city=${city.id}`, { timeout: 3000 });
    if (res.data?.incidents) {
      return res.data.incidents;
    }
  } catch {
    // Fallback to generated high-fidelity realistic incidents tailored to the city's center & ports
  }

  const [lon, lat] = city.center;
  return [
    {
      id: `${city.id}-rb-1`,
      title: 'Major Culvert & Flyover Road Construction',
      type: 'roadblock',
      severity: 'critical',
      coordinates: [lon + 0.012, lat - 0.006],
      roadName: 'Port Access Arterial Road / Freight Bypass',
      description: 'Full lane closure due to crane installation and stormwater culvert overhaul. Detour recommended.',
      delayMins: 24,
      isBlockingRoute: true
    },
    {
      id: `${city.id}-cg-2`,
      title: 'Heavy Peak Container Truck Congestion',
      type: 'congestion',
      severity: 'moderate',
      coordinates: [lon - 0.015, lat + 0.014],
      roadName: 'Inbound Freight Corridor Express',
      description: 'Slow-moving queue approaching customs gate. Average speed reduced to 12 km/h.',
      delayMins: 14,
      isBlockingRoute: false
    },
    {
      id: `${city.id}-cs-3`,
      title: 'Road Pavement Resurfacing & Barrier Works',
      type: 'construction',
      severity: 'moderate',
      coordinates: [lon + 0.022, lat + 0.018],
      roadName: 'Logistics Park Ring Road North',
      description: 'Single lane open with flaggers. Expect minor queuing during heavy truck dispatch hours.',
      delayMins: 8,
      isBlockingRoute: false
    },
    {
      id: `${city.id}-ac-4`,
      title: 'Disabled Heavy Trailer Incident',
      type: 'accident',
      severity: 'critical',
      coordinates: [lon - 0.008, lat - 0.012],
      roadName: 'National Highway Freight Link #38',
      description: 'Mechanical breakdown blocking right lane. Recovery vehicle on site.',
      delayMins: 18,
      isBlockingRoute: false
    }
  ];
}

export interface CityGisLayers {
  warehouses: any;
  yards: any;
  gates: any;
  roads: any;
}

export async function fetchCityGisLayers(cityId: string): Promise<CityGisLayers> {
  try {
    const res = await axios.get(`${BACKEND_URL}/api/gis/layers?city=${cityId}`, { timeout: 4000 });
    if (res.data) {
      return {
        warehouses: res.data.warehouses || { type: 'FeatureCollection', features: [] },
        yards: res.data.yards || { type: 'FeatureCollection', features: [] },
        gates: res.data.gates || { type: 'FeatureCollection', features: [] },
        roads: res.data.roads || { type: 'FeatureCollection', features: [] }
      };
    }
  } catch (err) {
    console.warn(`Could not load GIS layers for ${cityId}:`, err);
  }
  return {
    warehouses: { type: 'FeatureCollection', features: [] },
    yards: { type: 'FeatureCollection', features: [] },
    gates: { type: 'FeatureCollection', features: [] },
    roads: { type: 'FeatureCollection', features: [] }
  };
}

// ==================== PHASE 3 OPERATIONAL ENTITIES API ====================

// Trucks CRUD
export async function fetchTrucks(cityId: string, status?: string): Promise<Truck[]> {
  try {
    const statusParam = status ? `&status=${status}` : '';
    const res = await axios.get(`${BACKEND_URL}/api/trucks?city=${cityId}${statusParam}`, { timeout: 3000 });
    return res.data || [];
  } catch (err) {
    console.warn(`Error fetching trucks for ${cityId}:`, err);
    return [];
  }
}

export async function createTruck(payload: Partial<Truck>): Promise<Truck> {
  const res = await axios.post(`${BACKEND_URL}/api/trucks`, payload);
  return res.data;
}

export async function updateTruck(truckId: string, payload: Partial<Truck>): Promise<Truck> {
  const res = await axios.put(`${BACKEND_URL}/api/trucks/${truckId}`, payload);
  return res.data;
}

export async function deleteTruck(truckId: string): Promise<void> {
  await axios.delete(`${BACKEND_URL}/api/trucks/${truckId}`);
}

// Containers CRUD
export async function fetchContainers(cityId: string, customsStatus?: string): Promise<Container[]> {
  try {
    const filterParam = customsStatus ? `&customs_status=${customsStatus}` : '';
    const res = await axios.get(`${BACKEND_URL}/api/containers?city=${cityId}${filterParam}`, { timeout: 3000 });
    return res.data || [];
  } catch (err) {
    console.warn(`Error fetching containers for ${cityId}:`, err);
    return [];
  }
}

export async function createContainer(payload: Partial<Container>): Promise<Container> {
  const res = await axios.post(`${BACKEND_URL}/api/containers`, payload);
  return res.data;
}

export async function updateContainer(containerId: string, payload: Partial<Container>): Promise<Container> {
  const res = await axios.put(`${BACKEND_URL}/api/containers/${containerId}`, payload);
  return res.data;
}

export async function deleteContainer(containerId: string): Promise<void> {
  await axios.delete(`${BACKEND_URL}/api/containers/${containerId}`);
}

// Shipments CRUD
export async function fetchShipments(cityId: string, status?: string): Promise<Shipment[]> {
  try {
    const filterParam = status ? `&status=${status}` : '';
    const res = await axios.get(`${BACKEND_URL}/api/shipments?city=${cityId}${filterParam}`, { timeout: 3000 });
    return res.data || [];
  } catch (err) {
    console.warn(`Error fetching shipments for ${cityId}:`, err);
    return [];
  }
}

export async function createShipment(payload: Partial<Shipment>): Promise<Shipment> {
  const res = await axios.post(`${BACKEND_URL}/api/shipments`, payload);
  return res.data;
}

export async function updateShipment(shipmentId: string, payload: Partial<Shipment>): Promise<Shipment> {
  const res = await axios.put(`${BACKEND_URL}/api/shipments/${shipmentId}`, payload);
  return res.data;
}

export async function deleteShipment(shipmentId: string): Promise<void> {
  await axios.delete(`${BACKEND_URL}/api/shipments/${shipmentId}`);
}

// Telemetry & MQTT Simulation
export async function triggerTelemetryTick(cityId: string): Promise<any> {
  try {
    const res = await axios.post(`${BACKEND_URL}/api/telemetry/simulate-tick?city=${cityId}`);
    return res.data;
  } catch (err) {
    console.warn('Error simulating telemetry tick:', err);
    return null;
  }
}

export async function fetchTelemetryStats(): Promise<TelemetryStats | null> {
  try {
    const res = await axios.get(`${BACKEND_URL}/api/telemetry/stats`, { timeout: 2500 });
    return res.data;
  } catch {
    return null;
  }
}

export async function publishMqttMessage(topic: string, payload: Record<string, any>): Promise<any> {
  const res = await axios.post(`${BACKEND_URL}/api/telemetry/mqtt-publish`, { topic, payload });
  return res.data;
}

export function createTelemetryWebSocket(
  cityId: string,
  onPacket: (data: any) => void
): { socket: WebSocket | null; close: () => void } {
  try {
    const wsUrl = BACKEND_URL.replace(/^http/, 'ws') + `/ws/telemetry?city=${cityId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`[LogiSync] Connected to MQTT Telemetry WebSocket bridge (${cityId})`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onPacket(data);
      } catch (err) {
        console.error('Error parsing telemetry WebSocket packet:', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('[LogiSync] Telemetry WebSocket notice:', err);
    };

    return {
      socket: ws,
      close: () => {
        try {
          ws.close();
        } catch {}
      }
    };
  } catch {
    return { socket: null, close: () => {} };
  }
}

