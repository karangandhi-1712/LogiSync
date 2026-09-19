// ─── MyBookingsTab — per-port bookings list ────────────────────────────────────
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, Zap, Eye, Navigation, Calendar, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { EPassModal } from './EPassModal';
import { RoutePanel } from './RoutePanel';
import type { BookingRecord } from '../../data/portServiceData';
import type { PortInfo } from '../../data/ports';
import { useState } from 'react';

const STATUS_CFG = {
  upcoming:    { label: 'Upcoming',    icon: Clock,         cls: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-400/30' },
  in_progress: { label: 'In Progress', icon: Zap,           cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-400/30' },
  completed:   { label: 'Completed',   icon: CheckCircle2,  cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-400/30' },
};

const VEH_LABELS: Record<string, string> = {
  trailer: 'Heavy Trailer', container_truck: 'Container Truck',
  reefer_truck: 'Reefer Truck', flatbed: 'Flatbed', tanker: 'Tanker',
};

interface MyBookingsTabProps {
  port: PortInfo | null;
  bookings: BookingRecord[];
  onReschedule: (id: string) => void;
  onCancel: (id: string) => void;
  cancellingId: string | null;
}

export function MyBookingsTab({ port, bookings, onReschedule, onCancel, cancellingId }: MyBookingsTabProps) {
  const [epassBooking, setEpassBooking] = useState<BookingRecord | null>(null);
  const [routeBooking, setRouteBooking] = useState<BookingRecord | null>(null);

  if (!port) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center">
          <Calendar className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No port selected</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-xs">
          Bookings are shown per port. Select a port above to view your gate reservations.
        </p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
          No bookings for {port.short}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-xs">
          Use "How to Book" to reserve your first gate slot at this port.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {bookings.map((b, idx) => {
            const scfg = STATUS_CFG[b.status];
            const StatusIcon = scfg.icon;
            const isUpcoming = b.status === 'upcoming';

            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: idx * 0.04 }}
                className="rounded-2xl border bg-white/60 dark:bg-slate-900/50
                  border-white/70 dark:border-white/10 backdrop-blur-sm p-4
                  hover:border-cyan-400/30 transition-all duration-200"
              >
                {/* Top row: token + status */}
                <div className="flex items-start justify-between mb-2.5">
                  <div>
                    <p className="text-[9px] text-slate-400 font-mono mb-0.5">Token</p>
                    <p className="text-xs font-black font-mono text-slate-800 dark:text-white">
                      {b.tokenNumber}
                    </p>
                  </div>
                  <span className={clsx(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border flex-shrink-0',
                    scfg.cls
                  )}>
                    <StatusIcon className="w-2.5 h-2.5" />
                    {scfg.label}
                  </span>
                </div>

                {/* Detail grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] mb-3">
                  {[
                    { label: 'Gate & Service', value: `${b.gate} · ${b.serviceLabel}` },
                    { label: 'Date & Window',  value: `${b.date} · ${b.timeWindow}` },
                    { label: 'Vehicle',        value: `${b.vehicleNumber} · ${VEH_LABELS[b.vehicleType] ?? b.vehicleType}` },
                    { label: 'Driver',         value: b.driverName },
                    { label: 'Destination',    value: b.destination },
                    { label: 'Priority',       value: `${b.tier.charAt(0).toUpperCase() + b.tier.slice(1)}${b.tierFee ? ` · ₹${b.tierFee}` : ''}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="min-w-0">
                      <p className="text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
                      <p className="text-slate-700 dark:text-slate-200 font-semibold truncate">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Action row */}
                <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-slate-200/40 dark:border-white/10">
                  <Button size="sm" variant="ghost" onClick={() => setEpassBooking(b)}>
                    <Eye className="w-3.5 h-3.5" />
                    <span>View e-Pass</span>
                  </Button>

                  {/* View Route — only on Upcoming */}
                  {isUpcoming && (
                    <Button size="sm" variant="ghost" onClick={() => setRouteBooking(b)}>
                      <Navigation className="w-3.5 h-3.5" />
                      <span>View Route</span>
                    </Button>
                  )}

                  {/* Reschedule & Cancel — only on Upcoming */}
                  {isUpcoming && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto"
                        onClick={() => onReschedule(b.id)}
                      >
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={cancellingId === b.id}
                        onClick={() => onCancel(b.id)}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Sub-modals */}
      <EPassModal booking={epassBooking} onClose={() => setEpassBooking(null)} />
      <RoutePanel booking={routeBooking} onClose={() => setRouteBooking(null)} />
    </>
  );
}
