import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Play, AlertTriangle, CheckCircle, BarChart3, Sliders, Cpu } from 'lucide-react';

interface SimControlPanelProps {
  apiUrl: string;
}

export const SimControlPanel: React.FC<SimControlPanelProps> = ({ apiUrl }) => {
  const [params, setParams] = useState({
    duration_hours: 24,
    arrival_rate_per_hour: 22,
    inbound_gate_lanes: 3,
    weighbridges: 2,
    yard_cranes: 4,
    warehouse_docks: 6
  });

  const [simResults, setSimResults] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/sim/batch-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      setSimResults(data);
    } catch (err) {
      console.error('Error running SimPy simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: string) => {
    if (preset === 'baseline') {
      setParams({ duration_hours: 24, arrival_rate_per_hour: 22, inbound_gate_lanes: 3, weighbridges: 2, yard_cranes: 4, warehouse_docks: 6 });
    } else if (preset === 'surge') {
      setParams({ duration_hours: 24, arrival_rate_per_hour: 38, inbound_gate_lanes: 4, weighbridges: 3, yard_cranes: 6, warehouse_docks: 8 });
    } else if (preset === 'bottleneck') {
      setParams({ duration_hours: 24, arrival_rate_per_hour: 24, inbound_gate_lanes: 1, weighbridges: 2, yard_cranes: 4, warehouse_docks: 6 });
    }
  };

  // ECharts Option for Hourly Arrivals vs Departures
  const getHourlyChartOption = () => {
    if (!simResults?.hourly_chart_data) return {};
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: '#94a3b8' }, top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: simResults.hourly_chart_data.hours,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        name: 'Trucks / hr',
        nameTextStyle: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' }
      },
      series: [
        {
          name: 'Arrivals (Input)',
          type: 'line',
          smooth: true,
          data: simResults.hourly_chart_data.arrivals,
          itemStyle: { color: '#3b82f6' },
          areaStyle: { color: 'rgba(59, 130, 246, 0.15)' }
        },
        {
          name: 'Departures (Processed)',
          type: 'line',
          smooth: true,
          data: simResults.hourly_chart_data.departures,
          itemStyle: { color: '#10b981' },
          areaStyle: { color: 'rgba(16, 185, 129, 0.15)' }
        }
      ]
    };
  };

  // ECharts Option for Turnaround Time Distribution Histogram
  const getHistogramOption = () => {
    if (!simResults?.turnaround_histogram) return {};
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: '{b}: {c} trucks' },
      grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: simResults.turnaround_histogram.labels,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 9, rotate: 30 }
      },
      yAxis: {
        type: 'value',
        name: 'Frequency',
        nameTextStyle: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' }
      },
      series: [
        {
          name: 'Truck Count',
          type: 'bar',
          data: simResults.turnaround_histogram.counts,
          itemStyle: {
            color: '#06b6d4',
            borderRadius: [4, 4, 0, 0]
          }
        }
      ]
    };
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Phase 5: SimPy Discrete-Event Simulation Engine
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              High-Speed Terminal Simulator
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulates end-to-end multi-modal processes: Gate ANPR Queue → Weighbridge → Yard Stacking → Cross-dock → Outbound clearance.
          </p>
        </div>

        {/* Quick Scenario Preset Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => applyPreset('baseline')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            Baseline 24h
          </button>
          <button
            onClick={() => applyPreset('surge')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded-lg border border-cyan-500/30 transition"
          >
            Vessel Surge
          </button>
          <button
            onClick={() => applyPreset('bottleneck')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold rounded-lg border border-rose-500/30 transition"
          >
            Gate Outage Bottleneck
          </button>
        </div>
      </div>

      {/* Simulation Parameter Controls */}
      <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-200">
            <Sliders className="w-4 h-4 text-emerald-400" /> Operational Model Parameters
          </div>
          <button
            onClick={runSimulation}
            disabled={loading}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
          >
            <Play className={`w-4 h-4 fill-current ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Simulating Operations...' : 'Run Discrete-Event Simulation'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <label className="text-[11px] text-slate-400 font-medium">Duration</label>
            <div className="font-mono text-sm font-bold text-white">{params.duration_hours} Hours</div>
            <input
              type="range"
              min="6"
              max="72"
              step="6"
              value={params.duration_hours}
              onChange={(e) => setParams({ ...params, duration_hours: Number(e.target.value) })}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <label className="text-[11px] text-slate-400 font-medium">Arrival Rate (λ)</label>
            <div className="font-mono text-sm font-bold text-cyan-300">{params.arrival_rate_per_hour} Trucks/hr</div>
            <input
              type="range"
              min="5"
              max="60"
              value={params.arrival_rate_per_hour}
              onChange={(e) => setParams({ ...params, arrival_rate_per_hour: Number(e.target.value) })}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <label className="text-[11px] text-slate-400 font-medium">Inbound Gates</label>
            <div className="font-mono text-sm font-bold text-blue-300">{params.inbound_gate_lanes} Lanes</div>
            <input
              type="range"
              min="1"
              max="6"
              value={params.inbound_gate_lanes}
              onChange={(e) => setParams({ ...params, inbound_gate_lanes: Number(e.target.value) })}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
            />
          </div>

          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <label className="text-[11px] text-slate-400 font-medium">Weighbridges</label>
            <div className="font-mono text-sm font-bold text-indigo-300">{params.weighbridges} Scales</div>
            <input
              type="range"
              min="1"
              max="4"
              value={params.weighbridges}
              onChange={(e) => setParams({ ...params, weighbridges: Number(e.target.value) })}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
            />
          </div>

          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <label className="text-[11px] text-slate-400 font-medium">RTG Cranes</label>
            <div className="font-mono text-sm font-bold text-purple-300">{params.yard_cranes} Cranes</div>
            <input
              type="range"
              min="2"
              max="8"
              value={params.yard_cranes}
              onChange={(e) => setParams({ ...params, yard_cranes: Number(e.target.value) })}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
          </div>

          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <label className="text-[11px] text-slate-400 font-medium">Warehouse Docks</label>
            <div className="font-mono text-sm font-bold text-emerald-300">{params.warehouse_docks} Docks</div>
            <input
              type="range"
              min="2"
              max="16"
              value={params.warehouse_docks}
              onChange={(e) => setParams({ ...params, warehouse_docks: Number(e.target.value) })}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Simulation Results & Visual Analytics */}
      {simResults ? (
        <div className="space-y-6">
          {/* Key Simulation KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Processed Trucks</div>
              <div className="text-xl font-mono font-bold text-white mt-1">
                {simResults.kpis.total_trucks_serviced} <span className="text-xs text-slate-400">units</span>
              </div>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total TEU Throughput</div>
              <div className="text-xl font-mono font-bold text-cyan-300 mt-1">
                {simResults.kpis.total_teu_throughput} <span className="text-xs text-slate-400">TEU</span>
              </div>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Turnaround (TAT)</div>
              <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
                {simResults.kpis.avg_turnaround_time_mins} <span className="text-xs text-slate-400">mins</span>
              </div>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">95th Percentile TAT</div>
              <div className="text-xl font-mono font-bold text-amber-400 mt-1">
                {simResults.kpis.p95_turnaround_time_mins} <span className="text-xs text-slate-400">mins</span>
              </div>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Crane Utilization</div>
              <div className="text-xl font-mono font-bold text-purple-300 mt-1">
                {simResults.kpis.yard_crane_utilization_pct}%
              </div>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Gate Queue Wait</div>
              <div className="text-xl font-mono font-bold text-blue-300 mt-1">
                {simResults.kpis.avg_gate_queue_wait_mins} <span className="text-xs text-slate-400">mins</span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="font-bold text-sm text-slate-200 mb-3 flex items-center justify-between">
                <span>Hourly Truck Inflow vs Outflow</span>
                <span className="text-[11px] text-slate-400 font-normal">Diurnal Arrival Pattern</span>
              </div>
              <div className="h-64">
                <ReactECharts option={getHourlyChartOption()} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <div className="font-bold text-sm text-slate-200 mb-3 flex items-center justify-between">
                <span>Turnaround Time (TAT) Frequency Distribution</span>
                <span className="text-[11px] text-cyan-400 font-normal">Stochastic Service Spread</span>
              </div>
              <div className="h-64">
                <ReactECharts option={getHistogramOption()} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Bottleneck Diagnostic Findings */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div className="font-bold text-sm text-slate-200 mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" /> Automated Terminal Bottleneck Diagnostics
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {simResults.bottleneck_analysis.map((b: any, i: number) => (
                <div
                  key={i}
                  className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex items-start gap-3"
                >
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      b.severity === 'OPTIMAL'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : b.severity === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {b.severity === 'OPTIMAL' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">{b.component}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{b.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 p-12 rounded-2xl border border-slate-800/80 text-center space-y-3">
          <BarChart3 className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-300">Ready to execute discrete-event terminal simulation.</div>
          <div className="text-xs text-slate-500 max-w-md mx-auto">
            Click "Run Discrete-Event Simulation" above to simulate multi-modal yard traffic over 24 hours using SimPy.
          </div>
        </div>
      )}
    </div>
  );
};
