import { useEffect, useState, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [kpis, setKpis] = useState<any>(null);

  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [78.1348, 8.7642], // Thoothukudi
      zoom: 12,
    });

    map.current.on('load', async () => {
      if (!map.current) return;

      try {
        const [boundaryRes, roadsRes, gatesRes, warehousesRes, yardsRes, kpiRes] = await Promise.all([
          axios.get(`${API_URL}/api/mmlp/boundary`).catch(() => ({ data: null })),
          axios.get(`${API_URL}/api/roads`).catch(() => ({ data: null })),
          axios.get(`${API_URL}/api/gates`).catch(() => ({ data: null })),
          axios.get(`${API_URL}/api/warehouses`).catch(() => ({ data: null })),
          axios.get(`${API_URL}/api/yards`).catch(() => ({ data: null })),
          axios.get(`${API_URL}/api/kpis`).catch(() => ({ data: null })),
        ]);

        if (kpiRes.data) setKpis(kpiRes.data);

        const m = map.current;

        // Boundary
        if (boundaryRes.data && boundaryRes.data.features?.length > 0) {
          m.addSource('boundary', { type: 'geojson', data: boundaryRes.data });
          m.addLayer({
            id: 'boundary-layer',
            type: 'line',
            source: 'boundary',
            paint: { 'line-color': '#ff0000', 'line-width': 2, 'line-dasharray': [2, 2] }
          });
        }

        // Roads
        if (roadsRes.data && roadsRes.data.features?.length > 0) {
          m.addSource('roads', { type: 'geojson', data: roadsRes.data });
          m.addLayer({
            id: 'roads-layer',
            type: 'line',
            source: 'roads',
            paint: { 'line-color': '#aaaaaa', 'line-width': 1 }
          });
        }

        // Warehouses
        if (warehousesRes.data && warehousesRes.data.features?.length > 0) {
          m.addSource('warehouses', { type: 'geojson', data: warehousesRes.data });
          m.addLayer({
            id: 'warehouses-layer',
            type: 'fill',
            source: 'warehouses',
            paint: { 'fill-color': '#00ff00', 'fill-opacity': 0.3 }
          });
          m.addLayer({
            id: 'warehouses-line',
            type: 'line',
            source: 'warehouses',
            paint: { 'line-color': '#00ff00', 'line-width': 1 }
          });
        }

        // Yards
        if (yardsRes.data && yardsRes.data.features?.length > 0) {
          m.addSource('yards', { type: 'geojson', data: yardsRes.data });
          m.addLayer({
            id: 'yards-layer',
            type: 'fill',
            source: 'yards',
            paint: { 'fill-color': '#0000ff', 'fill-opacity': 0.3 }
          });
        }

        // Gates
        if (gatesRes.data && gatesRes.data.features?.length > 0) {
          m.addSource('gates', { type: 'geojson', data: gatesRes.data });
          m.addLayer({
            id: 'gates-layer',
            type: 'circle',
            source: 'gates',
            paint: { 'circle-color': '#ff00ff', 'circle-radius': 6 }
          });
        }

      } catch (err) {
        console.error("Error loading GIS data:", err);
      }
    });
  }, []);

  return (
    <div className="relative w-full h-screen bg-gray-900 text-white font-sans">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Overlay UI */}
      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md p-6 rounded-xl border border-gray-700 shadow-2xl z-10 w-80">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-1">
          Thoothukudi MMLP
        </h1>
        <p className="text-sm text-gray-400 mb-6">Digital Twin MVP</p>

        {kpis ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <span className="text-gray-300">Gates</span>
              <span className="font-mono text-xl">{kpis.gates}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <span className="text-gray-300">Warehouses</span>
              <span className="font-mono text-xl">{kpis.warehouses}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <span className="text-gray-300">Yard Zones</span>
              <span className="font-mono text-xl">{kpis.yard_zones}</span>
            </div>
            <div className="mt-4 pt-2">
              <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                {kpis.data_source}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm animate-pulse">Loading Live Data...</div>
        )}
      </div>
    </div>
  );
}

export default App;
