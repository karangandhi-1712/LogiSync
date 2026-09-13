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
import { OperationsPanel } from './components/OperationsPanel';
import { WaypointManager } from './components/WaypointManager';
import { TrafficRoadblocksPanel } from './components/TrafficRoadblocksPanel';
import { TripSimulator } from './components/TripSimulator';
import { CitySelector } from './components/CitySelector';
import { PRESET_CITIES, calculateMultiPointRoute } from './services/api';
import type { City, Waypoint, RouteResult, TrafficIncident, SimulationState } from './types/logistics';
import { 
  Globe, 
  Map as MapIcon, 
  Layers, 
  Sparkles, 
  Cpu, 
  PlayCircle, 
  Radio, 
  RefreshCw, 
  Truck, 
  Ship, 
  Train 
} from 'lucide-react';

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

  // Multi-City Routing State
  const [selectedCity, setSelectedCity] = useState<City>(PRESET_CITIES[0]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(
    (PRESET_CITIES[0].defaultWaypoints || []).map((w, idx) => ({ ...w, id: `wp-${idx}` }))
  );
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [incidents] = useState<TrafficIncident[]>([]);
  const [showTrafficLayer, setShowTrafficLayer] = useState<boolean>(true);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [activeMapPickStopId, setActiveMapPickStopId] = useState<string | null>(null);
  const [simulationState, setSimulationState] = useState<SimulationState>({
    isPlaying: false,
    progress: 0,
    playbackSpeed: 1,
    currentCoord: [78.1368, 8.7624],
    currentHeading: 0,
    currentSpeedKmH: 45,
    currentLegIndex: 0
  });

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
    const interval = setInterval(fetchInitialData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate Multi-Point Route
  const handleCalculateRoute = async () => {
    if (waypoints.length < 2) return;
    setIsCalculatingRoute(true);
    try {
      const res = await calculateMultiPointRoute(waypoints);
      setRouteResult(res);
    } catch (e) {
      console.error('Routing calculation error:', e);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // WebSocket Live Physics Telemetry Stream
  useEffect(() => {
    const connectWS = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          if (isPaused) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'TELEMETRY_BATCH') {
              if (data.trucks) setTrucks(data.trucks);
              if (data.vessels) setVessels(data.vessels);
              if (data.trains) setTrains(data.trains);
              if (data.equipment) setEquipment(data.equipment);
            }
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };

        ws.onclose = () => {
          setTimeout(connectWS, 3000);
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
      }
    };

    connectWS();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [isPaused]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Header & Real-Time Logistics KPIs */}
      <HeaderKPIs
        kpis={kpis}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        liveTelemetryCount={trucks.length + vessels.length + trains.length}
      />

      {/* Main Navigation Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-2 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveMode('3d-map')}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition ${
              activeMode === '3d-map'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-300" />
            <span>3D Multi-Modal Twin</span>
          </button>

          <button
            onClick={() => setActiveMode('city-routing')}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition ${
              activeMode === 'city-routing'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <MapIcon className="w-4 h-4 text-emerald-400" />
            <span>Multi-City Routing & Roadblocks</span>
          </button>

          <button
            onClick={() => setActiveMode('operations')}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition ${
              activeMode === 'operations'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Operations & Gate Management</span>
          </button>

          <button
            onClick={() => setActiveMode('scenarios')}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition ${
              activeMode === 'scenarios'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Scenario Benchmarking</span>
          </button>

          <button
            onClick={() => setActiveMode('optimization')}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition ${
              activeMode === 'optimization'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>OR-Tools Optimization</span>
          </button>

          <button
            onClick={() => setActiveMode('simulation')}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition ${
              activeMode === 'simulation'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <PlayCircle className="w-4 h-4 text-rose-400" />
            <span>SimPy DES Simulation</span>
          </button>

          <button
            onClick={() => setActiveMode('sensors')}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition ${
              activeMode === 'sensors'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>IoT Sensors & ANPR</span>
          </button>

          <button
            onClick={() => setActiveMode('digital-twin')}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 transition ${
              activeMode === 'digital-twin'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            <span>Digital Twin State</span>
          </button>
        </div>

        {/* Multi-Modal Live Counter Indicator */}
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
          <span className="flex items-center gap-1 text-cyan-300">
            <Ship className="w-3.5 h-3.5" /> {vessels.length} Ships
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 text-purple-300">
            <Train className="w-3.5 h-3.5" /> {trains.length} Trains
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 text-blue-300">
            <Truck className="w-3.5 h-3.5" /> {trucks.length} Trucks
          </span>
        </div>
      </div>

      {/* Main Workspace Viewport */}
      <main className="flex-1 p-6 space-y-6">
        {activeMode === '3d-map' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[700px]">
            <div className="lg:col-span-3 h-[700px]">
              <Map3D
                apiUrl={API_URL}
                trucks={trucks}
                vessels={vessels}
                trains={trains}
                simSpeed={simSpeed}
                onSimSpeedChange={setSimSpeed}
                isPaused={isPaused}
                onTogglePause={() => setIsPaused(!isPaused)}
                onSelectVehicle={setSelectedVehicleId}
                onOpenEntityModal={setSelectedEntityForModal}
              />
            </div>

            <div className="lg:col-span-1 h-[700px]">
              <FleetTrackerPanel
                trucks={trucks}
                vessels={vessels}
                trains={trains}
                equipment={equipment}
                selectedVehicleId={selectedVehicleId}
                onSelectVehicle={setSelectedVehicleId}
                onOpenEntityModal={setSelectedEntityForModal}
              />
            </div>
          </div>
        )}

        {activeMode === 'city-routing' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <CitySelector
                selectedCity={selectedCity}
                onSelectCity={setSelectedCity}
              />
              <WaypointManager
                waypoints={waypoints}
                onUpdateWaypoints={setWaypoints}
                onSelectMapPickStop={setActiveMapPickStopId}
                activeMapPickStopId={activeMapPickStopId}
                selectedCity={selectedCity}
                onCalculateRoute={handleCalculateRoute}
                isCalculating={isCalculatingRoute}
              />
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="h-[520px] rounded-2xl overflow-hidden border border-slate-800">
                <Map3D
                  apiUrl={API_URL}
                  trucks={trucks}
                  vessels={vessels}
                  trains={trains}
                  simSpeed={simSpeed}
                  onSimSpeedChange={setSimSpeed}
                  isPaused={isPaused}
                  onTogglePause={() => setIsPaused(!isPaused)}
                  onSelectVehicle={setSelectedVehicleId}
                  onOpenEntityModal={setSelectedEntityForModal}
                />
              </div>
              <TrafficRoadblocksPanel
                incidents={incidents}
                showTrafficLayer={showTrafficLayer}
                onToggleTrafficLayer={() => setShowTrafficLayer(!showTrafficLayer)}
                onAutoDetour={() => {}}
                isRerouted={false}
              />
              {routeResult && (
                <TripSimulator
                  routeResult={routeResult}
                  simulation={simulationState}
                  waypoints={waypoints}
                  onTogglePlay={() => setSimulationState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
                  onReset={() => setSimulationState(prev => ({ ...prev, progress: 0, isPlaying: false }))}
                  onChangeSpeed={(speed: number) => setSimulationState(prev => ({ ...prev, playbackSpeed: speed }))}
                  onSeek={(progress: number) => setSimulationState(prev => ({ ...prev, progress }))}
                />
              )}
            </div>
          </div>
        )}

        {activeMode === 'operations' && (
          <div className="space-y-6">
            <LogisticsAppPanel apiUrl={API_URL} />
            <OperationsPanel
              selectedCity={selectedCity}
              isOpen={true}
              onClose={() => {}}
            />
          </div>
        )}

        {activeMode === 'scenarios' && (
          <ScenariosPanel apiUrl={API_URL} />
        )}

        {activeMode === 'optimization' && (
          <OptimizationPanel apiUrl={API_URL} />
        )}

        {activeMode === 'simulation' && (
          <SimControlPanel apiUrl={API_URL} />
        )}

        {activeMode === 'sensors' && (
          <SensorsPanel apiUrl={API_URL} />
        )}

        {activeMode === 'digital-twin' && (
          <DigitalTwinStatePanel apiUrl={API_URL} />
        )}
      </main>

      {/* Deep Inspection Modal for Ships, Trains, and Trucks */}
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
