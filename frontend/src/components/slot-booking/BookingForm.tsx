// ─── BookingForm — multi-section booking form in dark navy panel style ─────────
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Sparkles, Zap, Truck, User, Phone, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { DateScrubber } from './DateScrubber';
import { DestinationAutocomplete } from './DestinationAutocomplete';
import { PORT_SERVICE_MAP, PORT_DATE_DENSITY } from '../../data/portServiceData';
import type {
  ServiceType, VehicleType, PriorityTier, BookingRecord,
} from '../../data/portServiceData';
import type { PortInfo } from '../../data/ports';

// ── AI suggestions ────────────────────────────────────────────────────────────
export interface AiSlot {
  time: string;
  waitMin: number;
  reason: string;
  isTopPick: boolean;
}

interface DynamicAiConfig {
  topPickTime: string;
  slots: AiSlot[];
  bookedTimes: string[];
}

// Preset baseline optimal dispatch times per port corridor
const PORT_AI_PRESETS: Record<string, { top: string; alts: { time: string; waitMin: number; reason: string }[]; booked: string[] }> = {
  chennai: {
    top: '08:30',
    alts: [
      { time: '08:30', waitMin: 11, reason: 'AI Top Pick — clears 37m ahead of Gate 6 container surge' },
      { time: '11:30', waitMin: 18, reason: 'Midday lull between morning and afternoon shifts' },
      { time: '13:00', waitMin: 15, reason: 'Post-lunch off-peak window for harbour bypass' },
      { time: '16:30', waitMin: 22, reason: 'Evening buffer before 18:00 entry queue cutoff' },
    ],
    booked: ['09:30', '10:30', '14:00', '14:30', '15:30'],
  },
  voc: {
    top: '09:30',
    alts: [
      { time: '07:30', waitMin: 9,  reason: 'Early bird clearing on Madurai–Tuticorin Hwy' },
      { time: '09:30', waitMin: 8,  reason: 'AI Top Pick — lowest queue window (8 min wait) for container gates' },
      { time: '11:00', waitMin: 12, reason: 'Pre-peak rail synchronization slot' },
      { time: '15:30', waitMin: 11, reason: 'Post-shift clearing window with minimal terminal congestion' },
    ],
    booked: ['08:00', '12:00', '13:30', '14:00', '14:30'],
  },
  jnpt: {
    top: '07:30',
    alts: [
      { time: '07:30', waitMin: 14, reason: 'AI Top Pick — beats Panvel corridor bottleneck before 08:30 rush' },
      { time: '10:00', waitMin: 22, reason: 'Inter-shift window between Nhava Sheva berths' },
      { time: '15:30', waitMin: 20, reason: 'Afternoon window before peak evening outbound haulage' },
      { time: '16:30', waitMin: 16, reason: 'Clear transit window onto Mumbai–Pune expressway link' },
    ],
    booked: ['09:00', '11:30', '12:00', '13:00', '14:00'],
  },
  mumbai: {
    top: '07:00',
    alts: [
      { time: '07:00', waitMin: 16, reason: 'AI Top Pick — early entry before Eastern Freeway commercial vehicle ban' },
      { time: '09:30', waitMin: 22, reason: 'Green Gate clearance window for breakbulk/general cargo' },
      { time: '12:30', waitMin: 19, reason: 'Midday harbour link corridor opening' },
      { time: '16:30', waitMin: 24, reason: 'Wadi Bunder rail connection transfer slot' },
    ],
    booked: ['08:00', '10:30', '14:00', '14:30', '15:30'],
  },
  deendayal: {
    top: '09:00',
    alts: [
      { time: '06:30', waitMin: 5,  reason: 'Early morning dry bulk priority pass' },
      { time: '09:00', waitMin: 7,  reason: 'AI Top Pick — optimal 4h window on Gandhidham–Kandla link' },
      { time: '11:00', waitMin: 9,  reason: 'ICD Rail Ramp transfer slot with dedicated crane' },
      { time: '15:00', waitMin: 10, reason: 'Afternoon off-peak dispatch before evening shift' },
    ],
    booked: ['08:00', '12:00', '12:30', '13:30'],
  },
  cochin: {
    top: '10:00',
    alts: [
      { time: '08:00', waitMin: 8,  reason: 'Willingdon Island bypass open window' },
      { time: '10:00', waitMin: 10, reason: 'AI Top Pick — ICTT Vallarpadam post-docking low queue window' },
      { time: '13:30', waitMin: 11, reason: 'Post-noon reefer plug-in priority slot' },
      { time: '16:00', waitMin: 9,  reason: 'Coastal express rail coordination dispatch' },
    ],
    booked: ['07:30', '11:30', '14:00', '15:00'],
  },
  vizag: {
    top: '08:00',
    alts: [
      { time: '08:00', waitMin: 14, reason: 'AI Top Pick — clears ahead of Ore Terminal conveyor surge' },
      { time: '10:30', waitMin: 20, reason: 'Outer harbour container gate opening' },
      { time: '13:00', waitMin: 18, reason: 'Midday rail freight dispatch window' },
      { time: '16:00', waitMin: 15, reason: 'Gajuwaka corridor light traffic window' },
    ],
    booked: ['09:30', '12:00', '14:00', '14:30'],
  },
  mormugao: {
    top: '09:30',
    alts: [
      { time: '07:30', waitMin: 5, reason: 'Vasco bypass open with zero queues' },
      { time: '09:30', waitMin: 6, reason: 'AI Top Pick — fastest turnaround on Berth 9 iron ore quay' },
      { time: '12:00', waitMin: 8, reason: 'Harbour road open corridor' },
      { time: '15:00', waitMin: 7, reason: 'Coastal rail priority clearance' },
    ],
    booked: ['08:30', '13:00', '14:00'],
  },
  mangalore: {
    top: '09:00',
    alts: [
      { time: '07:30', waitMin: 8, reason: 'Panambur approach early transit pass' },
      { time: '09:00', waitMin: 9, reason: 'AI Top Pick — optimal container CFS loading window' },
      { time: '12:00', waitMin: 13, reason: 'POL Jetty off-peak transfer' },
      { time: '15:30', waitMin: 11, reason: 'Bengaluru highway link departure buffer' },
    ],
    booked: ['10:00', '13:30', '14:30'],
  },
  haldia: {
    top: '10:00',
    alts: [
      { time: '07:30', waitMin: 7, reason: 'Haldia port approach free corridor' },
      { time: '10:00', waitMin: 8, reason: 'AI Top Pick — container terminal low wait clearance' },
      { time: '12:30', waitMin: 10, reason: 'Rail freight CFS transfer pass' },
      { time: '15:30', waitMin: 9, reason: 'Kolkata expressway exit clearance' },
    ],
    booked: ['08:30', '11:30', '14:00'],
  },
  paradip: {
    top: '08:30',
    alts: [
      { time: '07:00', waitMin: 10, reason: 'Iron ore staging area early entry' },
      { time: '08:30', waitMin: 12, reason: 'AI Top Pick — PICT container gate lowest wait window' },
      { time: '11:30', waitMin: 16, reason: 'Midday conveyor coordination slot' },
      { time: '16:00', waitMin: 14, reason: 'Cuttack corridor open transit link' },
    ],
    booked: ['09:30', '13:00', '14:30', '15:00'],
  },
  ennore: {
    top: '08:00',
    alts: [
      { time: '06:30', waitMin: 4, reason: 'Expressway corridor free-flow transit' },
      { time: '08:00', waitMin: 6, reason: 'AI Top Pick — lowest 4h queue window across Kamarajar gates' },
      { time: '11:00', waitMin: 8, reason: 'Coal Berth 1 rapid turnaround window' },
      { time: '14:30', waitMin: 7, reason: 'LNG staging off-peak slot' },
    ],
    booked: ['09:00', '12:30', '15:00'],
  },
};

function buildDynamicAiSlots(
  portId: string,
  service: ServiceType,
  gateName: string,
  gateWaitMin: number,
  dateOffset: number
): DynamicAiConfig {
  const preset = PORT_AI_PRESETS[portId] || PORT_AI_PRESETS.voc;
  let top = preset.top;

  // Specific service adaptations
  if (service === 'express_rail') {
    top = '14:30';
  } else if (service === 'bulk') {
    top = portId === 'chennai' ? '07:30' : '07:00';
  }

  // Date-offset variation so different days have shifted optimal slots
  if (dateOffset === 1) {
    const [h, m] = top.split(':').map(Number);
    const newM = m === 30 ? '00' : '30';
    const newH = String(m === 30 ? (h + 1) % 24 : h).padStart(2, '0');
    top = `${newH}:${newM}`;
  } else if (dateOffset === 2) {
    top = '08:00';
  } else if (dateOffset >= 3) {
    top = '11:00';
  }

  const slots: AiSlot[] = preset.alts.map(alt => {
    const isTop = alt.time === top;
    return {
      time: alt.time,
      waitMin: Math.max(4, Math.round(alt.waitMin * (gateWaitMin > 30 ? 1.25 : 1.0))),
      reason: isTop ? `AI Top Pick — lowest projected queue for ${gateName.split('·')[0].trim() || 'this gate'}` : alt.reason,
      isTopPick: isTop,
    };
  });

  // Ensure the top slot is present in the list
  if (!slots.some(s => s.time === top)) {
    slots.unshift({
      time: top,
      waitMin: Math.max(5, Math.round(gateWaitMin * 0.45)),
      reason: `AI Top Pick — optimal 4h window for ${gateName.split('·')[0].trim() || 'this gate'}`,
      isTopPick: true,
    });
    if (slots.length > 4) slots.pop();
  } else {
    for (const s of slots) {
      s.isTopPick = s.time === top;
    }
  }

  const bookedBase = preset.booked;
  const bookedTimes = bookedBase.map(t => {
    if (t === top) return '15:00';
    return t;
  });

  return {
    topPickTime: top,
    slots,
    bookedTimes,
  };
}

// ── Time slot grid ────────────────────────────────────────────────────────────
const TIME_SLOTS = [
  '06:00','06:30','07:00','07:30','08:00','08:30',
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30',
];

type SlotState = 'available' | 'booked' | 'ai_pick';

const SLOT_CLS: Record<SlotState, string> = {
  available: 'bg-white/50 dark:bg-slate-800/40 border-white/60 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-cyan-400/50 cursor-pointer',
  booked:    'bg-blue-500/10 dark:bg-blue-900/30 border-blue-400/40 text-blue-700 dark:text-blue-300 cursor-not-allowed',
  ai_pick:   'bg-emerald-500/15 dark:bg-emerald-900/30 border-emerald-400/50 text-emerald-800 dark:text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] cursor-pointer',
};

// ── Vehicle types ─────────────────────────────────────────────────────────────
const VEHICLE_TYPES: { id: VehicleType; label: string; icon: string }[] = [
  { id: 'trailer',        label: 'Trailer',       icon: '🚛' },
  { id: 'container_truck',label: 'Container',     icon: '📦' },
  { id: 'reefer_truck',   label: 'Reefer',        icon: '❄️' },
  { id: 'flatbed',        label: 'Flatbed',       icon: '🏗️' },
  { id: 'tanker',         label: 'Tanker',        icon: '⛽' },
];

// ── Priority tiers ────────────────────────────────────────────────────────────
const TIERS: { id: PriorityTier; label: string; fee: number; desc: string }[] = [
  { id: 'standard', label: 'Standard', fee: 0,    desc: 'Regular queue' },
  { id: 'express',  label: 'Express',  fee: 500,  desc: 'Priority lane' },
  { id: 'urgent',   label: 'Urgent',   fee: 1000, desc: 'Immediate entry' },
];

interface BookingFormProps {
  port: PortInfo | null;
  onBookingConfirmed: (booking: BookingRecord) => void;
}

function dateStr(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

let seqCounter = 100;

export function BookingForm({ port, onBookingConfirmed }: BookingFormProps) {
  const [service, setService] = useState<ServiceType>('container_reefer');
  const [gateIndex, setGateIndex] = useState(0);
  const [dateOffset, setDateOffset] = useState(0);
  const [vehicleNum, setVehicleNum] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('container_truck');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('+91 98400 12345');
  const [destination, setDestination] = useState('');
  const [tier, setTier] = useState<PriorityTier>('express');
  const [showAi, setShowAi] = useState(false);
  const [selectedAiSlot, setSelectedAiSlot] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const services = port ? PORT_SERVICE_MAP[port.id] ?? [] : [];
  const currentService = services.find(s => s.service === service) ?? services[0];
  const gates = currentService?.gates ?? [];
  const gate = gates[Math.min(gateIndex, gates.length - 1)];

  const densityValues = port ? PORT_DATE_DENSITY[port.id] : undefined;

  // Compute dynamic AI slots based on port, service, gate, and date
  const aiData = useMemo(() => {
    return buildDynamicAiSlots(
      port?.id || 'voc',
      service,
      gate?.gateName || '',
      gate?.waitMin || 20,
      dateOffset
    );
  }, [port?.id, service, gate?.gateName, gate?.waitMin, dateOffset]);

  const aiSlots = aiData.slots;

  // Active time selection defaults to current port's AI Top Pick
  const [selectedTime, setSelectedTime] = useState(aiData.topPickTime);

  // Automatically update selected time to the AI Top Pick when port, gate, service or date changes
  useEffect(() => {
    setSelectedTime(aiData.topPickTime);
    setSelectedAiSlot(null);
  }, [aiData.topPickTime]);

  // Show AI panel when all required fields are filled
  const canShowAi = !!(gate && vehicleNum.trim() && driverName.trim() && driverPhone.trim() && destination.trim());
  useEffect(() => {
    if (canShowAi) setShowAi(true);
    else setShowAi(false);
  }, [canShowAi]);

  // Reset on port change
  useEffect(() => {
    setService('container_reefer');
    setGateIndex(0);
    setShowAi(false);
    setSelectedAiSlot(null);
    setBookingSuccess(false);
  }, [port?.id]);

  const handleConfirm = async () => {
    if (!port || !gate || !vehicleNum.trim() || !driverName.trim() || !driverPhone.trim() || !destination.trim()) return;
    setIsBooking(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsBooking(false);
    setBookingSuccess(true);

    const finalTime = selectedAiSlot ?? selectedTime;
    const tierObj = TIERS.find(t => t.id === tier)!;
    const portForCode = port.locode;
    const datePart = dateStr(dateOffset).replace(/-/g, '').slice(2);
    const token = `LGS-${portForCode}-${datePart}-${String(++seqCounter).padStart(4, '0')}`;

    const booking: BookingRecord = {
      id: `b-new-${Date.now()}`,
      tokenNumber: token,
      portId: port.id,
      service: service,
      serviceLabel: currentService?.label ?? service,
      gate: gate.gateName,
      date: dateStr(dateOffset),
      timeWindow: `${finalTime} – ${addMins(finalTime, 30)}`,
      vehicleNumber: vehicleNum.toUpperCase(),
      vehicleType,
      driverName: driverName.trim(),
      driverPhone: driverPhone.trim(),
      driverLicenseOk: true,
      destination: destination.trim(),
      status: 'upcoming',
      tier,
      tierFee: tierObj.fee,
      cargoType: currentService?.label ?? 'Cargo',
    };

    await new Promise(r => setTimeout(r, 600));
    setBookingSuccess(false);
    onBookingConfirmed(booking);

    // Reset form
    setVehicleNum('');
    setDriverName('');
    setDriverPhone('+91 98400 12345');
    setDestination('');
    setSelectedAiSlot(null);
    setShowAi(false);
  };

  if (!port) {
    return (
      <div className="rounded-2xl border border-slate-200/40 dark:border-white/10
        bg-white/30 dark:bg-slate-900/30 p-8 flex flex-col items-center justify-center gap-3 text-center min-h-[300px]">
        <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-700" />
        <p className="text-sm font-bold text-slate-500 dark:text-slate-500">
          Select a port above to begin booking
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-600 max-w-xs">
          Choose a port from the search bar to unlock gate slot booking
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Service & Gate */}
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Service &amp; Gate <span className="text-rose-500 font-black">*</span>
        </label>
        <div className="flex gap-2">
          <div className="flex-1 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/70 dark:border-white/10 overflow-hidden">
            <select
              value={service}
              onChange={e => { setService(e.target.value as ServiceType); setGateIndex(0); }}
              className="w-full px-3.5 py-2.5 bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
              required
            >
              {services.map(s => (
                <option key={s.service} value={s.service} className="dark:bg-slate-900">
                  {s.icon} {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/70 dark:border-white/10 overflow-hidden">
            <select
              value={gateIndex}
              onChange={e => setGateIndex(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
              required
            >
              {gates.map((g, i) => (
                <option key={g.gateNumber} value={i} className="dark:bg-slate-900">
                  {g.gateName} — {g.waitMin}m avg
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Date & Time */}
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Date &amp; Time <span className="text-rose-500 font-black">*</span>
        </label>
        <div className="mb-3">
          <DateScrubber
            dateOffset={dateOffset}
            onDateChange={setDateOffset}
            densityValues={densityValues}
          />
        </div>
        {/* Time slot grid */}
        <div className="grid grid-cols-6 gap-1.5">
          {TIME_SLOTS.map(time => {
            const isBooked = aiData.bookedTimes.includes(time);
            const isAiTop = time === aiData.topPickTime;
            const state: SlotState = isBooked ? 'booked' : isAiTop ? 'ai_pick' : 'available';
            const isSelected = (selectedAiSlot ?? selectedTime) === time;
            return (
              <button
                key={time}
                disabled={state === 'booked'}
                onClick={() => {
                  if (state !== 'booked') {
                    setSelectedTime(time);
                    setSelectedAiSlot(null);
                  }
                }}
                className={clsx(
                  'py-1.5 rounded-xl border text-[9px] font-bold transition-all duration-150',
                  SLOT_CLS[state],
                  isSelected && state !== 'booked' && 'ring-2 ring-cyan-400 scale-[1.08]'
                )}
              >
                {time}
                {state === 'ai_pick' && <span className="block text-[7px] opacity-80">AI✦</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Vehicle */}
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Vehicle Number &amp; Type <span className="text-rose-500 font-black">*</span>
        </label>
        <div className="flex items-center gap-2 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/70 dark:border-white/10 px-3.5 py-2.5 mb-2">
          <Truck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <input
            required
            value={vehicleNum}
            onChange={e => setVehicleNum(e.target.value)}
            placeholder="Vehicle Plate (e.g. TN-04-E-8821) *"
            className="flex-1 bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none font-mono uppercase"
          />
        </div>
        {/* Vehicle type tiles */}
        <div className="flex gap-1.5">
          {VEHICLE_TYPES.map(vt => (
            <button
              key={vt.id}
              type="button"
              onClick={() => setVehicleType(vt.id)}
              className={clsx(
                'flex-1 py-2 rounded-xl border text-center transition-all duration-150',
                vehicleType === vt.id
                  ? 'bg-gradient-to-b from-sky-500/20 to-cyan-500/10 border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'bg-white/50 dark:bg-slate-800/40 border-white/60 dark:border-white/10 hover:border-cyan-400/30'
              )}
            >
              <div className="text-base leading-none">{vt.icon}</div>
              <div className="text-[8px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">{vt.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Driver Details & Mobile Number */}
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Driver Contact Details <span className="text-rose-500 font-black">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/70 dark:border-white/10 px-3.5 py-2.5">
            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              required
              value={driverName}
              onChange={e => setDriverName(e.target.value)}
              placeholder="Driver Name *"
              className="flex-1 bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/70 dark:border-white/10 px-3.5 py-2.5">
            <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              required
              type="tel"
              value={driverPhone}
              onChange={e => setDriverPhone(e.target.value)}
              placeholder="Mobile Number *"
              className="flex-1 bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* 5. Delivery Destination (Google Maps style Autocomplete) */}
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Delivery Destination / Cargo Yard <span className="text-rose-500 font-black">*</span>
        </label>
        <DestinationAutocomplete
          value={destination}
          onChange={setDestination}
          portId={port.id}
          placeholder="Search CFS, ICD, port yard or city (e.g. CCTL Bay 4, Whitefield ICD)..."
        />
      </div>

      {/* 6. Priority Tier */}
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Dispatch Priority Tier <span className="text-rose-500 font-black">*</span>
        </label>
        <div className="flex gap-2">
          {TIERS.map(t => (
            <button
              key={t.id}
              onClick={() => setTier(t.id)}
              className={clsx(
                'flex-1 py-2.5 px-2 rounded-2xl text-center transition-all duration-200 border',
                tier === t.id
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold border-white/20 shadow-[0_4px_16px_rgba(6,182,212,0.4)] scale-[1.02]'
                  : 'bg-white/60 dark:bg-slate-900/60 border-white/60 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-cyan-400/40'
              )}
            >
              <div className="text-[10px] font-black">{t.label}</div>
              <div className="text-[9px] opacity-80 mt-0.5">
                {t.fee === 0 ? '₹0' : `+₹${t.fee.toLocaleString('en-IN')}`}
              </div>
              <div className="text-[8px] opacity-60 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 6. AI Slot Suggestions */}
      <AnimatePresence>
        {showAi && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/30"
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                AI Fleet Dispatch Optimizer
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {aiSlots.map(slot => {
                const isSelected = (selectedAiSlot ?? selectedTime) === slot.time;
                return (
                  <button
                    key={slot.time}
                    onClick={() => {
                      setSelectedAiSlot(slot.time);
                      setSelectedTime(slot.time);
                    }}
                    className={clsx(
                      'flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all duration-150',
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                        : 'bg-white/40 dark:bg-slate-900/40 border-white/60 dark:border-white/10 hover:border-emerald-400/40'
                    )}
                  >
                    <div className="font-mono text-xs font-black text-slate-800 dark:text-white w-12 flex-shrink-0">
                      {slot.time}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate">{slot.reason}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[9px] font-mono text-slate-500">{slot.waitMin}m wait</span>
                      {slot.isTopPick && (
                        <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black
                          bg-amber-400 text-amber-900
                          shadow-[0_0_8px_rgba(251,191,36,0.5)]
                          shimmer-ai">
                          ✦ TOP PICK
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. Confirm CTA */}
      <Button
        variant="primary"
        className="w-full py-3.5"
        isLoading={isBooking}
        onClick={handleConfirm}
        disabled={!gate || !vehicleNum.trim() || !driverName.trim() || !driverPhone.trim() || !destination.trim()}
      >
        {bookingSuccess ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>Slot Confirmed!</span>
          </>
        ) : isBooking ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Transmitting e-Pass…</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Slot &amp; Transmit e-Pass</span>
          </>
        )}
      </Button>

      <p className="text-[10px] text-center text-slate-400 font-medium">
        RFID fast-pass sync enabled · SMS notification will be sent to driver
      </p>
    </div>
  );
}

function addMins(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
