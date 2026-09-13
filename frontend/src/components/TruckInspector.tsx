import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck as TruckIcon,
  Gauge,
  Fuel,
  Thermometer,
  User,
  Building2,
  Navigation,
  CheckCircle2,
  X,
  Radio,
  Clock
} from 'lucide-react';
import type { Truck, TruckStatus } from '../types/logistics';
import { updateTruck } from '../services/api';

interface TruckInspectorProps {
  truck: Truck | null;
  onClose: () => void;
  onUpdateTruck?: (updated: Truck) => void;
  onFocusTruck?: (truck: Truck) => void;
}

const STATUS_OPTIONS: { value: TruckStatus; label: string; color: string }[] = [
  { value: 'in_transit', label: 'In Transit (On Road)', color: 'border-cyan-500 text-cyan-400 bg-cyan-500/10' },
  { value: 'inbound', label: 'Inbound Approach', color: 'border-blue-500 text-blue-400 bg-blue-500/10' },
  { value: 'at_gate', label: 'At Security / Gate', color: 'border-amber-500 text-amber-400 bg-amber-500/10' },
  { value: 'in_yard', label: 'In Container Yard', color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10' },
  { value: 'loading', label: 'Loading / Unloading', color: 'border-purple-500 text-purple-400 bg-purple-500/10' },
  { value: 'outbound', label: 'Outbound Dispatched', color: 'border-rose-500 text-rose-400 bg-rose-500/10' },
];

export const TruckInspector: React.FC<TruckInspectorProps> = ({
  truck,
  onClose,
  onUpdateTruck,
  onFocusTruck
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!truck) return null;

  const handleStatusChange = async (newStatus: TruckStatus) => {
    setIsUpdating(true);
    try {
      const updated = await updateTruck(truck.id, { status: newStatus });
      if (onUpdateTruck) onUpdateTruck(updated);
    } catch (err) {
      console.error('Error updating truck status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const isReefer = truck.truck_type === 'reefer';
  const fuelColor =
    truck.fuel_pct > 50 ? 'bg-emerald-500' : truck.fuel_pct > 25 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-88 glass-panel rounded-2xl border border-cyan-500/30 shadow-2xl p-4 flex flex-col gap-3.5 bg-slate-950/95 backdrop-blur-xl text-slate-100"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.3)]">
              <TruckIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm tracking-wide text-white">
                  {truck.plate_number}
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
                  {truck.truck_type.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                <Building2 className="w-3 h-3 text-cyan-400" />
                <span>{truck.carrier}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real-Time Telemetry Gauges Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Speed */}
          <div className="glass-panel p-2 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Gauge className="w-3 h-3 text-cyan-400" />
              <span>SPEED</span>
            </div>
            <span className="text-base font-bold font-mono text-cyan-300 mt-0.5">
              {Math.round(truck.speed_kmh)}
            </span>
            <span className="text-[9px] text-slate-500">km/h</span>
          </div>

          {/* Fuel */}
          <div className="glass-panel p-2 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Fuel className="w-3 h-3 text-amber-400" />
              <span>FUEL</span>
            </div>
            <span className="text-base font-bold font-mono text-amber-300 mt-0.5">
              {Math.round(truck.fuel_pct)}%
            </span>
            <div className="w-full bg-white/10 h-1 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full ${fuelColor} transition-all duration-300`}
                style={{ width: `${truck.fuel_pct}%` }}
              />
            </div>
          </div>

          {/* Cold Chain Temp or Engine */}
          <div className="glass-panel p-2 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Thermometer className="w-3 h-3 text-emerald-400" />
              <span>{isReefer ? 'REEFER' : 'TEMP'}</span>
            </div>
            <span
              className={`text-base font-bold font-mono mt-0.5 ${
                truck.temperature_c < 0 ? 'text-blue-300' : 'text-emerald-300'
              }`}
            >
              {truck.temperature_c.toFixed(1)}°C
            </span>
            <span className="text-[9px] text-slate-500">{isReefer ? 'Frozen Active' : 'Normal'}</span>
          </div>
        </div>

        {/* Mission & Driver */}
        <div className="glass-panel p-2.5 rounded-xl border border-white/10 flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" /> Driver
            </span>
            <strong className="text-white font-medium">{truck.driver_name}</strong>
          </div>
          <div className="text-[11px] text-slate-300 bg-black/40 p-2 rounded-lg border border-white/5 flex items-start gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{truck.assigned_mission}</span>
          </div>
        </div>

        {/* Status Lifecycle Selector */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Operational Status:</span>
            {isUpdating && <span className="text-cyan-400 text-[10px] animate-pulse">Updating...</span>}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = truck.status === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  disabled={isUpdating}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold border flex items-center justify-between transition-all ${
                    isSelected
                      ? opt.color + ' ring-1 ring-white/20'
                      : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="truncate">{opt.label.split(' ')[0]} {opt.label.split(' ')[1] || ''}</span>
                  {isSelected && <CheckCircle2 className="w-3 h-3 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live GPS Telemetry Footprint */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-cyan-400/80">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>GPS: {truck.latitude.toFixed(4)}, {truck.longitude.toFixed(4)}</span>
          </div>
          {onFocusTruck && (
            <button
              onClick={() => onFocusTruck(truck)}
              className="text-cyan-400 hover:text-cyan-200 underline font-sans text-[11px]"
            >
              Center on Map
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
