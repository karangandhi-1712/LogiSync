import React, { useState, useEffect } from 'react';
import { Play } from 'lucide-react';

interface ScenariosPanelProps {
  apiUrl: string;
}

export const ScenariosPanel: React.FC<ScenariosPanelProps> = ({ apiUrl }) => {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<any | null>(null);
  const [executing, setExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiUrl}/api/scenarios`)
      .then(r => r.json())
      .then(data => {
        setScenarios(data || []);
        if (data?.length > 0) setSelectedScenario(data[0]);
      })
      .catch(err => console.error('Error fetching scenarios:', err));
  }, [apiUrl]);

  const handleRunScenario = async (sc: any) => {
    setExecuting(true);
    try {
      const res = await fetch(`${apiUrl}/api/scenarios/${sc.id}/execute`, { method: 'POST' });
      const data = await res.json();
      setExecutionResult(data.execution_summary);
      setTimeout(() => setExecutionResult(null), 5000);
    } catch (err) {
      console.error('Error executing scenario:', err);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Industrial Logistics Scenarios & Benchmark Performance
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Empirical Improvement Data
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Compare unoptimized traditional operations against LogiSync Digital Twin & Google OR-Tools optimization.
          </p>
        </div>

        {executionResult && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono animate-pulse">
            ✓ {executionResult}
          </div>
        )}
      </div>

      {/* Scenario Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {scenarios.map((sc) => {
          const isSelected = selectedScenario?.id === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => setSelectedScenario(sc)}
              className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'bg-blue-950/50 border-blue-500 shadow-xl shadow-blue-500/20'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400">
                  {sc.category.replace(/_/g, ' ')}
                </span>
                <h3 className="font-bold text-sm text-white mt-1">{sc.title}</h3>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2">{sc.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold">-{sc.improvements?.turnaround_time_reduction_pct}% TAT</span>
                <span className="text-purple-300 font-bold">0 Reshuffles</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Scenario Detailed Comparison Breakdown */}
      {selectedScenario && (
        <div className="bg-slate-900/90 p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono text-cyan-400 font-bold">{selectedScenario.category}</span>
              <h3 className="text-lg font-extrabold text-white mt-0.5">{selectedScenario.title}</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">{selectedScenario.real_world_context}</p>
            </div>

            <button
              onClick={() => handleRunScenario(selectedScenario)}
              disabled={executing}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
            >
              <Play className={`w-4 h-4 fill-current ${executing ? 'animate-spin' : ''}`} />
              {executing ? 'Simulating Scenario...' : 'Execute Scenario in Digital Twin'}
            </button>
          </div>

          {/* Key Impact Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Turnaround Time</div>
              <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
                -{selectedScenario.improvements.turnaround_time_reduction_pct}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {selectedScenario.unoptimized_baseline.avg_turnaround_time_mins}m → {selectedScenario.optimized_smart.avg_turnaround_time_mins}m
              </div>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Peak Gate Queue</div>
              <div className="text-xl font-mono font-bold text-cyan-300 mt-1">
                -{selectedScenario.improvements.gate_queue_reduction_pct}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {selectedScenario.unoptimized_baseline.peak_gate_queue_trucks} → {selectedScenario.optimized_smart.peak_gate_queue_trucks} trucks
              </div>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Reshuffle Moves</div>
              <div className="text-xl font-mono font-bold text-purple-300 mt-1">
                -100% (Zero)
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {selectedScenario.unoptimized_baseline.yard_reshuffle_moves} → 0 wasted moves
              </div>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Throughput Rate</div>
              <div className="text-xl font-mono font-bold text-blue-400 mt-1">
                +{selectedScenario.improvements.throughput_increase_pct}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {selectedScenario.unoptimized_baseline.hourly_throughput_teu} → {selectedScenario.optimized_smart.hourly_throughput_teu} TEU/h
              </div>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">CO2 Emissions Saved</div>
              <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
                {selectedScenario.improvements.co2_emissions_reduced_kg} kg
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Reduced truck gate idling</div>
            </div>
          </div>

          {/* Side-by-Side Detailed Metric Comparison Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Unoptimized Baseline */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-rose-500/20 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  Traditional Unmanaged Baseline (FIFO)
                </span>
                <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                  {selectedScenario.unoptimized_baseline.status}
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Average Turnaround Time (TAT):</span>
                  <span className="text-white font-bold">{selectedScenario.unoptimized_baseline.avg_turnaround_time_mins} mins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gate Queue Peak:</span>
                  <span className="text-rose-300 font-bold">{selectedScenario.unoptimized_baseline.peak_gate_queue_trucks} trucks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Crane Utilization (Stress):</span>
                  <span className="text-amber-300 font-bold">{selectedScenario.unoptimized_baseline.crane_utilization_pct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fuel Wasted Idling in Queue:</span>
                  <span className="text-slate-300">{selectedScenario.unoptimized_baseline.fuel_wasted_per_truck_liters} L / truck</span>
                </div>
              </div>
            </div>

            {/* Optimized Smart */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  LogiSync Smart Digital Twin & OR-Tools
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  {selectedScenario.optimized_smart.status}
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Average Turnaround Time (TAT):</span>
                  <span className="text-emerald-400 font-bold">{selectedScenario.optimized_smart.avg_turnaround_time_mins} mins</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gate Queue Peak:</span>
                  <span className="text-emerald-300 font-bold">{selectedScenario.optimized_smart.peak_gate_queue_trucks} trucks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Crane Utilization (Balanced):</span>
                  <span className="text-cyan-300 font-bold">{selectedScenario.optimized_smart.crane_utilization_pct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fuel Wasted Idling in Queue:</span>
                  <span className="text-slate-300">{selectedScenario.optimized_smart.fuel_wasted_per_truck_liters} L / truck</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
