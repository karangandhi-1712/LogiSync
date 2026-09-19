// ─── PortSelectorBar — inline search bar that opens the modal ────────────────
import { Anchor, ChevronDown, X } from 'lucide-react';
import { clsx } from 'clsx';
import { getPort } from '../../data/ports';

interface PortSelectorBarProps {
  selectedPortId: string | null;
  onClick: () => void;
  onClear: () => void;
}

export function PortSelectorBar({ selectedPortId, onClick, onClear }: PortSelectorBarProps) {
  const port = selectedPortId ? getPort(selectedPortId) : null;

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        id="port-selector-bar"
        className={clsx(
          'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-200',
          'text-left backdrop-blur-xl',
          port
            ? 'bg-white/80 dark:bg-slate-900/70 border-cyan-400/50 dark:border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.12)]'
            : 'bg-white/60 dark:bg-slate-800/50 border-white/70 dark:border-white/15 hover:border-cyan-400/40 neu-flat-sm'
        )}
      >
        {/* Anchor icon */}
        <div className={clsx(
          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
          port
            ? 'bg-gradient-to-br from-sky-500 to-cyan-600 shadow-lg shadow-cyan-500/20'
            : 'bg-slate-100 dark:bg-slate-800/60'
        )}>
          <Anchor className={clsx('w-4.5 h-4.5', port ? 'text-white' : 'text-slate-400')} />
        </div>

        {/* Port name / placeholder */}
        <div className="flex-1 min-w-0">
          {port ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {port.name}
                </span>
                <span className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded-full
                  bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-400/30 flex-shrink-0">
                  {port.locode}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {port.city}, {port.state} · {port.coast} Coast
                <button
                  onClick={e => { e.stopPropagation(); onClick(); }}
                  className="ml-2 text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                >
                  Change port
                </button>
              </p>
            </div>
          ) : (
            <span className="text-sm text-slate-400 dark:text-slate-500">
              Search or select a port to begin…
            </span>
          )}
        </div>

        {/* Right action */}
        {port ? (
          <button
            onClick={e => { e.stopPropagation(); onClear(); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400
              hover:text-red-500 hover:bg-red-500/10 transition-all flex-shrink-0"
            title="Clear port selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 group-hover:text-cyan-500 transition-colors" />
        )}
      </button>
    </div>
  );
}
