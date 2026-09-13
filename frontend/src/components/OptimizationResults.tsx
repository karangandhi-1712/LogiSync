import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingDown, Fuel, Clock, Leaf, IndianRupee, Gauge, ArrowRight, Sparkles } from 'lucide-react';
import type { OptimizationResult } from '../types/logistics';
import { useTheme } from '../context/ThemeContext';

interface OptimizationResultsProps {
  result: OptimizationResult | null;
  onClose: () => void;
  onApplyOptimizedRoute: (result: OptimizationResult) => void;
}

export const OptimizationResults: React.FC<OptimizationResultsProps> = ({
  result,
  onClose,
  onApplyOptimizedRoute,
}) => {
  const { isDark } = useTheme();

  if (!result) return null;

  const metrics = [
    {
      label: 'Distance',
      original: `${result.original_distance_km.toFixed(1)} km`,
      optimized: `${result.total_distance_km.toFixed(1)} km`,
      saved: `${(result.original_distance_km - result.total_distance_km).toFixed(1)} km`,
      pct: ((result.original_distance_km - result.total_distance_km) / Math.max(result.original_distance_km, 0.1) * 100).toFixed(1),
      icon: <TrendingDown className="w-3.5 h-3.5" />,
      color: 'cyan',
    },
    {
      label: 'Fuel',
      original: `${result.original_fuel_L.toFixed(1)} L`,
      optimized: `${result.total_fuel_L.toFixed(1)} L`,
      saved: `${result.fuel_saved_L.toFixed(1)} L`,
      pct: ((result.fuel_saved_L / Math.max(result.original_fuel_L, 0.1)) * 100).toFixed(1),
      icon: <Fuel className="w-3.5 h-3.5" />,
      color: 'emerald',
    },
    {
      label: 'Time',
      original: `${result.original_time_mins.toFixed(0)} min`,
      optimized: `${result.total_time_mins.toFixed(0)} min`,
      saved: `${result.time_saved_mins.toFixed(0)} min`,
      pct: ((result.time_saved_mins / Math.max(result.original_time_mins, 0.1)) * 100).toFixed(1),
      icon: <Clock className="w-3.5 h-3.5" />,
      color: 'amber',
    },
    {
      label: 'CO₂',
      original: `${result.original_co2_kg.toFixed(1)} kg`,
      optimized: `${result.total_co2_kg.toFixed(1)} kg`,
      saved: `${(result.original_co2_kg - result.total_co2_kg).toFixed(1)} kg`,
      pct: (((result.original_co2_kg - result.total_co2_kg) / Math.max(result.original_co2_kg, 0.1)) * 100).toFixed(1),
      icon: <Leaf className="w-3.5 h-3.5" />,
      color: 'green',
    },
    {
      label: 'Cost',
      original: `₹${result.original_cost_inr.toLocaleString()}`,
      optimized: `₹${result.total_cost_inr.toLocaleString()}`,
      saved: `₹${result.cost_saved_inr.toLocaleString()}`,
      pct: ((result.cost_saved_inr / Math.max(result.original_cost_inr, 0.1)) * 100).toFixed(1),
      icon: <IndianRupee className="w-3.5 h-3.5" />,
      color: 'violet',
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel rounded-2xl border border-white/10 w-[360px] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className={`px-4 py-3 flex items-center justify-between border-b border-white/10 ${
          isDark
            ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10'
            : 'bg-gradient-to-r from-indigo-500/10 to-blue-500/10'
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-indigo-600'}`} />
            <div>
              <h3 className="text-xs font-bold font-display tracking-wide">ML OPTIMIZATION RESULTS</h3>
              <p className="text-[9px] text-slate-400">
                GA ran {result.generations_run} generations · {result.optimization_mode.replace('_', ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Efficiency Score */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-center">
          <div className="relative w-24 h-24">
            {/* Background circle */}
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                strokeWidth="8"
              />
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke={isDark ? '#00f2fe' : '#4f46e5'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${result.efficiency_score * 2.64} 264`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-black font-mono ${isDark ? 'text-cyan-400' : 'text-indigo-600'}`}>
                {result.efficiency_score.toFixed(0)}
              </span>
              <span className="text-[8px] font-mono text-slate-400 uppercase">SCORE</span>
            </div>
          </div>

          <div className="ml-4 space-y-1">
            <div className="text-[10px] text-slate-400 font-mono">IMPROVEMENT</div>
            <div className={`text-2xl font-black font-mono ${
              result.improvement_pct > 0 ? 'text-emerald-400' : 'text-slate-400'
            }`}>
              {result.improvement_pct > 0 ? '+' : ''}{result.improvement_pct}%
            </div>
            <div className="text-[9px] text-slate-500 font-mono">
              {result.fuel_rate_L_per_100km} L/100km
            </div>
          </div>
        </div>

        {/* Metrics Comparison Grid */}
        <div className="px-4 pb-3 space-y-1.5">
          {/* Column Headers */}
          <div className="grid grid-cols-4 gap-1 text-[8px] font-mono text-slate-500 uppercase px-1">
            <span>Metric</span>
            <span className="text-center">Original</span>
            <span className="text-center">Optimized</span>
            <span className="text-right">Saved</span>
          </div>

          {metrics.map((m, idx) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-panel-subtle rounded-lg p-2 grid grid-cols-4 gap-1 items-center"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                {m.icon}
                <span>{m.label}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 text-center line-through opacity-60">
                {m.original}
              </div>
              <div className={`text-[10px] font-mono font-bold text-center ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {m.optimized}
              </div>
              <div className="text-[10px] font-mono font-bold text-emerald-400 text-right">
                {parseFloat(m.pct) > 0 ? `↓${m.pct}%` : '—'}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Optimized Route Order */}
        <div className="px-4 pb-3">
          <div className="text-[10px] font-mono font-semibold text-slate-400 uppercase mb-1.5">Optimized Route Order</div>
          <div className="flex items-center gap-1 flex-wrap">
            {result.optimized_waypoint_names.map((name, idx) => (
              <React.Fragment key={idx}>
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold font-mono ${
                  isDark
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'bg-indigo-500/15 text-indigo-600 border border-indigo-500/30'
                }`}>
                  {String.fromCharCode(65 + idx)}: {name.slice(0, 15)}
                </span>
                {idx < result.optimized_waypoint_names.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Apply Button */}
        <div className="px-4 pb-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onApplyOptimizedRoute(result)}
            className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              isDark
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-600 text-black hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : 'bg-gradient-to-r from-emerald-500 to-indigo-600 text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]'
            }`}
          >
            <Gauge className="w-4 h-4" />
            Apply Optimized Route
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
