// ─── SlotReservationPanel.tsx — Right Drawer for Gate Slot Reservation Details ─
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Lock, ShieldCheck, Anchor, Calendar, Truck, User, MapPin, QrCode, Phone
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { DriverCallModal } from '../common/DriverCallModal';
import type { BookingRecord } from '../../data/portServiceData';
import { getPort } from '../../data/ports';

interface SlotReservationPanelProps {
  booking: BookingRecord | null;
  onClose: () => void;
}

const TIER_BADGES: Record<string, string> = {
  standard: 'text-slate-400 border-slate-400/30 bg-slate-400/10',
  express: 'text-sky-400 border-sky-400/30 bg-sky-400/10',
  urgent: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
};

const VEHICLE_LABELS: Record<string, string> = {
  trailer: 'Heavy Trailer (40ft)',
  container_truck: 'Container Chassis Truck',
  reefer_truck: 'Reefer Temperature-Controlled Truck',
  flatbed: 'Heavy Flatbed Hauler',
  tanker: 'Liquid Cargo Tanker',
};

export function SlotReservationPanel({ booking, onClose }: SlotReservationPanelProps) {
  const [isCalling, setIsCalling] = useState(false);

  if (!booking) return null;
  const port = getPort(booking.portId);
  const driverPhone = booking.driverPhone || '+91 98400 12345';

  return (
    <>
      <AnimatePresence>
        <motion.aside
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="w-[400px] flex-shrink-0 flex flex-col h-full overflow-y-auto z-30 relative
            liquid-glass border-l border-l-white/50 dark:border-l-white/15 backdrop-blur-3xl
            shadow-[-10px_0_40px_rgba(0,0,0,0.1)] dark:shadow-[-12px_0_40px_rgba(0,0,0,0.5)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/40 dark:border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 flex-shrink-0">
                <Anchor className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Gate Slot Reservation Details
                  </h3>
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300">
                    <Lock className="w-2.5 h-2.5" />
                    Read Only
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {port.name} · {port.locode}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Read-Only Cryptographic Banner */}
          <div className="px-5 py-2.5 bg-cyan-500/10 dark:bg-cyan-500/15 border-b border-cyan-400/20 flex items-center gap-2 text-[11px] text-cyan-800 dark:text-cyan-200 font-semibold flex-shrink-0">
            <Lock className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
            <span className="leading-snug">
              Official Terminal Gate Record. Cryptographically sealed; cannot be modified or re-allocated from alerts feed.
            </span>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
            {/* Confirmed Token Box */}
            <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-white/60 dark:border-white/10 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Confirmed Token Number
                </p>
                <p className="text-base font-black font-mono text-slate-900 dark:text-white tracking-wider mt-0.5">
                  {booking.tokenNumber}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-400/30">
                  CONFIRMED
                </span>
                <QrCode className="w-7 h-7 text-cyan-500/70" />
              </div>
            </div>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {/* Terminal & Gate */}
              <div className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-white/10">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1">
                  <Anchor className="w-3 h-3 text-sky-500" />
                  Terminal &amp; Gate
                </div>
                <p className="font-bold text-slate-800 dark:text-slate-100">{booking.gate}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{booking.serviceLabel}</p>
              </div>

              {/* Reserved Schedule */}
              <div className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-white/10">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1">
                  <Calendar className="w-3 h-3 text-emerald-500" />
                  Reserved Schedule
                </div>
                <p className="font-bold text-slate-800 dark:text-slate-100">{booking.date}</p>
                <p className="text-[10px] font-mono font-semibold text-cyan-600 dark:text-cyan-400 mt-0.5">{booking.timeWindow}</p>
              </div>

              {/* Vehicle */}
              <div className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-white/10">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1">
                  <Truck className="w-3 h-3 text-indigo-500" />
                  Vehicle
                </div>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-100">{booking.vehicleNumber}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {VEHICLE_LABELS[booking.vehicleType] || booking.vehicleType}
                </p>
              </div>

              {/* Driver & KYC with Working Call Button */}
              <div className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-amber-500" />
                      Driver &amp; KYC
                    </span>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{booking.driverName}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                      KYC Verified
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-300 mt-1">
                    {driverPhone}
                  </p>
                </div>

                {/* Prominent Working Call Button */}
                <button
                  onClick={() => setIsCalling(true)}
                  className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-black
                    bg-emerald-500/15 text-emerald-700 dark:text-emerald-300
                    border border-emerald-400/40 hover:bg-emerald-500/25 active:scale-95 transition-all shadow-sm"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Call Driver</span>
                </button>
              </div>
            </div>

            {/* Delivery Destination */}
            <div className="p-3.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/60 dark:border-white/10">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-1">
                <MapPin className="w-3 h-3 text-rose-500" />
                Delivery Destination / Cargo Yard
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                {booking.destination}
              </p>
            </div>

            {/* Priority Tier */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/70 dark:border-white/10 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Fast-Pass Lane Tier:</span>
              <span className={clsx('px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border', TIER_BADGES[booking.tier])}>
                {booking.tier.toUpperCase()} {booking.tierFee > 0 ? `· ₹${booking.tierFee}` : '· ₹0'}
              </span>
            </div>
          </div>

          {/* Footer Action */}
          <div className="px-5 py-3.5 border-t border-white/40 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center justify-between flex-shrink-0">
            <span className="text-[10px] text-slate-400 font-medium">
              Read-only terminal record
            </span>
            <Button variant="primary" size="sm" onClick={onClose}>
              Acknowledge &amp; Close
            </Button>
          </div>
        </motion.aside>
      </AnimatePresence>

      {/* Interactive In-App Dispatch Calling Modal */}
      <DriverCallModal
        isOpen={isCalling}
        onClose={() => setIsCalling(false)}
        driverName={booking.driverName}
        driverPhone={driverPhone}
        vehiclePlate={booking.vehicleNumber}
      />
    </>
  );
}
