import { useState, useCallback, useEffect, useMemo } from 'react';
import { Truck, Eye, Layers, Zap, X } from 'lucide-react';
import { GoogleMapCanvas } from '../components/map/GoogleMapCanvas';
import { TruckMarker } from '../components/map/TruckMarker';
import { GeofenceOverlay } from '../components/map/GeofenceOverlay';
import { SubHeaderStrip } from '../components/dashboard/SubHeaderStrip';
import { TelemetryInspector } from '../components/dashboard/TelemetryInspector';
import { fetchFleet, fetchGisGates, triggerReroute, createTelemetryWebSocket } from '../services/api';
import { RouteLayer } from '../components/map/RouteLayer';
import { useToast } from '../context/ToastContext';
import { usePort } from '../context/PortContext';
import { Button } from '../components/ui/Button';
import type { Truck as TruckType } from '../types';

export default function DashboardPage() {
  const { port, portId } = usePort();
  const [fleet, setFleet] = useState<TruckType[]>([]);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [selectedTruck, setSelectedTruck] = useState<TruckType | null>(null);
  const [layersVisible, setLayersVisible] = useState(true);
  const [portGates, setPortGates] = useState<any[]>([]);
  const [rerouteModalData, setRerouteModalData] = useState<any>(null);
  const [, setIsRerouting] = useState(false);

  const { showToast } = useToast();

  // Load trucks for the selected port
  useEffect(() => {
    setFleet([]);
    setSelectedTruck(null);
    fetchFleet(portId).then(data => {
      if (data && data.length > 0) {
        setFleet(data);
        setSelectedTruck(data[0]);
      }
    }).catch(() => {});
  }, [portId]);

  // Subscribe to live WebSocket updates
  useEffect(() => {
    const handle = createTelemetryWebSocket(portId, (update) => {
      if (!update || !update.id) return;
      setFleet(prev => prev.map(trk => {
        if (trk.id === update.id) {
          return {
            ...trk,
            latitude: update.latitude ?? trk.latitude,
            longitude: update.longitude ?? trk.longitude,
            speedKmh: update.speedKmh ?? trk.speedKmh,
            heading: update.heading ?? trk.heading,
            status: update.status ?? trk.status,
            fuelPct: update.fuelPct ?? trk.fuelPct
          };
        }
        return trk;
      }));

      setSelectedTruck(prev => {
        if (prev && prev.id === update.id) {
          return {
            ...prev,
            latitude: update.latitude ?? prev.latitude,
            longitude: update.longitude ?? prev.longitude,
            speedKmh: update.speedKmh ?? prev.speedKmh,
            heading: update.heading ?? prev.heading,
            status: update.status ?? prev.status,
            fuelPct: update.fuelPct ?? prev.fuelPct
          };
        }
        return prev;
      });
    });

    return () => handle.close();
  }, [portId]);

  const handleMapReady = useCallback((map: any) => {
    setMapInstance(map);
  }, []);

  // Drop the stale map handle on port switch (remounted canvas re-registers).
  useEffect(() => {
    setMapInstance(null);
  }, [portId]);

  // Gate coordinates for the selected truck's destination leg.
  useEffect(() => {
    setPortGates([]);
    fetchGisGates(portId).then(g => setPortGates(Array.isArray(g) ? g : [])).catch(() => {});
  }, [portId]);

  const destGate = useMemo(() => {
    const want = (selectedTruck?.assigned_gate || '').toLowerCase();
    if (!want || portGates.length === 0) return null;
    const hit = portGates.find(g =>
      String(g.name || g.gate_id || '').toLowerCase().startsWith(want) ||
      String(g.gate_id || '').toLowerCase().startsWith(want)
    ) || portGates[2] || portGates[0];
    const lat = hit?.lat ?? hit?.coordinates?.[1];
    const lng = hit?.lng ?? hit?.coordinates?.[0];
    return lat != null && lng != null ? { lat, lng, name: hit.name || hit.gate_id } : null;
  }, [selectedTruck?.assigned_gate, portGates]);

  const handleTruckClick = useCallback((truck: TruckType) => {
    setSelectedTruck(truck);
    setInspectorOpen(true);
    mapInstance?.panTo({ lat: truck.latitude, lng: truck.longitude });
  }, [mapInstance]);

  // Reroute action calling real backend
  const handleReroute = async () => {
    if (!selectedTruck) return;
    setIsRerouting(true);
    try {
      const res = await triggerReroute(selectedTruck.id);
      setRerouteModalData(res);
      showToast({
        type: 'success',
        title: 'AI Reroute Dispatched',
        message: `Corridor bypass instructions transmitted to ${selectedTruck.plate}`
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Reroute Failed',
        message: 'Could not contact backend dispatcher service.'
      });
    } finally {
      setIsRerouting(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--bg-canvas)] relative">
      <SubHeaderStrip />

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Map Canvas */}
        <div id="tutorial-map-container" className="flex-1 relative min-w-0">
          <GoogleMapCanvas
            key={`map-${portId}`}
            center={{ lat: port.lat, lng: port.lng }}
            zoom={port.zoom}
            onMapReady={handleMapReady}
          />

          {/* GIS Overlays */}
          {mapInstance && layersVisible && (
            <>
              <GeofenceOverlay map={mapInstance} portId={portId} portName={port.short} />
              {selectedTruck && destGate && (
                <RouteLayer
                  map={mapInstance}
                  routeKey={selectedTruck.id}
                  fromLat={selectedTruck.latitude}
                  fromLng={selectedTruck.longitude}
                  toLat={destGate.lat}
                  toLng={destGate.lng}
                  status={selectedTruck.status}
                  label={`${selectedTruck.id} → ${destGate.name}`}
                />
              )}
              {fleet.map(truck => (
                <TruckMarker
                  key={truck.id}
                  map={mapInstance}
                  truck={truck}
                  selected={selectedTruck?.id === truck.id}
                  onClick={handleTruckClick}
                />
              ))}
            </>
          )}

          {/* Floating HUD: Open Inspector Pill */}
          {!inspectorOpen && (
            <button
              onClick={() => setInspectorOpen(true)}
              className="absolute bottom-5 right-5 z-20 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-xs
                liquid-glass border border-white/70 dark:border-white/15
                neu-button text-slate-800 dark:text-slate-100 shadow-xl
                hover:border-cyan-400/60 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all backdrop-blur-2xl"
            >
              <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Truck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
              </div>
              <Eye className="w-4 h-4" />
              <span>Inspect Active Dispatch</span>
            </button>
          )}

          {/* Floating HUD: Layers Toggle Pill */}
          <button
            id="tutorial-layers-btn"
            onClick={() => setLayersVisible(p => !p)}
            className="absolute bottom-5 left-5 z-20 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold
              liquid-glass border border-white/70 dark:border-white/15
              neu-button text-slate-700 dark:text-slate-200 shadow-lg
              hover:border-cyan-400/50 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all backdrop-blur-2xl"
          >
            <Layers className="w-4 h-4 text-cyan-500" />
            <span>{layersVisible ? 'GIS Layers Active' : 'Layers Hidden'}</span>
            {layersVisible ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-400" />
            )}
          </button>
        </div>

        {/* Right Telemetry Inspector Panel */}
        <div id="tutorial-reroute-action-btn">
          <TelemetryInspector
            isOpen={inspectorOpen}
            onClose={() => setInspectorOpen(false)}
            onTriggerReroute={handleReroute}
            selectedTruck={selectedTruck}
          />
        </div>
      </div>

      {/* Reroute Result Modal */}
      {rerouteModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="max-w-md w-full p-6 rounded-3xl liquid-glass-elevated border border-white/80 dark:border-white/20 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/40 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-white">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    AI Reroute Dispatched
                  </h3>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {rerouteModalData.plate} • {rerouteModalData.truck_id}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setRerouteModalData(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-xs text-cyan-800 dark:text-cyan-200 leading-relaxed font-semibold">
              {rerouteModalData.instruction || "Diverting to Harbour Bypass Rd -> Gate 4 to avoid NH 38 queue."}
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm">
                <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {rerouteModalData.delay_avoided_min ?? 25}m
                </div>
                <div className="text-[9px] uppercase font-bold text-slate-400">Delay Avoided</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm">
                <div className="text-base font-black text-cyan-600 dark:text-cyan-400 font-mono">
                  {rerouteModalData.fuel_saved_litres ?? 3.8}L
                </div>
                <div className="text-[9px] uppercase font-bold text-slate-400">Fuel Saved</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm">
                <div className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {rerouteModalData.co2_reduction_kg ?? 9.4}kg
                </div>
                <div className="text-[9px] uppercase font-bold text-slate-400">CO2 Reduced</div>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => setRerouteModalData(null)}
            >
              Acknowledge & Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

