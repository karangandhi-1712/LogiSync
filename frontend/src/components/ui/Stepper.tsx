import { Minus, Plus } from 'lucide-react';

/**
 * iOS-style stepper.
 *
 * Replaces a range slider for anything the operator types a precise number
 * into. A slider is the wrong control for a batch cap: it hides the exact value,
 * gives no way to type one directly, and drags on a touchscreen are imprecise
 * enough to overshoot a 12-stop ceiling. The minus/plus affordance makes the
 * bound obvious and keeps every value reachable without a drag.
 *
 * `value` is always clamped into [min, max] here rather than at each call site,
 * so a caller that mis-wires its bounds still cannot produce an out-of-range
 * number.
 */
export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit,
  tone = 'sky',
  id,
}: {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Accessible name for the whole control, e.g. "Radius". */
  label: string;
  /** Rendered beside the value, e.g. "km". */
  unit?: string;
  tone?: 'sky' | 'emerald';
  id?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const atMin = value <= min;
  const atMax = value >= max;

  const bump = (delta: number) => onChange(clamp(value + delta * step));

  const btn =
    'grid place-items-center w-9 h-9 shrink-0 rounded-[14px] transition-all duration-200 ' +
    'disabled:opacity-30 disabled:cursor-not-allowed active:scale-90';

  const toneRing =
    tone === 'emerald'
      ? 'text-emerald-700 dark:text-emerald-200 bg-emerald-500/12 hover:bg-emerald-500/22 border-emerald-400/25'
      : 'text-sky-700 dark:text-sky-200 bg-sky-500/12 hover:bg-sky-500/22 border-sky-400/25';

  const fill =
    tone === 'emerald'
      ? 'from-emerald-400 to-emerald-600'
      : 'from-sky-400 to-sky-600';

  const track = tone === 'emerald' ? 'bg-emerald-500' : 'bg-sky-500';

  // How far through the allowed range we are, for the thin progress rail.
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div
      className="px-3 py-2.5 rounded-2xl liquid-glass border border-white/70 dark:border-white/10 backdrop-blur-xl neu-flat-sm"
    >
      <label
        htmlFor={id}
        className="text-[9px] font-black uppercase tracking-wider text-slate-400 block"
      >
        {label}
      </label>

      <div className="flex items-center gap-1.5 mt-1.5">
        <button
          type="button"
          onClick={() => bump(-1)}
          disabled={atMin}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className={`${btn} ${toneRing} border neu-button`}
        >
          <Minus className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <div className="flex-1 min-w-0 flex flex-col items-center justify-center">
          <span
            className="text-sm font-black font-mono text-slate-900 dark:text-white tabular-nums leading-none"
            aria-live="polite"
          >
            {value}
            {unit && <span className="text-[10px] font-bold text-slate-400 ml-0.5">{unit}</span>}
          </span>
          {/* Range rail: gives the bounds a visual presence without the
              imprecision of a draggable thumb. */}
          <div className="mt-1 w-full h-1 rounded-full bg-slate-500/12 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${fill} transition-[width] duration-200`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => bump(1)}
          disabled={atMax}
          aria-label={`Increase ${label.toLowerCase()}`}
          className={`${btn} ${toneRing} border neu-button`}
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>

      <p className="mt-1 text-center text-[9px] text-slate-400 font-mono">
        {min}–{max} {unit}
      </p>
    </div>
  );
}