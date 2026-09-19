// ─── StepsGuide — numbered vertical guide with connected step line ────────────
import { Layers, Calendar, Truck, MapPin, Zap, Sparkles, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

const STEPS = [
  {
    icon: Layers,
    title: 'Select Service & Gate',
    desc: 'Choose Bulk, General, Container/Reefer, or Express Rail for this port',
    color: 'text-sky-500',
    bg: 'bg-sky-500/15 border-sky-400/30',
  },
  {
    icon: Calendar,
    title: 'Pick Date & Time',
    desc: 'Choose when your truck will arrive at the terminal',
    color: 'text-violet-500',
    bg: 'bg-violet-500/15 border-violet-400/30',
  },
  {
    icon: Truck,
    title: 'Enter Vehicle & Driver Details',
    desc: 'Registration number, vehicle type, driver info',
    color: 'text-amber-500',
    bg: 'bg-amber-500/15 border-amber-400/30',
  },
  {
    icon: MapPin,
    title: 'Set Delivery Destination',
    desc: 'Where the goods are headed after leaving the port',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/15 border-emerald-400/30',
  },
  {
    icon: Zap,
    title: 'Choose Dispatch Priority',
    desc: 'Standard (₹0), Express (₹500), or Urgent (₹1,000)',
    color: 'text-orange-500',
    bg: 'bg-orange-500/15 border-orange-400/30',
  },
  {
    icon: Sparkles,
    title: 'Review AI Slot Suggestions',
    desc: "Pick the AI's Top Pick or choose your own from the ranked list",
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/15 border-cyan-400/30',
  },
  {
    icon: CheckCircle2,
    title: 'Confirm & Receive e-Pass',
    desc: 'Get your transit e-Pass instantly, ready to download',
    color: 'text-green-500',
    bg: 'bg-green-500/15 border-green-400/30',
  },
];

export function StepsGuide() {
  return (
    <div className="flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-black text-slate-800 dark:text-white mb-0.5">How to Book</h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Complete these steps to reserve your gate slot
        </p>
      </div>

      <div className="relative flex flex-col gap-0">
        {/* Vertical connector line */}
        <div className="absolute left-[19px] top-5 bottom-5 w-px bg-gradient-to-b from-sky-400/40 via-cyan-400/20 to-green-400/40" />

        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex items-start gap-3 py-2.5 relative">
              {/* Step icon bubble */}
              <div className={clsx(
                'w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 z-10',
                'bg-white dark:bg-slate-900',
                step.bg
              )}>
                <Icon className={clsx('w-4 h-4', step.color)} />
              </div>

              {/* Step text */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 font-mono">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {step.title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
