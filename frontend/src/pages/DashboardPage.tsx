import { useState, useCallback, useRef } from 'react';
import { Truck, Eye, EyeOff } from 'lucide-react';
import { GoogleMapCanvas } from '../components/map/GoogleMapCanvas';
import { TruckMarker } from '../components/map/TruckMarker';
import { GeofenceOverlay } from '../components/map/GeofenceOverlay';
import { SubHeaderStrip } from '../components/dashboard/SubHeaderStrip';
import { TelemetryInspector } from '../components/dashboard/TelemetryInspector';
import type { Truck as TruckType } from '../types';

// Demo fleet data — all parked around Thoothukudi
const DEMO_FLEET: TruckType[] = [
  {
    id: 'TRK-8821', plate: 'TN-04-E-8821', truckType: 'reefer',
    vehicleMake: 'Scania R500', containerSize: 'High Cube 40ft', vin: 'SC-990812',
    status: 'in_transit', cityId: 'thoothukudi',
    driver: { id: 'd1', name: 'Rajesh Kumar', rating: 4.9, dutyHours: 4, dutyMinutes: 12, phone: '+91-99400-11234', kyc_verified: true },
    latitude: 8.800, longitude: 78.130, heading: 114, speedKmh: 58,
    fuelPct: 78, reeferTempC: -18, reeferSetTempC: -20,
    mission: { origin: 'Chennai CFS', destination: 'VOC Port Gate 3', progressPct: 68, distanceClearedKm: 184, distanceRemainingKm: 42, etaTime: '14:15', etaStatus: 'on_time' },
    gnssLocked: true,
  },
  {
    id: 'TRK-3019', plate: 'KA-01-MJ-9941', truckType: 'container_chassis',
    vehicleMake: 'Tata Prima 4825.S', containerSize: '20ft Standard', vin: 'TP-441920',
    status: 'at_gate', cityId: 'thoothukudi',
    driver: { id: 'd2', name: 'Murugan S.', rating: 4.7, dutyHours: 2, dutyMinutes: 45, phone: '+91-98765-43210', kyc_verified: true },
    latitude: 8.765, longitude: 78.157, heading: 200, speedKmh: 0,
    fuelPct: 62,
    mission: { origin: 'Madurai ICD', destination: 'VOC Gate 1', progressPct: 100, distanceClearedKm: 156, distanceRemainingKm: 0, etaTime: '14:00', etaStatus: 'on_time' },
    gnssLocked: true,
  },
  {
    id: 'TRK-1102', plate: 'TN-58-BG-3310', truckType: 'flatbed',
    vehicleMake: 'Ashok Leyland 4940', containerSize: '40ft Flatbed', vin: 'AL-220458',
    status: 'delayed', cityId: 'thoothukudi',
    driver: { id: 'd3', name: 'Selvam K.', rating: 4.5, dutyHours: 6, dutyMinutes: 5, phone: '+91-97700-22345', kyc_verified: true },
    latitude: 8.835, longitude: 78.095, heading: 160, speedKmh: 18,
    fuelPct: 41,
    mission: { origin: 'Tirunelveli MMLP', destination: 'VOC Gate 3', progressPct: 45, distanceClearedKm: 68, distanceRemainingKm: 82, etaTime: '15:30', etaStatus: 'delayed' },
    alertTag: 'NH-44 Bypass Bottleneck • Missed Window',
    gnssLocked: true,
  },
  {
    id: 'TRK-5501', plate: 'TN-04-H-7743', truckType: 'tanker',
    vehicleMake: 'BharatBenz 4040', containerSize: 'Liquid Tanker 40KL', vin: 'BB-774391',
    status: 'in_transit', cityId: 'thoothukudi',
    driver: { id: 'd4', name: 'Arjun P.', rating: 4.8, dutyHours: 3, dutyMinutes: 22, phone: '+91-96001-33456', kyc_verified: false },
    latitude: 8.720, longitude: 78.162, heading: 45, speedKmh: 62,
    fuelPct: 89,
    mission: { origin: 'VOC Berth 4', destination: 'Chennai Refinery', progressPct: 22, distanceClearedKm: 67, distanceRemainingKm: 235, etaTime: '18:45', etaStatus: 'on_time' },
    gnssLocked: true,
  },
];

export default function DashboardPage() {
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [selectedTruck, setSelectedTruck] = useState<TruckType>(DEMO_FLEET[0]);
  const [layersVisible, setLayersVisible] = useState(true);
  const inspectorOpenRef = useRef(inspectorOpen);
  inspectorOpenRef.current = inspectorOpen;

  const handleMapReady = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  const handleTruckClick = useCallback((truck: TruckType) => {
    setSelectedTruck(truck);
    setInspectorOpen(true);
    mapInstance?.panTo({ lat: truck.latitude, lng: truck.longitude });
  }, [mapInstance]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SubHeaderStrip />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Map Canvas */}
        <div className="flex-1 relative min-w-0">
          <GoogleMapCanvas
            center={{ lat: 8.7642, lng: 78.1348 }}
            zoom={12}
            onMapReady={handleMapReady}
          />

          {/* GIS Overlays */}
          {mapInstance && layersVisible && (
            <>
              <GeofenceOverlay map={mapInstance} />
              {DEMO_FLEET.map(truck => (
                <TruckMarker
                  key={truck.id}
                  map={mapInstance}
                  truck={truck}
                  onClick={handleTruckClick}
                />
              ))}
            </>
          )}

          {/* Floating open-inspector button */}
          {!inspectorOpen && (
            <button
              onClick={() => setInspectorOpen(true)}
              className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm
                bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700
                text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-cyan-500/10 transition-colors"
            >
              <Truck className="w-4 h-4 text-sky-500 dark:text-cyan-400" />
              <Eye className="w-4 h-4" />
              Active Dispatch
            </button>
          )}

          {/* Layers toggle */}
          <button
            onClick={() => setLayersVisible(p => !p)}
            className="absolute bottom-4 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold
              bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700
              text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {layersVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {layersVisible ? 'Hide Layers' : 'Show Layers'}
          </button>
        </div>

        {/* Right Inspector Panel */}
        <TelemetryInspector
          isOpen={inspectorOpen}
          onClose={() => setInspectorOpen(false)}
          onTriggerReroute={() => alert(`Reroute triggered for ${selectedTruck.id}`)}
        />
      </div>
    </div>
  );
}
