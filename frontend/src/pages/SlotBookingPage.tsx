import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Eye, Zap, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../context/ThemeContext';

// ─── Gate Status Data ─────────────────────────────────────────────────────
const GATES = [
  { id: 'G-01', name: 'Main Entry',        wait: 45, queue: 14, status: 'congested' as const },
  { id: 'G-02', name: 'Container Term',    wait: 18, queue: 6,  status: 'normal'    as const },
  { id: 'G-03', name: 'Bulk & Express',    wait: 11, queue: 2,  status: 'optimal'   as const },
  { id: 'G-04', name: 'Export Yard',       wait: 22, queue: 9,  status: 'moderate'  as const },
];

const STATUS_CONFIG = {
  congested: { label: 'CONGESTED',       bg: 'bg-red-100 dark:bg-red-900/30',     border: 'border-red-200 dark:border-red-800/40',     text: 'text-red-600 dark:text-red-400',     dot: 'bg-red-500' },
  normal:    { label: 'NORMAL',          bg: 'bg-slate-100 dark:bg-slate-800/60', border: 'border-slate-200 dark:border-slate-700/50', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
  optimal:   { label: 'OPTIMAL / FAST-PASS', bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800/40', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  moderate:  { label: 'MODERATE',        bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800/40', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
};

// ─── Timeline Slot Data ────────────────────────────────────────────────────
const SLOTS = [
  { time: '14:00', type: 'active',    label: 'TRUCK AT GATE — Inspection & Weighbridge', sub: '04m left', icon: <Eye className="w-3.5 h-3.5" /> },
  { time: '14:15', type: 'ai_pick',  label: 'TARGET SLOT: Bulk Cargo Gate 3', sub: '₹500 Express Locked [Claimed]', icon: <Zap className="w-3.5 h-3.5" />, isAI: true },
  { time: '14:30', type: 'booked',   label: 'TN-04-E-8821 • Rajesh Kumar', sub: 'Booked Express, 40FT High Cube', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { time: '14:45', type: 'surge',    label: 'HIGH QUEUE SPIKE — 8 Trucks Waiting', sub: 'Divert recommended', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { time: '15:00', type: 'available',label: 'Standard Priority • 9-12 Open Windows', sub: '', icon: <Clock className="w-3.5 h-3.5" /> },
  { time: '15:15', type: 'available',label: 'Standard Priority • 9-12 Open Windows', sub: '', icon: <Clock className="w-3.5 h-3.5" /> },
];

const SLOT_STYLES = {
  active:    'bg-sky-50 dark:bg-sky-900/20 border-sky-300 dark:border-sky-700/60 text-sky-700 dark:text-sky-300',
  ai_pick:   'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300',
  booked:    'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700/60 text-blue-700 dark:text-blue-300',
  surge:     'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700/60 text-red-700 dark:text-red-300',
  available: 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:border-sky-300 dark:hover:border-cyan-500/50 cursor-pointer',
};

// ─── Congestion Bar Chart ──────────────────────────────────────────────────
function CongestionChart() {
  const { isDark } = useTheme();
  const hours = ['06','08','10','12','14','16','18','20','22'];
  const gate1 = [12, 18, 26, 38, 48, 35, 22, 14, 8];
  const gate3 = [6,  8,  10, 14, 11, 9,  7,  5,  4];

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Gate 1 (Main Entry)', 'Gate 3 (Bulk/Express)'], top: 0, textStyle: { color: isDark ? '#94a3b8' : '#475569', fontSize: 10 } },
    grid: { left: '5%', right: '5%', bottom: '10%', top: '30px', containLabel: true },
    xAxis: {
      type: 'category', data: hours.map(h => `${h}:00`),
      axisLabel: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 9 },
      axisLine: { lineStyle: { color: isDark ? '#1e3a5f' : '#e2e8f0' } },
    },
    yAxis: {
      type: 'value', name: 'Wait (min)',
      nameTextStyle: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 9 },
      axisLabel: { color: isDark ? '#64748b' : '#94a3b8', fontSize: 9 },
      splitLine: { lineStyle: { color: isDark ? '#0d1c2d' : '#f1f5f9' } },
    },
    series: [
      {
        name: 'Gate 1 (Main Entry)',
        type: 'bar', data: gate1, barMaxWidth: 20,
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#f59e0b' }] },
          borderRadius: [4, 4, 0, 0],
        },
        markPoint: { data: [{ type: 'max', name: 'Peak' }], symbolSize: 40, label: { fontSize: 9, color: '#fff' } },
      },
      {
        name: 'Gate 3 (Bulk/Express)',
        type: 'bar', data: gate3, barMaxWidth: 20,
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#06b6d4' }] },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: '180px' }} />;
}

export default function SlotBookingPage() {
  const [selectedGate, setSelectedGate] = useState('G-03');
  const [tier, setTier] = useState<'standard' | 'express' | 'critical'>('express');
  const [dwell, setDwell] = useState(45);

  const TIER_CONFIG = [
    { id: 'standard' as const, label: 'Standard',  price: '₹0',      suffix: '' },
    { id: 'express'  as const, label: 'Express',   price: '+₹500',   suffix: '' },
    { id: 'critical' as const, label: 'Critical',  price: '+₹1,200', suffix: '' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg-canvas)]">
      {/* Page Header */}
      <div className="px-6 pt-5 pb-3 border-b border-slate-200 dark:border-[rgba(100,130,200,0.15)] flex-shrink-0">
        <h1 className="text-xl font-black text-slate-900 dark:text-white">Gate Slot Booking & AI Dispatch</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Real-time gate availability · AI-optimized slot recommendations · Driver e-Pass transmission</p>
      </div>

      {/* Gate Status Matrix */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-[rgba(100,130,200,0.15)] flex-shrink-0">
        <div className="grid grid-cols-4 gap-3">
          {GATES.map(gate => {
            const cfg = STATUS_CONFIG[gate.status];
            const isSelected = selectedGate === gate.id;
            return (
              <button
                key={gate.id}
                onClick={() => setSelectedGate(gate.id)}
                className={clsx(
                  'p-3 rounded-2xl border-2 text-left transition-all duration-200',
                  cfg.bg, cfg.border,
                  isSelected && 'ring-2 ring-sky-400 dark:ring-cyan-500 ring-offset-1 dark:ring-offset-navy-950'
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={clsx('w-2 h-2 rounded-full', cfg.dot)} />
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{gate.id}</span>
                </div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">{gate.name}</div>
                <div className="text-2xl font-black tabular text-slate-800 dark:text-white">{gate.wait}<span className="text-xs font-medium ml-0.5">M</span></div>
                <div className="flex items-center justify-between mt-1">
                  <span className={clsx('text-[9px] font-black uppercase', cfg.text)}>{cfg.label}</span>
                  <span className="text-[9px] text-slate-400">{gate.queue} in queue</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — Timeline + Chart */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden border-r border-slate-200 dark:border-[rgba(100,130,200,0.15)]">
          {/* Date selector + intervals */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800/60 flex-shrink-0">
            <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <Calendar className="w-4 h-4 text-sky-500 dark:text-cyan-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Today — 14 Sep 2026</span>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            <div className="ml-auto flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {['15M', '30M', '1H'].map(i => (
                <button key={i} className={clsx('px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors', i === '15M' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-cyan-400 shadow-sm' : 'text-slate-400 dark:text-slate-500')}>{i}</button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-5 py-2 flex-shrink-0">
            {[
              { color: 'bg-sky-500', label: 'Active at Gate' },
              { color: 'bg-emerald-500', label: 'AI Top Pick' },
              { color: 'bg-blue-500', label: 'Booked' },
              { color: 'bg-red-500', label: 'Bottleneck/Peak' },
              { color: 'bg-slate-300 dark:bg-slate-600', label: 'Available' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={clsx('w-2 h-2 rounded-full', l.color)} />
                <span className="text-[10px] text-slate-400 dark:text-slate-500">{l.label}</span>
              </div>
            ))}
          </div>

          {/* Timeline Slots */}
          <div className="flex-1 overflow-y-auto px-5 py-2 space-y-2">
            <AnimatePresence>
              {SLOTS.map((slot, i) => (
                <motion.div
                  key={slot.time}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={clsx('flex items-center gap-3 p-3 rounded-xl border transition-all duration-200', SLOT_STYLES[slot.type as keyof typeof SLOT_STYLES])}
                >
                  <span className="text-xs font-black tabular w-10 flex-shrink-0">{slot.time}</span>
                  <span className="flex-shrink-0">{slot.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{slot.label}</div>
                    {slot.sub && <div className="text-[10px] opacity-70 truncate">{slot.sub}</div>}
                  </div>
                  {slot.isAI && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white flex-shrink-0">AI TOP PICK</span>
                  )}
                  {slot.type === 'available' && (
                    <button className="flex-shrink-0 px-3 py-1 rounded-lg text-[11px] font-bold bg-sky-500 dark:bg-cyan-500 text-white hover:bg-sky-600 transition-colors">
                      Quick Claim
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Congestion Chart */}
          <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-800/60 px-5 py-3">
            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              AI Congestion Delay Forecast
            </h3>
            <CongestionChart />
          </div>
        </div>

        {/* Right — Booking Panel */}
        <div className="w-[400px] flex-shrink-0 flex flex-col overflow-y-auto p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">Booking & Driver e-Pass Transmission</h2>

          {/* Gate Selector */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Target Gate</label>
            <select
              value={selectedGate}
              onChange={e => setSelectedGate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm font-medium
                bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700
                text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-cyan-500"
            >
              {GATES.map(g => <option key={g.id} value={g.id}>{g.id} — {g.name} ({g.wait}m avg dwell)</option>)}
            </select>
          </div>

          {/* Time Window */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
            <div className="text-[10px] text-slate-400 uppercase mb-0.5">Time Window</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">14 Sep 2026, 14:15 – 14:30</div>
          </div>

          {/* Fleet Asset */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
            <div className="text-[10px] text-slate-400 uppercase mb-1">Assigned Fleet Asset</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">TRK-8821 • Rajesh Kumar</div>
                <div className="text-[10px] text-slate-400">TN-04-E-8821 · Scania R500</div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">KYC ✓</span>
            </div>
          </div>

          {/* Cargo */}
          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/40">
            <div className="text-[10px] text-sky-400 uppercase mb-0.5">Cargo</div>
            <div className="text-sm font-bold text-sky-700 dark:text-sky-300">Refrigerated Container • High Priority</div>
            <div className="text-[10px] text-sky-400 mt-0.5">-18.4°C monitored · Cold-chain compliant</div>
          </div>

          {/* Dwell Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Dwell Time</label>
              <span className="text-sm font-black tabular text-sky-600 dark:text-cyan-400">{dwell} mins</span>
            </div>
            <input
              type="range" min={15} max={120} step={15} value={dwell}
              onChange={e => setDwell(Number(e.target.value))}
              className="w-full accent-sky-500 dark:accent-cyan-500"
            />
            <div className="flex justify-between text-[9px] text-slate-300 dark:text-slate-600 mt-0.5">
              <span>15m</span><span>Unload + Crane Sync</span><span>2h</span>
            </div>
          </div>

          {/* Protocol Tier */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Protocol Tier</label>
            <div className="flex gap-2">
              {TIER_CONFIG.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTier(t.id)}
                  className={clsx(
                    'flex-1 py-2 px-2 rounded-xl text-center transition-all duration-200 border',
                    tier === t.id
                      ? 'bg-sky-500 dark:bg-cyan-500 border-sky-500 dark:border-cyan-500 text-white'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-sky-300 dark:hover:border-cyan-500/50'
                  )}
                >
                  <div className="text-[10px] font-bold">{t.label}</div>
                  <div className="text-[9px] opacity-80">{t.price}</div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Optimizer Card */}
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">AI Fleet Dispatch Optimizer</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-300/80 mb-2">
                  Optimal entry: <b>Gate 3 at 14:15</b>. Bypasses Main Arterial construction.
                </p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                  ↓ SAVINGS: 34 Mins Faster
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">Accept Route</button>
              <button className="flex-1 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Override</button>
            </div>
          </div>

          {/* Confirm CTA */}
          <button className="w-full py-3.5 rounded-xl font-bold text-sm text-white
            bg-gradient-to-r from-sky-500 to-blue-600 dark:from-cyan-500 dark:to-blue-500
            hover:from-sky-600 hover:to-blue-700 shadow-glow-sky dark:shadow-glow-cyan
            flex items-center justify-center gap-2 transition-all duration-200"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm Slot & Transmit Driver e-Pass
          </button>

          <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
            RFID fast-pass sync enabled · SMS notification will be sent to driver
          </p>
        </div>
      </div>
    </div>
  );
}
