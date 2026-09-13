import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Eye, Compass, Sparkles, Navigation, Ship, Train, Truck, Play, Pause, Layers } from 'lucide-react';

interface Map3DProps {
  apiUrl: string;
  trucks: any[];
  vessels?: any[];
  trains?: any[];
  simSpeed?: number;
  onSimSpeedChange?: (speed: number) => void;
  isPaused?: boolean;
  onTogglePause?: () => void;
  onSelectVehicle: (id: string) => void;
  onOpenEntityModal: (entity: any) => void;
}

export const Map3D: React.FC<Map3DProps> = ({
  apiUrl,
  trucks,
  vessels = [],
  trains = [],
  simSpeed = 1,
  onSimSpeedChange,
  isPaused = false,
  onTogglePause,
  onSelectVehicle,
  onOpenEntityModal
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const vehicleMarkers = useRef<{ [id: string]: maplibregl.Marker }>({});
  const vesselMarkers = useRef<{ [id: string]: maplibregl.Marker }>({});
  const trainMarkers = useRef<{ [id: string]: maplibregl.Marker }>({});

  const [pitch, setPitch] = useState<number>(62);
  const [bearing, setBearing] = useState<number>(-30);

  // Initialize MapLibre GL 3D Map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      // Panoramic perspective encompassing Ships (East Sea Channel), MMLP Hub (Center), and Trains (West Railway)
      center: [78.1650, 8.7550],
      zoom: 13.6,
      pitch: 62,
      bearing: -30,
      maxPitch: 85
    });

    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.current = m;

    m.on('pitch', () => setPitch(Math.round(m.getPitch())));
    m.on('rotate', () => setBearing(Math.round(m.getBearing())));

    m.on('load', async () => {
      try {
        const [warehousesRes, yardsRes, roadsRes, gatesRes, boundaryRes, stacks3dRes, routesRes] = await Promise.all([
          fetch(`${apiUrl}/api/warehouses`).then(r => r.json()).catch(() => null),
          fetch(`${apiUrl}/api/yards`).then(r => r.json()).catch(() => null),
          fetch(`${apiUrl}/api/roads`).then(r => r.json()).catch(() => null),
          fetch(`${apiUrl}/api/gates`).then(r => r.json()).catch(() => null),
          fetch(`${apiUrl}/api/mmlp/boundary`).then(r => r.json()).catch(() => null),
          fetch(`${apiUrl}/api/gis/3d-container-stacks`).then(r => r.json()).catch(() => null),
          fetch(`${apiUrl}/api/gis/routes`).then(r => r.json()).catch(() => null),
        ]);

        // 1. MMLP Perimeter Boundary Layer
        if (boundaryRes && boundaryRes.features?.length > 0) {
          m.addSource('boundary-src', { type: 'geojson', data: boundaryRes });
          m.addLayer({
            id: 'boundary-fill',
            type: 'fill',
            source: 'boundary-src',
            paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.05 }
          });
          m.addLayer({
            id: 'boundary-line',
            type: 'line',
            source: 'boundary-src',
            paint: {
              'line-color': '#06b6d4',
              'line-width': 2.5,
              'line-dasharray': [3, 2]
            }
          });
        }

        // 2. Road Network Graph Layer
        if (roadsRes && roadsRes.features?.length > 0) {
          m.addSource('roads-src', { type: 'geojson', data: roadsRes });
          m.addLayer({
            id: 'roads-casing',
            type: 'line',
            source: 'roads-src',
            paint: { 'line-color': '#0f172a', 'line-width': 6 }
          });
          m.addLayer({
            id: 'roads-line',
            type: 'line',
            source: 'roads-src',
            paint: {
              'line-color': '#334155',
              'line-width': 3,
              'line-opacity': 0.8
            }
          });
        }

        // 3. GTA V Style Multi-Layer Glowing Neon Route Ribbons (Highways, Sea Channel, Rail Corridors)
        if (routesRes && routesRes.features?.length > 0) {
          m.addSource('routes-src', { type: 'geojson', data: routesRes });

          // Layer 1: Ambient Outer Glow / Halo
          m.addLayer({
            id: 'routes-glow-outer',
            type: 'line',
            source: 'routes-src',
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 14,
              'line-opacity': 0.45,
              'line-blur': 6
            }
          });

          // Layer 2: Main Vibrant Neon Ribbon
          m.addLayer({
            id: 'routes-glow-mid',
            type: 'line',
            source: 'routes-src',
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 6,
              'line-opacity': 0.85,
              'line-blur': 1
            }
          });

          // Layer 3: High-Intensity White-Hot Laser Core
          m.addLayer({
            id: 'routes-core-laser',
            type: 'line',
            source: 'routes-src',
            paint: {
              'line-color': '#ffffff',
              'line-width': 1.8,
              'line-opacity': 0.95
            }
          });
        }

        // 4. Container Yard Zones Footprints
        if (yardsRes && yardsRes.features?.length > 0) {
          m.addSource('yards-src', { type: 'geojson', data: yardsRes });
          m.addLayer({
            id: 'yards-polygon',
            type: 'fill',
            source: 'yards-src',
            paint: {
              'fill-color': ['coalesce', ['get', 'color'], '#1e3a8a'],
              'fill-opacity': 0.25
            }
          });
          m.addLayer({
            id: 'yards-border',
            type: 'line',
            source: 'yards-src',
            paint: {
              'line-color': ['coalesce', ['get', 'color'], '#3b82f6'],
              'line-width': 1.5
            }
          });
        }

        // 5. 3D Extruded Warehouses Layer
        if (warehousesRes && warehousesRes.features?.length > 0) {
          m.addSource('warehouses-src', { type: 'geojson', data: warehousesRes });
          m.addLayer({
            id: 'warehouses-3d',
            type: 'fill-extrusion',
            source: 'warehouses-src',
            paint: {
              'fill-extrusion-color': [
                'match',
                ['get', 'category'],
                'COLD_CHAIN', '#06b6d4',
                'CROSS_DOCK', '#8b5cf6',
                'ADMINISTRATION', '#3b82f6',
                '#10b981'
              ],
              'fill-extrusion-height': ['coalesce', ['get', 'height'], 15],
              'fill-extrusion-base': ['coalesce', ['get', 'base_height'], 0],
              'fill-extrusion-opacity': 0.88
            }
          });
        }

        // 6. 3D Container Stacks Layer
        if (stacks3dRes && stacks3dRes.features?.length > 0) {
          m.addSource('stacks-3d-src', { type: 'geojson', data: stacks3dRes });
          m.addLayer({
            id: 'containers-3d-stacks',
            type: 'fill-extrusion',
            source: 'stacks-3d-src',
            paint: {
              'fill-extrusion-color': ['get', 'color'],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.95
            }
          });
        }

        // 7. Gate Complex Markers Layer
        if (gatesRes && gatesRes.features?.length > 0) {
          m.addSource('gates-src', { type: 'geojson', data: gatesRes });
          m.addLayer({
            id: 'gates-glow',
            type: 'circle',
            source: 'gates-src',
            paint: {
              'circle-radius': 14,
              'circle-color': '#ec4899',
              'circle-opacity': 0.25,
              'circle-blur': 0.6
            }
          });
          m.addLayer({
            id: 'gates-point',
            type: 'circle',
            source: 'gates-src',
            paint: {
              'circle-radius': 6,
              'circle-color': '#f43f5e',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          });
        }

      } catch (err) {
        console.error('Error initializing 3D Map Layers:', err);
      }
    });
  }, [apiUrl]);

  // Update 3D Trucks on Multi-Corridor Road Network
  useEffect(() => {
    if (!map.current) return;
    const m = map.current;

    trucks.forEach((truck) => {
      const { id, latitude, longitude, heading, license_plate, route_color, state_of_origin } = truck;
      if (!latitude || !longitude) return;

      const color = route_color || '#3b82f6';

      if (!vehicleMarkers.current[id]) {
        const el = document.createElement('div');
        el.className = 'truck-3d-model cursor-pointer transition-transform duration-500';
        el.innerHTML = `
          <div class="relative group flex flex-col items-center">
            <div class="mb-1 bg-slate-950/95 text-white text-[9px] font-mono font-extrabold px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap shadow-xl flex items-center gap-1 group-hover:scale-110 transition">
              <span class="w-1.5 h-1.5 rounded-full animate-ping" style="background-color: ${color}"></span>
              ${state_of_origin ? `[${state_of_origin.slice(0, 2).toUpperCase()}] ` : ''}${license_plate}
            </div>

            <!-- Realistic 3D Heavy Prime Mover & Trailer -->
            <div class="relative w-12 h-6 rounded-md shadow-2xl flex items-center transition-transform" style="transform: rotate(${heading || 0}deg); background: linear-gradient(135deg, #1e293b, #0f172a); border: 1.5px solid ${color}">
              <div class="w-4 h-full bg-slate-800 rounded-l-md border-r border-slate-700 relative flex items-center justify-center">
                <div class="w-2 h-3 bg-cyan-400/80 rounded-sm shadow-sm"></div>
                <div class="absolute -left-1 top-1 w-1.5 h-1 bg-yellow-300 rounded-full shadow-md shadow-yellow-300/80"></div>
                <div class="absolute -left-1 bottom-1 w-1.5 h-1 bg-yellow-300 rounded-full shadow-md shadow-yellow-300/80"></div>
              </div>

              <div class="flex-1 h-full rounded-r-md flex items-center justify-center relative overflow-hidden" style="background-color: ${color}35">
                <span class="text-[7px] font-mono font-extrabold text-white tracking-tighter truncate px-0.5">${truck.container_no?.slice(0, 7) || 'MMLP'}</span>
              </div>
            </div>
          </div>
        `;

        el.addEventListener('click', () => {
          onSelectVehicle(id);
          onOpenEntityModal(truck);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .addTo(m);

        vehicleMarkers.current[id] = marker;
      } else {
        vehicleMarkers.current[id].setLngLat([longitude, latitude]);
        const el = vehicleMarkers.current[id].getElement();
        const truckBody = el.querySelector('.relative.w-12');
        if (truckBody) {
          (truckBody as HTMLElement).style.transform = `rotate(${heading || 0}deg)`;
        }
      }
    });
  }, [trucks, onSelectVehicle, onOpenEntityModal]);

  // Update 3D Ships / Vessels on Sea Navigation Channel
  useEffect(() => {
    if (!map.current) return;
    const m = map.current;

    vessels.forEach((vessel) => {
      const { id, latitude, longitude, heading, vessel_name, route_color } = vessel;
      if (!latitude || !longitude) return;

      const color = route_color || '#06b6d4';

      if (!vesselMarkers.current[id]) {
        const el = document.createElement('div');
        el.className = 'vessel-3d-model cursor-pointer transition-transform duration-700';
        el.innerHTML = `
          <div class="relative group flex flex-col items-center">
            <!-- Pulsing Vessel Badge -->
            <div class="mb-1 bg-slate-950/95 text-cyan-300 text-[11px] font-mono font-extrabold px-3 py-1 rounded-lg border border-cyan-500/50 whitespace-nowrap shadow-2xl flex items-center gap-1.5 group-hover:scale-110 transition backdrop-blur-sm">
              <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
              🚢 ${vessel_name} (${vessel.teu_capacity ? `${vessel.teu_capacity} TEU` : 'Tugboat'})
            </div>

            <!-- Realistic 3D Ship Hull with Container Bays & Bridge Tower -->
            <div class="relative w-28 h-10 rounded-xl shadow-2xl flex items-center transition-transform" style="transform: rotate(${heading || 0}deg); background: linear-gradient(135deg, #092c4c, #06182c); border: 2px solid ${color}; box-shadow: 0 0 15px ${color}60">
              <!-- Ship Bow Point -->
              <div class="absolute -left-3 top-2 bottom-2 w-4 bg-cyan-600 rounded-l-full shadow-inner flex items-center justify-center">
                <div class="w-1.5 h-1.5 bg-yellow-300 rounded-full shadow-md shadow-yellow-300"></div>
              </div>

              <!-- Container Stacks on Deck -->
              <div class="flex-1 h-full p-1 grid grid-cols-5 gap-1 items-center justify-center pl-2">
                <div class="h-5 bg-blue-500 rounded-xs shadow-sm"></div>
                <div class="h-5 bg-emerald-500 rounded-xs shadow-sm"></div>
                <div class="h-5 bg-amber-500 rounded-xs shadow-sm"></div>
                <div class="h-5 bg-rose-500 rounded-xs shadow-sm"></div>
                <div class="h-5 bg-cyan-500 rounded-xs shadow-sm"></div>
              </div>

              <!-- Bridge Tower / Wheelhouse with Radar -->
              <div class="w-6 h-8 bg-slate-200 rounded-r-lg border border-slate-400 flex flex-col items-center justify-center shadow-lg mr-1 relative">
                <div class="w-3.5 h-2 bg-cyan-600 rounded-xs mb-0.5"></div>
                <div class="w-1.5 h-2.5 bg-slate-700"></div>
                <div class="absolute -top-1.5 w-1 h-1.5 bg-amber-400 rounded-full animate-ping"></div>
              </div>
            </div>
          </div>
        `;

        el.addEventListener('click', () => {
          onSelectVehicle(id);
          onOpenEntityModal(vessel);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .addTo(m);

        vesselMarkers.current[id] = marker;
      } else {
        vesselMarkers.current[id].setLngLat([longitude, latitude]);
        const el = vesselMarkers.current[id].getElement();
        const shipBody = el.querySelector('.relative.w-28');
        if (shipBody) {
          (shipBody as HTMLElement).style.transform = `rotate(${heading || 0}deg)`;
        }
      }
    });
  }, [vessels, onSelectVehicle, onOpenEntityModal]);

  // Update 3D Freight Trains on Railway Corridor
  useEffect(() => {
    if (!map.current) return;
    const m = map.current;

    trains.forEach((train) => {
      const { id, latitude, longitude, heading, train_number, route_color } = train;
      if (!latitude || !longitude) return;

      const color = route_color || '#a855f7';

      if (!trainMarkers.current[id]) {
        const el = document.createElement('div');
        el.className = 'train-3d-model cursor-pointer transition-transform duration-600';
        el.innerHTML = `
          <div class="relative group flex flex-col items-center">
            <!-- Pulsing Train Badge -->
            <div class="mb-1 bg-slate-950/95 text-purple-300 text-[11px] font-mono font-extrabold px-3 py-1 rounded-lg border border-purple-500/50 whitespace-nowrap shadow-2xl flex items-center gap-1.5 group-hover:scale-110 transition backdrop-blur-sm">
              <span class="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping"></span>
              🚂 ${train_number} (${train.total_teu || 90} TEU)
            </div>

            <!-- Realistic 3D Locomotive Engine & Coupled Container Flatcars -->
            <div class="relative w-32 h-7 rounded-lg shadow-2xl flex items-center transition-transform" style="transform: rotate(${heading || 0}deg); background: #1e1b4b; border: 2px solid ${color}; box-shadow: 0 0 15px ${color}60">
              <!-- WAG-9 Electric Locomotive -->
              <div class="w-8 h-full bg-red-600 rounded-l-lg border-r border-slate-700 flex items-center justify-center relative">
                <div class="w-3.5 h-2.5 bg-yellow-400 rounded-xs shadow-sm"></div>
                <!-- Roof Pantograph -->
                <div class="absolute -top-1.5 w-3 h-1.5 bg-slate-200 rounded-xs"></div>
                <!-- Headlights -->
                <div class="absolute -left-1 top-1 w-1.5 h-1 bg-yellow-300 rounded-full shadow-md shadow-yellow-300"></div>
                <div class="absolute -left-1 bottom-1 w-1.5 h-1 bg-yellow-300 rounded-full shadow-md shadow-yellow-300"></div>
              </div>

              <!-- Container Flatcars -->
              <div class="flex-1 h-full flex items-center justify-around px-1 gap-1">
                <div class="w-5 h-5 bg-blue-600 rounded-xs shadow-sm flex items-center justify-center">
                  <span class="text-[5px] text-white font-mono">CON</span>
                </div>
                <div class="w-5 h-5 bg-emerald-600 rounded-xs shadow-sm flex items-center justify-center">
                  <span class="text-[5px] text-white font-mono">MSK</span>
                </div>
                <div class="w-5 h-5 bg-amber-600 rounded-xs shadow-sm flex items-center justify-center">
                  <span class="text-[5px] text-white font-mono">CMA</span>
                </div>
                <div class="w-5 h-5 bg-cyan-600 rounded-xs shadow-sm flex items-center justify-center">
                  <span class="text-[5px] text-white font-mono">HLX</span>
                </div>
              </div>
            </div>
          </div>
        `;

        el.addEventListener('click', () => {
          onSelectVehicle(id);
          onOpenEntityModal(train);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .addTo(m);

        trainMarkers.current[id] = marker;
      } else {
        trainMarkers.current[id].setLngLat([longitude, latitude]);
        const el = trainMarkers.current[id].getElement();
        const trainBody = el.querySelector('.relative.w-32');
        if (trainBody) {
          (trainBody as HTMLElement).style.transform = `rotate(${heading || 0}deg)`;
        }
      }
    });
  }, [trains, onSelectVehicle, onOpenEntityModal]);

  // Camera presets
  const setCameraPreset = (name: string) => {
    if (!map.current) return;
    const m = map.current;

    switch (name) {
      case 'overview':
        m.flyTo({ center: [78.1650, 8.7550], zoom: 13.6, pitch: 62, bearing: -30, duration: 1800 });
        break;
      case 'ships':
        m.flyTo({ center: [78.1950, 8.7420], zoom: 14.8, pitch: 66, bearing: -45, duration: 1800 });
        break;
      case 'rail':
        m.flyTo({ center: [78.1250, 8.7710], zoom: 15.2, pitch: 64, bearing: 35, duration: 1800 });
        break;
      case 'highways':
        m.flyTo({ center: [78.1380, 8.7750], zoom: 15.0, pitch: 62, bearing: -15, duration: 1800 });
        break;
      case 'gate':
        m.flyTo({ center: [78.1368, 8.7624], zoom: 17.5, pitch: 66, bearing: 15, duration: 1800 });
        break;
      case 'yard':
        m.flyTo({ center: [78.1374, 8.7608], zoom: 17.8, pitch: 70, bearing: -45, duration: 1800 });
        break;
    }
  };

  const handlePitchChange = (newPitch: number) => {
    setPitch(newPitch);
    if (map.current) map.current.setPitch(newPitch);
  };

  const handleBearingChange = (newBearing: number) => {
    setBearing(newBearing);
    if (map.current) map.current.setBearing(newBearing);
  };

  return (
    <div className="relative w-full h-full min-h-[550px] bg-slate-950 overflow-hidden rounded-2xl border border-slate-800 shadow-2xl">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* 3D Camera & Multi-Speed Simulation Controls Toolbar (Top Left) */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-2xl space-y-3 w-76">
          {/* Simulation Speed & Playback Bar */}
          <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
            <button
              onClick={onTogglePause}
              className={`p-1.5 rounded-md font-bold text-xs flex items-center gap-1 transition ${
                isPaused ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
              {isPaused ? 'Resume' : 'Live'}
            </button>

            <div className="flex items-center gap-1">
              {[1, 2, 5, 10, 20].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onSimSpeedChange && onSimSpeedChange(spd)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition ${
                    simSpeed === spd
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-cyan-400" /> Multi-Modal Camera Views
            </span>
            <span className="text-[10px] font-mono text-cyan-400">{pitch}° / {bearing}°</span>
          </div>

          {/* Quick Camera Presets */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setCameraPreset('overview')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium transition text-left flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" /> 3D Overview
            </button>
            <button
              onClick={() => setCameraPreset('ships')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium transition text-left flex items-center gap-1.5"
            >
              <Ship className="w-3.5 h-3.5 text-cyan-400" /> Port & Ships
            </button>
            <button
              onClick={() => setCameraPreset('rail')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium transition text-left flex items-center gap-1.5"
            >
              <Train className="w-3.5 h-3.5 text-purple-400" /> Rail Corridor
            </button>
            <button
              onClick={() => setCameraPreset('highways')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium transition text-left flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5 text-amber-400" /> Interstate Roads
            </button>
            <button
              onClick={() => setCameraPreset('gate')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium transition text-left flex items-center gap-1.5"
            >
              <Navigation className="w-3.5 h-3.5 text-rose-400" /> Gate Complex
            </button>
            <button
              onClick={() => setCameraPreset('yard')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium transition text-left flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> 3D Stacks
            </button>
          </div>

          {/* Perspective & Rotation Sliders */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Perspective Tilt</span>
              <span className="font-mono text-cyan-400">{pitch}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              value={pitch}
              onChange={(e) => handlePitchChange(Number(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Bearing Rotation</span>
              <span className="font-mono text-cyan-400">{bearing}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={bearing}
              onChange={(e) => handleBearingChange(Number(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* 3D Map Multi-Modal Legend (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-700 shadow-xl text-xs space-y-2 w-76">
        <div className="font-bold text-slate-200 text-[11px] uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-cyan-400" /> Multi-Corridor GTA Lines</span>
          <span className="text-[10px] text-emerald-400 font-mono">Live Physics</span>
        </div>
        <div className="grid grid-cols-1 gap-1.5 text-slate-300 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400"></span>
            <span>Maritime Fairway (Singapore / Colombo Vessels)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500"></span>
            <span>Southern Railway Freight Track (Chennai / BLR)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500"></span>
            <span>North Highway SH-176 (MH, DL, AP, HR Fleets)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400"></span>
            <span>West Highway NH-38 (KA, KL, TS Fleets)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500"></span>
            <span>VOC Port Access Wharf Expressway</span>
          </div>
        </div>
        <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 italic">
          💡 Click any Ship, Train, or Truck to inspect live telematics & manifests
        </div>
      </div>
    </div>
  );
};
