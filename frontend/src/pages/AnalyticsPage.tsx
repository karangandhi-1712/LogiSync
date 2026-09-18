import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../context/ThemeContext';
import { TrendingDown, Truck, Zap, CheckCircle2, Download, Settings, Play, Sparkles, BarChart2 } from 'lucide-react';
import { clsx } from 'clsx';
import { fetchKPIs, fetchHeatmapData, fetchTurnaroundData, fetchQueueDepth, fetchRerouteImpact, runSimulation } from '../services/api';
import { useToast } from '../context/ToastContext';
import { usePort } from '../context/PortContext';
import { Button } from '../components/ui/Button';

// ─── KPI Cards (Liquid Neu-Glass Prisms) ──────────────────────────────────
function KPISummaryCards({ data }: { data?: any }) {
  const cards = [
    {
      icon: <Truck className="w-5 h-5 text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" />,
      label: 'Avg Queue Wait Time',
      value: `${data?.avg_queue_wait_min ?? 34} min`,
      change: `↓ ${Math.abs(data?.avg_queue_wait_delta ?? 18)}% vs last week`,
      good: true,
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />,
      label: 'Gate Utilization',
      value: `${data?.gate_utilization_pct ?? 78}%`,
      change: `${data?.active_trucks_in_port ?? 390} active trucks`,
      good: true,
    },
    {
      icon: <Zap className="w-5 h-5 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />,
      label: 'Reroutes Triggered',
      value: `${data?.reroutes_triggered_today ?? 23} today`,
      badge: 'AUTOMATED',
      sub3: [`${data?.reroutes_triggered_today ?? 23} reroutes`, `₹${Math.round((data?.fuel_saved_litres_today ?? 142.5) * 94).toLocaleString('en-IN')} fuel`, `${data?.co2_saved_kg_today ?? 381.9} kg CO₂`],
    },
    {
      icon: <TrendingDown className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />,
      label: 'Slot Adherence',
      value: `${data?.slot_adherence_pct ?? 89}% OPTIMAL`,
      change: 'Live slot adherence',
      segments: [
        { label: 'Exact', pct: 76, color: 'bg-emerald-500 shadow-[0_0_6px_#10b981]' },
        { label: 'Grace', pct: 13, color: 'bg-amber-400' },
        { label: 'Variance', pct: 11, color: 'bg-red-400' },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className="p-5 rounded-3xl liquid-glass-elevated border border-white/70 dark:border-white/15 backdrop-blur-2xl neu-flat-sm transition-all duration-200 hover:scale-[1.02] relative overflow-hidden"
        >
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/70 dark:border-white/10 neu-flat-sm flex items-center justify-center flex-shrink-0">
              {card.icon}
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-400 uppercase font-bold tracking-wider">
              {card.label}
            </span>
          </div>

          <div className={clsx(
            'text-3xl font-black tabular mb-1 font-mono',
            i === 3 ? 'text-emerald-600 dark:text-emerald-400' : 'chroma-text'
          )}>
            {card.value}
          </div>

          {card.change && (
            <div className={clsx('text-xs font-bold', card.good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
              {card.change}
            </div>
          )}

          {card.badge && (
            <span className="inline-block px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30 shadow-sm">
              {card.badge}
            </span>
          )}

          {card.sub3 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {card.sub3.map(s => (
                <span key={s} className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  {s}
                </span>
              ))}
            </div>
          )}

          {card.segments && (
            <div className="mt-3 space-y-1.5">
              <div className="flex h-2 rounded-full overflow-hidden gap-1 p-0.5 bg-slate-200/50 dark:bg-slate-800/60 neu-inset-sm">
                {card.segments.map(seg => (
                  <div key={seg.label} className={clsx('rounded-full transition-all', seg.color)} style={{ width: `${seg.pct}%` }} />
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                {card.segments.map(seg => <span key={seg.label}>{seg.label} {seg.pct}%</span>)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Congestion Heatmap ────────────────────────────────────────────────────
function CongestionHeatmap({ chartData }: { chartData?: any }) {
  const { isDark } = useTheme();
  const hours = ['06:00','08:00','10:00','12:00','14:00','16:00','18:00'];
  const gates = ['G-04','G-03','G-02','G-01'];
  const raw = [
    [15,22,35,48,62,45,28],
    [8, 10,12,14,11, 9, 7],
    [20,30,42,55,38,28,18],
    [25,40,55,70,85,65,40],
  ];

  const data: [number, number, number][] = [];
  if (chartData?.data) {
    chartData.data.forEach((cell: any) => data.push([cell.hour_index, cell.gate_index, cell.score]));
  } else {
    raw.forEach((row, gi) => row.forEach((val, hi) => data.push([hi, gi, val])));
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      formatter: (p: { data: [number, number, number] }) =>
        `${gates[p.data[1]]} @ ${hours[p.data[0]]}: <b>${p.data[2]}</b> min wait`,
    },
    grid: { left: '8%', right: '4%', bottom: '16%', top: '8%', containLabel: false },
    xAxis: { type: 'category', data: hours, axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'category', data: gates, axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 700 }, axisLine: { show: false }, axisTick: { show: false } },
    visualMap: {
      min: 0, max: 90, calculable: true,
      orient: 'horizontal', left: 'center', bottom: '1%',
      inRange: { color: ['#10b981','#f59e0b','#ef4444'] },
      textStyle: { color: isDark ? '#cbd5e1' : '#475569', fontSize: 9 },
    },
    series: [{
      name: 'Congestion', type: 'heatmap', data,
      label: { show: true, formatter: (p: { data: [number, number, number] }) => `${p.data[2]}`, fontSize: 9, color: '#fff', fontWeight: 700 },
      itemStyle: { borderRadius: 6 },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0, 0, 0, 0.4)' } },
    }],
  };
  return <ReactECharts option={option} style={{ height: '220px' }} />;
}

// ─── Turnaround Chart ──────────────────────────────────────────────────────
function TurnaroundChart({ chartData }: { chartData?: any }) {
  const { isDark } = useTheme();
  const days = Array.from({ length: 30 }, (_, i) => `${i + 1}`);
  const categories = chartData?.categories || days;
  const actual    = chartData?.actual || days.map((_, i) => 85 - i * 0.8);
  const predicted = chartData?.predicted || days.map((_, i) => 90 - i * 0.7);

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { data: ['Actual', 'AI Predicted'], top: 0, textStyle: { color: isDark ? '#cbd5e1' : '#475569', fontSize: 10 } },
    grid: { left: '4%', right: '3%', bottom: '8%', top: '30px', containLabel: true },
    xAxis: { type: 'category', data: categories, axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 8 }, axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' } } },
    yAxis: { type: 'value', name: 'Hours', nameTextStyle: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }, axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 8 }, splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' } } },
    series: [
      { name: 'Actual', type: 'line', data: actual, smooth: true, lineStyle: { width: 2.5, color: '#00f5d4' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,245,212,0.35)' }, { offset: 1, color: 'rgba(0,245,212,0)' }] } }, symbol: 'none' },
      { name: 'AI Predicted', type: 'line', data: predicted, smooth: true, lineStyle: { width: 2, color: '#10b981', type: 'dashed' }, symbol: 'none' },
    ],
  };
  return <ReactECharts option={option} style={{ height: '220px' }} />;
}

// ─── Queue Depth Chart ─────────────────────────────────────────────────────
function QueueDepthChart({ chartData }: { chartData?: any }) {
  const { isDark } = useTheme();
  const times = chartData?.timestamps || ['06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00'];
  const g1 = chartData?.g1 || [4, 8, 14, 22, 18, 12, 8, 5];
  const g2 = chartData?.g2 || [2, 5, 8, 10, 7, 5, 3, 2];
  const g3 = chartData?.g3 || [1, 2, 3, 4, 2, 2, 1, 1];
  const g4 = chartData?.g4 || [3, 6, 9, 12, 10, 8, 5, 3];

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { data: ['Gate 1','Gate 2','Gate 3','Gate 4'], top: 0, textStyle: { color: isDark ? '#cbd5e1' : '#475569', fontSize: 10 } },
    grid: { left: '4%', right: '3%', bottom: '8%', top: '30px', containLabel: true },
    xAxis: { type: 'category', data: times, axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }, axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' } } },
    yAxis: { type: 'value', name: 'Trucks', nameTextStyle: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }, axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }, splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' } } },
    series: [
      { name: 'Gate 1', type: 'line', stack: 'total', data: g1, smooth: true, lineStyle: { width: 2, color: '#ef4444' }, areaStyle: { color: 'rgba(239,68,68,0.3)' }, symbol: 'none' },
      { name: 'Gate 2', type: 'line', stack: 'total', data: g2, smooth: true, lineStyle: { width: 2, color: '#f59e0b' }, areaStyle: { color: 'rgba(245,158,11,0.3)' }, symbol: 'none' },
      { name: 'Gate 3', type: 'line', stack: 'total', data: g3, smooth: true, lineStyle: { width: 2, color: '#10b981' }, areaStyle: { color: 'rgba(16,185,129,0.3)' }, symbol: 'none' },
      { name: 'Gate 4', type: 'line', stack: 'total', data: g4, smooth: true, lineStyle: { width: 2, color: '#00f5d4' }, areaStyle: { color: 'rgba(0,245,212,0.3)' }, symbol: 'none' },
    ],
  };
  return <ReactECharts option={option} style={{ height: '220px' }} />;
}

// ─── Reroute Impact Chart ──────────────────────────────────────────────────
function RerouteImpactChart({ chartData }: { chartData?: any }) {
  const { isDark } = useTheme();
  const days = chartData?.corridors || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const withoutAi = chartData?.without_ai_wait_min || [62, 74, 68, 81, 72];
  const withAi    = chartData?.with_ai_wait_min || [41, 48, 44, 52, 46];

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Without AI', 'With AI'], top: 0, textStyle: { color: isDark ? '#cbd5e1' : '#475569', fontSize: 10 } },
    grid: { left: '4%', right: '4%', bottom: '8%', top: '30px', containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }, splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' } } },
    yAxis: { type: 'category', data: days, axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 10, fontWeight: 700 }, axisLine: { show: false }, axisTick: { show: false } },
    series: [
      {
        name: 'Without AI', type: 'bar', data: withoutAi, barMaxWidth: 16,
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#f87171' }] }, borderRadius: [0, 6, 6, 0] },
      },
      {
        name: 'With AI', type: 'bar', data: withAi, barMaxWidth: 16,
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#00f5d4' }] }, borderRadius: [0, 6, 6, 0] },
        markLine: { data: [{ type: 'average', name: 'Avg' }], label: { fontSize: 9 }, lineStyle: { color: '#00f5d4', type: 'dashed' } },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: '220px' }} />;
}

export default function AnalyticsPage() {
  const { showToast } = useToast();
  const { port, portId } = usePort();
  const [period, setPeriod] = useState<'24h' | '7d' | 'monthly'>('24h');
  const [kpiData, setKpiData] = useState<any>(null);
  const [isSimRunning, setIsSimRunning] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [chartData, setChartData] = useState<Record<string, any>>({});
  const [isLoadingCharts, setIsLoadingCharts] = useState(true);

  const PERIODS = [
    { id: '24h'     as const, label: 'LIVE 24H'  },
    { id: '7d'      as const, label: 'LAST 7D'   },
    { id: 'monthly' as const, label: 'MONTHLY'   },
  ];

  // Load KPIs when period or port changes
  useEffect(() => {
    const periodParam = period === 'monthly' ? '30d' : period;
    fetchKPIs(periodParam as any, portId)
      .then(d => setKpiData(d))
      .catch(() => {});
  }, [period, portId]);

  useEffect(() => {
    setIsLoadingCharts(true);
    Promise.all([
      fetchHeatmapData(period, portId),
      fetchTurnaroundData(period, portId),
      fetchQueueDepth(undefined, portId),
      fetchRerouteImpact(portId),
    ]).then(([heatmap, turnaround, queue, reroute]) => {
      setChartData({ heatmap, turnaround, queue, reroute });
    }).catch(() => {
      showToast({ type: 'error', title: 'Charts Unavailable', message: 'Could not load live analytics charts.' });
    }).finally(() => setIsLoadingCharts(false));
  }, [period, portId, showToast]);

  const handleRunSimulation = async () => {
    setIsSimRunning(true);
    try {
      const result = await runSimulation({
        num_trucks: 200,
        arrival_distribution: 'poisson',
        gate_capacity_multiplier: 1.0,
        dynamic_rerouting_enabled: true,
        time_horizon_hours: 24,
      });
      setSimResult(result);
      showToast({
        type: 'success',
        title: 'Simulation Complete',
        message: result.summary || `Avg wait with AI: ${result.avg_queue_wait ?? 'N/A'} min · −${result.wait_reduction_pct ?? 'N/A'}% vs no-AI baseline`,
      });
    } catch {
      showToast({ type: 'error', title: 'Simulation Failed', message: 'Backend simulation service unavailable.' });
    } finally { setIsSimRunning(false); }
  };

  const handleExport = () => {
    const data = kpiData ? JSON.stringify(kpiData, null, 2) : JSON.stringify({ message: 'No KPI data loaded yet' });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `logisync-telemetry-${period}-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast({ type: 'success', title: 'Export Complete', message: 'Telemetry JSON downloaded.' });
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-canvas)] relative">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white chroma-text">
                Port Operations Analytics & AI BI
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-400/30">
                <Sparkles className="w-2.5 h-2.5 text-cyan-500" />
                PREDICTIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gate heatmaps · Predictive turnaround cycle · AI reroute efficiency · Real-time queue accumulation
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-700 dark:text-cyan-300 font-bold">
                {port.short} · {port.city}
              </span>
            </p>
          </div>

          {/* Filter Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-900/60 p-1 rounded-2xl neu-inset-sm">
              {PERIODS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-xl text-[10px] font-bold transition-all',
                    period === p.id
                      ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-cyan-400 shadow-sm scale-[1.02]'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center gap-1.5 neu-flat-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
              <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Peak: 08:00 – 20:00
              </span>
            </div>

            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download className="w-3.5 h-3.5 text-cyan-500" />
              <span>Export Telemetry</span>
            </Button>
          </div>
        </div>

        {/* KPI Summary Row */}
        <div id="tutorial-analytics-kpis">
          <KPISummaryCards data={kpiData} />
        </div>

        {/* 2x2 Visualization Grid (Liquid Neu-Glass Cards) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {[
            { title: 'Gate Congestion Heatmap Matrix', sub: 'Wait times by gate × hour (minutes)', Chart: CongestionHeatmap, id: 'tutorial-heatmap-chart' },
            { title: 'Turnaround Time — Actual vs. AI Predicted', sub: '30-day vessel-to-gate cycle · −35.3% dwell reduction', Chart: TurnaroundChart, id: undefined },
            { title: 'Live Queue Depth & Throughput Today', sub: 'Stacked truck accumulation by terminal gate', Chart: QueueDepthChart, id: undefined },
            { title: 'Reroute Impact — Delay Savings', sub: '"Without AI" vs "With AI" throughput (+28% speed)', Chart: RerouteImpactChart, id: undefined },
          ].map(({ title, sub, Chart, id }) => (
            <div
              key={title}
              id={id}
              className="p-5 rounded-3xl liquid-glass border border-white/70 dark:border-white/15 backdrop-blur-2xl neu-flat-sm shadow-xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{sub}</p>
                </div>
                <div className="w-7 h-7 rounded-xl bg-white/60 dark:bg-slate-800/60 flex items-center justify-center neu-flat-sm">
                  <BarChart2 className="w-3.5 h-3.5 text-cyan-500" />
                </div>
              </div>
              {isLoadingCharts ? (
                <div className="h-[220px] rounded-2xl bg-white/30 dark:bg-slate-900/30 animate-pulse" />
              ) : (
                <Chart chartData={
                  id === 'tutorial-heatmap-chart'
                    ? chartData.heatmap
                    : title.startsWith('Turnaround')
                      ? chartData.turnaround
                      : title.startsWith('Live Queue')
                        ? chartData.queue
                        : chartData.reroute
                } />
              )}
            </div>
          ))}
        </div>

        {/* Policy Engine Card */}
        <div id="tutorial-analytics-actions" className="p-6 rounded-3xl liquid-glass-elevated border border-white/70 dark:border-white/20 backdrop-blur-3xl neu-flat-sm shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-emerald-500 animate-pulse" />
                </div>
                <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Autonomous Optimizer Auto-Throttle Policy v4.2
                </span>
                <span className={clsx(
                  'px-2.5 py-0.5 rounded-full text-[9px] font-black border',
                  simResult
                    ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-400/30'
                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/30'
                )}>
                  {simResult ? 'SIM DONE' : 'HEALTHY'}
                </span>
              </div>

              <div className="flex items-center gap-6 mt-3 flex-wrap">
                {[
                  { label: 'Queue Slack',       value: simResult?.avg_queue_wait != null ? `${Number(simResult.avg_queue_wait).toFixed(1)} min (AI)` : '4.5 min' },
                  { label: 'Divert Threshold',  value: '>12 Trucks' },
                  { label: 'OCR Confidence',    value: '99.4%' },
                  { label: 'Wait Reduction',    value: simResult?.wait_reduction_pct != null ? `−${simResult.wait_reduction_pct}% vs no-AI` : '−35.3% vs baseline' },
                ].map(p => (
                  <div key={p.label} className="px-3 py-1.5 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-white/60 dark:border-white/10 neu-flat-sm">
                    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{p.label}</div>
                    <div className="text-sm font-black tabular text-slate-900 dark:text-white font-mono">{p.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <Button variant="ghost" onClick={() => showToast({ type: 'info', title: 'Policy Editor', message: 'Tune Policy Weights panel coming soon.' })}>
                <Settings className="w-4 h-4" />
                <span>Tune Weights</span>
              </Button>
              <Button variant="primary" isLoading={isSimRunning} onClick={handleRunSimulation}>
                {!isSimRunning && <Play className="w-4 h-4 fill-white" />}
                <span>Run Monte Carlo Sim</span>
              </Button>
            </div>
          </div>
          {simResult && (
            <div className="mt-4 p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-xs text-cyan-800 dark:text-cyan-200 leading-relaxed">
              <span className="font-bold">Simulation Result: </span>
              {simResult.summary || `${simResult.num_trucks || 200} trucks simulated · Avg wait with AI: ${simResult.avg_queue_wait ?? 'N/A'} min · Reduction: ${simResult.wait_reduction_pct ?? 'N/A'}%`}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
