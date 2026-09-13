import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Gauge, Fuel } from 'lucide-react';
import type { SimulationState, RouteResult, Waypoint, TruckProfile } from '../types/logistics';
import { useTheme } from '../context/ThemeContext';

interface TripSimulatorProps {
  simulation: SimulationState;
  routeResult: RouteResult | null;
  waypoints: Waypoint[];
  onTogglePlay: () => void;
  onReset: () => void;
  onChangeSpeed: (speed: number) => void;
  onSeek: (progress: number) => void;
  truckProfile?: TruckProfile | null;
  payloadTonnes?: number;
}

export const TripSimulator: React.FC<TripSimulatorProps> = ({
  simulation,
  routeResult,
  waypoints,
  onTogglePlay,
  onReset,
  onChangeSpeed,
  onSeek,
  truckProfile,
  payloadTonnes,
}) => {
  const { isDark } = useTheme();

  if (!routeResult || routeResult.coordinates.length === 0) return null;

  const currentLegName =
    waypoints[simulation.currentLegIndex] && waypoints[simulation.currentLegIndex + 1]
      ? `Leg ${simulation.currentLegIndex + 1}: ${waypoints[simulation.currentLegIndex].label} (${waypoints[simulation.currentLegIndex].name.slice(0, 16)}...) → ${waypoints[simulation.currentLegIndex + 1].label}`
      : 'In Transit';

  const truckIcon = truckProfile?.icon || '🚚';
  const truckName = truckProfile?.name || 'Fleet Unit';
  const fuelBurned = simulation.fuelBurned ?? 0;
  const fuelTotal = simulation.fuelTotal ?? 0;
  const fuelPct = fuelTotal > 0 ? Math.min(100, (fuelBurned / fuelTotal) * 100) : 0;


  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="glass-panel py-3 px-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10 shadow-2xl backdrop-blur-xl w-full max-w-5xl"
    >
      {/* Left: Vehicle Status & Live Telemetry */}
      <div className="flex items-center gap-3.5 min-w-[240px]">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
          isDark
            ? 'from-cyan-500/20 to-emerald-500/20 border-cyan-500/40'
            : 'from-indigo-500/20 to-blue-500/20 border-indigo-500/40'
        } border flex items-center justify-center shadow-[0_0_15px_rgba(0,242,254,0.2)] text-xl`}>
          {truckIcon}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono uppercase tracking-wider">
              {truckName}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                simulation.isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
          </div>
          <div className={`text-[11px] ${isDark ? 'text-cyan-300/90' : 'text-indigo-600'} font-medium truncate max-w-[200px]`}>
            {currentLegName}
          </div>
          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
            <span>{simulation.currentCoord[1].toFixed(4)}°N, {simulation.currentCoord[0].toFixed(4)}°E</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold flex items-center gap-0.5">
              <Gauge className="w-2.5 h-2.5" />
              {simulation.currentSpeedKmH} km/h
            </span>
            {payloadTonnes !== undefined && (
              <>
                <span>•</span>
                <span className="text-amber-400 font-bold">{payloadTonnes}T</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Progress Bar & Fuel Gauge */}
      <div className="flex-1 w-full max-w-md flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
          <span>{waypoints[0]?.label || 'A'} (Start)</span>
          <span className={`${isDark ? 'text-cyan-400' : 'text-indigo-600'} font-bold`}>
            {Math.round(simulation.progress * 100)}% DISPATCHED
          </span>
          <span>{waypoints[waypoints.length - 1]?.label || 'End'} (Dest)</span>
        </div>

        <div className="relative w-full flex items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={simulation.progress}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
              isDark ? 'bg-slate-800 accent-cyan-400' : 'bg-slate-200 accent-indigo-500'
            }`}
          />
        </div>

        {/* Fuel Gauge Bar */}
        {fuelTotal > 0 && (
          <div className="flex items-center gap-2">
            <Fuel className="w-3 h-3 text-amber-400" />
            <div className={`flex-1 h-1.5 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-200'} overflow-hidden`}>
              <motion.div
                className={`h-full rounded-full ${
                  fuelPct > 75 ? 'bg-rose-500' : fuelPct > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${fuelPct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-[9px] font-mono text-slate-400 min-w-[60px] text-right">
              {fuelBurned.toFixed(1)}L / {fuelTotal.toFixed(0)}L
            </span>
          </div>
        )}
      </div>

      {/* Right: Controls & Speed */}
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onTogglePlay}
          className={`p-2.5 rounded-xl font-bold transition-colors ${
            isDark
              ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(0,242,254,0.4)]'
              : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]'
          }`}
          title={simulation.isPlaying ? 'Pause Simulation' : 'Play Simulation'}
        >
          {simulation.isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
        </motion.button>

        {/* Reset Button */}
        <button
          onClick={onReset}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
          title="Reset Trip to Origin"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Speed Multiplier */}
        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
          {[1, 2, 5, 10].map((spd) => (
            <button
              key={spd}
              onClick={() => onChangeSpeed(spd)}
              className={`px-2 py-1 text-[10px] font-mono font-bold rounded-lg transition-colors ${
                simulation.playbackSpeed === spd
                  ? isDark
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-indigo-500/30 text-indigo-600 border border-indigo-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
