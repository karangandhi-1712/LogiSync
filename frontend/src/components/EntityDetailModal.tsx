import React from 'react';
import { X, Truck, Ship, Train, User, MapPin, Clock, ShieldCheck } from 'lucide-react';

interface EntityDetailModalProps {
  entity: any | null;
  onClose: () => void;
}

export const EntityDetailModal: React.FC<EntityDetailModalProps> = ({ entity, onClose }) => {
  if (!entity) return null;

  const isVessel = entity.entity_type === 'VESSEL' || entity.vessel_name || entity.imo_number;
  const isTrain = entity.entity_type === 'TRAIN' || entity.train_number || entity.loco_number;
  const isTruck = !isVessel && !isTrain;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: isVessel ? '#06b6d425' : isTrain ? '#a855f725' : '#3b82f625',
                color: isVessel ? '#06b6d4' : isTrain ? '#c084fc' : '#3b82f6'
              }}
            >
              {isVessel ? <Ship className="w-6 h-6" /> : isTrain ? <Train className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white font-mono">
                  {isVessel ? entity.vessel_name : isTrain ? entity.train_number : entity.license_plate}
                </h2>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                  style={{
                    backgroundColor: isVessel ? '#06b6d420' : isTrain ? '#a855f720' : '#3b82f620',
                    borderColor: isVessel ? '#06b6d440' : isTrain ? '#a855f740' : '#3b82f640',
                    color: isVessel ? '#38bdf8' : isTrain ? '#d8b4fe' : '#60a5fa'
                  }}
                >
                  {isVessel ? 'MARITIME VESSEL' : isTrain ? 'RAIL FREIGHT RAKE' : (entity.state_of_origin ? `${entity.state_of_origin} TRUCK` : 'INTERSTATE TRUCK')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isVessel ? `${entity.imo_number} • Flag: ${entity.flag}` : isTrain ? `${entity.loco_number} • ${entity.operator}` : `${entity.carrier} • ID: ${entity.id}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Origin & Destination Journey */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isVessel ? 'Maritime Voyage & Berth Allocation' : isTrain ? 'Rail Transit & Siding Corridor' : 'Highway Transit Route & Mission Path'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1 font-bold">
                  <MapPin className="w-3 h-3 text-blue-400" /> Origin Port / Depot / Hub
                </span>
                <div className="text-xs font-semibold text-white">
                  {isVessel ? entity.origin_port : isTrain ? entity.origin_terminal : (entity.origin || 'Madurai Highway Corridor')}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1 font-bold">
                  <MapPin className="w-3 h-3 text-emerald-400" /> Destination Facility / Berth
                </span>
                <div className="text-xs font-semibold text-white">
                  {isVessel ? entity.destination_port : isTrain ? entity.destination_terminal : (entity.destination || 'MMLP Terminal')}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Clock className="w-3.5 h-3.5" /> ETA: {entity.eta_timestamp || `${entity.eta_minutes} mins`}
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold font-sans">
                <ShieldCheck className="w-3.5 h-3.5" /> Status: {entity.status}
              </span>
            </div>
          </div>

          {/* Cargo Manifest & Specifications */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Cargo Manifest & Payload Specifications</span>
              <span className="text-cyan-400 font-mono text-[10px]">{entity.ewaybill_no || entity.call_sign || 'MANIFEST VERIFIED'}</span>
            </div>

            {isVessel && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Total TEU Capacity</span>
                  <span className="font-mono font-bold text-white text-sm">{entity.teu_capacity} TEU</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">TEU Onboard</span>
                  <span className="font-mono text-cyan-300 font-bold text-sm">{entity.teu_onboard} TEU</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Deadweight Tonnage (DWT)</span>
                  <span className="font-mono text-emerald-300 font-bold text-sm">{entity.dwt_tonnes} t</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Draft / Beam / Length</span>
                  <span className="font-mono text-purple-300">{entity.draft_meters}m / {entity.beam_meters}m / {entity.length_meters}m</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 col-span-2">
                  <span className="text-[10px] text-slate-500 block">Cargo Description</span>
                  <span className="font-semibold text-slate-200 block truncate">{entity.cargo_description}</span>
                </div>
              </div>
            )}

            {isTrain && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Total Flatcar Wagons</span>
                  <span className="font-mono font-bold text-white text-sm">{entity.total_wagons} Wagons (BLC)</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Total TEU Payload</span>
                  <span className="font-mono text-purple-300 font-bold text-sm">{entity.total_teu} TEU</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Gross Train Weight</span>
                  <span className="font-mono text-emerald-300 font-bold text-sm">{entity.gross_train_weight_tonnes} tonnes</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 col-span-3">
                  <span className="text-[10px] text-slate-500 block">Cargo Manifest</span>
                  <span className="font-semibold text-slate-200">{entity.cargo_description}</span>
                </div>
              </div>
            )}

            {isTruck && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Container No (ISO 6346)</span>
                  <span className="font-mono font-bold text-white">{entity.container_no || entity.current_container_id}</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">ISO Type</span>
                  <span className="font-mono text-cyan-300 font-bold">{entity.iso_type || '40HC'}</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Cargo Description</span>
                  <span className="font-semibold text-emerald-300 truncate block">{entity.cargo_name || 'Commercial Freight'}</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Gross Weight</span>
                  <span className="font-mono text-white font-bold">{entity.gross_weight_tonnes || 24.5} tonnes</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Tare / Net Weight</span>
                  <span className="font-mono text-slate-300">{entity.tare_weight_tonnes || 3.9}t / {entity.net_weight_tonnes || 20.6}t</span>
                </div>
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Customs Seal No</span>
                  <span className="font-mono text-purple-300">{entity.seal_number || 'SL-998234'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Commander / Pilot / Driver Profile & Telematics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                {isVessel ? 'Master / Captain Profile' : isTrain ? 'Loco Pilot Crew' : 'Truck Driver Information'}
              </div>
              <div className="text-sm font-bold text-white">
                {isVessel ? entity.captain_name : isTrain ? entity.loco_pilot_name : (entity.driver_name || 'Autonomous Vehicle')}
              </div>
              <div className="text-xs text-slate-400">
                {isVessel ? `Harbour Pilot: ${entity.pilot_onboard ? 'Onboard ✓' : 'En Route'}` : isTrain ? `Assistant Pilot: ${entity.assistant_pilot_name}` : `Phone: ${entity.driver_phone || 'N/A'}`}
              </div>
              <div className="text-[11px] text-slate-500">
                {isTruck && `Experience: ${entity.driver_experience_years || 10} Years`}
                {isVessel && `Call Sign: ${entity.call_sign}`}
                {isTrain && `Traction: Electric 25kV AC`}
              </div>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 font-mono">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                Real-Time Telematics Feed
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-300">Speed: <span className="font-bold text-white">{isVessel ? `${entity.speed_knots} kts` : `${entity.speed_kmh} km/h`}</span></div>
                <div className="text-slate-300">Heading: <span className="font-bold text-purple-300">{entity.heading}°</span></div>
                <div className="text-slate-300">Mode: <span className="font-bold text-cyan-300">{entity.entity_type || (isVessel ? 'VESSEL' : isTrain ? 'TRAIN' : 'TRUCK')}</span></div>
                <div className="text-slate-300">GPS: <span className="text-[10px] text-emerald-400">{entity.latitude?.toFixed(4)}, {entity.longitude?.toFixed(4)}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono">Real-time Multi-Modal Digital Twin Feed</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-md shadow-blue-600/30"
          >
            Close Telemetry Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
