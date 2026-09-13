import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Truck, Gauge } from 'lucide-react';
import type { SimulationState, RouteResult, Waypoint } from '../types/logistics';

interface TripSimulatorProps {
  simulation: SimulationState;
  routeResult: RouteResult | null;
  waypoints: Waypoint[];
  onTogglePlay: () => void;
  onReset: () => void;
  onChangeSpeed: (speed: number) => void;
  onSeek: (progress: number) => void;
}

export const TripSimulator: React.FC<TripSimulatorProps> = ({
  simulation,
  routeResult,
  waypoints,
  onTogglePlay,
  onReset,
  onChangeSpeed,
  onSeek,
}) => {
  if (!routeResult || routeResult.coordinates.length === 0) return null;

  const currentLegName =
    waypoints[simulation.currentLegIndex] && waypoints[simulation.currentLegIndex + 1]
      ? `Leg ${simulation.currentLegIndex + 1}: ${waypoints[simulation.currentLegIndex].label} (${waypoints[simulation.currentLegIndex].name.slice(0, 16)}...) → ${waypoints[simulation.currentLegIndex + 1].label}`
      : 'In Transit';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="glass-panel py-3 px-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10 shadow-2xl backdrop-blur-xl w-full max-w-4xl"
    >
      {/* Left: Vehicle Status & Live Telemetry */}
      <div className="flex items-center gap-3.5 min-w-[240px]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.2)]">
          <Truck className="w-5 h-5 animate-pulse" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              FLEET UNIT #TN-69-MMLP
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                simulation.isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
          </div>
          <div className="text-[11px] text-cyan-300/90 font-medium truncate max-w-[200px]">
            {currentLegName}
          </div>
          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
            <span>{simulation.currentCoord[1].toFixed(4)}°N, {simulation.currentCoord[0].toFixed(4)}°E</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold flex items-center gap-0.5">
              <Gauge className="w-2.5 h-2.5" />
              {simulation.currentSpeedKmH} km/h
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Progress Bar & Scrubber */}
      <div className="flex-1 w-full max-w-md flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
          <span>{waypoints[0]?.label || 'A'} (Start)</span>
          <span className="text-cyan-400 font-bold">{Math.round(simulation.progress * 100)}% DISPATCHED</span>
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
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
          />
        </div>
      </div>

      {/* Right: Controls & Speed */}
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onTogglePlay}
          className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_15px_rgba(0,242,254,0.4)] transition-colors"
          title={simulation.isPlaying ? 'Pause Simulation' : 'Play Simulation'}
        >
          {simulation.isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black" />}
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
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
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
