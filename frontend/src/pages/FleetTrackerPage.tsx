import { useState, useCallback } from 'react';
import { Search, Gauge, Fuel, Navigation, Snowflake, MapPin, AlertTriangle, Zap, Satellite, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { GoogleMapCanvas } from '../components/map/GoogleMapCanvas';
import { TruckMarker } from '../components/map/TruckMarker';
import type { Truck } from '../types';

// Full 24-truck demo fleet
const DEMO_FLEET: Truck[] = [
  { id:'TRK-8821',plate:'TN-04-E-8821',truckType:'reefer',vehicleMake:'Scania R500',containerSize:'High Cube 40ft',vin:'SC-990812',status:'in_transit',cityId:'thoothukudi',driver:{id:'d1',name:'Rajesh Kumar',rating:4.9,dutyHours:4,dutyMinutes:12,phone:'+91-99400-11234',kyc_verified:true},latitude:8.800,longitude:78.130,heading:114,speedKmh:58,fuelPct:78,reeferTempC:-18,reeferSetTempC:-20,mission:{origin:'Chennai CFS',destination:'VOC Port Gate 3',progressPct:68,distanceClearedKm:184,distanceRemainingKm:42,etaTime:'14:15',etaStatus:'on_time'},gnssLocked:true},
  { id:'TRK-3019',plate:'KA-01-MJ-9941',truckType:'container_chassis',vehicleMake:'Tata Prima',containerSize:'20ft Standard',vin:'TP-441920',status:'at_gate',cityId:'thoothukudi',driver:{id:'d2',name:'Murugan S.',rating:4.7,dutyHours:2,dutyMinutes:45,phone:'+91-98765-43210',kyc_verified:true},latitude:8.765,longitude:78.157,heading:200,speedKmh:0,fuelPct:62,mission:{origin:'Madurai ICD',destination:'VOC Gate 1',progressPct:100,distanceClearedKm:156,distanceRemainingKm:0,etaTime:'14:00',etaStatus:'on_time'},gnssLocked:true},
  { id:'TRK-1102',plate:'TN-58-BG-3310',truckType:'flatbed',vehicleMake:'Ashok Leyland',containerSize:'40ft Flatbed',vin:'AL-220458',status:'delayed',cityId:'thoothukudi',driver:{id:'d3',name:'Selvam K.',rating:4.5,dutyHours:6,dutyMinutes:5,phone:'+91-97700-22345',kyc_verified:true},latitude:8.835,longitude:78.095,heading:160,speedKmh:18,fuelPct:41,mission:{origin:'Tirunelveli MMLP',destination:'VOC Gate 3',progressPct:45,distanceClearedKm:68,distanceRemainingKm:82,etaTime:'15:30',etaStatus:'delayed'},alertTag:'NH-44 Bypass Bottleneck • Missed Window',gnssLocked:true},
  { id:'TRK-5501',plate:'TN-04-H-7743',truckType:'tanker',vehicleMake:'BharatBenz 4040',containerSize:'Liquid Tanker 40KL',vin:'BB-774391',status:'in_transit',cityId:'thoothukudi',driver:{id:'d4',name:'Arjun P.',rating:4.8,dutyHours:3,dutyMinutes:22,phone:'+91-96001-33456',kyc_verified:false},latitude:8.720,longitude:78.162,heading:45,speedKmh:62,fuelPct:89,mission:{origin:'VOC Berth 4',destination:'Chennai Refinery',progressPct:22,distanceClearedKm:67,distanceRemainingKm:235,etaTime:'18:45',etaStatus:'on_time'},gnssLocked:true},
  { id:'TRK-2240',plate:'TN-04-F-2240',truckType:'container_chassis',vehicleMake:'Volvo FH16',containerSize:'40ft HC',vin:'VFH-2240',status:'loading',cityId:'thoothukudi',driver:{id:'d5',name:'Pandi V.',rating:4.6,dutyHours:1,dutyMinutes:30,phone:'+91-99001-44567',kyc_verified:true},latitude:8.758,longitude:78.170,heading:90,speedKmh:0,fuelPct:55,mission:{origin:'Tuticorin WH',destination:'VOC Berth 2',progressPct:80,distanceClearedKm:12,distanceRemainingKm:3,etaTime:'14:45',etaStatus:'on_time'},gnssLocked:true},
  { id:'TRK-6612',plate:'AP-09-AB-6612',truckType:'reefer',vehicleMake:'Scania R450',containerSize:'Reefer 40ft',vin:'SR-6612',status:'in_transit',cityId:'thoothukudi',driver:{id:'d6',name:'Suresh M.',rating:4.4,dutyHours:5,dutyMinutes:0,phone:'+91-96003-55678',kyc_verified:true},latitude:8.810,longitude:78.145,heading:135,speedKmh:72,fuelPct:66,reeferTempC:-4,reeferSetTempC:-5,mission:{origin:'Perishables Hub',destination:'VOC Cold Zone',progressPct:55,distanceClearedKm:140,distanceRemainingKm:115,etaTime:'16:00',etaStatus:'on_time'},gnssLocked:true},
];

// Fill rest with generic trucks to make 24
const EXTRA_STATUSES: Truck['status'][] = ['in_transit','in_transit','in_transit','at_gate','at_gate','at_gate','delayed','idle','outbound','outbound','outbound','outbound','outbound','outbound','in_transit','in_transit','in_transit','in_transit'];
for (let i = 7; i <= 24; i++) {
  const status = EXTRA_STATUSES[i - 7] || 'in_transit';
  const lat = 8.70 + Math.random() * 0.14;
  const lng = 78.09 + Math.random() * 0.12;
  DEMO_FLEET.push({
    id: `TRK-${1000 + i}`, plate: `TN-04-${String.fromCharCode(65 + (i % 26))}-${1000 + i}`,
    truckType: 'container_chassis', vehicleMake: 'Tata Prima', containerSize: '40ft HC', vin: `TP-${1000+i}`,
    status, cityId: 'thoothukudi',
    driver: { id: `d${i}`, name: `Driver ${i}`, rating: 4.2 + Math.random() * 0.7, dutyHours: Math.floor(Math.random() * 8), dutyMinutes: Math.floor(Math.random() * 60), phone: '+91-99000-00000', kyc_verified: true },
    latitude: lat, longitude: lng, heading: Math.floor(Math.random() * 360), speedKmh: status === 'in_transit' ? 40 + Math.floor(Math.random() * 40) : 0,
    fuelPct: 30 + Math.floor(Math.random() * 60),
    mission: { origin: 'Chennai', destination: 'VOC Port', progressPct: Math.floor(Math.random() * 100), distanceClearedKm: 50 + Math.floor(Math.random() * 200), distanceRemainingKm: Math.floor(Math.random() * 100), etaTime: '16:00', etaStatus: status === 'delayed' ? 'delayed' : 'on_time' },
    gnssLocked: true,
  });
}

const STATUS_COLORS: Record<string, string> = {
  in_transit: 'text-emerald-500',
  at_gate:    'text-amber-500',
  loading:    'text-blue-500',
  delayed:    'text-red-500',
  idle:       'text-slate-400',
  outbound:   'text-cyan-500',
};

const STATUS_BG: Record<string, string> = {
  in_transit: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  at_gate:    'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  loading:    'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  delayed:    'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  idle:       'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  outbound:   'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
};

const STATUS_FILTER_COUNTS = {
  all: 24, in_transit: 12, at_gate: 5, loading: 2, delayed: 3, idle: 2,
};

export default function FleetTrackerPage() {
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const handleMapReady = useCallback((m: google.maps.Map) => setMapInstance(m), []);

  const filteredFleet = DEMO_FLEET.filter(t => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || t.id.toLowerCase().includes(q) || t.plate.toLowerCase().includes(q) || t.driver.name.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const handleTruckClick = (truck: Truck) => {
    setSelectedTruck(truck);
    mapInstance?.panTo({ lat: truck.latitude, lng: truck.longitude });
    mapInstance?.setZoom(14);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg-canvas)]">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-slate-200 dark:border-[rgba(100,130,200,0.15)] flex-shrink-0">
        <h1 className="text-xl font-black text-slate-900 dark:text-white">Fleet Tracker & Telematics</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Live GPS tracking · GNSS RTK telemetry · 5G NR low-latency stream</p>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — Vehicle List */}
        <div className="w-[400px] flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-[rgba(100,130,200,0.15)]">
          {/* Search */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800/60 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search plate, driver, container ID..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm
                  bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700
                  text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex gap-1.5 px-3 py-2 overflow-x-auto flex-shrink-0 border-b border-slate-100 dark:border-slate-800/60">
            {Object.entries(STATUS_FILTER_COUNTS).map(([s, cnt]) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  'flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap',
                  statusFilter === s
                    ? 'bg-sky-500 dark:bg-cyan-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')} ({cnt})
              </button>
            ))}
          </div>

          {/* Truck Cards */}
          <div className="flex-1 overflow-y-auto py-2 px-3 space-y-2">
            {filteredFleet.map(truck => (
              <button
                key={truck.id}
                onClick={() => handleTruckClick(truck)}
                className={clsx(
                  'w-full text-left p-3 rounded-2xl border transition-all duration-200',
                  selectedTruck?.id === truck.id
                    ? 'border-sky-400 dark:border-cyan-500 bg-sky-50 dark:bg-cyan-500/10'
                    : 'border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-800/30 hover:border-sky-200 dark:hover:border-slate-700'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', STATUS_COLORS[truck.status].replace('text-', 'bg-'))} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-black text-slate-800 dark:text-white">{truck.id}</span>
                      <span className="text-[9px] font-black">{truck.plate}</span>
                      <span className={clsx('ml-auto px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase', STATUS_BG[truck.status])}>
                        {truck.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{truck.driver.name}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {truck.mission.origin} → {truck.mission.destination}
                    </div>

                    {truck.alertTag && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                        <span className="text-[10px] text-red-500 dark:text-red-400 truncate">{truck.alertTag}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] tabular text-slate-600 dark:text-slate-300">{truck.speedKmh} km/h</span>
                      </div>
                      <div className="flex items-center gap-1 flex-1">
                        <Fuel className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={clsx('h-full rounded-full', truck.fuelPct > 50 ? 'bg-emerald-500' : truck.fuelPct > 20 ? 'bg-amber-500' : 'bg-red-500')}
                            style={{ width: `${truck.fuelPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] tabular text-slate-400">{truck.fuelPct}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right — Map */}
        <div className="flex-1 relative min-w-0">
          <GoogleMapCanvas
            center={{ lat: 8.7642, lng: 78.1348 }}
            zoom={11}
            onMapReady={handleMapReady}
          />

          {mapInstance && filteredFleet.map(truck => (
            <TruckMarker key={truck.id} map={mapInstance} truck={truck} onClick={handleTruckClick} />
          ))}

          {/* GNSS Telemetry Status */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700">
              <Satellite className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">GNSS: 28 Locked</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700">
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">5G NR: 4.2ms latency</span>
            </div>
          </div>

          {/* Vehicle Inspector Overlay */}
          <AnimatePresence>
            {selectedTruck && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="absolute bottom-4 left-4 right-4 z-20 p-4 rounded-2xl
                  bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
                  border border-slate-200 dark:border-slate-700
                  shadow-lg dark:shadow-[0_8px_32px_rgba(6,182,212,0.12)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 dark:text-white">{selectedTruck.id}</span>
                      <span className="text-xs text-slate-400">{selectedTruck.plate}</span>
                      <span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-black uppercase', STATUS_BG[selectedTruck.status])}>
                        {selectedTruck.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{selectedTruck.vehicleMake} · {selectedTruck.containerSize} · {selectedTruck.driver.name}</p>
                  </div>
                  <button onClick={() => setSelectedTruck(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
                </div>

                {/* 4-stage mission breadcrumb */}
                <div className="flex items-center gap-1 mb-3 overflow-x-auto">
                  {['Chennai CFS', 'Tambaram Toll', 'VOC Gate 3', 'Berth 4 STS'].map((step, i) => (
                    <div key={step} className="flex items-center gap-1 flex-shrink-0">
                      <div className={clsx('flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold',
                        i <= 1 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' :
                        i === 2 ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-cyan-400' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      )}>
                        <MapPin className="w-2.5 h-2.5" /> {step}
                      </div>
                      {i < 3 && <span className="text-slate-300 dark:text-slate-600">→</span>}
                    </div>
                  ))}
                </div>

                {/* Telemetry row */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                    <Gauge className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400 mx-auto mb-0.5" />
                    <div className="text-sm font-black tabular text-slate-800 dark:text-white">{selectedTruck.speedKmh}</div>
                    <div className="text-[9px] text-slate-400">km/h</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                    <Navigation className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400 mx-auto mb-0.5" />
                    <div className="text-sm font-black tabular text-slate-800 dark:text-white">{selectedTruck.heading}°</div>
                    <div className="text-[9px] text-slate-400">ESE</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                    <Fuel className="w-3.5 h-3.5 text-amber-500 mx-auto mb-0.5" />
                    <div className="text-sm font-black tabular text-slate-800 dark:text-white">{selectedTruck.fuelPct}%</div>
                    <div className="text-[9px] text-slate-400">Fuel</div>
                  </div>
                  <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-center">
                    <Snowflake className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400 mx-auto mb-0.5" />
                    <div className="text-sm font-black tabular text-sky-600 dark:text-cyan-300">{selectedTruck.reeferTempC ?? '—'}°</div>
                    <div className="text-[9px] text-sky-400">Reefer</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 py-2 rounded-xl text-xs font-bold bg-sky-500 dark:bg-cyan-500 text-white hover:bg-sky-600 flex items-center justify-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> AI Reroute
                  </button>
                  <button className="flex-1 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                    Dispatch
                  </button>
                  <button className="flex-1 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                    Reassign
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
