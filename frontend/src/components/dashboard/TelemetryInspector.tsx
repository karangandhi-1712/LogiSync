import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Gauge, Navigation, Fuel, Snowflake,
  MapPin, Route, Star, Clock, Phone, Zap
} from 'lucide-react';
import { clsx } from 'clsx';

interface TelemetryInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerReroute?: () => void;
}

// Realistic demo truck data — TRK-8821
const TRUCK_DATA = {
  id: 'TRK-8821',
  plate: 'TN-04-E-8821',
  make: 'Scania R500',
  container: 'High Cube 40ft',
  vin: '#SC-990812',
  status: 'IN TRANSIT' as const,
  driver: {
    name: 'Rajesh Kumar',
    rating: 4.9,
    dutyHrs: 4,
    dutyMins: 12,
    initials: 'RK',
  },
  telemetry: {
    speed: 58,
    speedLimit: 70,
    heading: 114,
    headingLabel: 'ESE',
    waypointLabel: 'Waypoint D Vector',
    fuelPct: 78,
    fuelLitres: 420,
    reeferTemp: -18,
    reeferSetTemp: -20,
    reeferStatus: 'STABLE OK',
  },
  mission: {
    origin: 'Chennai CFS',
    destination: 'VOC Port Gate 3',
    progressPct: 68,
    clearedKm: 184,
    remainingKm: 42,
    eta: '14:15',
    etaStatus: 'ON TIME',
  },
  gnssSnr: 99.84,
};

export function TelemetryInspector({ isOpen, onClose, onTriggerReroute }: TelemetryInspectorProps) {
  const t = TRUCK_DATA;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-[380px] flex-shrink-0 flex flex-col h-full overflow-y-auto
            bg-white dark:bg-navy-600 border-l border-slate-200 dark:border-[rgba(100,130,200,0.15)]
            shadow-[-4px_0_20px_rgba(0,0,0,0.04)] dark:shadow-[-4px_0_20px_rgba(6,182,212,0.05)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 flex-shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 dark:text-white text-base">{t.id}</span>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  {t.status}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {t.make} • {t.container} • VIN {t.vin}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Driver Card */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 dark:from-cyan-400 dark:to-blue-500 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">{t.driver.initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.driver.name}</span>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{t.driver.rating}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  <Clock className="w-3 h-3 inline mr-0.5" />
                  Duty: {t.driver.dutyHrs}h {t.driver.dutyMins}m
                </p>
              </div>
              <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold
                bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400
                border border-emerald-200 dark:border-emerald-800/40
                hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors">
                <Phone className="w-3 h-3" /> Call
              </button>
            </div>

            {/* Telemetry 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Speed */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Gauge className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Speed</span>
                </div>
                <div className="text-2xl font-black tabular text-slate-800 dark:text-white">
                  {t.telemetry.speed}
                  <span className="text-xs font-medium text-slate-400 ml-1">km/h</span>
                </div>
                <div className="text-[10px] text-emerald-500 font-semibold">Limit: {t.telemetry.speedLimit} km/h ✓</div>
              </div>

              {/* Heading */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Navigation className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Heading</span>
                </div>
                <div className="text-2xl font-black tabular text-slate-800 dark:text-white">
                  {t.telemetry.heading}°
                  <span className="text-sm font-bold text-sky-500 dark:text-cyan-400 ml-1">{t.telemetry.headingLabel}</span>
                </div>
                <div className="text-[10px] text-slate-400">{t.telemetry.waypointLabel}</div>
              </div>

              {/* Fuel */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <Fuel className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Fuel Tank</span>
                </div>
                <div className="text-2xl font-black tabular text-slate-800 dark:text-white mb-1">
                  {t.telemetry.fuelPct}%
                </div>
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all', t.telemetry.fuelPct > 50 ? 'bg-emerald-500' : t.telemetry.fuelPct > 20 ? 'bg-amber-500' : 'bg-red-500')}
                    style={{ width: `${t.telemetry.fuelPct}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{t.telemetry.fuelLitres}L reserve</div>
              </div>

              {/* Reefer Temp */}
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/40">
                <div className="flex items-center gap-1.5 mb-1">
                  <Snowflake className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />
                  <span className="text-[10px] text-sky-400 uppercase font-medium">Reefer Temp</span>
                </div>
                <div className="text-2xl font-black tabular text-sky-600 dark:text-cyan-300">
                  {t.telemetry.reeferTemp}°C
                </div>
                <div className="text-[10px] text-sky-400">Set: {t.telemetry.reeferSetTemp}°C</div>
                <div className="text-[10px] font-bold text-emerald-500 mt-0.5">✓ {t.telemetry.reeferStatus}</div>
              </div>
            </div>

            {/* Mission Progress */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Route className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Active Corridor</span>
                <span className="ml-auto px-2 py-0.5 text-[9px] font-black rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                  {t.mission.etaStatus}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-500 dark:text-slate-400">{t.mission.origin}</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <MapPin className="w-3 h-3 text-sky-500 dark:text-cyan-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t.mission.destination}</span>
              </div>

              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 dark:from-cyan-500 dark:to-emerald-400 rounded-full transition-all"
                  style={{ width: `${t.mission.progressPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                <span className="tabular">{t.mission.clearedKm} km cleared</span>
                <span className="font-bold text-slate-600 dark:text-slate-300">{t.mission.progressPct}%</span>
                <span className="tabular">{t.mission.remainingKm} km left · ETA <b className="text-emerald-500">{t.mission.eta}</b></span>
              </div>
            </div>

            {/* AI Route Optimizer Alert */}
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">AI Route Optimizer</p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-300/80 mb-2">
                    Gate 1 bottleneck detected (+32m delay). Recommend diversion to <b>Gate 3 via Coastal Bypass</b>.
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                      ↓ Saved: 26 mins
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 tabular">
                      SNR: {t.gnssSnr}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reroute CTA */}
            <button
              onClick={onTriggerReroute}
              className="w-full py-3 rounded-xl font-bold text-sm text-white
                bg-gradient-to-r from-sky-500 to-blue-600 dark:from-cyan-500 dark:to-blue-500
                hover:from-sky-600 hover:to-blue-700 dark:hover:from-cyan-600 dark:hover:to-blue-600
                shadow-glow-sky dark:shadow-glow-cyan
                flex items-center justify-center gap-2 transition-all duration-200"
            >
              <Zap className="w-4 h-4" />
              ⚡ Trigger Live Reroute
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
