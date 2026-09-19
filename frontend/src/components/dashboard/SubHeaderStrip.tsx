import { Anchor, Activity, Container, Clock, Waves, ChevronDown, MapPin, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchKPIs } from '../../services/api';
import { usePort } from '../../context/PortContext';

function devLog(...args: unknown[]) {
  if (import.meta.env.DEV) console.info('[ports-menu]', ...args);
}

export function SubHeaderStrip() {
  const { port, portId, setPortId, ports } = usePort();
  const [portMenuOpen, setPortMenuOpen] = useState(false);
  const [portQuery, setPortQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openedAtRef = useRef(0);

  const openMenu = () => {
    openedAtRef.current = Date.now();
    devLog('open');
    setPortQuery('');
    setPortMenuOpen(true);
  };

  const closeMenu = (why: string) => {
    devLog('close requested:', why);
    setPortMenuOpen(false);
    // Return focus to the trigger pill for keyboard users.
    triggerRef.current?.focus({ preventScroll: true });
  };

  // Stray backdrop events from the opening interaction itself must never
  // instantly kill the just-opened dialog.
  const requestClose = () => {
    if (Date.now() - openedAtRef.current < 400) {
      devLog('close ignored (within open-guard window)');
      return;
    }
    closeMenu('backdrop');
  };

  // Escape closes the dialog. No scroll/resize listeners by design: the
  // centered dialog can't go stale or shift layout, and scroll events used to
  // instantly kill the old dropdown (whole-page width flicker).
  useEffect(() => {
    if (!portMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu('escape');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [portMenuOpen]);

  const filteredPorts = useMemo(() => {
    const q = portQuery.trim().toLowerCase();
    if (!q) return ports;
    return ports.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.short.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.state.toLowerCase().includes(q)
    );
  }, [ports, portQuery]);

  const westPorts = useMemo(() => filteredPorts.filter(p => p.coast === 'West'), [filteredPorts]);
  const eastPorts = useMemo(() => filteredPorts.filter(p => p.coast === 'East'), [filteredPorts]);
  const [metrics, setMetrics] = useState({
    vessels: '12',
    density: '74.2%',
    wait: '11m'
  });

  useEffect(() => {
    fetchKPIs('24h').then(kpis => {
      if (kpis) {
        setMetrics({
          vessels: '12',
          density: `${kpis.gateUtilizationPct || 74.2}%`,
          wait: `${Math.round(kpis.avgQueueWaitMin || 11)}m`
        });
      }
    }).catch(() => {});
  }, []);

  return (
    <div
      id="tutorial-dash-status-strip"
      className="h-11 flex items-center px-4 md:px-6 gap-4 border-b flex-shrink-0
      liquid-glass border-b-white/40 dark:border-b-white/10 backdrop-blur-xl relative z-20"
    >
      {/* Port selector & Sweep Status */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-sky-500/15 dark:bg-cyan-500/20 flex items-center justify-center border border-sky-400/30">
          <Anchor className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />
        </div>
        <div>
          <button
            ref={triggerRef}
            aria-haspopup="listbox"
            aria-expanded={portMenuOpen}
            onClick={() => { if (portMenuOpen) setPortMenuOpen(false); else openMenu(); }}
            title="Select port terminal"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100
              bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm
              hover:border-cyan-400/50 hover:text-cyan-700 dark:hover:text-cyan-300 transition-all max-w-[280px]"
          >
            <span className="truncate">Terminal: {port.name}</span>
            <span className="flex-shrink-0 px-1.5 py-px rounded-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 text-[9px] font-black">
              {ports.length}
            </span>
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-cyan-500" />
          </button>
          {portMenuOpen && createPortal(
            <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4">
              {/* Click-away backdrop */}
              <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={requestClose} />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Select port terminal"
                className="relative w-[min(560px,92vw)] max-h-[80vh] flex flex-col overflow-hidden rounded-3xl liquid-glass-elevated border border-white/70 dark:border-white/15 backdrop-blur-2xl p-4"
                style={{ boxShadow: 'var(--shadow-4)' }}
              >
                <div className="flex items-center gap-2.5 pb-3 border-b border-white/40 dark:border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/15 dark:bg-cyan-500/20 flex items-center justify-center border border-sky-400/30 flex-shrink-0">
                    <Anchor className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                      Select Port Terminal
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {ports.length} major ports · map, fleet, slots & analytics follow
                    </p>
                  </div>
                  <button
                    onClick={() => closeMenu('x-button')}
                    aria-label="Close port picker"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-95 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-3 pb-1.5 flex-shrink-0">
                  <div className="relative rounded-xl bg-white/70 dark:bg-slate-900/70 border border-white/60 dark:border-white/10 overflow-hidden">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-500" />
                    <input
                      autoFocus
                      value={portQuery}
                      onChange={e => setPortQuery(e.target.value)}
                      placeholder={`Search ${ports.length} ports...`}
                      aria-label="Search ports"
                      className="w-full pl-8 pr-2.5 py-2 bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 -mx-1 px-1 py-1">
                  {filteredPorts.length === 0 && (
                    <div className="px-3 py-8 text-center text-xs text-slate-400">No ports match “{portQuery}”.</div>
                  )}
                  {[
                    { label: 'West Coast', list: westPorts },
                    { label: 'East Coast', list: eastPorts },
                  ].map(group => group.list.length > 0 && (
                    <div key={group.label}>
                      <div className="px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {group.label} ({group.list.length})
                      </div>
                      {group.list.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setPortId(p.id); closeMenu(`select ${p.id}`); }}
                          aria-current={p.id === portId}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all active:scale-[0.99] ${
                            p.id === portId
                              ? 'bg-gradient-to-r from-sky-500/20 to-cyan-500/15 text-sky-700 dark:text-cyan-300 font-bold ring-1 ring-cyan-400/40'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <span className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-400/25 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-bold truncate">{p.name}</span>
                            <span className="block text-[11px] text-slate-400 truncate">{p.city}, {p.state} · {p.corridor}</span>
                          </span>
                          {p.id === portId && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="pt-2.5 mt-1 border-t border-white/40 dark:border-white/10 flex-shrink-0">
                  <p className="text-center text-[10px] text-slate-400">Press Esc or click outside to close</p>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Radar sweep indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex-shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
            3.2s Radar Sweep
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/10 dark:bg-cyan-500/15 border border-sky-400/30 flex-shrink-0">
          <Waves className="w-3 h-3 text-sky-600 dark:text-cyan-400" />
          <span className="text-[9px] font-bold text-sky-700 dark:text-cyan-300 uppercase">
            Berths 1–8 Normal
          </span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Quick Metrics in Neumorphic Pills */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm text-xs backdrop-blur-md">
          <Anchor className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden md:inline">AIS Vessels:</span>
          <span className="text-xs font-bold tabular text-slate-800 dark:text-slate-100 font-mono">{metrics.vessels}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm text-xs backdrop-blur-md">
          <Container className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden md:inline">Yard Density:</span>
          <span className="text-xs font-bold tabular text-slate-800 dark:text-slate-100 font-mono">{metrics.density}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm text-xs backdrop-blur-md">
          <Clock className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden md:inline">Avg Gate Wait:</span>
          <span className="text-xs font-bold tabular text-slate-800 dark:text-slate-100 font-mono">{metrics.wait}</span>
        </div>
      </div>

      {/* Telemetry Layers button */}
      <button className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold
        bg-white/60 dark:bg-slate-800/60 border border-white/70 dark:border-white/15
        neu-button text-slate-700 dark:text-slate-200
        hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-400/50
        transition-all duration-200"
      >
        <Activity className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
        <span className="hidden sm:inline">Telemetry Active</span>
      </button>
    </div>
  );
}

