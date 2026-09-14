import { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../context/ThemeContext';
import { TrendingDown, Truck, Zap, CheckCircle2, Download, Settings, Play } from 'lucide-react';
import { clsx } from 'clsx';

// ─── KPI Cards ─────────────────────────────────────────────────────────────
function KPISummaryCards() {
  const cards = [
    {
      icon: <Truck className="w-5 h-5 text-sky-500 dark:text-cyan-400" />,
      label: 'Avg Queue Wait Time',
      value: '34 min',
      change: '↓ 18% vs last week',
      good: true,
      sub: '',
      sparkData: [42, 38, 44, 36, 34, 39, 34],
      sparkColor: '#10b981',
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      label: 'Gate Utilization',
      value: '78%',
      change: '390/500 Trucks/Hr',
      good: true,
      ringPct: 78,
      ringColor: '#06b6d4',
    },
    {
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      label: 'Reroutes Triggered',
      value: '23 today',
      badge: 'AUTOMATED',
      sub3: ['4.2 hrs saved', '₹84,000 fuel', '480 kg CO₂'],
    },
    {
      icon: <TrendingDown className="w-5 h-5 text-emerald-500" />,
      label: 'Slot Adherence',
      value: '89% OPTIMAL',
      change: '342/384 slots',
      segments: [
        { label: 'Exact', pct: 76, color: 'bg-emerald-500 dark:bg-emerald-400' },
        { label: 'Grace', pct: 13, color: 'bg-amber-400' },
        { label: 'Variance', pct: 11, color: 'bg-red-400' },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="p-4 rounded-2xl bg-white dark:bg-[rgba(15,23,42,0.85)] border border-slate-200 dark:border-[rgba(100,130,200,0.15)] shadow-card-light dark:shadow-card-dark">
          <div className="flex items-center gap-2 mb-2">
            {card.icon}
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">{card.label}</span>
          </div>
          <div className={clsx('text-2xl font-black tabular mb-1', i === 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white')}>{card.value}</div>

          {card.change && (
            <div className={clsx('text-xs font-semibold', card.good ? 'text-emerald-500' : 'text-red-500')}>{card.change}</div>
          )}
          {card.badge && (
            <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">{card.badge}</span>
          )}
          {card.sub3 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {card.sub3.map(s => (
                <span key={s} className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{s}</span>
              ))}
            </div>
          )}
          {card.segments && (
            <div className="mt-2 space-y-1">
              <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                {card.segments.map(seg => (
                  <div key={seg.label} className={clsx('rounded-full', seg.color)} style={{ width: `${seg.pct}%` }} />
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400">
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
function CongestionHeatmap() {
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
  raw.forEach((row, gi) => row.forEach((val, hi) => data.push([hi, gi, val])));

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      formatter: (p: { data: [number, number, number] }) =>
        `${gates[p.data[1]]} @ ${hours[p.data[0]]}: <b>${p.data[2]}</b> min wait`,
    },
    grid: { left: '10%', right: '5%', bottom: '15%', top: '8%', containLabel: false },
    xAxis: { type: 'category', data: hours, axisLabel: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 9 }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'category', data: gates, axisLabel: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 600 }, axisLine: { show: false }, axisTick: { show: false } },
    visualMap: {
      min: 0, max: 90, calculable: true,
      orient: 'horizontal', left: 'center', bottom: '2%',
      inRange: { color: ['#10b981','#f59e0b','#ef4444'] },
      textStyle: { color: isDark ? '#94a3b8' : '#475569', fontSize: 9 },
    },
    series: [{
      name: 'Congestion', type: 'heatmap', data,
      label: { show: true, formatter: (p: { data: [number, number, number] }) => `${p.data[2]}`, fontSize: 9, color: '#fff', fontWeight: 600 },
      itemStyle: { borderRadius: 4 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
    }],
  };
  return <ReactECharts option={option} style={{ height: '200px' }} />;
}

// ─── Turnaround Chart ──────────────────────────────────────────────────────
function TurnaroundChart() {
  const { isDark } = useTheme();
  const days = Array.from({ length: 30 }, (_, i) => `${i + 1}`);
  const actual    = days.map((_, i) => 85 - Math.random() * 15 - (i * 0.8));
  const predicted = days.map((_, i) => 90 - i * 0.7);

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { data: ['Actual', 'AI Predicted'], top: 0, textStyle: { color: isDark ? '#94a3b8' : '#475569', fontSize: 9 } },
    grid: { left: '5%', right: '3%', bottom: '10%', top: '30px', containLabel: true },
    xAxis: { type: 'category', data: days, axisLabel: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 8 }, axisLine: { lineStyle: { color: isDark ? '#1e3a5f' : '#e2e8f0' } } },
    yAxis: { type: 'value', name: 'Hours', nameTextStyle: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 9 }, axisLabel: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 8 }, splitLine: { lineStyle: { color: isDark ? '#0d1c2d' : '#f1f5f9' } } },
    series: [
      { name: 'Actual', type: 'line', data: actual, smooth: true, lineStyle: { width: 2, color: '#06b6d4' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(6,182,212,0.25)' }, { offset: 1, color: 'rgba(6,182,212,0)' }] } }, symbol: 'none' },
      { name: 'AI Predicted', type: 'line', data: predicted, smooth: true, lineStyle: { width: 2, color: '#10b981', type: 'dashed' }, symbol: 'none' },
    ],
  };
  return <ReactECharts option={option} style={{ height: '200px' }} />;
}

// ─── Queue Depth Chart ─────────────────────────────────────────────────────
function QueueDepthChart() {
  const { isDark } = useTheme();
  const times = ['06','08','10','12','14','16','18','20'];
  const g1 = [4, 8, 14, 22, 18, 12, 8, 5];
  const g2 = [2, 5, 8,  10, 7,  5,  3, 2];
  const g3 = [1, 2, 3,  4,  2,  2,  1, 1];
  const g4 = [3, 6, 9,  12, 10, 8,  5, 3];

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { data: ['Gate 1','Gate 2','Gate 3','Gate 4'], top: 0, textStyle: { color: isDark ? '#94a3b8' : '#475569', fontSize: 9 } },
    grid: { left: '5%', right: '3%', bottom: '10%', top: '30px', containLabel: true },
    xAxis: { type: 'category', data: times.map(t => `${t}:00`), axisLabel: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 9 }, axisLine: { lineStyle: { color: isDark ? '#1e3a5f' : '#e2e8f0' } } },
    yAxis: { type: 'value', name: 'Trucks', nameTextStyle: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 9 }, axisLabel: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 9 }, splitLine: { lineStyle: { color: isDark ? '#0d1c2d' : '#f1f5f9' } } },
    series: [
      { name: 'Gate 1', type: 'line', stack: 'total', data: g1, smooth: true, lineStyle: { width: 1.5, color: '#ef4444' }, areaStyle: { color: 'rgba(239,68,68,0.3)' }, symbol: 'none' },
      { name: 'Gate 2', type: 'line', stack: 'total', data: g2, smooth: true, lineStyle: { width: 1.5, color: '#f59e0b' }, areaStyle: { color: 'rgba(245,158,11,0.3)' }, symbol: 'none' },
      { name: 'Gate 3', type: 'line', stack: 'total', data: g3, smooth: true, lineStyle: { width: 1.5, color: '#10b981' }, areaStyle: { color: 'rgba(16,185,129,0.3)' }, symbol: 'none' },
      { name: 'Gate 4', type: 'line', stack: 'total', data: g4, smooth: true, lineStyle: { width: 1.5, color: '#06b6d4' }, areaStyle: { color: 'rgba(6,182,212,0.3)' }, symbol: 'none' },
    ],
  };
  return <ReactECharts option={option} style={{ height: '200px' }} />;
}

// ─── Reroute Impact Chart ──────────────────────────────────────────────────
function RerouteImpactChart() {
  const { isDark } = useTheme();
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const withoutAi = [62, 74, 68, 81, 72];
  const withAi    = [41, 48, 44, 52, 46];

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Without AI', 'With AI'], top: 0, textStyle: { color: isDark ? '#94a3b8' : '#475569', fontSize: 9 } },
    grid: { left: '5%', right: '5%', bottom: '10%', top: '30px', containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 9 }, splitLine: { lineStyle: { color: isDark ? '#0d1c2d' : '#f1f5f9' } } },
    yAxis: { type: 'category', data: days, axisLabel: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 600 }, axisLine: { show: false }, axisTick: { show: false } },
    series: [
      {
        name: 'Without AI', type: 'bar', data: withoutAi, barMaxWidth: 16,
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#f87171' }] }, borderRadius: [0, 4, 4, 0] },
      },
      {
        name: 'With AI', type: 'bar', data: withAi, barMaxWidth: 16,
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#34d399' }] }, borderRadius: [0, 4, 4, 0] },
        markLine: { data: [{ type: 'average', name: 'Avg' }], label: { fontSize: 9 }, lineStyle: { color: '#06b6d4', type: 'dashed' } },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: '200px' }} />;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'24h' | '7d' | 'monthly'>('24h');
  const PERIODS = [
    { id: '24h'     as const, label: 'LIVE 24H'  },
    { id: '7d'      as const, label: 'LAST 7D'   },
    { id: 'monthly' as const, label: 'MONTHLY'   },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-canvas)]">
      <div className="max-w-[1600px] mx-auto p-6 space-y-5">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Logistics Analytics & BI</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Gate heatmaps · Turnaround trends · AI reroute impact · Queue depth analysis</p>
          </div>

          {/* Filter Strip */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {PERIODS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors',
                    period === p.id
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-cyan-400 shadow-sm'
                      : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/40">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Peak: 08:00 – 20:00</span>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export Telemetry
            </button>
          </div>
        </div>

        {/* KPI Summary Row */}
        <KPISummaryCards />

        {/* 2x2 Visualization Grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { title: 'Gate Congestion Heatmap Matrix', sub: 'Wait times by gate × hour (minutes)', Chart: CongestionHeatmap },
            { title: 'Turnaround Time — Actual vs. AI Predicted', sub: '30-day vessel-to-gate cycle · −35.3% reduction', Chart: TurnaroundChart },
            { title: 'Live Queue Depth & Throughput Today', sub: 'Stacked truck accumulation by gate', Chart: QueueDepthChart },
            { title: 'Reroute Impact — Delay Savings', sub: '"Without AI" vs "With AI" throughput (+28%)', Chart: RerouteImpactChart },
          ].map(({ title, sub, Chart }) => (
            <div key={title} className="p-4 rounded-2xl bg-white dark:bg-[rgba(15,23,42,0.85)] border border-slate-200 dark:border-[rgba(100,130,200,0.15)] shadow-card-light dark:shadow-card-dark">
              <div className="mb-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{sub}</p>
              </div>
              <Chart />
            </div>
          ))}
        </div>

        {/* Policy Engine Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[rgba(15,23,42,0.85)] border border-slate-200 dark:border-[rgba(100,130,200,0.15)] shadow-card-light dark:shadow-card-dark">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Autonomous Optimizer Auto-Throttle Policy v4.2</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">HEALTHY</span>
              </div>
              <div className="flex items-center gap-6 mt-2">
                {[
                  { label: 'Queue Slack',       value: '4.5 min' },
                  { label: 'Divert Threshold',  value: '>12 Trucks' },
                  { label: 'OCR Confidence',    value: '99.4%' },
                  { label: 'Simulation Score',  value: '0.96 AUC' },
                ].map(p => (
                  <div key={p.label}>
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">{p.label}</div>
                    <div className="text-sm font-black tabular text-slate-800 dark:text-white">{p.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Settings className="w-4 h-4" /> Tune Weights
              </button>
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-sky-500 dark:bg-cyan-500 text-white hover:bg-sky-600 dark:hover:bg-cyan-600 transition-colors">
                <Play className="w-4 h-4" /> Run Monte Carlo Sim
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
