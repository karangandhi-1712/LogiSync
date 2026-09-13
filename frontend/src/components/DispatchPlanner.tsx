import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Truck as TruckIcon,
  Package,
  Plus,
  Trash2,
  Crosshair,
  Gauge,
  Fuel,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { Waypoint, TruckProfile, OptimizationMode, OptimizationResult } from '../types/logistics';
import { fetchTruckProfiles, optimizeRoute } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface DispatchPlannerProps {
  waypoints: Waypoint[];
  onUpdateWaypoints: (waypoints: Waypoint[]) => void;
  activeMapPickStopId: string | null;
  onSelectMapPickStop: (id: string | null) => void;
  onOptimizationResult: (result: OptimizationResult) => void;
  selectedTruckProfile: TruckProfile | null;
  onSelectTruckProfile: (profile: TruckProfile) => void;
  payloadTonnes: number;
  onUpdatePayloadTonnes: (tonnes: number) => void;
}

const CARGO_PRESETS = [
  { id: 'container_dry', name: 'General Containerized Cargo', icon: '📦', defaultTonnes: 16 },
  { id: 'perishables', name: 'Perishable Food / Cold-Chain', icon: '🥩', defaultTonnes: 12 },
  { id: 'electronics', name: 'Consumer Electronics & Hardware', icon: '💻', defaultTonnes: 8 },
  { id: 'heavy_machinery', name: 'Industrial Equipment & Steel', icon: '⚙️', defaultTonnes: 24 },
  { id: 'chemicals', name: 'Petroleum & Liquid Chemicals', icon: '🛢️', defaultTonnes: 20 },
  { id: 'fmcg', name: 'Fast-Moving Consumer Goods', icon: '🛒', defaultTonnes: 10 },
];

export const DispatchPlanner: React.FC<DispatchPlannerProps> = ({
  waypoints,
  onUpdateWaypoints,
  activeMapPickStopId,
  onSelectMapPickStop,
  onOptimizationResult,
  selectedTruckProfile,
  onSelectTruckProfile,
  payloadTonnes,
  onUpdatePayloadTonnes,
}) => {
  const { isDark } = useTheme();
  const [profiles, setProfiles] = useState<TruckProfile[]>([]);
  const [cargoType, setCargoType] = useState('container_dry');
  const [cargoValueLakhs, setCargoValueLakhs] = useState(45);
  const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>('fuel_efficient');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'stops' | 'freight' | 'trucks'>('stops');

  useEffect(() => {
    fetchTruckProfiles().then((p) => {
      setProfiles(p);
      if (p.length > 0 && !selectedTruckProfile) {
        onSelectTruckProfile(p[0]);
      }
    });
  }, []);

  const activeTruck = selectedTruckProfile || profiles[0];
  const maxTruckPayload = activeTruck?.max_payload_tonnes || 28;
  const isOverweight = payloadTonnes > maxTruckPayload;

  // Waypoint manipulation
  const handleWaypointChange = (idx: number, field: keyof Waypoint, value: any) => {
    const updated = [...waypoints];
    updated[idx] = { ...updated[idx], [field]: value };
    onUpdateWaypoints(updated);
  };

  const handleAddStop = () => {
    const nextLabel = String.fromCharCode(65 + waypoints.length);
    const lastPoint = waypoints[waypoints.length - 1];
    // Slightly offset coordinates from last point
    const newCoords: [number, number] = lastPoint
      ? [lastPoint.coordinates[0] + 0.02, lastPoint.coordinates[1] + 0.02]
      : [72.8777, 19.0760];

    const newWp: Waypoint = {
      id: `wp-${Date.now()}`,
      label: nextLabel,
      name: `Stop ${nextLabel} (Custom Landmark)`,
      coordinates: newCoords,
      role: 'checkpoint',
    };
    onUpdateWaypoints([...waypoints, newWp]);
  };

  const handleRemoveStop = (idx: number) => {
    if (waypoints.length <= 2) return;
    const updated = waypoints.filter((_, i) => i !== idx);
    // Relabel
    const relabeled = updated.map((w, i) => ({
      ...w,
      label: String.fromCharCode(65 + i),
      role: i === 0 ? 'origin' : i === updated.length - 1 ? 'destination' : w.role || 'checkpoint',
    }));
    onUpdateWaypoints(relabeled);
  };

  const handleRunOptimizer = async () => {
    if (waypoints.length < 2 || !activeTruck) return;
    setIsOptimizing(true);
    try {
      const res = await optimizeRoute(waypoints, activeTruck.id, payloadTonnes, optimizationMode);
      onOptimizationResult(res);
    } catch (err) {
      console.error('Route optimization error:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Interpolated fuel estimate
  const estimatedFuelRate = activeTruck
    ? (
        activeTruck.base_fuel_rate_L_per_100km +
        (activeTruck.loaded_fuel_rate_L_per_100km - activeTruck.base_fuel_rate_L_per_100km) *
          (payloadTonnes / Math.max(1, maxTruckPayload))
      ).toFixed(1)
    : '35.0';

  return (
    <div className={`w-full flex flex-col rounded-2xl overflow-hidden backdrop-blur-xl border ${
      isDark ? 'bg-slate-900/90 border-slate-700/80 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
    } shadow-2xl transition-colors`}>
      
      {/* Tab Header: Stops | Freight | Truck Selection */}
      <div className={`grid grid-cols-3 p-1.5 gap-1 border-b text-xs font-bold ${
        isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'
      }`}>
        <button
          onClick={() => setActiveSubTab('stops')}
          className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'stops'
              ? isDark
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm'
              : `${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>Points A, B, C...</span>
          <span className="text-[10px] px-1 rounded-full bg-cyan-500/20">{waypoints.length}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('freight')}
          className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'freight'
              ? isDark
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm'
              : `${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`
          }`}
        >
          <Package className="w-3.5 h-3.5 text-amber-400" />
          <span>Freight / Cargo</span>
        </button>

        <button
          onClick={() => setActiveSubTab('trucks')}
          className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'trucks'
              ? isDark
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
              : `${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`
          }`}
        >
          <TruckIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Truck Fleet</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-4 max-h-[460px] overflow-y-auto space-y-4">
        
        {/* ================= TAB 1: POINTS A, B, C, D ================= */}
        {activeSubTab === 'stops' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Route Stops & Waypoints
                </h3>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Type addresses or click <strong>Pick on Map</strong> to place stops anywhere in the city.
                </p>
              </div>
              <button
                onClick={handleAddStop}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stop</span>
              </button>
            </div>

            {/* List of stops */}
            <div className="space-y-2.5">
              {waypoints.map((wp, idx) => {
                const isPicking = activeMapPickStopId === wp.id;
                const isOrigin = idx === 0;
                const isDest = idx === waypoints.length - 1;

                return (
                  <div
                    key={wp.id}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isPicking
                        ? 'border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-500/30'
                        : isDark
                        ? 'border-slate-700/80 bg-slate-800/40 hover:bg-slate-800/70'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {/* Label Badge */}
                      <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shadow ${
                        isOrigin
                          ? 'bg-emerald-500 text-slate-950'
                          : isDest
                          ? 'bg-rose-500 text-white'
                          : 'bg-cyan-500 text-slate-950'
                      }`}>
                        {wp.label}
                      </span>

                      {/* Name input */}
                      <input
                        type="text"
                        value={wp.name}
                        onChange={(e) => handleWaypointChange(idx, 'name', e.target.value)}
                        placeholder={`Point ${wp.label} Location Name / Address`}
                        className={`flex-1 px-2.5 py-1 rounded-lg text-xs font-medium border focus:outline-none focus:border-cyan-500 transition-all ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                      />

                      {/* Pick on map button */}
                      <button
                        onClick={() => onSelectMapPickStop(isPicking ? null : wp.id)}
                        title="Click to place or move this point by clicking on the map"
                        className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
                          isPicking
                            ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md animate-pulse'
                            : isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{isPicking ? 'Clicking Map...' : 'Pick'}</span>
                      </button>

                      {/* Remove Stop */}
                      {waypoints.length > 2 && (
                        <button
                          onClick={() => handleRemoveStop(idx)}
                          title="Remove this waypoint"
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Coordinates & Role Display */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                      <span className="font-mono">
                        [{wp.coordinates[0].toFixed(4)}, {wp.coordinates[1].toFixed(4)}]
                      </span>
                      <span className="capitalize font-semibold text-slate-300">
                        {isOrigin ? 'Origin (Start)' : isDest ? 'Destination (End)' : 'Checkpoint / Delivery'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB 2: FREIGHT / CARGO ================= */}
        {activeSubTab === 'freight' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-1">
                <Package className="w-3.5 h-3.5" />
                Freight & Consignment Specification
              </h3>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Configure cargo weight in tonnes and category to accurately calculate engine load, fuel burn, and CO2.
              </p>
            </div>

            {/* Cargo Presets */}
            <div className="grid grid-cols-2 gap-2">
              {CARGO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setCargoType(preset.id);
                    onUpdatePayloadTonnes(preset.defaultTonnes);
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    cargoType === preset.id
                      ? 'border-amber-500 bg-amber-500/15 text-white'
                      : isDark
                      ? 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <span className="text-lg">{preset.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{preset.name}</div>
                    <div className="text-[10px] text-slate-400">~{preset.defaultTonnes} tonnes standard</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Payload Slider & Input */}
            <div className={`p-3.5 rounded-xl border ${
              isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
            } space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                  Cargo Payload Weight
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0.5}
                    max={50}
                    step={0.5}
                    value={payloadTonnes}
                    onChange={(e) => onUpdatePayloadTonnes(parseFloat(e.target.value) || 0)}
                    className={`w-20 px-2 py-1 text-right text-xs font-black rounded-lg border focus:outline-none focus:border-amber-500 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="text-xs font-bold text-amber-400">Tonnes</span>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={0.5}
                max={Math.max(45, maxTruckPayload)}
                step={0.5}
                value={payloadTonnes}
                onChange={(e) => onUpdatePayloadTonnes(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />

              {/* Overweight warning */}
              {isOverweight && (
                <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>
                    Warning: Payload ({payloadTonnes}t) exceeds truck rating ({maxTruckPayload}t). Switch to a multi-axle trailer in the Fleet tab.
                  </span>
                </div>
              )}

              {/* Live physics preview */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-900/60' : 'bg-white'}`}>
                  <span className="text-slate-400 block text-[10px]">Estimated Fuel Burn</span>
                  <span className="font-bold text-emerald-400">{estimatedFuelRate} L / 100km</span>
                </div>
                <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-900/60' : 'bg-white'}`}>
                  <span className="text-slate-400 block text-[10px]">Gross Mass (GVW)</span>
                  <span className="font-bold text-amber-400">
                    {((activeTruck?.tare_weight_tonnes || 15) + payloadTonnes).toFixed(1)} Tonnes
                  </span>
                </div>
              </div>
            </div>

            {/* Consignment Declared Value */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Declared Goods Value:</span>
              <div className="flex items-center gap-1 font-bold text-slate-200">
                <span>₹</span>
                <input
                  type="number"
                  value={cargoValueLakhs}
                  onChange={(e) => setCargoValueLakhs(parseInt(e.target.value) || 0)}
                  className={`w-16 px-1.5 py-0.5 rounded text-right border ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                />
                <span>Lakhs</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: TRUCK FLEET ================= */}
        {activeSubTab === 'trucks' && (
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
                <TruckIcon className="w-3.5 h-3.5" />
                Select Vehicle Type & Powertrain
              </h3>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Choose from heavy commercial haulers, reefers, tankers, or urban LCVs with calibrated dynamics.
              </p>
            </div>

            <div className="space-y-2">
              {profiles.map((truck) => {
                const isSelected = activeTruck?.id === truck.id;
                const canHandlePayload = payloadTonnes <= truck.max_payload_tonnes;

                return (
                  <button
                    key={truck.id}
                    onClick={() => onSelectTruckProfile(truck)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/15 shadow-lg shadow-emerald-950/30'
                        : isDark
                        ? 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{truck.icon}</span>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{truck.name}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                          <div className="text-[10px] text-slate-400">{truck.category}</div>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        canHandlePayload
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        Max {truck.max_payload_tonnes}t
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 mt-2 text-[10px] text-slate-300">
                      <div>Power: <strong>{truck.engine_power_hp} HP</strong></div>
                      <div>Axles: <strong>{truck.axle_count}</strong></div>
                      <div>Optimal: <strong>{truck.optimal_speed_kmh} km/h</strong></div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================= OPTIMIZATION FOOTER ================= */}
      <div className={`p-4 border-t ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50'} space-y-3`}>
        {/* Mode Selector */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-400">Algorithm Objective:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setOptimizationMode('fuel_efficient')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                optimizationMode === 'fuel_efficient'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Fuel className="w-3 h-3" />
              <span>Fuel</span>
            </button>
            <button
              onClick={() => setOptimizationMode('time_efficient')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                optimizationMode === 'time_efficient'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Time</span>
            </button>
            <button
              onClick={() => setOptimizationMode('balanced')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                optimizationMode === 'balanced'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Gauge className="w-3 h-3" />
              <span>Balanced</span>
            </button>
          </div>
        </div>

        {/* Big Optimization Button */}
        <button
          onClick={handleRunOptimizer}
          disabled={isOptimizing || waypoints.length < 2}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-black text-sm shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isOptimizing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Solving Multi-Stop TSP & Physics...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Find Most Fuel & Time Efficient Route (ML)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
