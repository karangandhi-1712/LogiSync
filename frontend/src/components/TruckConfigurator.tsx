import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Weight, Clock, Gauge, Fuel, ChevronDown, Sparkles } from 'lucide-react';
import type { TruckProfile, OptimizationMode, Waypoint, OptimizationResult } from '../types/logistics';
import { fetchTruckProfiles, optimizeRoute } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface TruckConfiguratorProps {
  waypoints: Waypoint[];
  onOptimizationResult: (result: OptimizationResult) => void;
}

const MODE_CONFIG: Record<OptimizationMode, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
  fuel_efficient: { label: 'Fuel Efficient', icon: <Fuel className="w-3.5 h-3.5" />, color: 'emerald', desc: 'Minimize fuel consumption' },
  time_efficient: { label: 'Time Efficient', icon: <Clock className="w-3.5 h-3.5" />, color: 'cyan', desc: 'Minimize travel time' },
  balanced:       { label: 'Balanced', icon: <Gauge className="w-3.5 h-3.5" />, color: 'amber', desc: 'Best fuel + time trade-off' },
};

export const TruckConfigurator: React.FC<TruckConfiguratorProps> = ({
  waypoints,
  onOptimizationResult,
}) => {
  const { isDark } = useTheme();
  const [profiles, setProfiles] = useState<TruckProfile[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState('container_chassis');
  const [payloadTonnes, setPayloadTonnes] = useState(15);
  const [mode, setMode] = useState<OptimizationMode>('balanced');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showTruckPicker, setShowTruckPicker] = useState(false);

  useEffect(() => {
    fetchTruckProfiles().then(setProfiles);
  }, []);

  const selectedProfile = profiles.find(p => p.id === selectedTruckId) || profiles[0];
  const maxPayload = selectedProfile?.max_payload_tonnes || 28;

  // Clamp payload when truck changes
  useEffect(() => {
    if (payloadTonnes > maxPayload) {
      setPayloadTonnes(Math.round(maxPayload * 0.6));
    }
  }, [selectedTruckId, maxPayload]);

  // Interpolated fuel rate preview
  const fuelPreview = selectedProfile
    ? (
        selectedProfile.base_fuel_rate_L_per_100km +
        (selectedProfile.loaded_fuel_rate_L_per_100km - selectedProfile.base_fuel_rate_L_per_100km) *
        (payloadTonnes / Math.max(maxPayload, 1))
      ).toFixed(1)
    : '—';

  const handleOptimize = async () => {
    if (waypoints.length < 2) return;
    setIsOptimizing(true);
    try {
      const result = await optimizeRoute(waypoints, selectedTruckId, payloadTonnes, mode);
      onOptimizationResult(result);
    } catch (err) {
      console.error('Optimization failed:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  if (!selectedProfile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl border border-white/10 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${isDark ? 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40' : 'from-indigo-500/20 to-blue-500/20 border-indigo-500/40'} border flex items-center justify-center`}>
          <Truck className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-indigo-600'}`} />
        </div>
        <div>
          <h3 className="text-xs font-bold font-display tracking-wide">CONFIGURE & OPTIMIZE</h3>
          <p className="text-[9px] text-slate-400">Select truck, payload & optimize route</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Truck Selector */}
        <div>
          <label className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
            Truck Type
          </label>
          <button
            onClick={() => setShowTruckPicker(!showTruckPicker)}
            className={`w-full glass-panel-subtle rounded-xl p-3 flex items-center justify-between transition-all border ${
              showTruckPicker
                ? isDark ? 'border-cyan-500/40' : 'border-indigo-500/40'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedProfile.icon}</span>
              <div className="text-left">
                <div className="text-xs font-bold">{selectedProfile.name}</div>
                <div className="text-[10px] text-slate-400">{selectedProfile.category} · {selectedProfile.max_payload_tonnes}T max</div>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showTruckPicker ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showTruckPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {profiles.map(profile => (
                    <button
                      key={profile.id}
                      onClick={() => {
                        setSelectedTruckId(profile.id);
                        setShowTruckPicker(false);
                      }}
                      className={`w-full glass-panel-subtle rounded-lg p-2.5 flex items-center gap-3 transition-all border ${
                        profile.id === selectedTruckId
                          ? isDark ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-indigo-500/40 bg-indigo-500/10'
                          : 'border-transparent hover:border-white/15'
                      }`}
                    >
                      <span className="text-xl">{profile.icon}</span>
                      <div className="text-left flex-1">
                        <div className="text-[11px] font-bold">{profile.name}</div>
                        <div className="text-[9px] text-slate-400">{profile.category} · {profile.engine_power_hp} HP · {profile.max_payload_tonnes}T</div>
                      </div>
                      <div className="text-[9px] font-mono text-slate-500">
                        {profile.base_fuel_rate_L_per_100km}-{profile.loaded_fuel_rate_L_per_100km} L/100km
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Payload Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Weight className="w-3 h-3" /> Payload Weight
            </label>
            <span className={`text-sm font-bold font-mono ${isDark ? 'text-cyan-400' : 'text-indigo-600'}`}>
              {payloadTonnes} T
            </span>
          </div>

          <input
            type="range"
            min="0"
            max={maxPayload}
            step="0.5"
            value={payloadTonnes}
            onChange={(e) => setPayloadTonnes(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />

          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
            <span>0 T (empty)</span>
            <span className={`${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Est. {fuelPreview} L/100km</span>
            <span>{maxPayload} T (max)</span>
          </div>
        </div>

        {/* Optimization Mode */}
        <div>
          <label className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
            Optimization Mode
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(Object.entries(MODE_CONFIG) as [OptimizationMode, typeof MODE_CONFIG[OptimizationMode]][]).map(([key, config]) => {
              const isActive = mode === key;
              const colorClasses: Record<string, string> = {
                emerald: isActive
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200',
                cyan: isActive
                  ? isDark ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-400' : 'border-indigo-500/50 bg-indigo-500/15 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-200',
                amber: isActive
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200',
              };

              return (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`glass-panel-subtle rounded-xl p-2.5 flex flex-col items-center gap-1 transition-all border ${colorClasses[config.color]}`}
                >
                  {config.icon}
                  <span className="text-[9px] font-bold font-mono">{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Stats Preview */}
        <div className="glass-panel-subtle rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[9px] text-slate-400 font-mono">TRUCK</div>
            <div className="text-lg">{selectedProfile.icon}</div>
          </div>
          <div>
            <div className="text-[9px] text-slate-400 font-mono">PAYLOAD</div>
            <div className={`text-sm font-bold font-mono ${isDark ? 'text-cyan-400' : 'text-indigo-600'}`}>{payloadTonnes}T</div>
          </div>
          <div>
            <div className="text-[9px] text-slate-400 font-mono">FUEL RATE</div>
            <div className="text-sm font-bold font-mono text-amber-400">{fuelPreview}</div>
          </div>
        </div>

        {/* Optimize Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOptimize}
          disabled={isOptimizing || waypoints.length < 2}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            isOptimizing
              ? 'bg-slate-700 text-slate-400 cursor-wait'
              : waypoints.length < 2
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : isDark
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black hover:shadow-[0_0_25px_rgba(0,242,254,0.3)]'
                  : 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white hover:shadow-[0_0_25px_rgba(79,70,229,0.3)]'
          }`}
        >
          {isOptimizing ? (
            <>
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
              <span>Running GA Optimizer...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Optimize Route with ML</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};
