import { useState, useCallback, useEffect, useMemo } from 'react';
import { Search, Gauge, Fuel, Navigation, Snowflake, MapPin, AlertTriangle, Zap, Satellite, Wifi, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { GoogleMapCanvas } from '../components/map/GoogleMapCanvas';
import { TruckMarker } from '../components/map/TruckMarker';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import { usePort } from '../context/PortContext';
import { triggerReroute, bookSlot, fetchFleet, createTelemetryWebSocket } from '../services/api';
import { getDemoFleet } from '../data/demoFleet';
import type { Truck } from '../types';

const STATUS_COLORS: Record<string, string> = {
  in_transit: 'text-emerald-500',
  at_gate:    'text-amber-500',
  queued:     'text-orange-500',
  loading:    'text-blue-500',
  delayed:    'text-red-500',
  idle:       'text-slate-400',
  outbound:   'text-cyan-500',
};

const STATUS_BG: Record<string, string> = {
  in_transit: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30',
  at_gate:    'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30',
  queued:     'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-400/30',
  loading:    'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/30',
  delayed:    'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-400/30',
  idle:       'bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-400/30',
  outbound:   'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-400/30',
};

const STATUS_DOT_FALLBACK = 'bg-slate-400';
const STATUS_BG_FALLBACK = 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-400/30';

const STATUS_FILTER_ORDER = ['all', 'in_transit', 'at_gate', 'queued', 'loading', 'delayed', 'idle', 'outbound'] as const;

export default function FleetTrackerPage() {
  const { showToast } = useToast();
  const { port, portId } = usePort();
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [fleet, setFleet] = useState<Truck[]>(() => getDemoFleet(portId));
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [isRerouting, setIsRerouting] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const handleMapReady = useCallback((m: any) => setMapInstance(m), []);

  useEffect(() => {
    setIsLoading(true);
    setMapInstance(null);
    const demo = getDemoFleet(portId);
    setFleet(demo);
    setSelectedTruck(demo[0] || null);

    fetchFleet(portId)
      .then(data => {
        if (data && data.length > 0) {
          setFleet(data);
          setSelectedTruck(data[0] || null);
        }
        setLoadError(null);
      })
      .catch(() => setLoadError(null))
      .finally(() => setIsLoading(false));
  }, [portId]);

  useEffect(() => {
    const handle = createTelemetryWebSocket(
      portId,
      update => {
        if (!update.id) return;
        setFleet(prev => prev.map(truck => truck.id === update.id ? {
          ...truck,
          latitude: update.latitude ?? truck.latitude,
          longitude: update.longitude ?? truck.longitude,
          speedKmh: update.speedKmh ?? truck.speedKmh,
          heading: update.heading ?? truck.heading,
          fuelPct: update.fuelPct ?? truck.fuelPct,
          status: update.status ?? truck.status,
        } : truck));
        setSelectedTruck(prev => prev && prev.id === update.id ? {
          ...prev,
          latitude: update.latitude ?? prev.latitude,
          longitude: update.longitude ?? prev.longitude,
          speedKmh: update.speedKmh ?? prev.speedKmh,
          heading: update.heading ?? prev.heading,
          fuelPct: update.fuelPct ?? prev.fuelPct,
          status: update.status ?? prev.status,
        } : prev);
      },
      undefined,
      setWsStatus
    );
    return () => handle.close();
  }, [portId]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: fleet.length };
    for (const t of fleet) {
      const s = t.status || 'unknown';
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [fleet]);

  const filteredFleet = fleet.filter(t => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchSearch = !q
      || t.id.toLowerCase().includes(q)
      || t.plate.toLowerCase().includes(q)
      || t.driver.name.toLowerCase().includes(q)
      || (t.vin || '').toLowerCase().includes(q)
      || (t.containerSize || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const handleTruckClick = (truck: Truck) => {
    setSelectedTruck(truck);
    mapInstance?.panTo({ lat: truck.latitude, lng: truck.longitude });
    mapInstance?.setZoom(14);
  };

  const handleAiReroute = async () => {
    if (!selectedTruck) return;
    setIsRerouting(true);
    try {
      const res = await triggerReroute(selectedTruck.id);
      showToast({ type: 'success', title: 'AI Reroute Dispatched', message: res.instruction || `Bypassed corridor for ${selectedTruck.plate}` });
    } catch {
      showToast({ type: 'error', title: 'Reroute Failed', message: 'Could not contact backend dispatcher.' });
    } finally { setIsRerouting(false); }
  };

  const handleDispatchEPass = async () => {
    if (!selectedTruck) return;
    setIsDispatching(true);
    try {
      await bookSlot({
        gateId: port.gates[2], date: new Date().toISOString().split('T')[0],
        slotTime: selectedTruck.mission.etaTime || '14:00',
        truckPlate: selectedTruck.plate, driverName: selectedTruck.driver.name,
        driverPhone: selectedTruck.driver.phone, cargoType: 'Container', dwellMinutes: 30, tier: 'standard',
        port: portId,
      });
      showToast({ type: 'success', title: 'e-Pass Transmitted', message: `SMS dispatched to ${selectedTruck.driver.name}` });
    } catch {
      showToast({ type: 'error', title: 'e-Pass Failed', message: 'Could not transmit the driver e-Pass.' });
    } finally { setIsDispatching(false); }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg-canvas)] relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/40 dark:border-white/10 flex-shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white chroma-text">
              Fleet Telematics & GIS Tracker
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-400/30">
              <Sparkles className="w-2.5 h-2.5 text-cyan-500" />
              GNSS RTK 5G NR
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time multi-band GPS tracking · Geofence status alerts · 5G NR low-latency telemetry
          </p>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — Vehicle List in Liquid Neu-Glass Container */}
        <div id="tutorial-fleet-list" className="w-[410px] flex-shrink-0 flex flex-col border-r border-white/40 dark:border-white/10 liquid-glass backdrop-blur-2xl">
          {/* Search Debossed Inset Well */}
          <div id="tutorial-fleet-search" className="p-3.5 border-b border-white/40 dark:border-white/10 flex-shrink-0">
            <div className="relative rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/70 dark:border-white/10 neu-inset overflow-hidden focus-within:ring-2 focus-within:ring-cyan-400">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search plate, driver, container ID..."
                className="w-full pl-10 pr-3.5 py-2.5 bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Status Filter Pills (Tactile Neu-Pills) */}
          <div className="flex gap-1.5 px-3.5 py-2.5 overflow-x-auto flex-shrink-0 border-b border-white/40 dark:border-white/10 no-scrollbar">
            {STATUS_FILTER_ORDER.filter((s) => s === 'all' || (statusCounts[s] ?? 0) > 0).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  'flex-shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap',
                  statusFilter === s
                    ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md scale-[1.02]'
                    : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white border border-white/60 dark:border-white/10 neu-flat-sm'
                )}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')} ({statusCounts[s] ?? 0})
              </button>
            ))}
          </div>

          {/* Truck Cards */}
          <div className="flex-1 overflow-y-auto py-3 px-3.5 space-y-2.5">
            {isLoading && <div className="space-y-2">{[1, 2, 3].map(item => <div key={item} className="h-28 rounded-2xl bg-white/40 dark:bg-slate-900/40 animate-pulse" />)}</div>}
            {loadError && <div className="mb-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-700 dark:text-amber-300">{loadError}</div>}
            {!isLoading && filteredFleet.length === 0 && <div className="p-6 text-center text-xs text-slate-500">No trucks match these filters.</div>}
            {filteredFleet.map(truck => (
              <button
                key={truck.id}
                onClick={() => handleTruckClick(truck)}
                className={clsx(
                  'w-full text-left p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden backdrop-blur-xl',
                  selectedTruck?.id === truck.id
                    ? 'border-cyan-400 dark:border-cyan-400 bg-sky-500/15 dark:bg-cyan-500/15 shadow-[0_0_20px_rgba(6,182,212,0.25)] scale-[1.01]'
                    : 'border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-900/50 hover:border-cyan-400/50 neu-flat-sm'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0 shadow-sm', (STATUS_COLORS[truck.status] || 'text-slate-400').replace('text-', 'bg-') || STATUS_DOT_FALLBACK)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-black text-slate-900 dark:text-white font-mono">{truck.id}</span>
                      <span className="text-[10px] font-bold text-slate-500 font-mono">{truck.plate}</span>
                      <span className={clsx('ml-auto px-2 py-0.5 rounded-full text-[8px] font-black uppercase', STATUS_BG[truck.status] || STATUS_BG_FALLBACK)}>
                        {(truck.status || 'unknown').replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{truck.driver.name}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {truck.mission.origin} → {truck.mission.destination}
                    </div>

                    {truck.alertTag && (
                      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/30">
                        <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0 animate-pulse" />
                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 truncate">{truck.alertTag}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-200/40 dark:border-white/10">
                      <div className="flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-cyan-500" />
                        <span className="text-[10px] tabular font-bold text-slate-700 dark:text-slate-200 font-mono">
                          {truck.speedKmh} km/h
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-1">
                        <Fuel className="w-3 h-3 text-amber-500 flex-shrink-0" />
                        <div className="flex-1 h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden neu-inset-sm">
                          <div
                            className={clsx('h-full rounded-full transition-all', truck.fuelPct > 50 ? 'bg-emerald-500' : truck.fuelPct > 20 ? 'bg-amber-500' : 'bg-red-500')}
                            style={{ width: `${truck.fuelPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] tabular font-mono text-slate-400">{truck.fuelPct}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right — Map View */}
        <div className="flex-1 relative min-w-0">
          <GoogleMapCanvas
            key={`fleet-map-${portId}`}
            center={{ lat: port.lat, lng: port.lng }}
            zoom={port.zoom}
            onMapReady={handleMapReady}
          />

          {mapInstance && filteredFleet.map(truck => (
            <TruckMarker key={truck.id} map={mapInstance} truck={truck} selected={selectedTruck?.id === truck.id} onClick={handleTruckClick} />
          ))}

          {/* Floating GNSS & 5G Telemetry Status Badges */}
          <div id="tutorial-fleet-telecom" className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl liquid-glass border border-white/70 dark:border-white/15 neu-flat-sm">
              <Satellite className="w-4 h-4 text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono">GNSS: {wsStatus === 'connected' ? 'Live' : 'Reconnecting'}</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl liquid-glass border border-white/70 dark:border-white/15 neu-flat-sm">
              <Wifi className="w-4 h-4 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono">5G NR: {wsStatus === 'connected' ? '4.2ms' : 'offline'}</span>
            </div>
          </div>

          {/* Vehicle Inspector Floating Liquid Glass Modal */}
          <AnimatePresence>
            {selectedTruck && (
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                className="absolute bottom-5 left-5 right-5 z-20 p-5 rounded-3xl
                  liquid-glass-elevated border border-white/70 dark:border-white/20
                  shadow-2xl backdrop-blur-3xl"
              >
                <div className="flex items-center justify-between mb-3.5">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-black text-slate-900 dark:text-white font-mono chroma-text">
                        {selectedTruck.id}
                      </span>
                      <span className="text-xs font-bold text-slate-500 font-mono">{selectedTruck.plate}</span>
                      <span className={clsx('px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase', STATUS_BG[selectedTruck.status] || STATUS_BG_FALLBACK)}>
                        {(selectedTruck.status || 'unknown').replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      {selectedTruck.vehicleMake} · {selectedTruck.containerSize} · Driver: {selectedTruck.driver.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedTruck(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 neu-button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 4-stage mission breadcrumb */}
                <div className="flex items-center gap-1.5 mb-3.5 overflow-x-auto no-scrollbar">
                  {['Chennai CFS', 'Tambaram Toll', 'VOC Gate 3', 'Berth 4 STS'].map((step, i) => (
                    <div key={step} className="flex items-center gap-1.5 flex-shrink-0">
                      <div className={clsx(
                        'flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold border',
                        i <= 1
                          ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-700 dark:text-emerald-300'
                          : i === 2
                          ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-700 dark:text-cyan-300'
                          : 'bg-white/40 dark:bg-slate-800/40 border-white/40 dark:border-white/10 text-slate-400'
                      )}>
                        <MapPin className="w-3 h-3" /> {step}
                      </div>
                      {i < 3 && <span className="text-slate-300 dark:text-slate-600 font-bold">→</span>}
                    </div>
                  ))}
                </div>

                {/* Telemetry row (Tactile Inset Gauges) */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm text-center">
                    <Gauge className="w-4 h-4 text-cyan-500 mx-auto mb-1" />
                    <div className="text-base font-black tabular text-slate-900 dark:text-white font-mono">{selectedTruck.speedKmh}</div>
                    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">km/h</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm text-center">
                    <Navigation className="w-4 h-4 text-cyan-500 mx-auto mb-1" />
                    <div className="text-base font-black tabular text-slate-900 dark:text-white font-mono">{selectedTruck.heading}°</div>
                    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Heading ESE</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm text-center">
                    <Fuel className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                    <div className="text-base font-black tabular text-slate-900 dark:text-white font-mono">{selectedTruck.fuelPct}%</div>
                    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Fuel Level</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-sky-500/10 dark:bg-cyan-500/10 border border-sky-400/30 dark:border-cyan-400/30 neu-flat-sm text-center">
                    <Snowflake className="w-4 h-4 text-cyan-500 mx-auto mb-1 animate-spin-slow" />
                    <div className="text-base font-black tabular text-cyan-600 dark:text-cyan-300 font-mono">{selectedTruck.reeferTempC ?? '—'}°</div>
                    <div className="text-[9px] text-cyan-600 dark:text-cyan-400 uppercase font-bold tracking-wider">Reefer Temp</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2.5 mt-4">
                  <Button variant="primary" size="sm" className="flex-1" isLoading={isRerouting} onClick={handleAiReroute}>
                    <Zap className="w-3.5 h-3.5" /> AI Dynamic Reroute
                  </Button>
                  <Button variant="secondary" size="sm" className="flex-1" isLoading={isDispatching} onClick={handleDispatchEPass}>
                    Dispatch e-Pass
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => setSelectedTruck(null)}>
                    Close
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
