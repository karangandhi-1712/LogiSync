import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Eye, Zap, CheckCircle2, AlertTriangle, Clock, Sparkles, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../context/ThemeContext';
import { usePort } from '../context/PortContext';
import { fetchSlots, bookSlot, getAiSlotSuggestion, getGateCongestion, rescheduleSlot, cancelSlot } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import type { Slot } from '../types';

// ─── Status config for gate cards ─────────────────────────────────────────
const STATUS_CONFIG = {
  congested: { label: 'CONGESTED',           bg: 'bg-red-500/10 dark:bg-red-950/20',         border: 'border-red-400/40 dark:border-red-500/30',         text: 'text-red-600 dark:text-red-400',         dot: 'bg-red-500 shadow-[0_0_8px_#ef4444]' },
  normal:    { label: 'NORMAL',              bg: 'bg-white/60 dark:bg-slate-900/60',         border: 'border-slate-300/40 dark:border-white/10',          text: 'text-slate-700 dark:text-slate-300',     dot: 'bg-slate-400' },
  optimal:   { label: 'OPTIMAL / FAST-PASS', bg: 'bg-emerald-500/10 dark:bg-emerald-950/25', border: 'border-emerald-400/40 dark:border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500 shadow-[0_0_8px_#10b981]' },
  moderate:  { label: 'MODERATE',            bg: 'bg-amber-500/10 dark:bg-amber-950/20',     border: 'border-amber-400/40 dark:border-amber-500/30',     text: 'text-amber-600 dark:text-amber-400',     dot: 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' },
} as const;

type GateStatus = keyof typeof STATUS_CONFIG;

interface GateInfo {
  id: string; name: string; wait: number; queue: number; status: GateStatus;
}

// ─── Slot timeline display styles ─────────────────────────────────────────
const SLOT_STYLES = {
  active:    'bg-sky-500/10 dark:bg-sky-900/30 border-sky-400/40 dark:border-sky-500/40 text-sky-800 dark:text-sky-300 shadow-[0_0_12px_rgba(2,132,199,0.15)]',
  ai_pick:   'bg-emerald-500/15 dark:bg-emerald-900/30 border-emerald-400/50 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.2)]',
  booked:    'bg-blue-500/10 dark:bg-blue-900/30 border-blue-400/40 dark:border-blue-500/40 text-blue-800 dark:text-blue-300',
  surge:     'bg-red-500/10 dark:bg-red-900/30 border-red-400/40 dark:border-red-500/40 text-red-800 dark:text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.15)]',
  available: 'bg-white/60 dark:bg-slate-900/50 border-white/70 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-cyan-400/60 cursor-pointer neu-flat-sm',
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
    legend: { data: ['Gate 1 (Main Entry)', 'Gate 3 (Bulk/Express)'], top: 0, textStyle: { color: isDark ? '#cbd5e1' : '#475569', fontSize: 10 } },
    grid: { left: '4%', right: '4%', bottom: '8%', top: '28px', containLabel: true },
    xAxis: { type: 'category', data: hours.map(h => `${h}:00`), axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }, axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' } } },
    yAxis: { type: 'value', name: 'Wait (min)', nameTextStyle: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }, axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }, splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' } } },
    series: [
      { name: 'Gate 1 (Main Entry)', type: 'bar', data: gate1, barMaxWidth: 18, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#f59e0b' }] }, borderRadius: [6,6,0,0] } },
      { name: 'Gate 3 (Bulk/Express)', type: 'bar', data: gate3, barMaxWidth: 18, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#00f5d4' }] }, borderRadius: [6,6,0,0] } },
    ],
  };
  return <ReactECharts option={option} style={{ height: '170px' }} />;
}

function dateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

const INTERVAL_MINUTES: Record<string, number> = { '15M': 15, '30M': 30, '1H': 60 };

// Offline fallback gates (VOC-flavored; replaced by live per-port data when online).
const DEMO_GATES: GateInfo[] = [
  { id: 'Gate 1 (Bulk)', name: 'Gate 1 (Bulk)', wait: 45, queue: 14, status: 'congested' },
  { id: 'Gate 2 (General)', name: 'Gate 2 (General)', wait: 18, queue: 6,  status: 'normal'    },
  { id: 'Gate 3 (Container/Reefer)', name: 'Gate 3 (Container/Reefer)', wait: 11, queue: 2,  status: 'optimal'   },
  { id: 'Gate 4 (Express Rail)', name: 'Gate 4 (Express Rail)', wait: 22, queue: 9,  status: 'moderate'  },
];

export default function SlotBookingPage() {
  const { showToast } = useToast();
  const { port, portId } = usePort();
  const [gates, setGates] = useState<GateInfo[]>(DEMO_GATES);
  // Full gate name (backend canonical form); defaults to the port's Gate 3.
  const [selectedGate, setSelectedGate] = useState(port.gates[2]);
  const [tier, setTier] = useState<'standard' | 'express' | 'critical'>('express');
  const [dwell, setDwell] = useState(45);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [actionSlotId, setActionSlotId] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{
    recommended_gate: string; recommended_time: string;
    confidence_score: number; expected_savings_minutes: number;
    turnaround_improvement_pct: number; reasoning: string;
  } | null>(null);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('14:15');
  const [dateOffset, setDateOffset] = useState(0);
  const [interval, setInterval] = useState<keyof typeof INTERVAL_MINUTES>('15M');
  const activeDate = dateStr(dateOffset);

  const TIER_CONFIG = [
    { id: 'standard' as const, label: 'Standard',  price: '₹0' },
    { id: 'express'  as const, label: 'Express',   price: '+₹500' },
    { id: 'critical' as const, label: 'Critical',  price: '+₹1,200' },
  ];

  // Reset to the newly selected port's Gate 3 (full canonical name).
  useEffect(() => {
    setSelectedGate(port.gates[2]);
    setAiSuggestion(null);
  }, [portId, port]);

  const loadCongestion = useCallback(async () => {
    try {
      const data = await getGateCongestion(portId);
      if (Array.isArray(data) && data.length > 0) {
        setGates(data.map((g: any) => ({
          id: g.gate_id || g.id,
          name: g.gate_name || g.name,
          wait: g.waitMinutes ?? g.avg_wait_min ?? g.wait ?? 0,
          queue: g.queueCount ?? g.queue_depth ?? g.queue ?? 0,
          status: (g.status as GateStatus) || 'normal',
        })));
      } else {
        // Offline fallback mirrors the selected port's gate names.
        setGates(port.gates.map((gn, i) => ({ ...DEMO_GATES[i % DEMO_GATES.length], id: gn, name: gn })));
      }
    } catch {
      setGates(port.gates.map((gn, i) => ({ ...DEMO_GATES[i % DEMO_GATES.length], id: gn, name: gn })));
    }
  }, [portId, port]);

  const loadSlots = useCallback(async () => {
    setIsLoadingSlots(true);
    try {
      const data = await fetchSlots(selectedGate, dateStr(dateOffset), portId);
      setSlots(data);
    } catch { setSlots([]); }
    finally { setIsLoadingSlots(false); }
  }, [selectedGate, dateOffset, portId]);

  useEffect(() => { loadCongestion(); }, [loadCongestion]);
  useEffect(() => { loadSlots(); }, [loadSlots]);

  useEffect(() => {
    let cancelled = false;
    setIsAiLoading(true);
    getAiSlotSuggestion(selectedGate, dateStr(dateOffset), selectedSlotTime, 'Container', portId)
      .then(result => { if (!cancelled) setAiSuggestion(result); })
      .catch(() => { if (!cancelled) setAiSuggestion(null); })
      .finally(() => { if (!cancelled) setIsAiLoading(false); });
    return () => { cancelled = true; };
  }, [selectedGate, selectedSlotTime, dateOffset, portId]);

  const handleAiSuggest = async () => {
    setIsAiLoading(true);
    try {
      const result = await getAiSlotSuggestion(selectedGate, dateStr(dateOffset), selectedSlotTime, 'Container', portId);
      setAiSuggestion(result);
      showToast({ type: 'success', title: 'AI Recommendation Ready', message: `Optimal: ${result.recommended_gate} @ ${result.recommended_time}` });
    } catch {
      showToast({ type: 'error', title: 'AI Service Unavailable', message: 'Could not fetch AI recommendation.' });
    } finally { setIsAiLoading(false); }
  };

  const handleConfirmBooking = async (overrideTime?: string) => {
    setIsBooking(true);
    try {
      const targetGate = aiSuggestion?.recommended_gate || selectedGate;
      const targetTime = overrideTime || aiSuggestion?.recommended_time || selectedSlotTime;
      await bookSlot({ gateId: targetGate, date: activeDate, slotTime: targetTime, truckPlate: 'TN-04-E-8821', driverName: 'Rajesh Kumar', driverPhone: '+91-99400-11234', cargoType: 'Refrigerated Container', dwellMinutes: dwell, tier, port: portId });
      showToast({ type: 'success', title: 'Slot Confirmed!', message: `e-Pass sent to driver. Gate ${targetGate} @ ${targetTime}` });
      setAiSuggestion(null);
      loadSlots();
    } catch {
      showToast({ type: 'error', title: 'Booking Failed', message: 'Could not confirm the slot. Please retry.' });
    } finally { setIsBooking(false); }
  };

  const handleReschedule = async (slotId: string, newTime: string) => {
    setActionSlotId(slotId);
    try {
      await rescheduleSlot(slotId, newTime);
      showToast({ type: 'success', title: 'Slot Rescheduled', message: `Slot moved to ${newTime}.` });
      await loadSlots();
    } catch {
      showToast({ type: 'error', title: 'Reschedule Failed', message: 'Could not update the slot.' });
    } finally { setActionSlotId(null); }
  };

  const handleCancel = async (slotId: string) => {
    if (!window.confirm('Cancel this gate slot?')) return;
    setActionSlotId(slotId);
    try {
      await cancelSlot(slotId);
      showToast({ type: 'success', title: 'Slot Cancelled', message: 'Gate capacity has been released.' });
      await loadSlots();
    } catch {
      showToast({ type: 'error', title: 'Cancellation Failed', message: 'Could not cancel the slot.' });
    } finally { setActionSlotId(null); }
  };

  // Build timeline items from API data or fall back to demo
  const demoTimeline = [
    { time: '14:00', type: 'active'    as const, label: 'TRUCK AT GATE — Inspection & Weighbridge',     sub: '04m left',                      isAI: false },
    { time: '14:15', type: 'ai_pick'  as const,  label: 'TARGET SLOT: Bulk Cargo Gate 3',               sub: '₹500 Express Locked [Claimed]',  isAI: true  },
    { time: '14:30', type: 'booked'   as const,  label: 'TN-04-E-8821 • Rajesh Kumar',                  sub: 'Booked Express, 40FT High Cube', isAI: false },
    { time: '14:45', type: 'surge'    as const,  label: 'HIGH QUEUE SPIKE — 8 Trucks Waiting',          sub: 'Divert recommended',             isAI: false },
    { time: '15:00', type: 'available'as const,  label: 'Standard Priority • 9-12 Open Windows',        sub: '',                               isAI: false },
    { time: '15:15', type: 'available'as const,  label: 'Standard Priority • 9-12 Open Windows',        sub: '',                               isAI: false },
  ];

  const timelineItems = slots.length > 0
    ? slots.map((s, _i) => ({
    slotId: s.id,
        time: s.slot_time || '14:00',
        type: s.status === 'booked' ? 'booked' as const : 'available' as const,
        label: s.status === 'booked' ? `${s.truck_plate || 'Unknown'} • ${s.driver_name || 'Driver'}` : `Available — ${s.gate_id}`,
        sub: s.status === 'booked' ? `${s.cargo_type || 'Container'} · ${s.dwell_estimate_min || 25}min` : '',
        isAI: false,
      }))
    : demoTimeline.map(item => ({ ...item, slotId: undefined }));

  const getSlotIcon = (type: string) => {
    if (type === 'active')  return <Eye className="w-3.5 h-3.5" />;
    if (type === 'ai_pick') return <Zap className="w-3.5 h-3.5" />;
    if (type === 'booked')  return <CheckCircle2 className="w-3.5 h-3.5" />;
    if (type === 'surge')   return <AlertTriangle className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  };

  const fmtEndTime = (start: string) => {
    const [h, m] = start.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return start;
    const end = new Date(0, 0, 0, h, m + INTERVAL_MINUTES[interval]);
    return `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`;
  };

  const dateLabel = new Date(activeDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg-canvas)] relative">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-white/40 dark:border-white/10 flex-shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white chroma-text">
              Gate Slot Allocation & AI Dispatch
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-400/30">
              <Sparkles className="w-2.5 h-2.5 text-cyan-500" />
              AI OPTIMIZED
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time terminal gates availability · Dynamic slot booking · Driver e-Pass encryption
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { loadCongestion(); loadSlots(); }}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Gate Status Matrix */}
      <div id="tutorial-gate-matrix" className="px-6 py-3.5 border-b border-white/40 dark:border-white/10 flex-shrink-0">
        <div className="grid grid-cols-4 gap-3.5">
          {gates.map(gate => {
            const cfg = STATUS_CONFIG[gate.status];
            const isSelected = selectedGate === gate.id;
            return (
              <button
                key={gate.id}
                onClick={() => setSelectedGate(gate.id)}
                className={clsx(
                  'p-3.5 rounded-2xl border text-left transition-all duration-200 relative overflow-hidden backdrop-blur-xl',
                  cfg.bg, cfg.border,
                  isSelected
                    ? 'ring-2 ring-cyan-400 dark:ring-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.02]'
                    : 'hover:scale-[1.01] neu-flat-sm'
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 font-mono">{gate.id}</span>
                  <div className={clsx('w-2 h-2 rounded-full', cfg.dot)} />
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1 truncate">{gate.name}</div>
                <div className="text-2xl font-black tabular text-slate-900 dark:text-white font-mono">
                  {gate.wait}<span className="text-xs font-medium text-slate-400 ml-1">MIN</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/40 dark:border-white/10">
                  <span className={clsx('text-[9px] font-black uppercase', cfg.text)}>{cfg.label}</span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">{gate.queue} in queue</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — Timeline + Congestion Chart */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden border-r border-white/40 dark:border-white/10">
          {/* Date Selector + Interval Pills */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-white/40 dark:border-white/10 flex-shrink-0">
            <button onClick={() => setDateOffset(d => d - 1)} title="Previous day" className="p-1.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-white/10 neu-button text-slate-500 hover:text-cyan-500 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {dateOffset === 0 ? 'Today' : dateOffset === 1 ? 'Tomorrow' : dateLabel} — {dateLabel}
              </span>
            </div>
            <button onClick={() => setDateOffset(d => Math.min(d + 1, 7))} title="Next day" className="p-1.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-white/10 neu-button text-slate-500 hover:text-cyan-500 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="ml-auto flex items-center gap-1 bg-slate-200/50 dark:bg-slate-900/60 p-1 rounded-xl neu-inset-sm">
              {(Object.keys(INTERVAL_MINUTES) as (keyof typeof INTERVAL_MINUTES)[]).map(iv => (
                <button
                  key={iv}
                  onClick={() => setInterval(iv)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-[10px] font-bold transition-all',
                    iv === interval
                      ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-cyan-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  {iv}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-6 py-2 flex-shrink-0 text-[10px]">
            {[
              { color: 'bg-sky-500 shadow-[0_0_6px_#0284c7]', label: 'Active Gate' },
              { color: 'bg-emerald-500 shadow-[0_0_6px_#10b981]', label: 'AI Top Pick' },
              { color: 'bg-blue-500', label: 'Booked' },
              { color: 'bg-red-500 shadow-[0_0_6px_#ef4444]', label: 'Bottleneck' },
              { color: 'bg-slate-300 dark:bg-slate-700', label: 'Available' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={clsx('w-2 h-2 rounded-full', l.color)} />
                <span className="text-slate-500 dark:text-slate-400 font-medium">{l.label}</span>
              </div>
            ))}
          </div>

          {/* Timeline Slots */}
          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2">
            {isLoadingSlots ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" /> Loading slots…
              </div>
            ) : (
              <AnimatePresence>
                {timelineItems.map((slot, i) => (
                  <motion.div
                    key={`${slot.time}-${i}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    id={slot.isAI ? 'tutorial-ai-top-pick' : undefined}
                    className={clsx(
                      'flex items-center gap-3.5 p-3 rounded-2xl border transition-all duration-200 backdrop-blur-xl',
                      SLOT_STYLES[slot.type]
                    )}
                  >
                    <span className="text-xs font-black tabular w-12 flex-shrink-0 font-mono">{slot.time}</span>
                    <span className="flex-shrink-0 text-cyan-500">{getSlotIcon(slot.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{slot.label}</div>
                      {slot.sub && <div className="text-[10px] opacity-75 truncate">{slot.sub}</div>}
                    </div>
                    {slot.isAI && (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white shadow-[0_0_10px_#10b981] flex-shrink-0">
                        AI TOP PICK
                      </span>
                    )}
                    {slot.type === 'available' && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="flex-shrink-0"
                        isLoading={isBooking}
                        onClick={() => { setSelectedSlotTime(slot.time); handleConfirmBooking(slot.time); }}
                      >
                        Quick Claim
                      </Button>
                    )}
                    {slot.type === 'booked' && slot.slotId && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button size="sm" variant="ghost" isLoading={actionSlotId === slot.slotId} onClick={() => handleReschedule(slot.slotId!, fmtEndTime(slot.time))}>
                          Reschedule
                        </Button>
                        <Button size="sm" variant="danger" disabled={actionSlotId !== null && actionSlotId !== slot.slotId} onClick={() => handleCancel(slot.slotId!)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Congestion Chart */}
          <div className="flex-shrink-0 border-t border-white/40 dark:border-white/10 px-6 py-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>AI Congestion Delay Forecast</span>
            </h3>
            <CongestionChart />
          </div>
        </div>

        {/* Right — Booking Panel */}
        <div id="tutorial-booking-form" className="w-[410px] flex-shrink-0 flex flex-col overflow-y-auto p-6 space-y-4 liquid-glass border-l border-l-white/40 dark:border-l-white/10 backdrop-blur-3xl">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Booking & Driver e-Pass Transmission
          </h2>

          {/* Gate Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Target Terminal Gate
            </label>
            <div className="rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/70 dark:border-white/10 neu-inset overflow-hidden">
              <select
                value={selectedGate}
                onChange={e => setSelectedGate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
              >
                {gates.map(g => (
                  <option key={g.id} value={g.id} className="dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                    {g.id} — {g.name} ({g.wait}m avg dwell)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Window Pill */}
          <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Reserved Window</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, {selectedSlotTime} – {fmtEndTime(selectedSlotTime)}
            </div>
          </div>

          {/* Fleet Asset Pill */}
          <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Assigned Asset</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">TRK-8821 • Rajesh Kumar</div>
                <div className="text-[10px] text-slate-400 font-mono">TN-04-E-8821 · Scania R500</div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30">
                KYC ✓
              </span>
            </div>
          </div>

          {/* Cargo */}
          <div className="p-3 rounded-2xl bg-sky-500/10 dark:bg-cyan-500/10 border border-sky-400/30 dark:border-cyan-400/30 neu-flat-sm">
            <div className="text-[10px] text-cyan-600 dark:text-cyan-400 uppercase font-bold tracking-wider mb-0.5">Cargo Details</div>
            <div className="text-xs font-bold text-sky-800 dark:text-cyan-300">Refrigerated Container • High Priority</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">-18.4°C monitored · Cold-chain compliant</div>
          </div>

          {/* Dwell Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Dwell Duration</label>
              <span className="text-xs font-black tabular text-cyan-600 dark:text-cyan-400 font-mono">{dwell} mins</span>
            </div>
            <input type="range" min={15} max={120} step={15} value={dwell} onChange={e => setDwell(Number(e.target.value))} className="w-full accent-cyan-500 cursor-pointer" />
            <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono">
              <span>15m</span><span>Unload + Crane Sync</span><span>2h</span>
            </div>
          </div>

          {/* Protocol Tier Buttons */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Dispatch Priority Tier
            </label>
            <div className="flex gap-2">
              {TIER_CONFIG.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTier(t.id)}
                  className={clsx(
                    'flex-1 py-2.5 px-2 rounded-2xl text-center transition-all duration-200 border',
                    tier === t.id
                      ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold border-white/20 shadow-[0_4px_16px_rgba(6,182,212,0.4)] scale-[1.02]'
                      : 'bg-white/60 dark:bg-slate-900/60 border-white/60 dark:border-white/10 text-slate-600 dark:text-slate-400 neu-flat-sm hover:border-cyan-400/40'
                  )}
                >
                  <div className="text-[10px] font-black">{t.label}</div>
                  <div className="text-[9px] opacity-80 mt-0.5">{t.price}</div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Optimizer Card */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 neu-flat-sm">
            <div className="flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">AI Fleet Dispatch Optimizer</p>
                {aiSuggestion ? (
                  <>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                      Optimal entry: <b>{aiSuggestion.recommended_gate} @ {aiSuggestion.recommended_time}</b>.<br />
                      {aiSuggestion.reasoning}
                    </p>
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white shadow-[0_0_8px_#10b981]">
                        ↓ SAVINGS: {aiSuggestion.expected_savings_minutes} Mins Faster
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-400/30">
                        {Math.round(aiSuggestion.confidence_score * 100)}% Confidence
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                    Click "AI Suggest" to get the optimal entry slot recommendation for the selected gate.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="success" size="sm" className="flex-1" isLoading={isAiLoading} onClick={handleAiSuggest}>
                {aiSuggestion ? 'Refresh AI Pick' : 'AI Suggest'}
              </Button>
              {aiSuggestion && (
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => setAiSuggestion(null)}>Override</Button>
              )}
            </div>
          </div>

          {/* Confirm CTA */}
          <Button
            variant="primary"
            className="w-full py-3.5"
            isLoading={isBooking}
            onClick={() => handleConfirmBooking()}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Slot & Transmit e-Pass</span>
          </Button>

          <p className="text-[10px] text-center text-slate-400 font-medium">
            RFID fast-pass sync enabled · SMS notification will be sent to driver
          </p>
        </div>
      </div>
    </div>
  );
}

