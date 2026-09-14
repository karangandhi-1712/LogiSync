import { Anchor, Activity, Container, Clock } from 'lucide-react';

const METRICS = [
  { icon: <Anchor className="w-3.5 h-3.5" />, label: 'AIS Vessels', value: '12', color: 'text-sky-500 dark:text-cyan-400' },
  { icon: <Container className="w-3.5 h-3.5" />, label: 'Yard Density', value: '74.2%', color: 'text-amber-500' },
  { icon: <Clock className="w-3.5 h-3.5" />, label: 'Avg Gate Wait', value: '11m', color: 'text-emerald-500' },
];

export function SubHeaderStrip() {
  return (
    <div className="h-11 flex items-center px-4 gap-4 border-b flex-shrink-0
      bg-slate-50 dark:bg-[#0d1c2d] border-slate-200 dark:border-[rgba(100,130,200,0.15)]"
    >
      {/* Terminal ID */}
      <div className="flex items-center gap-2 min-w-0">
        <Anchor className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
          Terminal: V.O. Chidambaranar (VOC Port)
        </span>
        {/* Radar sweep indicator */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/40 flex-shrink-0">
          <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">3.2s Sweep</span>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800/40 flex-shrink-0">
          <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 uppercase">Berths 1–8 Normal</span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Quick Metrics */}
      <div className="flex items-center gap-3">
        {METRICS.map((m, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className={m.color}>{m.icon}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block">{m.label}:</span>
            <span className="text-xs font-bold tabular text-slate-700 dark:text-slate-200">{m.value}</span>
          </div>
        ))}
      </div>

      {/* Telemetry Layers button */}
      <button className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold
        border border-slate-300 dark:border-slate-700
        text-slate-600 dark:text-slate-300
        hover:bg-sky-50 dark:hover:bg-cyan-500/10 hover:border-sky-300 dark:hover:border-cyan-500/50 hover:text-sky-600 dark:hover:text-cyan-400
        transition-all duration-200"
      >
        <Activity className="w-3.5 h-3.5" />
        Telemetry Layers
      </button>
    </div>
  );
}
