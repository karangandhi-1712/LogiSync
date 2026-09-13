import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Construction,
  ShieldAlert,
  Clock,
  Shuffle,
  Eye,
  EyeOff,
  Flame,
  CheckCircle,
  Radio
} from 'lucide-react';
import type { TrafficIncident } from '../types/logistics';

interface TrafficRoadblocksPanelProps {
  incidents: TrafficIncident[];
  showTrafficLayer: boolean;
  onToggleTrafficLayer: () => void;
  onAutoDetour: () => void;
  isRerouted: boolean;
}

export const TrafficRoadblocksPanel: React.FC<TrafficRoadblocksPanelProps> = ({
  incidents,
  showTrafficLayer,
  onToggleTrafficLayer,
  onAutoDetour,
  isRerouted,
}) => {
  const roadblocks = incidents.filter((i) => i.type === 'roadblock' || i.isBlockingRoute);
  const totalDelay = incidents.reduce((acc, i) => acc + (i.delayMins || 0), 0);

  return (
    <div className="glass-panel p-4 rounded-2xl flex flex-col gap-3 shadow-2xl border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">Live Roadblocks & Traffic</h3>
            <p className="text-[11px] text-slate-400">Real-time Overpass & Incident Flow</p>
          </div>
        </div>

        {/* Live feed pulse */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTrafficLayer}
            title={showTrafficLayer ? 'Hide Traffic Layer' : 'Show Traffic Layer'}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
              showTrafficLayer
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {showTrafficLayer ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="text-[10px] font-mono">{showTrafficLayer ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Incident Summary Card */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl bg-cyber-900/90 border border-rose-500/20 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Roadblocks</div>
            <div className="text-lg font-bold text-rose-400 flex items-center gap-1.5 font-mono">
              <span>{roadblocks.length}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
            </div>
          </div>
          <AlertTriangle className="w-5 h-5 text-rose-400/60" />
        </div>

        <div className="p-2.5 rounded-xl bg-cyber-900/90 border border-amber-500/20 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Congestion Delay</div>
            <div className="text-lg font-bold text-amber-400 flex items-center gap-1 font-mono">
              <span>+{totalDelay}</span>
              <span className="text-xs text-amber-300/80">min</span>
            </div>
          </div>
          <Clock className="w-5 h-5 text-amber-400/60" />
        </div>
      </div>

      {/* Auto Reroute / Detour Button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={onAutoDetour}
        className={`w-full py-2.5 px-3 rounded-xl border font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
          isRerouted
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
            : 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30 hover:border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
        }`}
      >
        {isRerouted ? (
          <>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Detour Active (Roadblocks Avoided)</span>
          </>
        ) : (
          <>
            <Shuffle className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Smart Detour (Avoid Roadblocks)</span>
          </>
        )}
      </motion.button>

      {/* Incident List */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5 pt-1">
          <Radio className="w-3 h-3 text-rose-400 animate-pulse" />
          <span>Active Incident Telemetry</span>
        </div>

        {incidents.map((incident) => {
          const isBlock = incident.type === 'roadblock';
          return (
            <div
              key={incident.id}
              className={`p-2.5 rounded-xl border text-xs transition-all ${
                isBlock
                  ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                  : 'bg-cyber-900/60 border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 shrink-0">
                    {incident.type === 'roadblock' && (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    {incident.type === 'construction' && (
                      <Construction className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    {incident.type === 'congestion' && (
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                    )}
                    {incident.type === 'accident' && (
                      <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-xs">{incident.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{incident.roadName}</div>
                    <div className="text-[11px] text-slate-300 mt-1 leading-snug">
                      {incident.description}
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    isBlock ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  +{incident.delayMins}m
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
