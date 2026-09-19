// ─── DateScrubber — reusable date-chip row with density bars ─────────────────
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface DateScrubberProps {
  dateOffset: number;
  onDateChange: (offset: number) => void;
  densityValues?: number[]; // 7 values 0–1, index 0 = today
  maxOffset?: number;
  minOffset?: number;
}

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function getChipDate(offsetFromToday: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetFromToday);
  return d;
}

function densityColor(v: number) {
  if (v >= 0.75) return 'bg-red-500';
  if (v >= 0.45) return 'bg-amber-400';
  return 'bg-emerald-400';
}

export function DateScrubber({
  dateOffset,
  onDateChange,
  densityValues,
  maxOffset = 6,
  minOffset = 0,
}: DateScrubberProps) {
  const chips = Array.from({ length: 7 }, (_, i) => i + minOffset);

  return (
    <div className="flex items-center gap-2">
      {/* Left arrow */}
      <button
        onClick={() => onDateChange(Math.max(minOffset, dateOffset - 1))}
        disabled={dateOffset <= minOffset}
        className="p-1.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/60
          dark:border-white/10 text-slate-500 hover:text-cyan-500 transition-colors
          disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Date chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {chips.map((offset) => {
          const d = getChipDate(offset);
          const day = DAY_NAMES[d.getDay()];
          const date = d.getDate();
          const month = MONTH_NAMES[d.getMonth()];
          const isToday = offset === 0;
          const isSelected = offset === dateOffset;
          const density = densityValues ? densityValues[offset] ?? 0.4 : 0.4;

          return (
            <button
              key={offset}
              onClick={() => onDateChange(offset)}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition-all duration-200 flex-shrink-0',
                isSelected
                  ? 'bg-gradient-to-b from-sky-500/20 to-cyan-500/10 border-cyan-400/60 dark:border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                  : 'bg-white/50 dark:bg-slate-800/40 border-white/60 dark:border-white/10 hover:border-cyan-400/40 hover:bg-white/70 dark:hover:bg-slate-800/60'
              )}
            >
              <span className={clsx(
                'text-[9px] font-black uppercase tracking-wider',
                isToday ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'
              )}>
                {isToday ? 'TODAY' : day}
              </span>
              <span className={clsx(
                'text-[11px] font-black font-mono',
                isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
              )}>
                {date} {month}
              </span>
              {/* Density bar */}
              <div className="w-full h-0.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-0.5">
                <div
                  className={clsx('h-full rounded-full transition-all', densityColor(density))}
                  style={{ width: `${density * 100}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => onDateChange(Math.min(maxOffset, dateOffset + 1))}
        disabled={dateOffset >= maxOffset}
        className="p-1.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/60
          dark:border-white/10 text-slate-500 hover:text-cyan-500 transition-colors
          disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
