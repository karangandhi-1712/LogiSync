import { useEffect, useState, useRef, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Route,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Radio,
  Truck as TruckIcon
} from 'lucide-react';

import type { City, Waypoint, RouteResult, TrafficIncident, SimulationState, Truck } from './types/logistics';
import { PRESET_CITIES, calculateMultiPointRoute, fetchCityIncidents, fetchCityGisLayers, fetchTrucks, createTelemetryWebSocket } from './services/api';
import { CitySelector } from './components/CitySelector';
import { WaypointManager } from './components/WaypointManager';
import { TrafficRoadblocksPanel } from './components/TrafficRoadblocksPanel';
import { TripSimulator } from './components/TripSimulator';
import { KPIStatsHeader } from './components/KPIStatsHeader';
import { FacilityInspector, type SelectedFacility } from './components/FacilityInspector';
import { TruckInspector } from './components/TruckInspector';
import { OperationsPanel } from './components/OperationsPanel';

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  // Markers references
  const waypointMarkersRef = useRef<maplibregl.Marker[]>([]);
  const incidentMarkersRef = useRef<maplibregl.Marker[]>([]);
  const truckMarkerRef = useRef<maplibregl.Marker | null>(null);
  const operationalTruckMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  // Core State
  const [selectedCity, setSelectedCity] = useState<City>(PRESET_CITIES[0]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(
    (PRESET_CITIES[0].defaultWaypoints || []).map((w, idx) => ({ ...w, id: `wp-${idx}` }))
  );
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [showTrafficLayer, setShowTrafficLayer] = useState(true);
  const [showGisLayers, setShowGisLayers] = useState(true);
  const [isRerouted, setIsRerouted] = useState(false);
  const [activeMapPickStopId, setActiveMapPickStopId] = useState<string | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<SelectedFacility | null>(null);

  // Phase 3: Operational Fleet & Telemetry State
  const [operationalTrucks, setOperationalTrucks] = useState<Truck[]>([]);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [isOperationsOpen, setIsOperationsOpen] = useState(false);
  const [telemetryConnected, setTelemetryConnected] = useState(true);
  const [telemetryPacketsCount, setTelemetryPacketsCount] = useState(0);

  // UI Tabs & Panels
  const [activeSidebarTab, setActiveSidebarTab] = useState<'waypoints' | 'traffic'>('waypoints');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);


  // Simulation State
  const [simulation, setSimulation] = useState<SimulationState>({
    isPlaying: false,
    progress: 0,
    playbackSpeed: 2,
    currentCoord: PRESET_CITIES[0].center,
    currentHeading: 0,
    currentSpeedKmH: 45,
    currentLegIndex: 0
  });

  const animFrameRef = useRef<number | null>(null);

  // 1. Initialize MapLibre GL
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: selectedCity.center,
      zoom: selectedCity.zoom,
      pitch: 35,
      bearing: -10,
    });

    m.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    m.on('load', async () => {
      // Add empty route source & layers
      m.addSource('route-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] }
        }
      });

      // Route Glow Outline
      m.addLayer({
        id: 'route-line-glow',
        type: 'line',
        source: 'route-line',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#00f2fe',
          'line-width': 9,
          'line-opacity': 0.35,
          'line-blur': 4
        }
      });

      // Route Main Line
      m.addLayer({
        id: 'route-line-main',
        type: 'line',
        source: 'route-line',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#00f2fe',
          'line-width': 4.5,
          'line-opacity': 0.95
        }
      });

      // Initialize GIS sources
      m.addSource('gis-warehouses', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('gis-yards', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('gis-gates', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

      // GIS Layers
      m.addLayer({
        id: 'gis-warehouses-fill',
        type: 'fill',
        source: 'gis-warehouses',
        paint: { 'fill-color': '#10b981', 'fill-opacity': 0.28 }
      });
      m.addLayer({
        id: 'gis-warehouses-line',
        type: 'line',
        source: 'gis-warehouses',
        paint: { 'line-color': '#10b981', 'line-width': 1.5 }
      });

      m.addLayer({
        id: 'gis-yards-fill',
        type: 'fill',
        source: 'gis-yards',
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.28 }
      });
      m.addLayer({
        id: 'gis-yards-line',
        type: 'line',
        source: 'gis-yards',
        paint: { 'line-color': '#3b82f6', 'line-width': 1.5 }
      });

      m.addLayer({
        id: 'gis-gates-circle',
        type: 'circle',
        source: 'gis-gates',
        paint: {
          'circle-color': '#a855f7',
          'circle-radius': 6.5,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Interactive Click Listeners for GIS Features (Phase 2 Facility Inspector)
      m.on('click', 'gis-warehouses-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const f = e.features[0];
          const props = f.properties || {};
          setSelectedFacility({
            id: props.id || 'wh-1',
            type: 'warehouse',
            name: props.name || 'Industrial Warehouse',
            coordinates: [e.lngLat.lng, e.lngLat.lat],
            areaSqm: props.area_sqm,
            capacity: props.capacity_pallets_estimated,
            capacityLabel: 'Estimated Pallets',
            occupancyPct: props.occupancy_pct_simulated,
            dataSource: props.data_source || 'OpenStreetMap Authentic Geometry',
            operationalStatus: props.operational_metrics || 'SIMULATED'
          });
        }
      });

      m.on('click', 'gis-yards-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const f = e.features[0];
          const props = f.properties || {};
          setSelectedFacility({
            id: props.id || 'yd-1',
            type: 'yard',
            name: props.name || 'Container Storage Yard',
            coordinates: [e.lngLat.lng, e.lngLat.lat],
            areaSqm: props.area_sqm,
            capacity: props.slots_total_estimated,
            capacityLabel: 'Estimated TEU Slots',
            occupancyPct: props.occupancy_pct_simulated,
            dataSource: props.data_source || 'OpenStreetMap Authentic Geometry',
            operationalStatus: props.operational_metrics || 'SIMULATED'
          });
        }
      });

      m.on('click', 'gis-gates-circle', (e) => {
        if (e.features && e.features.length > 0) {
          const f = e.features[0];
          const props = f.properties || {};
          setSelectedFacility({
            id: props.id || 'gt-1',
            type: 'gate',
            name: props.name || 'Access Gate',
            coordinates: [e.lngLat.lng, e.lngLat.lat],
            lanes: props.lanes || 4,
            hasAnpr: props.has_anpr,
            hasRfid: props.has_rfid,
            hasWeighbridge: props.has_weighbridge,
            dataSource: props.data_source || 'OpenStreetMap Authentic Geometry',
            operationalStatus: props.operational_metrics || 'SIMULATED'
          });
        }
      });

      // Cursor pointer effects
      ['gis-warehouses-fill', 'gis-yards-fill', 'gis-gates-circle'].forEach((layerId) => {
        m.on('mouseenter', layerId, () => {
          m.getCanvas().style.cursor = 'pointer';
        });
        m.on('mouseleave', layerId, () => {
          m.getCanvas().style.cursor = '';
        });
      });

      // Load initial city GIS layers
      loadCityGisLayers(m, selectedCity.id);
    });

    // Map Click Handler for Map-Pick Mode
    m.on('click', (e) => {
      if (!activeMapPickStopIdRef.current) return;
      const clickedCoord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      handleMapPickCoordinate(activeMapPickStopIdRef.current, clickedCoord);
    });

    map.current = m;

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Ref to track activeMapPickStopId inside map click callback
  const activeMapPickStopIdRef = useRef<string | null>(null);
  activeMapPickStopIdRef.current = activeMapPickStopId;

  // Load GIS layers dynamically for any city
  const loadCityGisLayers = async (m: maplibregl.Map, cityId: string) => {
    try {
      const layers = await fetchCityGisLayers(cityId);

      const whSrc = m.getSource('gis-warehouses') as maplibregl.GeoJSONSource;
      if (whSrc && layers.warehouses) {
        whSrc.setData(layers.warehouses);
      }

      const ydSrc = m.getSource('gis-yards') as maplibregl.GeoJSONSource;
      if (ydSrc && layers.yards) {
        ydSrc.setData(layers.yards);
      }

      const gtSrc = m.getSource('gis-gates') as maplibregl.GeoJSONSource;
      if (gtSrc && layers.gates) {
        gtSrc.setData(layers.gates);
      }
    } catch (err) {
      console.error('Error loading city GIS layers:', err);
    }
  };

  // 2. Fetch Incidents whenever City Changes
  useEffect(() => {
    let isMounted = true;
    fetchCityIncidents(selectedCity).then((inc) => {
      if (isMounted) setIncidents(inc);
    });
    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  // 3. Handle City Selection
  const handleSelectCity = (city: City) => {
    setSelectedCity(city);
    setIsRerouted(false);
    setSelectedFacility(null);

    // Fly camera smoothly to new city
    if (map.current) {
      map.current.flyTo({
        center: city.center,
        zoom: city.zoom,
        pitch: 35,
        essential: true,
        duration: 2200
      });
      loadCityGisLayers(map.current, city.id);
    }

    // Update waypoints to city's default
    const newWaypoints = (city.defaultWaypoints || []).map((w, idx) => ({
      ...w,
      id: `wp-${city.id}-${idx}`
    }));
    setWaypoints(newWaypoints);

    // Reset simulation
    setSimulation((prev) => ({
      ...prev,
      isPlaying: false,
      progress: 0,
      currentCoord: newWaypoints[0]?.coordinates || city.center
    }));
  };

  // 4. Calculate Route
  const handleCalculateRoute = useCallback(async (customAvoids?: TrafficIncident[]) => {
    if (waypoints.length < 2) return;
    setIsCalculatingRoute(true);

    const avoidsToUse = customAvoids !== undefined ? customAvoids : isRerouted ? incidents.filter(i => i.type === 'roadblock') : [];

    try {
      const res = await calculateMultiPointRoute(waypoints, avoidsToUse);
      setRouteResult(res);

      // Update map GeoJSON source
      if (map.current && map.current.isStyleLoaded()) {
        const src = map.current.getSource('route-line') as maplibregl.GeoJSONSource;
        if (src) {
          src.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: res.coordinates
            }
          });

          const color = res.status === 'blocked' ? '#f43f5e' : res.status === 'rerouted' ? '#10b981' : '#00f2fe';
          map.current.setPaintProperty('route-line-main', 'line-color', color);
          map.current.setPaintProperty('route-line-glow', 'line-color', color);
        }

        const bounds = new maplibregl.LngLatBounds();
        waypoints.forEach(w => bounds.extend(w.coordinates));
        res.coordinates.forEach(c => bounds.extend(c as [number, number]));
        map.current.fitBounds(bounds, { padding: { top: 90, bottom: 120, left: 340, right: 80 }, maxZoom: 14, duration: 1500 });
      }

      if (res.coordinates.length > 0) {
        setSimulation(prev => ({
          ...prev,
          progress: 0,
          currentCoord: res.coordinates[0],
          currentHeading: 0,
          currentLegIndex: 0
        }));
      }
    } catch (err) {
      console.error('Route calculation failed:', err);
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [waypoints, isRerouted, incidents]);

  // Recalculate route whenever waypoints change
  useEffect(() => {
    handleCalculateRoute();
  }, [waypoints]);

  // 5. Smart Detour Action
  const handleAutoDetour = () => {
    const nextRerouted = !isRerouted;
    setIsRerouted(nextRerouted);
    const avoids = nextRerouted ? incidents.filter(i => i.type === 'roadblock' || i.isBlockingRoute) : [];
    handleCalculateRoute(avoids);
  };

  // 6. Map-Pick Stop Coordinate Assignment
  const handleMapPickCoordinate = (stopId: string, coords: [number, number]) => {
    const updated = waypoints.map(w => {
      if (w.id === stopId) {
        return { ...w, coordinates: coords };
      }
      return w;
    });
    setWaypoints(updated);
    setActiveMapPickStopId(null);
  };

  // 7. Add Facility as Waypoint Stop from Inspector
  const handleAddFacilityToRoute = (facility: SelectedFacility) => {
    const nextIdx = waypoints.length;
    const nextLabel = String.fromCharCode(65 + nextIdx);
    const newWp: Waypoint = {
      id: `wp-facility-${Date.now()}`,
      label: nextLabel,
      name: facility.name,
      coordinates: facility.coordinates,
      role: facility.type === 'warehouse' ? 'checkpoint' : facility.type === 'yard' ? 'crossdock' : 'customs'
    };
    setWaypoints(prev => [...prev, newWp]);
    setSelectedFacility(null);
  };

  // 8. Render Custom DOM Markers on MapLibre (Waypoints & Roadblocks)
  useEffect(() => {
    if (!map.current) return;
    const m = map.current;

    waypointMarkersRef.current.forEach(marker => marker.remove());
    waypointMarkersRef.current = [];

    waypoints.forEach((wp, idx) => {
      const el = document.createElement('div');
      el.className = 'custom-waypoint-marker flex flex-col items-center group';

      const isOrigin = idx === 0;
      const isDest = idx === waypoints.length - 1;
      const badgeBg = isOrigin ? '#10b981' : isDest ? '#f43f5e' : '#00f2fe';

      el.innerHTML = `
        <div style="background-color: ${badgeBg}; box-shadow: 0 0 15px ${badgeBg};" class="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-black font-extrabold text-xs font-mono shadow-xl relative">
          <span>${wp.label}</span>
          <div class="absolute -inset-1 rounded-full border border-white/50 animate-pulse-ring pointer-events-none"></div>
        </div>
        <div class="mt-1 px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-md border border-white/20 text-[10px] text-white font-medium whitespace-nowrap shadow-lg">
          ${wp.name.slice(0, 18)}
        </div>
      `;

      el.addEventListener('click', () => {
        setActiveSidebarTab('waypoints');
        setIsSidebarOpen(true);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(wp.coordinates)
        .addTo(m);

      waypointMarkersRef.current.push(marker);
    });

    incidentMarkersRef.current.forEach(marker => marker.remove());
    incidentMarkersRef.current = [];

    if (showTrafficLayer) {
      incidents.forEach(inc => {
        const el = document.createElement('div');
        const isBlock = inc.type === 'roadblock';
        const color = isBlock ? '#f43f5e' : '#f59e0b';

        el.className = 'cursor-pointer flex flex-col items-center group -translate-y-1/2';
        el.innerHTML = `
          <div style="background: rgba(15, 23, 42, 0.9); border: 2px solid ${color}; box-shadow: 0 0 14px ${color}80;" class="p-1.5 rounded-xl text-white shadow-xl relative">
            <span style="color: ${color}; font-size: 14px;">${isBlock ? '⛔' : '⚠️'}</span>
            ${isBlock ? `<div style="border-color: ${color};" class="absolute -inset-1.5 rounded-xl border animate-ping pointer-events-none opacity-40"></div>` : ''}
          </div>
          <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1.5 px-2.5 py-1 rounded-lg bg-black/90 text-[10px] text-white whitespace-nowrap border border-white/20 shadow-2xl pointer-events-none z-50">
            <strong style="color: ${color};">${inc.title}</strong>
            <div class="text-slate-400">${inc.roadName || ''} (+${inc.delayMins}m)</div>
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(inc.coordinates)
          .addTo(m);

        incidentMarkersRef.current.push(marker);
      });
    }
  }, [waypoints, incidents, showTrafficLayer]);

  // 9. Vehicle Simulation Loop & Moving Truck Marker
  useEffect(() => {
    if (!map.current) return;
    const m = map.current;

    if (!truckMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'w-9 h-9 rounded-full bg-cyan-400 text-black border-2 border-white shadow-[0_0_20px_#00f2fe] flex items-center justify-center font-bold text-sm -translate-x-1/2 -translate-y-1/2 z-40 transition-transform duration-75';
      el.innerHTML = `🚚`;

      truckMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(simulation.currentCoord)
        .addTo(m);
    } else {
      truckMarkerRef.current.setLngLat(simulation.currentCoord);
    }
  }, [simulation.currentCoord]);

  useEffect(() => {
    if (!simulation.isPlaying || !routeResult || routeResult.coordinates.length < 2) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      const progressDelta = (delta / 35) * simulation.playbackSpeed;

      setSimulation(prev => {
        let newProgress = prev.progress + progressDelta;
        if (newProgress >= 1) {
          newProgress = 1;
        }

        const coords = routeResult.coordinates;
        const totalPoints = coords.length;
        const floatIndex = newProgress * (totalPoints - 1);
        const lowIndex = Math.min(Math.floor(floatIndex), totalPoints - 2);
        const ratio = floatIndex - lowIndex;

        const p1 = coords[lowIndex];
        const p2 = coords[lowIndex + 1] || p1;

        const currentLon = p1[0] + (p2[0] - p1[0]) * ratio;
        const currentLat = p1[1] + (p2[1] - p1[1]) * ratio;

        const legIdx = Math.min(
          Math.floor(newProgress * (waypoints.length - 1)),
          waypoints.length - 2
        );

        const speed = isRerouted ? 52 : prev.currentSpeedKmH;

        if (newProgress >= 1) {
          return {
            ...prev,
            isPlaying: false,
            progress: 1,
            currentCoord: coords[coords.length - 1]
          };
        }

        return {
          ...prev,
          progress: newProgress,
          currentCoord: [currentLon, currentLat],
          currentLegIndex: Math.max(0, legIdx),
          currentSpeedKmH: speed
        };
      });

      if (simulation.progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [simulation.isPlaying, simulation.playbackSpeed, routeResult, isRerouted, waypoints.length]);

  const handleSeekSimulation = (newProgress: number) => {
    if (!routeResult || routeResult.coordinates.length === 0) return;
    const coords = routeResult.coordinates;
    const floatIndex = newProgress * (coords.length - 1);
    const lowIndex = Math.min(Math.floor(floatIndex), coords.length - 2);
    const ratio = floatIndex - lowIndex;
    const p1 = coords[lowIndex];
    const p2 = coords[lowIndex + 1] || p1;

    setSimulation(prev => ({
      ...prev,
      progress: newProgress,
      currentCoord: [p1[0] + (p2[0] - p1[0]) * ratio, p1[1] + (p2[1] - p1[1]) * ratio]
    }));
  };

  // Toggle GIS Layer visibility
  const handleToggleGisLayers = () => {
    const next = !showGisLayers;
    setShowGisLayers(next);
    if (map.current) {
      const visibility = next ? 'visible' : 'none';
      ['gis-warehouses-fill', 'gis-warehouses-line', 'gis-yards-fill', 'gis-yards-line', 'gis-gates-circle'].forEach(id => {
        if (map.current?.getLayer(id)) {
          map.current.setLayoutProperty(id, 'visibility', visibility);
        }
      });
    }
  };

  // ==================== PHASE 3: Fleet Truck Loading ====================
  const loadOperationalTrucks = useCallback(async () => {
    try {
      const trucks = await fetchTrucks(selectedCity.id);
      setOperationalTrucks(trucks);
    } catch (err) {
      console.error('Error loading operational trucks:', err);
    }
  }, [selectedCity.id]);

  useEffect(() => {
    loadOperationalTrucks();
    setSelectedTruck(null);
  }, [selectedCity.id, loadOperationalTrucks]);

  // ==================== PHASE 3: WebSocket Telemetry Connection ====================
  useEffect(() => {
    const conn = createTelemetryWebSocket(selectedCity.id, (data) => {
      if (data.type === 'tick_batch' && Array.isArray(data.updates)) {
        setOperationalTrucks(prev => {
          const updated = [...prev];
          for (const upd of data.updates) {
            const idx = updated.findIndex(t => t.id === upd.id);
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], ...upd };
            }
          }
          return updated;
        });
        setTelemetryPacketsCount(prev => prev + data.updates.length);
      } else if (data.type === 'telemetry_update' && data.truck_id) {
        setOperationalTrucks(prev =>
          prev.map(t => t.id === data.truck_id ? { ...t, ...data } : t)
        );
        setTelemetryPacketsCount(prev => prev + 1);
      }
    });

    if (conn.socket) {
      conn.socket.onopen = () => setTelemetryConnected(true);
      conn.socket.onclose = () => setTelemetryConnected(false);
      conn.socket.onerror = () => setTelemetryConnected(false);
    }

    return () => {
      conn.close();
      setTelemetryConnected(false);
    };
  }, [selectedCity.id]);

  // ==================== PHASE 3: Render Truck Markers on Map ====================
  useEffect(() => {
    if (!map.current) return;
    const m = map.current;

    // Remove stale markers
    const existingIds = new Set(operationalTrucks.map(t => t.id));
    operationalTruckMarkersRef.current.forEach((marker, id) => {
      if (!existingIds.has(id)) {
        marker.remove();
        operationalTruckMarkersRef.current.delete(id);
      }
    });

    // Create/update markers for each truck
    operationalTrucks.forEach(truck => {
      const existing = operationalTruckMarkersRef.current.get(truck.id);
      if (existing) {
        existing.setLngLat([truck.longitude, truck.latitude]);
        return;
      }

      const statusColor: Record<string, string> = {
        in_transit: '#22d3ee',
        inbound: '#3b82f6',
        at_gate: '#f59e0b',
        in_yard: '#10b981',
        loading: '#a855f7',
        outbound: '#f43f5e'
      };
      const color = statusColor[truck.status] || '#22d3ee';

      const el = document.createElement('div');
      el.className = 'cursor-pointer flex flex-col items-center group';
      el.innerHTML = `
        <div style="background: rgba(15,23,42,0.92); border: 2px solid ${color}; box-shadow: 0 0 12px ${color}60;" class="w-7 h-7 rounded-full flex items-center justify-center text-xs relative">
          🚛
          <div style="border-color: ${color};" class="absolute -inset-0.5 rounded-full border opacity-50 animate-pulse pointer-events-none"></div>
        </div>
        <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 px-2 py-0.5 rounded bg-black/90 text-[9px] text-white whitespace-nowrap border border-white/20 z-50 pointer-events-none">
          <strong style="color: ${color};">${truck.plate_number}</strong>
          <div class="text-slate-400">${truck.status.replace(/_/g, ' ')} · ${truck.speed_kmh} km/h</div>
        </div>
      `;

      el.addEventListener('click', () => {
        setSelectedTruck(truck);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([truck.longitude, truck.latitude])
        .addTo(m);

      operationalTruckMarkersRef.current.set(truck.id, marker);
    });
  }, [operationalTrucks]);

  // ==================== PHASE 3: Focus Truck on Map ====================
  const handleFocusTruck = useCallback((truck: Truck) => {
    if (map.current) {
      map.current.flyTo({
        center: [truck.longitude, truck.latitude],
        zoom: 16,
        pitch: 45,
        duration: 1500
      });
    }
    setSelectedTruck(truck);
  }, []);

  return (
    <div className="relative w-full h-screen bg-cyber-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. MapLibre Canvas */}
      <div
        ref={mapContainer}
        className={`absolute inset-0 w-full h-full ${
          activeMapPickStopId ? 'cursor-crosshair' : 'cursor-default'
        }`}
      />

      {/* Crosshair Banner when Picking Coordinate on Map */}
      <AnimatePresence>
        {activeMapPickStopId && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 rounded-full bg-amber-500 text-black font-bold text-xs shadow-2xl flex items-center gap-2 border-2 border-black animate-bounce"
          >
            <MapPin className="w-4 h-4" />
            <span>Click any location on the map to set coordinate for Waypoint</span>
            <button
              onClick={() => setActiveMapPickStopId(null)}
              className="ml-2 px-2 py-0.5 rounded bg-black text-amber-400 hover:bg-slate-900 text-[10px]"
            >
              Done / Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Top Navigation & Stats Bar */}
      <header className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Brand & City Selector */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="glass-panel py-2 px-3.5 rounded-xl border border-white/10 flex items-center gap-2.5 shadow-xl">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-black font-display text-sm tracking-wider shadow-[0_0_12px_rgba(0,242,254,0.4)]">
              LS
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-white font-display tracking-wide">
                  LogiSync
                </h1>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  PHASE 3
                </span>
              </div>
              <p className="text-[10px] text-slate-400">AI Multimodal Logistics Twin</p>
            </div>
          </div>

          <CitySelector selectedCity={selectedCity} onSelectCity={handleSelectCity} />

          {/* GIS Layers Toggle Button */}
          <button
            onClick={handleToggleGisLayers}
            title={showGisLayers ? 'Hide OSM GIS Buildings & Yards' : 'Show OSM GIS Buildings & Yards'}
            className={`glass-panel py-2 px-3 rounded-xl border text-xs flex items-center gap-2 transition-colors ${
              showGisLayers
                ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                : 'border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {showGisLayers ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-mono font-medium hidden sm:inline">OSM GIS</span>
          </button>
        </div>

        {/* Right: Live Telemetry & KPI Cards */}
        <div className="pointer-events-auto">
          <KPIStatsHeader
            routeResult={routeResult}
            incidents={incidents}
            isRerouted={isRerouted}
          />
        </div>
      </header>

      {/* 3. Left Floating Controls Dock (Waypoints & Roadblocks) */}
      <div className="absolute top-22 left-4 z-20 flex items-start gap-2">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="glass-panel p-2 rounded-xl text-slate-300 hover:text-white border border-white/10 hover:border-cyan-400/50 transition-colors shadow-xl"
          title={isSidebarOpen ? 'Collapse Panel' : 'Expand Panel'}
        >
          {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="w-88 flex flex-col gap-2.5"
            >
              {/* Tab Selector Buttons */}
              <div className="glass-panel p-1 rounded-xl flex items-center border border-white/10 shadow-lg">
                <button
                  onClick={() => setActiveSidebarTab('waypoints')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    activeSidebarTab === 'waypoints'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Route className="w-3.5 h-3.5" />
                  <span>Waypoints (A → {String.fromCharCode(65 + waypoints.length - 1)})</span>
                </button>

                <button
                  onClick={() => setActiveSidebarTab('traffic')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all relative ${
                    activeSidebarTab === 'traffic'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Traffic & Blocks</span>
                  {incidents.filter(i => i.type === 'roadblock').length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1.5 right-2" />
                  )}
                </button>
              </div>

              {/* Tab Content */}
              {activeSidebarTab === 'waypoints' ? (
                <WaypointManager
                  waypoints={waypoints}
                  onUpdateWaypoints={setWaypoints}
                  onSelectMapPickStop={setActiveMapPickStopId}
                  activeMapPickStopId={activeMapPickStopId}
                  selectedCity={selectedCity}
                  onCalculateRoute={handleCalculateRoute}
                  isCalculating={isCalculatingRoute}
                />
              ) : (
                <TrafficRoadblocksPanel
                  incidents={incidents}
                  showTrafficLayer={showTrafficLayer}
                  onToggleTrafficLayer={() => setShowTrafficLayer(!showTrafficLayer)}
                  onAutoDetour={handleAutoDetour}
                  isRerouted={isRerouted}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Interactive Facility Inspector Floating Card (Phase 2) */}
      <div className="absolute top-22 right-4 z-20 pointer-events-auto">
        <FacilityInspector
          facility={selectedFacility}
          onClose={() => setSelectedFacility(null)}
          onAddAsWaypoint={handleAddFacilityToRoute}
        />
      </div>

      {/* 5. Bottom Trip Simulator Dock */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-full px-4 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-4xl">
          <TripSimulator
            simulation={simulation}
            routeResult={routeResult}
            waypoints={waypoints}
            onTogglePlay={() => setSimulation(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
            onReset={() => setSimulation(prev => ({ ...prev, isPlaying: false, progress: 0, currentCoord: routeResult?.coordinates[0] || selectedCity.center }))}
            onChangeSpeed={(spd) => setSimulation(prev => ({ ...prev, playbackSpeed: spd }))}
            onSeek={handleSeekSimulation}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
