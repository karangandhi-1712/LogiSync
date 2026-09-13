import React, { useState } from 'react';
import { Truck, Ship, Train, Cpu, BatteryCharging, Gauge } from 'lucide-react';

interface FleetTrackerPanelProps {
  trucks: any[];
  vessels?: any[];
  trains?: any[];
  equipment: any[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  onOpenEntityModal?: (entity: any) => void;
}

export const FleetTrackerPanel: React.FC<FleetTrackerPanelProps> = ({
  trucks,
  vessels = [],
  trains = [],
  equipment,
  selectedVehicleId,
  onSelectVehicle,
  onOpenEntityModal
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'trucks' | 'ships' | 'trains'>('all');

  const filteredTrucks = activeTab === 'all' || activeTab === 'trucks' ? trucks : [];
  const filteredVessels = activeTab === 'all' || activeTab === 'ships' ? vessels : [];
  const filteredTrains = activeTab === 'all' || activeTab === 'trains' ? trains : [];

  return (
    <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-2xl space-y-4 max-h-[580px] overflow-y-auto">
      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
            Multi-Modal Fleet & Traffic ({trucks.length + vessels.length + trains.length})
          </h3>
          <p className="text-[10px] text-slate-400">Road, Maritime AIS & Rail FOIS Telemetry</p>
        </div>

        <div className="flex bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[10px] font-bold">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2 py-1 rounded ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('trucks')}
            className={`px-2 py-1 rounded ${activeTab === 'trucks' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Trucks ({trucks.length})
          </button>
          <button
            onClick={() => setActiveTab('ships')}
            className={`px-2 py-1 rounded ${activeTab === 'ships' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Ships ({vessels.length})
          </button>
          <button
            onClick={() => setActiveTab('trains')}
            className={`px-2 py-1 rounded ${activeTab === 'trains' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Trains ({trains.length})
          </button>
        </div>
      </div>

      {/* Cargo Ships Section */}
      {filteredVessels.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
            <Ship className="w-3.5 h-3.5" /> Maritime Container Vessels ({filteredVessels.length})
          </div>

          {filteredVessels.map((vessel) => {
            const isSelected = vessel.id === selectedVehicleId;
            return (
              <div
                key={vessel.id}
                onClick={() => {
                  onSelectVehicle(vessel.id);
                  if (onOpenEntityModal) onOpenEntityModal(vessel);
                }}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-500 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                      <Ship className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1 font-mono">
                        {vessel.vessel_name}
                      </div>
                      <div className="text-[10px] text-slate-400">{vessel.origin_port} → {vessel.destination_port}</div>
                    </div>
                  </div>

                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                    {vessel.teu_onboard} TEU
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-300">
                  <span className="text-cyan-300 font-bold">{vessel.speed_knots} kts</span>
                  <span className="text-slate-400">Capt: {vessel.captain_name}</span>
                  <span className="text-emerald-400">Draft: {vessel.draft_meters}m</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Freight Trains Section */}
      {filteredTrains.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-slate-800">
          <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
            <Train className="w-3.5 h-3.5" /> Southern Railway Freight Trains ({filteredTrains.length})
          </div>

          {filteredTrains.map((train) => {
            const isSelected = train.id === selectedVehicleId;
            return (
              <div
                key={train.id}
                onClick={() => {
                  onSelectVehicle(train.id);
                  if (onOpenEntityModal) onOpenEntityModal(train);
                }}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-purple-950/60 border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Train className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white font-mono">{train.train_number}</div>
                      <div className="text-[10px] text-slate-400">{train.loco_number}</div>
                    </div>
                  </div>

                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                    {train.total_teu} TEU ({train.total_wagons} Wagons)
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-300">
                  <span className="text-purple-300 font-bold">{train.speed_kmh} km/h</span>
                  <span className="text-slate-400">Pilot: {train.loco_pilot_name}</span>
                  <span className="text-emerald-400">{train.gross_train_weight_tonnes} t</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interstate Trucks Section */}
      {filteredTrucks.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-slate-800">
          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" /> Interstate Long-Haul Fleet ({filteredTrucks.length})
          </div>

          {filteredTrucks.map((truck) => {
            const isSelected = truck.id === selectedVehicleId;
            return (
              <div
                key={truck.id}
                onClick={() => {
                  onSelectVehicle(truck.id);
                  if (onOpenEntityModal) onOpenEntityModal(truck);
                }}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-950/60 border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white font-mono flex items-center gap-1">
                        {truck.license_plate}
                        {truck.state_of_origin && (
                          <span className="text-[9px] bg-blue-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-mono">
                            {truck.state_of_origin}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{truck.origin}</div>
                    </div>
                  </div>

                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {truck.status}
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1 text-[11px] font-mono text-slate-300">
                  <div className="flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-cyan-400" /> {truck.speed_kmh} km/h
                  </div>
                  <div className="flex items-center gap-1">
                    <BatteryCharging className="w-3 h-3 text-emerald-400" /> {truck.fuel_or_battery_pct}%
                  </div>
                  <div className="text-right text-cyan-300 font-bold truncate">
                    {truck.container_no || 'Chassis'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Equipment Section */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          RTG & RMG Terminal Cranes
        </div>

        {equipment.map((eq) => (
          <div
            key={eq.id}
            className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-bold text-white text-[11px]">{eq.name}</div>
                <div className="text-[10px] text-slate-400">{eq.moves_completed_today} moves today</div>
              </div>
            </div>

            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
              {eq.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
