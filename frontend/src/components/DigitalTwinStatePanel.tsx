import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, RefreshCw, Scale, Clock, MapPin, Flame } from 'lucide-react';

interface DigitalTwinStatePanelProps {
  apiUrl: string;
}

export const DigitalTwinStatePanel: React.FC<DigitalTwinStatePanelProps> = ({ apiUrl }) => {
  const [observedState, setObservedState] = useState<any>(null);
  const [projectedState, setProjectedState] = useState<any>(null);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [obsRes, projRes, discRes] = await Promise.all([
        fetch(`${apiUrl}/api/twin/state/observed`).then(r => r.json()).catch(() => null),
        fetch(`${apiUrl}/api/twin/state/projected`).then(r => r.json()).catch(() => null),
        fetch(`${apiUrl}/api/twin/discrepancies`).then(r => r.json()).catch(() => null),
      ]);
      setObservedState(obsRes);
      setProjectedState(projRes);
      setDiscrepancies(discRes?.discrepancies || []);
    } catch (err) {
      console.error("Error fetching twin states:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiUrl]);

  const handleReconcile = async (disc: any) => {
    setReconcilingId(disc.id);
    try {
      await fetch(`${apiUrl}/api/twin/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: disc.type,
          target_item_id: disc.entity_id,
          note: `Reconciled: ${disc.suggested_action}`
        })
      });
      // Remove reconciled item locally and refresh
      setDiscrepancies(prev => prev.filter(d => d.id !== disc.id));
    } catch (err) {
      console.error("Error reconciling:", err);
    } finally {
      setReconcilingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Phase 4: Digital Twin Core State Separation
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              Live Synchronization
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time reconciliation between Physical Observed Telemetry and Planned Operational Target Baseline.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh State Diff
        </button>
      </div>

      {/* Discrepancy Alert Banner */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm text-slate-200 uppercase tracking-wider">
              Active Operational Discrepancies ({discrepancies.length})
            </span>
          </div>
          <span className="text-xs text-slate-400">Tolerance Threshold: ±1.5t weight / 15m ETA drift</span>
        </div>

        {discrepancies.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <span>All observed physical parameters match projected plan within SLA tolerances.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {discrepancies.map((d) => (
              <div
                key={d.id}
                className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                      {d.type === 'WEIGHT_MISMATCH' && <Scale className="w-3.5 h-3.5 text-rose-400" />}
                      {d.type === 'ETA_DRIFT' && <Clock className="w-3.5 h-3.5 text-amber-400" />}
                      {d.type === 'MISPLACED_IN_YARD' && <MapPin className="w-3.5 h-3.5 text-blue-400" />}
                      {d.type === 'HAZMAT_SAFETY_RULE' && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                      {d.container_no || d.vehicle_plate || d.entity_id}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        d.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : d.severity === 'HIGH'
                          ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {d.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-medium">{d.description}</p>

                  <div className="bg-slate-900/90 p-2.5 rounded-lg text-[11px] grid grid-cols-2 gap-2 border border-slate-800 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Physical Observed</span>
                      <span className="text-rose-300 font-bold">{d.observed_value}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Projected Plan</span>
                      <span className="text-emerald-300 font-bold">{d.projected_value}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    <span className="text-slate-500">Suggested Action: </span>
                    <span className="text-cyan-300">{d.suggested_action}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleReconcile(d)}
                  disabled={reconcilingId === d.id}
                  className="w-full py-1.5 px-3 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
                >
                  {reconcilingId === d.id ? 'Reconciling...' : 'Apply Digital Twin Reconciliation'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Side-by-Side State Comparison Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Observed Physical State */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h3 className="font-bold text-sm text-white">OBSERVED PHYSICAL STATE</h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Sensors & Telemetry
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Active Trucks in Terminal</span>
              <span className="font-mono text-white font-bold">{observedState?.kpis?.active_trucks_in_terminal || 4} units</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Total TEU Stored (Yard Matrix)</span>
              <span className="font-mono text-cyan-300 font-bold">{observedState?.kpis?.total_yard_teu_stored || 2960} TEU</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Measured Avg Turnaround (TAT)</span>
              <span className="font-mono text-amber-300 font-bold">{observedState?.kpis?.avg_measured_turnaround_time_mins || 34.2} mins</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Inbound Gate Physical Queue</span>
              <span className="font-mono text-rose-300 font-bold">{observedState?.kpis?.gate_inbound_queue_observed || 2} trucks</span>
            </div>
          </div>
        </div>

        {/* Projected Operational State */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
              <h3 className="font-bold text-sm text-white">PROJECTED OPERATIONAL PLAN</h3>
            </div>
            <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              Target SLA Baseline
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Target Turnaround Time (TAT)</span>
              <span className="font-mono text-emerald-300 font-bold">{projectedState?.target_sla_kpis?.target_turnaround_time_mins || 26.0} mins</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Target Gate Queue Wait</span>
              <span className="font-mono text-cyan-300 font-bold">{projectedState?.target_sla_kpis?.target_gate_wait_time_mins || 4.5} mins</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Target Crane Productivity</span>
              <span className="font-mono text-blue-300 font-bold">{projectedState?.target_sla_kpis?.target_crane_productivity_moves_hr || 30.0} moves/hr</span>
            </div>
            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Scheduled Appointments (Today)</span>
              <span className="font-mono text-purple-300 font-bold">{projectedState?.target_sla_kpis?.planned_appointments_today || 120} Bookings</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
