import React from 'react';
import { motion } from 'framer-motion';
import {
  Navigation,
  Clock,
  AlertOctagon,
  Fuel,
  TrendingDown
} from 'lucide-react';
import type { RouteResult, TrafficIncident } from '../types/logistics';

interface KPIStatsHeaderProps {
  routeResult: RouteResult | null;
  incidents: TrafficIncident[];
  isRerouted: boolean;
}

export const KPIStatsHeader: React.FC<KPIStatsHeaderProps> = ({
  routeResult,
  incidents,
  isRerouted,
}) => {
  const distKm = routeResult ? routeResult.totalDistanceKm : 0;
  const etaMins = routeResult ? routeResult.totalDurationMins : 0;
  const trafficDelay = routeResult ? routeResult.trafficDelayMins : 0;
  const roadblocksCount = incidents.filter(i => i.type === 'roadblock' || i.isBlockingRoute).length;

  // Estimated fuel calculation: Heavy commercial vehicle avg 3.5 km/L -> ~0.285 L/km
  const fuelLiters = Math.round(distKm * 0.285);
  // CO2: ~2.68 kg CO2 per liter diesel
  const co2Kg = Math.round(fuelLiters * 2.68);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {/* Distance Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel py-2 px-3.5 rounded-xl border border-white/10 flex items-center gap-3 shadow-lg"
      >
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
          <Navigation className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Total Route</div>
          <div className="text-sm font-bold text-white font-mono flex items-baseline gap-1">
            <span>{distKm}</span>
            <span className="text-[10px] font-normal text-slate-400">km</span>
          </div>
        </div>
      </motion.div>

      {/* ETA & Traffic Delay Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-panel py-2 px-3.5 rounded-xl border border-white/10 flex items-center gap-3 shadow-lg"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Estimated Transit</div>
          <div className="text-sm font-bold text-white font-mono flex items-baseline gap-1.5">
            <span>{etaMins}m</span>
            {trafficDelay > 0 && (
              <span className="text-[10px] font-semibold text-amber-400">
                (+{trafficDelay}m congestion)
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Roadblocks Avoidance */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel py-2 px-3.5 rounded-xl border border-white/10 flex items-center gap-3 shadow-lg"
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
            isRerouted
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : roadblocksCount > 0
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              : 'bg-slate-500/15 border-slate-500/30 text-slate-400'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Route Safety</div>
          <div className="text-sm font-bold font-mono">
            {isRerouted ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                Hazards Bypassed
              </span>
            ) : roadblocksCount > 0 ? (
              <span className="text-rose-400">
                {roadblocksCount} Bottleneck{roadblocksCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-slate-300">All Corridors Clear</span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Fuel / Eco Telemetry */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="hidden lg:flex glass-panel py-2 px-3.5 rounded-xl border border-white/10 items-center gap-3 shadow-lg"
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Fuel className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Energy & Footprint</div>
          <div className="text-sm font-bold text-white font-mono flex items-baseline gap-2">
            <span>{fuelLiters} L</span>
            <span className="text-[10px] text-emerald-400">{co2Kg} kg CO₂</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
