import React from 'react';
import { X, Truck, User, Phone, MapPin, Clock, ShieldCheck } from 'lucide-react';

interface TruckDetailModalProps {
  truck: any | null;
  onClose: () => void;
}

export const TruckDetailModal: React.FC<TruckDetailModalProps> = ({ truck, onClose }) => {
  if (!truck) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: `${truck.route_color || '#3b82f6'}25`, color: truck.route_color || '#3b82f6' }}
            >
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white font-mono">{truck.license_plate}</h2>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                  style={{
                    backgroundColor: `${truck.route_color || '#3b82f6'}20`,
                    borderColor: `${truck.route_color || '#3b82f6'}40`,
                    color: truck.route_color || '#3b82f6'
                  }}
                >
                  {truck.route_type?.replace(/_/g, ' ') || 'ACTIVE MISSION'}
                </span>
              </div>
              <p className="text-xs text-slate-400">{truck.carrier} • ID: {truck.id}</p>
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
              Transit Route & Mission Path
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1 font-bold">
                  <MapPin className="w-3 h-3 text-blue-400" /> Origin Port / Depot
                </span>
                <div className="text-xs font-semibold text-white">{truck.origin || 'Thoothukudi Logistics Hub'}</div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1 font-bold">
                  <MapPin className="w-3 h-3 text-emerald-400" /> Destination Facility
                </span>
                <div className="text-xs font-semibold text-white">{truck.destination || 'MMLP Terminal'}</div>
              </div>
            </div>

            {/* ETA & Live Status */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-cyan-300 font-mono">
                <Clock className="w-3.5 h-3.5" /> Live ETA: {truck.eta_minutes} mins ({truck.eta_timestamp})
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" /> Mission Status: {truck.status}
              </span>
            </div>
          </div>

          {/* Cargo Manifest & Container Specifications */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Cargo Manifest & Container Specifications</span>
              <span className="text-cyan-400 font-mono text-[10px]">{truck.ewaybill_no}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Container No (ISO 6346)</span>
                <span className="font-mono font-bold text-white">{truck.container_no || truck.current_container_id}</span>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">ISO Type</span>
                <span className="font-mono text-cyan-300 font-bold">{truck.iso_type || '40HC'}</span>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Cargo Description</span>
                <span className="font-semibold text-emerald-300 truncate block">{truck.cargo_name || 'Commercial Freight'}</span>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Gross Weight</span>
                <span className="font-mono text-white font-bold">{truck.gross_weight_tonnes || 24.5} tonnes</span>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Tare / Net Weight</span>
                <span className="font-mono text-slate-300">{truck.tare_weight_tonnes || 3.9}t / {truck.net_weight_tonnes || 20.6}t</span>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Customs Seal No</span>
                <span className="font-mono text-purple-300">{truck.seal_number || 'SL-998234'}</span>
              </div>
            </div>
          </div>

          {/* Driver & Telematics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Driver Profile */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" /> Driver Information
              </div>
              <div className="text-sm font-bold text-white">{truck.driver_name || 'Autonomous Vehicle'}</div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-500" /> {truck.driver_phone || 'N/A'}
              </div>
              <div className="text-[11px] text-slate-500">
                Experience: {truck.driver_experience_years ? `${truck.driver_experience_years} Years` : 'Autonomous AI Pilot'}
              </div>
            </div>

            {/* Live Telematics */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 font-mono">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                Real-Time Telematics
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-300">Speed: <span className="font-bold text-white">{truck.speed_kmh} km/h</span></div>
                <div className="text-slate-300">Heading: <span className="font-bold text-purple-300">{truck.heading}°</span></div>
                <div className="text-slate-300">Fuel / Batt: <span className="font-bold text-emerald-400">{truck.fuel_or_battery_pct}%</span></div>
                <div className="text-slate-300">GPS: <span className="text-[10px] text-cyan-300">{truck.latitude?.toFixed(4)}, {truck.longitude?.toFixed(4)}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono">Verified E-Waybill & ANPR Registered</span>
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
