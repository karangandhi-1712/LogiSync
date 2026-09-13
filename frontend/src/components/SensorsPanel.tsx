import React, { useState, useEffect } from 'react';
import { Radio, Scale, Camera, Thermometer, Zap } from 'lucide-react';

interface SensorsPanelProps {
  apiUrl: string;
}

export const SensorsPanel: React.FC<SensorsPanelProps> = ({ apiUrl }) => {
  const [sensorData, setSensorData] = useState<any>(null);
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

  const fetchSensors = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/sensors/telemetry`);
      const data = await res.json();
      setSensorData(data);
    } catch (err) {
      console.error('Error fetching sensor telemetry:', err);
    }
  };

  useEffect(() => {
    fetchSensors();
    const interval = setInterval(fetchSensors, 2500);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const handleSimulateTrigger = async (sensorType: string, facilityId: string) => {
    try {
      await fetch(`${apiUrl}/api/sensors/trigger-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sensor_type: sensorType, gate_or_wh_id: facilityId })
      });
      setTriggerStatus(`Event ${sensorType} triggered on ${facilityId}`);
      setTimeout(() => setTriggerStatus(null), 3500);
      fetchSensors();
    } catch (err) {
      console.error('Error triggering sensor event:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Logistics IoT Sensor Network & Port Gate Hardware
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              Live Hardware Feeds
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry from Port Gate ANPR cameras, 80-tonne Weighbridges, RFID FastTrack portals, and Warehouse Cold-Chain monitors.
          </p>
        </div>

        {triggerStatus && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold animate-pulse">
            ✓ {triggerStatus}
          </div>
        )}
      </div>

      {/* Gate Complex IoT Hardware Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sensorData?.gates?.map((gate: any) => (
          <div key={gate.gate_id} className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-sm text-white">{gate.name}</h3>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                gate.barrier_status === 'OPEN'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}>
                Barrier: {gate.barrier_status}
              </span>
            </div>

            {/* ANPR Camera */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <Camera className="w-3.5 h-3.5" /> High-Speed ANPR Camera ({gate.anpr_camera?.camera_id})
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Conf: {gate.anpr_camera?.confidence_score}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Last Plate Read:</span>
                <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  {gate.anpr_camera?.last_plate_read}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Matched Gate Pass:</span>
                <span className="text-cyan-300 font-mono">{gate.anpr_camera?.matched_appointment}</span>
              </div>
            </div>

            {/* Weighbridge Transducers */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Scale className="w-3.5 h-3.5" /> 80t Static Weighbridge ({gate.weighbridge_scale?.device_id})
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{gate.weighbridge_scale?.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-500 block uppercase">Gross Wt</span>
                  <span className="font-bold text-white text-sm">{gate.weighbridge_scale?.current_gross_weight_tonnes} t</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-500 block uppercase">Tare Est.</span>
                  <span className="font-bold text-slate-300 text-sm">{gate.weighbridge_scale?.tare_estimate_tonnes || 3.9} t</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                  <span className="text-[9px] text-slate-500 block uppercase">Net Cargo</span>
                  <span className="font-bold text-emerald-400 text-sm">{gate.weighbridge_scale?.net_cargo_weight_tonnes || 22.5} t</span>
                </div>
              </div>
            </div>

            {/* Trigger Button */}
            <button
              onClick={() => handleSimulateTrigger('ANPR_FASTTRACK_TRIGGER', gate.gate_id)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" /> Simulate ANPR & RFID Gate Scan
            </button>
          </div>
        ))}
      </div>

      {/* Warehouse Environmental & Dock Bay Sensors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sensorData?.warehouses?.map((wh: any) => (
          <div key={wh.warehouse_id} className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">{wh.name}</h3>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className={`px-2 py-0.5 rounded-full border ${
                  wh.ambient_temp_celsius < 0
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 font-bold'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {wh.ambient_temp_celsius}°C
                </span>
                <span className="text-slate-400">{wh.humidity_pct}% RH</span>
              </div>
            </div>

            {/* Dock Bays Status */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Ultrasonic Dock Bay Proximity Sensors
              </div>

              <div className="space-y-2">
                {wh.dock_bays?.map((bay: any) => (
                  <div
                    key={bay.bay_no}
                    className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center font-bold text-slate-300">
                        #{bay.bay_no}
                      </span>
                      <div>
                        <div className="font-bold text-white font-sans text-xs">
                          {bay.truck_plate || 'Bay Available'}
                        </div>
                        <div className="text-[10px] text-slate-500">{bay.status}</div>
                      </div>
                    </div>

                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      bay.status === 'AVAILABLE'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-sans'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30 font-sans'
                    }`}>
                      {bay.status === 'AVAILABLE' ? 'VACANT' : 'ACTIVE DOCK'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
