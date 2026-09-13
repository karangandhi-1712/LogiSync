import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { HeaderKPIs } from './components/HeaderKPIs';
import { Map3D } from './components/Map3D';
import { EntityDetailModal } from './components/EntityDetailModal';
import { SensorsPanel } from './components/SensorsPanel';
import { ScenariosPanel } from './components/ScenariosPanel';
import { LogisticsAppPanel } from './components/LogisticsAppPanel';
import { DigitalTwinStatePanel } from './components/DigitalTwinStatePanel';
import { SimControlPanel } from './components/SimControlPanel';
import { OptimizationPanel } from './components/OptimizationPanel';
import { FleetTrackerPanel } from './components/FleetTrackerPanel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = API_URL.replace(/^http/, 'ws') + '/api/telemetry/ws';

export function App() {
  const [activeMode, setActiveMode] = useState<string>('3d-map');
  const [kpis, setKpis] = useState<any>(null);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [trains, setTrains] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedEntityForModal, setSelectedEntityForModal] = useState<any | null>(null);

  // Multi-Speed Simulation State
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Initial Fetch & Fallback Polling
  const fetchInitialData = async () => {
    try {
      const [kpiRes, trucksRes, vesselsRes, trainsRes, eqRes] = await Promise.all([
        axios.get(`${API_URL}/api/kpis`).catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/entities/trucks`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/entities/vessels`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/entities/trains`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/api/entities/equipment`).catch(() => ({ data: [] }))
      ]);
      if (kpiRes.data) setKpis(kpiRes.data);
      if (trucksRes.data) setTrucks(trucksRes.data);
      if (vesselsRes.data) setVessels(vesselsRes.data);
      if (trainsRes.data) setTrains(trainsRes.data);
      if (eqRes.data) setEquipment(eqRes.data);
    } catch (err) {
      console.error('Error fetching initial twin telemetry:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();

    // WebSocket Connection for Real-Time Multi-Modal Telemetry
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          if (packet.type === 'TELEMETRY_STREAM') {
            if (packet.trucks) setTrucks(packet.trucks);
            if (packet.vessels) setVessels(packet.vessels);
            if (packet.trains) setTrains(packet.trains);
            if (packet.equipment) setEquipment(packet.equipment);
          }
        } catch (e) {
          console.error('Error parsing telemetry ws packet:', e);
        }
      };

      ws.onerror = () => {
        console.warn('WebSocket connection failed, switching to polling mode.');
      };
    } catch (e) {
      console.warn('WebSocket init error:', e);
    }

    // Polling interval adjusted by speed factor
    const intervalTime = isPaused ? 999999 : Math.max(200, Math.round(2000 / simSpeed));
    const interval = setInterval(fetchInitialData, intervalTime);

    return () => {
      clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [simSpeed, isPaused]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Glassmorphism KPI & Nav Header */}
      <HeaderKPIs
        kpis={kpis}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        liveTelemetryCount={trucks.length + vessels.length + trains.length}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 p-4 lg:p-6 max-w-[1800px] w-full mx-auto">
        {/* Mode 1: 3D Digital Twin Map View */}
        {activeMode === '3d-map' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
            {/* 3D MapLibre Canvas Viewport (8 Columns) */}
            <div className="lg:col-span-8 h-full">
              <Map3D
                apiUrl={API_URL}
                trucks={trucks}
                vessels={vessels}
                trains={trains}
                simSpeed={simSpeed}
                onSimSpeedChange={(spd) => setSimSpeed(spd)}
                isPaused={isPaused}
                onTogglePause={() => setIsPaused(!isPaused)}
                onSelectVehicle={(id) => setSelectedVehicleId(id)}
                onOpenEntityModal={(entity) => setSelectedEntityForModal(entity)}
              />
            </div>

            {/* Fleet & Telemetry Live Inspector Panel (4 Columns) */}
            <div className="lg:col-span-4 h-full">
              <FleetTrackerPanel
                trucks={trucks}
                vessels={vessels}
                trains={trains}
                equipment={equipment}
                selectedVehicleId={selectedVehicleId}
                onSelectVehicle={(id) => setSelectedVehicleId(id)}
                onOpenEntityModal={(entity) => setSelectedEntityForModal(entity)}
              />
            </div>
          </div>
        )}

        {/* Mode 2: Logistics Operations & Gate Passes */}
        {activeMode === 'logistics-app' && (
          <div className="max-w-7xl mx-auto">
            <LogisticsAppPanel apiUrl={API_URL} />
          </div>
        )}

        {/* Mode 3: Logistics IoT Sensor Network & Gate Hardware */}
        {activeMode === 'sensors' && (
          <div className="max-w-7xl mx-auto">
            <SensorsPanel apiUrl={API_URL} />
          </div>
        )}

        {/* Mode 4: Logistics Scenarios & Benchmark Comparisons */}
        {activeMode === 'scenarios' && (
          <div className="max-w-7xl mx-auto">
            <ScenariosPanel apiUrl={API_URL} />
          </div>
        )}

        {/* Mode 5: Phase 4 Digital Twin State Separation */}
        {activeMode === 'digital-twin-state' && (
          <div className="max-w-6xl mx-auto">
            <DigitalTwinStatePanel apiUrl={API_URL} />
          </div>
        )}

        {/* Mode 6: Phase 5 SimPy Discrete-Event Simulation */}
        {activeMode === 'simulation' && (
          <div className="max-w-6xl mx-auto">
            <SimControlPanel apiUrl={API_URL} />
          </div>
        )}

        {/* Mode 7: Phase 6 Google OR-Tools Mathematical Optimization */}
        {activeMode === 'optimization' && (
          <div className="max-w-6xl mx-auto">
            <OptimizationPanel apiUrl={API_URL} />
          </div>
        )}
      </main>

      {/* Unified Multi-Modal Entity Detail Modal (Ships, Trains, Interstate Trucks) */}
      {selectedEntityForModal && (
        <EntityDetailModal
          entity={selectedEntityForModal}
          onClose={() => setSelectedEntityForModal(null)}
        />
      )}
    </div>
  );
}

export default App;
