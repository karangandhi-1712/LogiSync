import React from 'react';
import { Box, Truck, Clock, Cpu } from 'lucide-react';

interface HeaderKPIsProps {
  kpis: any;
  activeMode: string;
  setActiveMode: (mode: string) => void;
  liveTelemetryCount: number;
}

export const HeaderKPIs: React.FC<HeaderKPIsProps> = ({
  kpis,
  activeMode,
  setActiveMode,
  liveTelemetryCount
}) => {
  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white px-4 lg:px-6 py-3 sticky top-0 z-30 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Terminal Identifier */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Box className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base lg:text-lg font-extrabold bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent tracking-tight">
                Thoothukudi MMLP
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LOGISTICS DIGITAL TWIN
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Live IoT Telemetry • VOC Port & MMLP Corridor (OSM 3D)
            </p>
          </div>
        </div>

        {/* Real-time KPI Metric Badges */}
        <div className="hidden xl:flex items-center space-x-3">
          <div className="bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400">Avg TAT</div>
              <div className="text-xs font-mono font-bold text-cyan-300">
                {kpis?.avg_turnaround_time_mins || 31.4} <span className="text-[10px] font-normal text-slate-400">min</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2.5">
            <Box className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400">Yard Stacks</div>
              <div className="text-xs font-mono font-bold text-blue-300">
                {kpis?.current_teu_stored || 2960} <span className="text-[10px] font-normal text-slate-400">TEU</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2.5">
            <Truck className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400">Fleet Active</div>
              <div className="text-xs font-mono font-bold text-emerald-300">
                {liveTelemetryCount || 5} <span className="text-[10px] font-normal text-slate-400">Units</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2.5">
            <Cpu className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400">Crane Speed</div>
              <div className="text-xs font-mono font-bold text-purple-300">
                {kpis?.crane_productivity_teu_hr || 28.5} <span className="text-[10px] font-normal text-slate-400">TEU/h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Mode Switcher */}
        <div className="flex items-center bg-slate-950/90 p-1 rounded-xl border border-slate-800 flex-wrap gap-1">
          <button
            onClick={() => setActiveMode('3d-map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === '3d-map'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            3D Map & Fleet
          </button>
          <button
            onClick={() => setActiveMode('logistics-app')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'logistics-app'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Logistics & Passes
          </button>
          <button
            onClick={() => setActiveMode('sensors')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'sensors'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            IoT Sensors & Gates
          </button>
          <button
            onClick={() => setActiveMode('scenarios')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'scenarios'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Scenarios & Benchmarks
          </button>
          <button
            onClick={() => setActiveMode('digital-twin-state')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'digital-twin-state'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Observed vs Projected
          </button>
          <button
            onClick={() => setActiveMode('simulation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'simulation'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            SimPy Sim
          </button>
          <button
            onClick={() => setActiveMode('optimization')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeMode === 'optimization'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            OR-Tools
          </button>
        </div>
      </div>
    </header>
  );
};
