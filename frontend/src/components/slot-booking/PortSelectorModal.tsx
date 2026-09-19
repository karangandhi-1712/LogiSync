// ─── PortSelectorModal — centered overlay with all 12 ports ──────────────────
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Anchor, MapPin } from 'lucide-react';
import { clsx } from 'clsx';
import { PORTS } from '../../data/ports';

interface PortSelectorModalProps {
  isOpen: boolean;
  currentPortId: string | null;
  onSelect: (portId: string) => void;
  onClose: () => void;
}

const CONGESTION_DOT: Record<string, string> = {
  low: 'bg-emerald-500 shadow-[0_0_6px_#10b981]',
  moderate: 'bg-amber-400 shadow-[0_0_6px_#f59e0b]',
  high: 'bg-red-500 shadow-[0_0_6px_#ef4444]',
};
const CONGESTION_LABEL: Record<string, string> = {
  low: 'text-emerald-600 dark:text-emerald-400',
  moderate: 'text-amber-600 dark:text-amber-400',
  high: 'text-red-600 dark:text-red-400',
};

export function PortSelectorModal({ isOpen, currentPortId, onSelect, onClose }: PortSelectorModalProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = PORTS.filter(p =>
    !query ||
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.city.toLowerCase().includes(query.toLowerCase()) ||
    p.state.toLowerCase().includes(query.toLowerCase()) ||
    p.locode.toLowerCase().includes(query.toLowerCase())
  );

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setFocused(0);
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)); }
      if (e.key === 'Enter' && filtered[focused]) { onSelect(filtered[focused].id); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, filtered, focused, onSelect, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto w-full max-w-lg rounded-3xl
                bg-white/95 dark:bg-[#0d1526]/98 backdrop-blur-2xl
                border border-white/80 dark:border-white/15
                shadow-[0_32px_80px_rgba(0,0,0,0.35)]
                overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-3 border-b border-slate-200/60 dark:border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                      <Anchor className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">Select Port</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">12 major Indian ports available</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl flex items-center justify-center
                      bg-slate-100 dark:bg-slate-800/60 text-slate-500
                      hover:bg-slate-200 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setFocused(0); }}
                    placeholder="Search port, city, or LOCODE…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm
                      bg-slate-100 dark:bg-slate-800/60
                      border border-slate-200/60 dark:border-white/10
                      text-slate-800 dark:text-slate-100
                      placeholder:text-slate-400 focus:outline-none
                      focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30
                      transition-all"
                  />
                </div>
              </div>

              {/* Port list */}
              <div ref={listRef} className="overflow-y-auto max-h-[380px] py-2">
                {filtered.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">No ports match "{query}"</div>
                ) : (
                  filtered.map((port, idx) => {
                    const isSelected = port.id === currentPortId;
                    const isFocused = idx === focused;
                    return (
                      <button
                        key={port.id}
                        onClick={() => onSelect(port.id)}
                        onMouseEnter={() => setFocused(idx)}
                        className={clsx(
                          'w-full flex items-center gap-3.5 px-5 py-3 text-left transition-all duration-150',
                          isFocused && !isSelected && 'bg-slate-50 dark:bg-slate-800/40',
                          isSelected && 'bg-cyan-500/8 dark:bg-cyan-500/10'
                        )}
                      >
                        {/* Congestion dot */}
                        <span className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5', CONGESTION_DOT[port.congestionLevel])} />

                        {/* Port info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className={clsx(
                              'text-sm font-bold truncate',
                              isSelected ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-800 dark:text-slate-100'
                            )}>
                              {port.name}
                            </span>
                            <span className="text-[10px] font-black font-mono text-slate-400 dark:text-slate-500 flex-shrink-0">
                              {port.locode}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {port.city}, {port.state}
                            </span>
                          </div>
                        </div>

                        {/* Coast badge */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={clsx(
                            'text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full',
                            port.coast === 'West'
                              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                              : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                          )}>
                            {port.coast} Coast
                          </span>
                          <span className={clsx('text-[9px] font-bold', CONGESTION_LABEL[port.congestionLevel])}>
                            {port.congestionLevel.charAt(0).toUpperCase() + port.congestionLevel.slice(1)} Traffic
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer hint */}
              <div className="px-5 py-2.5 border-t border-slate-200/60 dark:border-white/10 flex items-center gap-3 text-[10px] text-slate-400">
                <span className="hidden sm:block">↑↓ Navigate</span>
                <span className="hidden sm:block">↵ Select</span>
                <span>Esc Close</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
