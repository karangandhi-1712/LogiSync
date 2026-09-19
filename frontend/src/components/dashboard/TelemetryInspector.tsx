import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Gauge, Navigation, Fuel, Snowflake,
  MapPin, Route, Star, Clock, Phone, Zap
} from 'lucide-react';
import { clsx } from 'clsx';
import { DriverCallModal } from '../common/DriverCallModal';
import type { Truck } from '../../types';

interface TelemetryInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerReroute?: () => void;
  selectedTruck?: Truck | null;
}

export function TelemetryInspector({ isOpen, onClose, onTriggerReroute, selectedTruck }: TelemetryInspectorProps) {
  const [isCalling, setIsCalling] = useState(false);
  const t = {
    id: selectedTruck?.id || 'TRK-8821',
    plate: selectedTruck?.plate || 'TN-04-E-8821',
    make: selectedTruck?.vehicleMake || 'Scania R500',
    container: selectedTruck?.containerSize || 'High Cube 40ft',
    vin: selectedTruck?.vin || '#SC-990812',
    status: (selectedTruck?.status?.toUpperCase() || 'IN TRANSIT') as any,
    driver: {
      name: selectedTruck?.driver?.name || 'Rajesh Kumar',
      rating: selectedTruck?.driver?.rating || 4.9,
      dutyHrs: selectedTruck?.driver?.dutyHours || 4,
      dutyMins: selectedTruck?.driver?.dutyMinutes || 12,
      initials: (selectedTruck?.driver?.name || 'RK').split(' ').map(w => w[0]).join('').slice(0, 2),
    },
    telemetry: {
      speed: Math.round(selectedTruck?.speedKmh ?? 58),
      speedLimit: 70,
      heading: Math.round(selectedTruck?.heading ?? 114),
      headingLabel: (selectedTruck?.heading ?? 114) > 180 ? 'WSW' : 'ENE',
      waypointLabel: 'Waypoint D Vector',
      fuelPct: selectedTruck?.fuelPct ?? 78,
      fuelLitres: Math.round(((selectedTruck?.fuelPct ?? 78) / 100) * 500),
      reeferTemp: selectedTruck?.reeferTempC ?? -18,
      reeferSetTemp: selectedTruck?.reeferSetTempC ?? -20,
      reeferStatus: selectedTruck?.reeferTempC !== null && selectedTruck?.reeferTempC !== undefined ? 'STABLE OK' : 'AMBIENT',
    },
    mission: {
      origin: selectedTruck?.mission?.origin || 'Chennai CFS',
      destination: selectedTruck?.mission?.destination || 'VOC Port Gate 3',
      progressPct: selectedTruck?.mission?.progressPct || 68,
      clearedKm: selectedTruck?.mission?.distanceClearedKm || 184,
      remainingKm: selectedTruck?.mission?.distanceRemainingKm || 42,
      eta: selectedTruck?.mission?.etaTime || '14:15',
      etaStatus: (selectedTruck?.mission?.etaStatus?.toUpperCase() || 'ON TIME'),
    },
  };


  return (
    <>
      <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="w-[400px] flex-shrink-0 flex flex-col h-full overflow-y-auto z-30 relative
            liquid-glass border-l border-l-white/50 dark:border-l-white/15 backdrop-blur-3xl
            shadow-[-10px_0_40px_rgba(0,0,0,0.1)] dark:shadow-[-12px_0_40px_rgba(0,0,0,0.5)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/40 dark:border-white/10 flex-shrink-0">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-black text-slate-900 dark:text-white text-lg tracking-tight chroma-text">
                  {t.id}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                  {t.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {t.make} • {t.container} • VIN {t.vin}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/60 neu-button transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Driver Card with Neumorphic Depth */}
            <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-sm font-black text-white">{t.driver.initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{t.driver.name}</span>
                  <div className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-500/10">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{t.driver.rating}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">
                  <Clock className="w-3 h-3 inline mr-1 text-cyan-500" />
                  Duty Log: {t.driver.dutyHrs}h {t.driver.dutyMins}m
                </p>
              </div>
              <button
                onClick={() => setIsCalling(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
                bg-emerald-500/15 text-emerald-700 dark:text-emerald-300
                border border-emerald-400/30 hover:bg-emerald-500/25 neu-button transition-all"
              >
                <Phone className="w-3 h-3 text-emerald-500" />
                <span>Call</span>
              </button>
            </div>

            {/* Telemetry 2x2 Grid with Tactile Neu-Glass Insets */}
            <div className="grid grid-cols-2 gap-3">
              {/* Speed */}
              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Gauge className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Speed</span>
                </div>
                <div className="text-2xl font-black tabular text-slate-900 dark:text-white font-mono">
                  {t.telemetry.speed}
                  <span className="text-xs font-medium text-slate-400 ml-1">km/h</span>
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  Limit: {t.telemetry.speedLimit} km/h ✓
                </div>
              </div>

              {/* Heading */}
              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Navigation className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Heading</span>
                </div>
                <div className="text-2xl font-black tabular text-slate-900 dark:text-white font-mono">
                  {t.telemetry.heading}°
                  <span className="text-sm font-bold text-sky-600 dark:text-cyan-400 ml-1">{t.telemetry.headingLabel}</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-1">{t.telemetry.waypointLabel}</div>
              </div>

              {/* Fuel Gauge with Inset Channel */}
              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Fuel className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Fuel Level</span>
                </div>
                <div className="text-2xl font-black tabular text-slate-900 dark:text-white mb-2 font-mono">
                  {t.telemetry.fuelPct}%
                </div>
                <div className="h-2 bg-slate-200/60 dark:bg-slate-800/80 rounded-full overflow-hidden neu-inset-sm">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all shadow-sm',
                      t.telemetry.fuelPct > 50 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_8px_#10b981]' : t.telemetry.fuelPct > 20 ? 'bg-amber-500' : 'bg-red-500'
                    )}
                    style={{ width: `${t.telemetry.fuelPct}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1.5 font-mono">{t.telemetry.fuelLitres}L reserve</div>
              </div>

              {/* Reefer Temperature */}
              <div className="p-3.5 rounded-2xl bg-sky-500/10 dark:bg-cyan-500/10 border border-sky-400/30 dark:border-cyan-400/30 neu-flat-sm">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Snowflake className="w-3.5 h-3.5 text-cyan-500 animate-spin-slow" />
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 uppercase font-bold tracking-wider">Reefer Temp</span>
                </div>
                <div className="text-2xl font-black tabular text-cyan-600 dark:text-cyan-300 font-mono">
                  {t.telemetry.reeferTemp}°C
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Set: {t.telemetry.reeferSetTemp}°C</div>
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">✓ {t.telemetry.reeferStatus}</div>
              </div>
            </div>

            {/* Mission Progress Corridor */}
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm space-y-2.5">
              <div className="flex items-center gap-2">
                <Route className="w-3.5 h-3.5 text-cyan-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Transit Corridor</span>
                <span className="ml-auto px-2 py-0.5 text-[9px] font-black rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30">
                  {t.mission.etaStatus}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{t.mission.origin}</span>
                <div className="flex-1 h-px bg-slate-300/60 dark:bg-slate-700/60" />
                <MapPin className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{t.mission.destination}</span>
              </div>

              <div className="h-2.5 bg-slate-200/60 dark:bg-slate-800/80 rounded-full overflow-hidden neu-inset-sm">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-sky-500 to-emerald-500 rounded-full transition-all shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                  style={{ width: `${t.mission.progressPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{t.mission.clearedKm} km cleared</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{t.mission.progressPct}%</span>
                <span>{t.mission.remainingKm} km left · ETA <b className="text-emerald-500 font-bold">{t.mission.eta}</b></span>
              </div>
            </div>

            {/* Reroute CTA Button */}
            <motion.button
              onClick={onTriggerReroute}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-white
                bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-600
                hover:from-sky-600 hover:via-cyan-600 hover:to-indigo-700
                shadow-[0_4px_20px_rgba(6,182,212,0.4)] hover:shadow-[0_6px_25px_rgba(6,182,212,0.6)]
                border border-white/20 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Trigger Live AI Reroute</span>
            </motion.button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>

    <DriverCallModal
      isOpen={isCalling}
      onClose={() => setIsCalling(false)}
      driverName={t.driver.name}
      driverPhone={selectedTruck?.driver?.phone || '+91 98400 12345'}
      driverRating={t.driver.rating}
      vehiclePlate={t.plate}
    />
  </>
  );
}
