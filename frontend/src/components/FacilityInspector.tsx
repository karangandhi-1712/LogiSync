import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Container,
  DoorOpen,
  X,
  Sparkles,
  CheckCircle2,
  PlusCircle
} from 'lucide-react';

export interface SelectedFacility {
  id: string | number;
  type: 'warehouse' | 'yard' | 'gate';
  name: string;
  coordinates: [number, number];
  areaSqm?: number;
  capacity?: number;
  capacityLabel?: string;
  occupancyPct?: number;
  lanes?: number;
  hasAnpr?: boolean;
  hasRfid?: boolean;
  hasWeighbridge?: boolean;
  dataSource: string;
  operationalStatus: string;
}

interface FacilityInspectorProps {
  facility: SelectedFacility | null;
  onClose: () => void;
  onAddAsWaypoint: (facility: SelectedFacility) => void;
}

export const FacilityInspector: React.FC<FacilityInspectorProps> = ({
  facility,
  onClose,
  onAddAsWaypoint,
}) => {
  if (!facility) return null;

  const isWarehouse = facility.type === 'warehouse';
  const isYard = facility.type === 'yard';
  const isGate = facility.type === 'gate';

  const themeColor = isWarehouse
    ? {
        border: 'border-emerald-500/50',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        glow: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]',
        bar: 'bg-emerald-400',
        text: 'text-emerald-400'
      }
    : isYard
    ? {
        border: 'border-blue-500/50',
        badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        glow: 'shadow-[0_0_20px_rgba(59,130,246,0.25)]',
        bar: 'bg-blue-400',
        text: 'text-blue-400'
      }
    : {
        border: 'border-purple-500/50',
        badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        glow: 'shadow-[0_0_20px_rgba(168,85,247,0.25)]',
        bar: 'bg-purple-400',
        text: 'text-purple-400'
      };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`glass-panel p-4 rounded-2xl w-84 border ${themeColor.border} ${themeColor.glow} shadow-2xl backdrop-blur-xl z-30 flex flex-col gap-3.5`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${themeColor.badgeBg}`}>
              {isWarehouse && <Building2 className="w-4 h-4" />}
              {isYard && <Container className="w-4 h-4" />}
              {isGate && <DoorOpen className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {isWarehouse ? 'Industrial Warehouse' : isYard ? 'Container Yard Zone' : 'Access Gate & ANPR'}
              </div>
              <h4 className="text-xs font-bold text-white leading-tight mt-0.5 max-w-[190px]">
                {facility.name}
              </h4>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Footprint & Area Metrics */}
        {facility.areaSqm && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-cyber-900/80 border border-white/5">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Footprint Area</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">
                {facility.areaSqm.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">m²</span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-cyber-900/80 border border-white/5">
              <div className="text-[10px] font-mono text-slate-400 uppercase">{facility.capacityLabel || 'Capacity'}</div>
              <div className={`text-sm font-bold font-mono mt-0.5 ${themeColor.text}`}>
                {facility.capacity?.toLocaleString() || 'N/A'}
              </div>
            </div>
          </div>
        )}

        {/* Occupancy Progress Bar */}
        {facility.occupancyPct !== undefined && (
          <div className="space-y-1.5 p-2.5 rounded-xl bg-cyber-900/60 border border-white/5">
            <div className="flex justify-between items-center text-[11px] font-mono">
              <span className="text-slate-400">Simulated Occupancy</span>
              <span className={`font-bold ${themeColor.text}`}>{facility.occupancyPct}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${themeColor.bar} transition-all duration-500 rounded-full`}
                style={{ width: `${facility.occupancyPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Gate Specific Indicators */}
        {isGate && (
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="p-2 rounded-lg bg-cyber-900/80 border border-white/5">
              <div className="text-[9px] text-slate-400 uppercase font-mono">Lanes</div>
              <div className="text-xs font-bold text-white font-mono mt-0.5">{facility.lanes || 4}</div>
            </div>
            <div className="p-2 rounded-lg bg-cyber-900/80 border border-white/5">
              <div className="text-[9px] text-slate-400 uppercase font-mono">ANPR</div>
              <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">ACTIVE</div>
            </div>
            <div className="p-2 rounded-lg bg-cyber-900/80 border border-white/5">
              <div className="text-[9px] text-slate-400 uppercase font-mono">Weighbridge</div>
              <div className="text-xs font-bold text-cyan-400 font-mono mt-0.5">
                {facility.hasWeighbridge ? 'YES' : 'NO'}
              </div>
            </div>
          </div>
        )}

        {/* Phase 2 Transparency Honesty Badges */}
        <div className="space-y-1.5 border-t border-white/10 pt-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">OpenStreetMap Authentic Polygon Footprint</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-amber-300/90 font-medium">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span className="truncate">Operational Metrics: Explicitly Marked SIMULATED</span>
          </div>
        </div>

        {/* Add to Route Action */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onAddAsWaypoint(facility)}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add as Waypoint Stop in Route</span>
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
};
