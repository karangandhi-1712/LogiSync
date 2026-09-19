// ─── ServiceGateOverview — four collapsible service cards + live clock ────────
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { PORT_SERVICE_MAP } from '../../data/portServiceData';
import type { ServiceCardData, GateStatusType } from '../../data/portServiceData';
import type { PortInfo } from '../../data/ports';

const STATUS_CFG: Record<GateStatusType, { label: string; bg: string; border: string; text: string; dot: string }> = {
  congested: { label: 'CONGESTED', bg: 'bg-red-500/10 dark:bg-red-950/20', border: 'border-red-400/40 dark:border-red-500/30', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500 shadow-[0_0_8px_#ef4444]' },
  normal:    { label: 'NORMAL',    bg: 'bg-white/60 dark:bg-slate-900/60', border: 'border-slate-300/40 dark:border-white/10', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
  optimal:   { label: 'OPTIMAL',  bg: 'bg-emerald-500/10 dark:bg-emerald-950/25', border: 'border-emerald-400/40 dark:border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500 shadow-[0_0_8px_#10b981]' },
  moderate:  { label: 'MODERATE', bg: 'bg-amber-500/10 dark:bg-amber-950/20', border: 'border-amber-400/40 dark:border-amber-500/30', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' },
};

function aggregateService(svc: ServiceCardData): { wait: number; queue: number; status: GateStatusType } {
  const total = svc.gates.length;
  if (total === 0) return { wait: 0, queue: 0, status: 'normal' };
  const wait = Math.round(svc.gates.reduce((s, g) => s + g.waitMin, 0) / total);
  const queue = svc.gates.reduce((s, g) => s + g.queue, 0);
  // Worst status wins
  const ranking: GateStatusType[] = ['congested', 'moderate', 'normal', 'optimal'];
  const status = svc.gates.reduce<GateStatusType>((worst, g) => {
    return ranking.indexOf(g.status) < ranking.indexOf(worst) ? g.status : worst;
  }, 'optimal');
  return { wait, queue, status };
}

interface ServiceGateOverviewProps {
  port: PortInfo | null;
  onRefresh: () => void;
}

function LiveClock({ port }: { port: PortInfo | null }) {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  const ss = String(time.getSeconds()).padStart(2, '0');

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/60 dark:bg-slate-900/50
      border border-white/70 dark:border-white/10 neu-flat-sm">
      <Clock className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
      <div>
        <div className="text-xs font-black font-mono text-slate-900 dark:text-white tabular-nums">
          {hh}:{mm}:{ss} IST
        </div>
        <div className="text-[9px] text-slate-400 uppercase tracking-wider leading-none">
          {port ? `${port.short} LOCAL` : 'SELECT PORT'}
        </div>
      </div>
    </div>
  );
}

export function ServiceGateOverview({ port, onRefresh }: ServiceGateOverviewProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const services: ServiceCardData[] = port ? (PORT_SERVICE_MAP[port.id] ?? []) : [];

  const toggleExpand = (svc: string) => {
    setExpanded(prev => ({ ...prev, [svc]: !prev[svc] }));
  };

  // Null state placeholder services
  const NULL_SERVICES = [
    { service: 'bulk', label: 'Bulk', icon: '⛽' },
    { service: 'general', label: 'General Cargo', icon: '📦' },
    { service: 'container_reefer', label: 'Container/Reefer', icon: '🚢' },
    { service: 'express_rail', label: 'Express Rail', icon: '🚂' },
  ] as const;

  return (
    <div className="px-6 py-4 border-b border-white/40 dark:border-white/10">
      {/* Row header: label + clock + refresh */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            Service & Gate Overview
          </h2>
          {!port && (
            <p className="text-[10px] text-slate-400 mt-0.5">Select a port to view live gate status</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <LiveClock port={port} />
        </div>
      </div>

      {/* Service cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {port ? (
          services.map(svc => {
            const { wait, queue, status } = aggregateService(svc);
            const cfg = STATUS_CFG[status];
            const isExpanded = expanded[svc.service];

            return (
              <div key={svc.service} className="flex flex-col gap-2">
                {/* Collapsed card */}
                <button
                  onClick={() => toggleExpand(svc.service)}
                  className={clsx(
                    'p-3.5 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden backdrop-blur-xl w-full',
                    cfg.bg, cfg.border,
                    'hover:scale-[1.01]',
                    isExpanded && 'ring-2 ring-cyan-400/60 shadow-[0_0_16px_rgba(6,182,212,0.2)]'
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-base">{svc.icon}</span>
                    <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1 truncate">
                    {svc.label}
                  </div>
                  <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-white font-mono">
                    {wait}<span className="text-xs font-medium text-slate-400 ml-1">MIN</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/40 dark:border-white/10">
                    <span className={clsx('text-[9px] font-black uppercase', cfg.text)}>{cfg.label}</span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">{queue} queued</span>
                  </div>
                  {/* Gates indicator */}
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                      +{svc.gates.length} gate{svc.gates.length > 1 ? 's' : ''}
                    </span>
                    <ChevronDown className={clsx(
                      'w-3 h-3 text-slate-400 transition-transform duration-300',
                      isExpanded && 'rotate-180'
                    )} />
                  </div>
                </button>

                {/* Expanded gate sub-rows */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-1.5 pl-1">
                        {svc.gates.map(gate => {
                          const gcfg = STATUS_CFG[gate.status];
                          return (
                            <div
                              key={gate.gateNumber}
                              className={clsx(
                                'px-3 py-2 rounded-xl border text-left backdrop-blur-md',
                                gcfg.bg, gcfg.border
                              )}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 truncate">
                                  {gate.gateName}
                                </span>
                                <div className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', gcfg.dot)} />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                                  {gate.waitMin}m
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">{gate.queue} in queue</span>
                                <span className={clsx('text-[8px] font-black ml-auto', gcfg.text)}>{gcfg.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        ) : (
          // Null state
          NULL_SERVICES.map(ns => (
            <div
              key={ns.service}
              className="p-3.5 rounded-2xl border border-slate-200/50 dark:border-white/8
                bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm opacity-60"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-base grayscale opacity-40">{ns.icon}</span>
                <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-500 mb-1">{ns.label}</div>
              <div className="text-2xl font-black font-mono text-slate-300 dark:text-slate-600">—</div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/30 dark:border-white/8">
                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-600">—</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-600 font-mono">0 queued</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
