// ─── CongestionSection — date scrubber + AI chart + peak gate callout ─────────
import { Zap, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../context/ThemeContext';
import { DateScrubber } from './DateScrubber';
import { PORT_CONGESTION, PORT_DATE_DENSITY } from '../../data/portServiceData';
import type { PortInfo } from '../../data/ports';

interface CongestionSectionProps {
  port: PortInfo | null;
  dateOffset: number;
  onDateChange: (offset: number) => void;
}

const HOURS = ['06','08','10','12','14','16','18','20','22'];
const COLORS_A = [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#f59e0b' }];
const COLORS_B = [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#00f5d4' }];

export function CongestionSection({ port, dateOffset, onDateChange }: CongestionSectionProps) {
  const { isDark } = useTheme();

  const congestion = port ? PORT_CONGESTION[port.id] : null;
  const densityValues = port ? PORT_DATE_DENSITY[port.id] : undefined;

  // Slightly shift chart data based on date offset (simulate different days)
  const shiftedSeries = congestion
    ? congestion.series.map(arr => arr.map(v => Math.max(2, Math.round(v * (0.8 + dateOffset * 0.05 + Math.random() * 0.05)))))
    : null;

  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: congestion
      ? { data: congestion.gateLabels, top: 0, textStyle: { color: isDark ? '#cbd5e1' : '#475569', fontSize: 10 } }
      : undefined,
    grid: { left: '4%', right: '4%', bottom: '8%', top: '32px', containLabel: true },
    xAxis: {
      type: 'category',
      data: HOURS.map(h => `${h}:00`),
      axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 9 },
      axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      name: 'Wait (min)',
      nameTextStyle: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 9 },
      axisLabel: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 9 },
      splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' } },
    },
    series: congestion && shiftedSeries
      ? congestion.gateLabels.map((label, i) => ({
          name: label,
          type: 'bar',
          data: shiftedSeries[i],
          barMaxWidth: 20,
          itemStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: i === 0 ? COLORS_A : COLORS_B },
            borderRadius: [6, 6, 0, 0],
          },
        }))
      : [],
  };

  return (
    <div className="px-6 py-4 border-b border-white/40 dark:border-white/10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            Date Tracker & Congestion Intelligence
          </h2>
        </div>
        {port && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {port.name}
          </span>
        )}
      </div>

      {/* Date scrubber */}
      <div className="mb-4">
        <DateScrubber
          dateOffset={dateOffset}
          onDateChange={onDateChange}
          densityValues={densityValues}
          maxOffset={6}
        />
      </div>

      {/* Chart + peak gate */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Chart */}
        <div className={clsx(
          'flex-1 rounded-2xl border backdrop-blur-sm overflow-hidden',
          port
            ? 'bg-white/50 dark:bg-slate-900/40 border-white/60 dark:border-white/10'
            : 'bg-white/30 dark:bg-slate-900/20 border-slate-200/40 dark:border-white/8'
        )}>
          <div className="px-4 pt-3 pb-0">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              AI Congestion Delay Forecast
              {port && <span className="ml-2 text-cyan-600 dark:text-cyan-400">· {port.short}</span>}
            </p>
          </div>
          {port ? (
            <ReactECharts option={chartOption} style={{ height: '170px' }} />
          ) : (
            <div className="h-[170px] flex flex-col items-center justify-center gap-2">
              <div className="flex gap-1">
                {[3, 5, 8, 12, 10, 7, 4, 3, 2].map((h, i) => (
                  <div
                    key={i}
                    className="w-4 rounded-t bg-slate-200 dark:bg-slate-800"
                    style={{ height: `${h * 4}px`, alignSelf: 'flex-end' }}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center px-4">
                Select a port to view live gate intelligence
              </p>
            </div>
          )}
        </div>

        {/* Peak gate callout */}
        {port && congestion && (
          <div className="lg:w-56 flex-shrink-0 rounded-2xl border
            bg-gradient-to-br from-amber-500/10 to-red-500/5
            border-amber-400/30 dark:border-amber-500/20 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Peak Gate Today
                </span>
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white leading-tight mb-1">
                {congestion.peakGateName}
              </p>
              <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full
                bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                {congestion.peakService}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-amber-400/20">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-red-600 dark:text-red-400">
                  {congestion.peakWaitMin}
                </span>
                <span className="text-xs text-slate-500">min peak wait</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                {congestion.peakTimeWindow}
              </p>
            </div>
          </div>
        )}

        {/* Null peak callout */}
        {!port && (
          <div className="lg:w-56 flex-shrink-0 rounded-2xl border
            bg-white/20 dark:bg-slate-900/20 border-slate-200/40 dark:border-white/8
            p-4 flex flex-col items-center justify-center opacity-50">
            <TrendingUp className="w-6 h-6 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-[10px] text-slate-400 text-center">Peak gate data appears here</p>
          </div>
        )}
      </div>
    </div>
  );
}
