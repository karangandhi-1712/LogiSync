import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck as TruckIcon,
  Box,
  FileText,
  Radio,
  Plus,
  Trash2,
  X,
  RefreshCw,
  Gauge,
  Fuel,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Play,
  Pause,
  MapPin
} from 'lucide-react';
import type { City, Truck, Container, Shipment, TelemetryStats } from '../types/logistics';
import {
  fetchTrucks,
  createTruck,
  deleteTruck,
  fetchContainers,
  createContainer,
  deleteContainer,
  fetchShipments,
  createShipment,
  deleteShipment,
  triggerTelemetryTick,
  fetchTelemetryStats
} from '../services/api';

interface OperationsPanelProps {
  selectedCity: City;
  isOpen: boolean;
  onClose: () => void;
  onFocusTruck?: (truck: Truck) => void;
  onRefreshMapTrucks?: () => void;
}

export const OperationsPanel: React.FC<OperationsPanelProps> = ({
  selectedCity,
  isOpen,
  onClose,
  onFocusTruck,
  onRefreshMapTrucks
}) => {
  const [activeTab, setActiveTab] = useState<'fleet' | 'containers' | 'shipments' | 'mqtt'>('fleet');

  // Entities state
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [telemetryStats, setTelemetryStats] = useState<TelemetryStats | null>(null);

  // Filters & Loading
  const [truckStatusFilter, setTruckStatusFilter] = useState<string>('all');
  const [containerCustomsFilter, setContainerCustomsFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Form Modals
  const [showAddTruckModal, setShowAddTruckModal] = useState<boolean>(false);
  const [showAddContainerModal, setShowAddContainerModal] = useState<boolean>(false);
  const [showAddShipmentModal, setShowAddShipmentModal] = useState<boolean>(false);

  // Form State - Truck
  const [newPlate, setNewPlate] = useState('');
  const [newCarrier, setNewCarrier] = useState('LogiSync Express');
  const [newTruckType, setNewTruckType] = useState<'container_chassis' | 'reefer' | 'flatbed' | 'hazmat'>('container_chassis');
  const [newDriver, setNewDriver] = useState('');
  const [newMission, setNewMission] = useState('Hub to Terminal Transfer');

  // Form State - Container
  const [newCntNumber, setNewCntNumber] = useState('');
  const [newIsoSize, setNewIsoSize] = useState<'20ft' | '40ft' | '40ft_HC' | 'reefer'>('40ft_HC');
  const [newContents, setNewContents] = useState('');
  const [newWeight, setNewWeight] = useState(24.5);
  const [newYardZone, setNewYardZone] = useState('Yard Block A');
  const [newCustoms, setNewCustoms] = useState<'cleared' | 'inspection_required' | 'hold'>('cleared');

  // Form State - Shipment
  const [newTrackingCode, setNewTrackingCode] = useState('');
  const [newOrigin, setNewOrigin] = useState('Port Inbound Gate');
  const [newDest, setNewDest] = useState('Express Freight Siding');
  const [newPriority, setNewPriority] = useState<'standard' | 'express' | 'critical'>('standard');
  const [newEtaMins, setNewEtaMins] = useState(30);

  // MQTT Stream Simulation controls
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [simInterval, setSimInterval] = useState(3);
  const [streamLog, setStreamLog] = useState<{ id: string; time: string; msg: string }[]>([]);

  // Load data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tList, cList, sList, stats] = await Promise.all([
        fetchTrucks(selectedCity.id, truckStatusFilter === 'all' ? undefined : truckStatusFilter),
        fetchContainers(selectedCity.id, containerCustomsFilter === 'all' ? undefined : containerCustomsFilter),
        fetchShipments(selectedCity.id),
        fetchTelemetryStats()
      ]);
      setTrucks(tList);
      setContainers(cList);
      setShipments(sList);
      setTelemetryStats(stats);
    } catch (err) {
      console.error('Error loading operations data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, selectedCity.id, truckStatusFilter, containerCustomsFilter]);

  // Periodic Telemetry Simulation Loop
  useEffect(() => {
    if (!isAutoSimulating) return;

    const timer = setInterval(async () => {
      const res = await triggerTelemetryTick(selectedCity.id);
      if (res?.telemetry) {
        const timeStr = new Date().toLocaleTimeString();
        setStreamLog(prev => [
          {
            id: `log-${Date.now()}`,
            time: timeStr,
            msg: `Tick broadcasted: ${res.ticks_count} active trucks telemetry streamed over MQTT/WS`
          },
          ...prev.slice(0, 30)
        ]);
        if (onRefreshMapTrucks) onRefreshMapTrucks();
      }
    }, simInterval * 1000);

    return () => clearInterval(timer);
  }, [isAutoSimulating, simInterval, selectedCity.id]);

  // Handle Add Truck
  const handleCreateTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate) return;
    try {
      const [lon, lat] = selectedCity.center;
      const created = await createTruck({
        plate_number: newPlate,
        city_id: selectedCity.id,
        carrier: newCarrier,
        truck_type: newTruckType,
        driver_name: newDriver || 'Assigned Driver',
        assigned_mission: newMission,
        status: 'in_transit',
        latitude: lat + (Math.random() - 0.5) * 0.02,
        longitude: lon + (Math.random() - 0.5) * 0.02,
        fuel_pct: 100.0,
        temperature_c: newTruckType === 'reefer' ? -18.0 : 4.0
      });
      setTrucks(prev => [created, ...prev]);
      setShowAddTruckModal(false);
      setNewPlate('');
      if (onRefreshMapTrucks) onRefreshMapTrucks();
    } catch (err) {
      console.error('Error creating truck:', err);
    }
  };

  // Handle Delete Truck
  const handleDeleteTruck = async (truckId: string) => {
    try {
      await deleteTruck(truckId);
      setTrucks(prev => prev.filter(t => t.id !== truckId));
      if (onRefreshMapTrucks) onRefreshMapTrucks();
    } catch (err) {
      console.error('Error deleting truck:', err);
    }
  };

  // Handle Add Container
  const handleCreateContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCntNumber) return;
    try {
      const created = await createContainer({
        container_number: newCntNumber,
        city_id: selectedCity.id,
        iso_size: newIsoSize,
        gross_weight_tonnes: Number(newWeight),
        contents: newContents || 'General Merchandise',
        yard_zone_id: newYardZone,
        customs_status: newCustoms,
        tier: 1,
        dwell_hours: 1.5
      });
      setContainers(prev => [created, ...prev]);
      setShowAddContainerModal(false);
      setNewCntNumber('');
      setNewContents('');
    } catch (err) {
      console.error('Error creating container:', err);
    }
  };

  // Handle Delete Container
  const handleDeleteContainer = async (containerId: string) => {
    try {
      await deleteContainer(containerId);
      setContainers(prev => prev.filter(c => c.id !== containerId));
    } catch (err) {
      console.error('Error deleting container:', err);
    }
  };

  // Handle Add Shipment
  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createShipment({
        city_id: selectedCity.id,
        tracking_code: newTrackingCode || `LOGI-${Math.floor(1000 + Math.random() * 9000)}`,
        origin_name: newOrigin,
        destination_name: newDest,
        priority: newPriority,
        eta_minutes: Number(newEtaMins),
        status: 'in_transit',
        weight_tonnes: 20.0
      });
      setShipments(prev => [created, ...prev]);
      setShowAddShipmentModal(false);
      setNewTrackingCode('');
    } catch (err) {
      console.error('Error creating shipment:', err);
    }
  };

  // Handle Delete Shipment
  const handleDeleteShipment = async (shipmentId: string) => {
    try {
      await deleteShipment(shipmentId);
      setShipments(prev => prev.filter(s => s.id !== shipmentId));
    } catch (err) {
      console.error('Error deleting shipment:', err);
    }
  };

  // Manual trigger tick
  const handleManualTick = async () => {
    const res = await triggerTelemetryTick(selectedCity.id);
    if (res?.telemetry) {
      setStreamLog(prev => [
        {
          id: `log-${Date.now()}`,
          time: new Date().toLocaleTimeString(),
          msg: `Manual tick triggered: ${res.ticks_count} telemetry packets ingested`
        },
        ...prev.slice(0, 30)
      ]);
      if (onRefreshMapTrucks) onRefreshMapTrucks();
      loadData();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-5xl h-[85vh] glass-panel rounded-3xl border border-cyan-500/30 shadow-2xl flex flex-col overflow-hidden bg-slate-950/95 text-slate-100"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-black shadow-[0_0_20px_rgba(0,242,254,0.4)]">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-wide">
                    Operations & Telemetry Command Center
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    PHASE 3
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Active Freight Corridor: <strong className="text-white">{selectedCity.name}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Refresh All Operations"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between px-6 py-2 border-b border-white/10 bg-slate-900/30 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('fleet')}
                className={`py-2 px-3.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'fleet'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TruckIcon className="w-4 h-4" />
                <span>Fleet & Trucks ({trucks.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('containers')}
                className={`py-2 px-3.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'containers'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Box className="w-4 h-4" />
                <span>Yard Containers ({containers.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('shipments')}
                className={`py-2 px-3.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'shipments'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Shipments ({shipments.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('mqtt')}
                className={`py-2 px-3.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'mqtt'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>MQTT Stream Live</span>
                {isAutoSimulating && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
                )}
              </button>
            </div>

            {/* Quick Actions per tab */}
            {activeTab === 'fleet' && (
              <button
                onClick={() => setShowAddTruckModal(true)}
                className="py-1.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-1.5 transition-colors shadow-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Fleet Truck</span>
              </button>
            )}

            {activeTab === 'containers' && (
              <button
                onClick={() => setShowAddContainerModal(true)}
                className="py-1.5 px-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-black font-bold flex items-center gap-1.5 transition-colors shadow-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ingest Container</span>
              </button>
            )}

            {activeTab === 'shipments' && (
              <button
                onClick={() => setShowAddShipmentModal(true)}
                className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center gap-1.5 transition-colors shadow-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Dispatch Shipment</span>
              </button>
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* TAB 1: FLEET & TRUCKS */}
            {activeTab === 'fleet' && (
              <div className="flex flex-col gap-4">
                {/* Filter bar */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Filter Status:</span>
                    {['all', 'in_transit', 'inbound', 'at_gate', 'in_yard', 'loading'].map(st => (
                      <button
                        key={st}
                        onClick={() => setTruckStatusFilter(st)}
                        className={`px-2.5 py-1 rounded-lg uppercase text-[10px] font-mono border transition-all ${
                          truckStatusFilter === st
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                            : 'border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">
                    Showing {trucks.length} operational units
                  </span>
                </div>

                {/* Trucks Grid */}
                {trucks.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs">
                    No active trucks found for this status. Click "+ Add Fleet Truck" above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {trucks.map(truck => (
                      <div
                        key={truck.id}
                        className="glass-panel p-4 rounded-2xl border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between gap-3 shadow-lg"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white text-sm">
                                  {truck.plate_number}
                                </span>
                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">
                                  {truck.truck_type}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {truck.carrier}
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteTruck(truck.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete truck"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-black/30 p-1.5 rounded-xl border border-white/5">
                              <div className="text-[9px] text-slate-500 flex items-center justify-center gap-1">
                                <Gauge className="w-2.5 h-2.5 text-cyan-400" /> SPEED
                              </div>
                              <div className="font-mono font-bold text-cyan-300 mt-0.5">
                                {Math.round(truck.speed_kmh)} km/h
                              </div>
                            </div>

                            <div className="bg-black/30 p-1.5 rounded-xl border border-white/5">
                              <div className="text-[9px] text-slate-500 flex items-center justify-center gap-1">
                                <Fuel className="w-2.5 h-2.5 text-amber-400" /> FUEL
                              </div>
                              <div className="font-mono font-bold text-amber-300 mt-0.5">
                                {Math.round(truck.fuel_pct)}%
                              </div>
                            </div>

                            <div className="bg-black/30 p-1.5 rounded-xl border border-white/5">
                              <div className="text-[9px] text-slate-500 flex items-center justify-center gap-1">
                                <Thermometer className="w-2.5 h-2.5 text-emerald-400" /> TEMP
                              </div>
                              <div className="font-mono font-bold text-emerald-300 mt-0.5">
                                {truck.temperature_c.toFixed(1)}°C
                              </div>
                            </div>
                          </div>

                          <div className="mt-2.5 text-[11px] text-slate-300 line-clamp-1 bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                            Mission: {truck.assigned_mission}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {truck.status.replace('_', ' ')}
                          </span>

                          {onFocusTruck && (
                            <button
                              onClick={() => {
                                onFocusTruck(truck);
                                onClose();
                              }}
                              className="text-cyan-400 hover:text-white flex items-center gap-1 text-[11px] font-medium"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>Locate on Map</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: YARD CONTAINERS */}
            {activeTab === 'containers' && (
              <div className="flex flex-col gap-4">
                {/* Customs Filter */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Customs Status:</span>
                    {['all', 'cleared', 'inspection_required', 'hold'].map(cst => (
                      <button
                        key={cst}
                        onClick={() => setContainerCustomsFilter(cst)}
                        className={`px-2.5 py-1 rounded-lg uppercase text-[10px] font-mono border transition-all ${
                          containerCustomsFilter === cst
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold'
                            : 'border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cst.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">
                    Total {containers.length} Stacked Units
                  </span>
                </div>

                {/* Containers Grid */}
                {containers.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs">
                    No containers found in this yard. Click "+ Ingest Container" above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {containers.map(cnt => (
                      <div
                        key={cnt.id}
                        className="glass-panel p-4 rounded-2xl border border-white/10 hover:border-blue-500/40 transition-all flex flex-col justify-between gap-3 shadow-lg"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white text-sm">
                                  {cnt.container_number}
                                </span>
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  {cnt.iso_size}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {cnt.contents}
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteContainer(cnt.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                              <div className="text-[9px] text-slate-500">ZONE</div>
                              <div className="font-mono font-bold text-slate-200 mt-0.5 text-[11px] truncate">
                                {cnt.yard_zone_id}
                              </div>
                            </div>

                            <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                              <div className="text-[9px] text-slate-500">TIER</div>
                              <div className="font-mono font-bold text-amber-300 mt-0.5">
                                Tier #{cnt.tier}
                              </div>
                            </div>

                            <div className="bg-black/30 p-2 rounded-xl border border-white/5">
                              <div className="text-[9px] text-slate-500">DWELL</div>
                              <div className="font-mono font-bold text-emerald-300 mt-0.5">
                                {cnt.dwell_hours.toFixed(1)}h
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${
                              cnt.customs_status === 'cleared'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : cnt.customs_status === 'hold'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {cnt.customs_status.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {cnt.gross_weight_tonnes} Tonnes
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SHIPMENTS */}
            {activeTab === 'shipments' && (
              <div className="flex flex-col gap-4">
                {shipments.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs">
                    No active shipments registered. Click "+ Dispatch Shipment" above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {shipments.map(shp => (
                      <div
                        key={shp.id}
                        className="glass-panel p-4 rounded-2xl border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-3 shadow-lg"
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white text-sm">
                                {shp.tracking_code}
                              </span>
                              <span
                                className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                                  shp.priority === 'critical'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : shp.priority === 'express'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                }`}
                              >
                                {shp.priority}
                              </span>
                            </div>

                            <button
                              onClick={() => handleDeleteShipment(shp.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="mt-3 flex flex-col gap-1.5 text-xs text-slate-300">
                            <div className="flex items-center gap-2">
                              <span className="w-16 text-[11px] text-slate-500 uppercase">From:</span>
                              <strong className="text-white">{shp.origin_name}</strong>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-16 text-[11px] text-slate-500 uppercase">To:</span>
                              <strong className="text-white">{shp.destination_name}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                          <span className="text-[11px] font-mono text-emerald-400">
                            ETA: ~{shp.eta_minutes} mins
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                            {shp.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: MQTT TELEMETRY STREAM */}
            {activeTab === 'mqtt' && (
              <div className="flex flex-col gap-4">
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="glass-panel p-3 rounded-2xl border border-white/10 text-center">
                    <span className="text-[10px] text-slate-400 uppercase">Broker Status</span>
                    <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      {telemetryStats?.broker_status || 'ONLINE'}
                    </div>
                  </div>

                  <div className="glass-panel p-3 rounded-2xl border border-white/10 text-center">
                    <span className="text-[10px] text-slate-400 uppercase">Connected Clients</span>
                    <div className="text-sm font-bold font-mono text-cyan-300 mt-1">
                      {telemetryStats?.connected_clients ?? 1} WS Link
                    </div>
                  </div>

                  <div className="glass-panel p-3 rounded-2xl border border-white/10 text-center">
                    <span className="text-[10px] text-slate-400 uppercase">Packets Ingested</span>
                    <div className="text-sm font-bold font-mono text-amber-300 mt-1">
                      {telemetryStats?.total_packets_processed ?? streamLog.length}
                    </div>
                  </div>

                  <div className="glass-panel p-3 rounded-2xl border border-white/10 text-center">
                    <span className="text-[10px] text-slate-400 uppercase">Protocol Bridge</span>
                    <div className="text-xs font-mono text-slate-300 mt-1.5 truncate">
                      MQTT / WebSocket
                    </div>
                  </div>
                </div>

                {/* Simulation Control Bar */}
                <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 flex items-center justify-between gap-4 bg-slate-900/40">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsAutoSimulating(!isAutoSimulating)}
                      className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
                        isAutoSimulating
                          ? 'bg-rose-500 hover:bg-rose-400 text-white'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                      }`}
                    >
                      {isAutoSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isAutoSimulating ? 'Pause Auto Ticks' : 'Start Auto Telemetry Stream'}</span>
                    </button>

                    <button
                      onClick={handleManualTick}
                      className="py-2 px-3.5 rounded-xl border border-white/10 hover:border-cyan-400 text-slate-300 hover:text-white text-xs font-medium transition-colors"
                    >
                      Single Tick Ingest
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Frequency:</span>
                    {[1, 2, 5].map(sec => (
                      <button
                        key={sec}
                        onClick={() => setSimInterval(sec)}
                        className={`px-2.5 py-1 rounded-lg font-mono text-[11px] border transition-all ${
                          simInterval === sec
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                            : 'border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Stream Terminal Feed */}
                <div className="glass-panel rounded-2xl border border-white/10 p-4 bg-black/60 font-mono text-xs flex flex-col gap-2 h-72 overflow-y-auto">
                  <div className="text-slate-500 text-[11px] border-b border-white/10 pb-1.5 flex items-center justify-between">
                    <span>MQTT FEED TOPIC: logisync/{selectedCity.id}/trucks/+/telemetry</span>
                    <span className="text-emerald-400">LISTENING</span>
                  </div>

                  {streamLog.length === 0 ? (
                    <div className="text-slate-600 text-center py-10">
                      Press "Start Auto Telemetry Stream" or "Single Tick Ingest" to see incoming MQTT packets.
                    </div>
                  ) : (
                    streamLog.map(log => (
                      <div key={log.id} className="flex items-start gap-2 text-[11px]">
                        <span className="text-slate-500">[{log.time}]</span>
                        <span className="text-cyan-300">📡</span>
                        <span className="text-slate-300">{log.msg}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* MODAL: ADD TRUCK */}
        {showAddTruckModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md glass-panel rounded-2xl border border-cyan-500/40 p-5 bg-slate-950 text-white shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h3 className="font-bold text-sm text-cyan-300">Add Heavy Freight Truck</h3>
                <button onClick={() => setShowAddTruckModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTruck} className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">License Plate Number</label>
                  <input
                    type="text"
                    value={newPlate}
                    onChange={e => setNewPlate(e.target.value)}
                    placeholder="e.g. TN-69-CC-5522"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-cyan-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Carrier / Operator</label>
                  <input
                    type="text"
                    value={newCarrier}
                    onChange={e => setNewCarrier(e.target.value)}
                    placeholder="e.g. VOC Port Freight Logistics"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-cyan-400 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Truck Chassis Type</label>
                    <select
                      value={newTruckType}
                      onChange={e => setNewTruckType(e.target.value as any)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-cyan-400 outline-none"
                    >
                      <option value="container_chassis">Container Chassis</option>
                      <option value="reefer">Reefer Cold Chain</option>
                      <option value="flatbed">Flatbed Heavy Haul</option>
                      <option value="hazmat">Hazmat Tanker</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Driver Name</label>
                    <input
                      type="text"
                      value={newDriver}
                      onChange={e => setNewDriver(e.target.value)}
                      placeholder="e.g. K. Muthu"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-cyan-400 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Assigned Mission</label>
                  <input
                    type="text"
                    value={newMission}
                    onChange={e => setNewMission(e.target.value)}
                    placeholder="e.g. Port Container Delivery to Warehouse 3"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-cyan-400 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddTruckModal(false)}
                    className="px-3 py-1.5 rounded-xl border border-white/10 text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold"
                  >
                    Deploy Truck
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD CONTAINER */}
        {showAddContainerModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md glass-panel rounded-2xl border border-blue-500/40 p-5 bg-slate-950 text-white shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h3 className="font-bold text-sm text-blue-300">Ingest Intermodal Container</h3>
                <button onClick={() => setShowAddContainerModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateContainer} className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Container ISO Code</label>
                  <input
                    type="text"
                    value={newCntNumber}
                    onChange={e => setNewCntNumber(e.target.value)}
                    placeholder="e.g. MSCU-994411-2"
                    required
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-400 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">ISO Size</label>
                    <select
                      value={newIsoSize}
                      onChange={e => setNewIsoSize(e.target.value as any)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-blue-400 outline-none"
                    >
                      <option value="40ft_HC">40ft High Cube</option>
                      <option value="20ft">20ft Standard</option>
                      <option value="40ft">40ft Standard</option>
                      <option value="reefer">Reefer Cold Container</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Gross Weight (Tonnes)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newWeight}
                      onChange={e => setNewWeight(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-blue-400 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Cargo Contents</label>
                  <input
                    type="text"
                    value={newContents}
                    onChange={e => setNewContents(e.target.value)}
                    placeholder="e.g. Semiconductor subassemblies"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-blue-400 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Yard Zone</label>
                    <input
                      type="text"
                      value={newYardZone}
                      onChange={e => setNewYardZone(e.target.value)}
                      placeholder="e.g. Yard Block A"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-blue-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Customs Status</label>
                    <select
                      value={newCustoms}
                      onChange={e => setNewCustoms(e.target.value as any)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-blue-400 outline-none"
                    >
                      <option value="cleared">Cleared</option>
                      <option value="inspection_required">Inspection Required</option>
                      <option value="hold">Customs Hold</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddContainerModal(false)}
                    className="px-3 py-1.5 rounded-xl border border-white/10 text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-black font-bold"
                  >
                    Stack in Yard
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD SHIPMENT */}
        {showAddShipmentModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md glass-panel rounded-2xl border border-emerald-500/40 p-5 bg-slate-950 text-white shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h3 className="font-bold text-sm text-emerald-300">Dispatch Logistics Shipment</h3>
                <button onClick={() => setShowAddShipmentModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateShipment} className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Tracking Consignment Code (Optional)</label>
                  <input
                    type="text"
                    value={newTrackingCode}
                    onChange={e => setNewTrackingCode(e.target.value)}
                    placeholder="e.g. LOGI-TH-9988"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-400 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Origin Point</label>
                    <input
                      type="text"
                      value={newOrigin}
                      onChange={e => setNewOrigin(e.target.value)}
                      placeholder="e.g. VOC Terminal Gate 1"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-emerald-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Destination</label>
                    <input
                      type="text"
                      value={newDest}
                      onChange={e => setNewDest(e.target.value)}
                      placeholder="e.g. NH-38 Freight Siding"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-emerald-400 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Priority Tier</label>
                    <select
                      value={newPriority}
                      onChange={e => setNewPriority(e.target.value as any)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-emerald-400 outline-none"
                    >
                      <option value="standard">Standard</option>
                      <option value="express">Express</option>
                      <option value="critical">Critical Cold-Chain</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Target ETA (Mins)</label>
                    <input
                      type="number"
                      value={newEtaMins}
                      onChange={e => setNewEtaMins(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-400 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddShipmentModal(false)}
                    className="px-3 py-1.5 rounded-xl border border-white/10 text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                  >
                    Dispatch Consignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
