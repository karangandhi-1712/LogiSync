// ─── AnalyticsPage - delivery marketplace performance ────────────────────────
// Replaces the old gate-congestion/telematics analytics entirely. Every figure
// is a real aggregate from the API; there are no hardcoded fallback series.

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Activity,
  AlertCircle,
  Coins,
  Download,
  Loader2,
  Package,
  Timer,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '../components/ui/Button';
import { TierBadge, formatINR } from '../components/marketplace/Badges';
import { useAuth } from '../context/AuthContext';
import { usePort } from '../context/PortContext';
import { useTheme } from '../context/ThemeContext';
import {
  fetchAreaStats,
  fetchBatchDistribution,
  fetchMarketplaceKpis,
  fetchPerPortOverview,
  fetchVolumeSeries,
} from '../services/api';
import type { AreaStat, MarketplaceKpis, VolumeSeries } from '../types';

type Period = '24h' | '7d' | '30d';

const PERIODS: { id: Period; label: string }[] = [
  { id: '24h', label: 'Last 24h' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { ports, portId } = usePort();
  const { isDark } = useTheme();

  const [period, setPeriod] = useState<Period>('7d');
  const [scopePort, setScopePort] = useState<string>('');
  const [kpis, setKpis] = useState<MarketplaceKpis | null>(null);
  const [volume, setVolume] = useState<VolumeSeries | null>(null);
  const [areas, setAreas] = useState<AreaStat[]>([]);
  const [batches, setBatches] = useState<any>(null);
  const [perPort, setPerPort] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const locked = user?.role === 'fleet_manager';
  const effectivePort = locked ? (user?.assigned_port_id ?? '') : scopePort;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [k, v, a, b] = await Promise.all([
        fetchMarketplaceKpis(period, effectivePort || undefined),
        fetchVolumeSeries(period, effectivePort || undefined),
        fetchAreaStats('30d', effectivePort || undefined),
        fetchBatchDistribution('30d', effectivePort || undefined),
      ]);
      setKpis(k);
      setVolume(v);
      setAreas(a.areas ?? []);
      setBatches(b);
      if (user?.role === 'port_admin' && !effectivePort) {
        const p = await fetchPerPortOverview(period);
        setPerPort(p.ports ?? []);
      } else {
        setPerPort([]);
      }
    } catch {
      // Leave the previous figures on screen rather than blanking the page.
    } finally {
      setLoading(false);
    }
  }, [period, effectivePort, user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const chartText = isDark ? '#cbd5e1' : '#334155';
  const gridLine = isDark ? 'rgba(255,255,255,.07)' : 'rgba(15,23,42,.08)';

  const volumeOption = useMemo(() => {
    if (!volume) return {};
    return {
      grid: { left: 44, right: 16, top: 32, bottom: 46 },
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: chartText }, top: 0, itemWidth: 12, itemHeight: 8 },
      xAxis: {
        type: 'category',
        data: volume.dates.map((d) => d.slice(5)),
        axisLabel: { color: chartText, fontSize: 10 },
        axisLine: { lineStyle: { color: gridLine } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: chartText, fontSize: 10 },
        splitLine: { lineStyle: { color: gridLine } },
      },
      series: [
        {
          name: 'Submitted',
          type: 'bar',
          data: volume.submitted,
          itemStyle: { color: '#0284c7', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: 'Delivered',
          type: 'line',
          smooth: true,
          data: volume.delivered,
          itemStyle: { color: '#059669' },
          lineStyle: { width: 2 },
        },
        {
          name: 'Cancelled / failed',
          type: 'line',
          smooth: true,
          data: volume.cancelled.map((c, i) => c + (volume.failed[i] ?? 0)),
          itemStyle: { color: '#dc2626' },
          lineStyle: { width: 2, type: 'dashed' },
        },
      ],
    };
  }, [volume, chartText, gridLine]);

  const batchOption = useMemo(() => {
    const hist = batches?.stop_count_histogram ?? [];
    if (!hist.length) return {};
    return {
      grid: { left: 44, right: 16, top: 24, bottom: 32 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        name: 'stops in batch',
        nameTextStyle: { color: chartText, fontSize: 10 },
        data: hist.map((h: any) => String(h.stops)),
        axisLabel: { color: chartText, fontSize: 10 },
        axisLine: { lineStyle: { color: gridLine } },
      },
      yAxis: {
        type: 'value',
        name: 'batches',
        nameTextStyle: { color: chartText, fontSize: 10 },
        axisLabel: { color: chartText, fontSize: 10 },
        splitLine: { lineStyle: { color: gridLine } },
      },
      series: [
        {
          type: 'bar',
          data: hist.map((h: any) => h.batches),
          itemStyle: { color: '#0ea5e9', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, [batches, chartText, gridLine]);

  function exportPdf() {
    if (!kpis) return;
    const doc = new jsPDF();
    const scope = effectivePort
      ? ports.find((p) => p.id === effectivePort)?.name ?? effectivePort
      : 'All ports';
    doc.setFontSize(16);
    doc.text('LogiSync - Delivery Marketplace Report', 14, 18);
    doc.setFontSize(9);
    doc.text(`Depot scope: ${scope}   ·   Period: ${period}   ·   ${new Date().toLocaleDateString('en-IN')}`, 14, 25);

    autoTable(doc, {
      startY: 32,
      head: [['Metric', 'Value']],
      body: [
        ['Requests submitted', String(kpis.total_requests)],
        ['Requests / day', String(kpis.requests_per_day)],
        ['Active batches', String(kpis.active_batches)],
        ['Completed batches', String(kpis.completed_schedules)],
        ['Avg time to claim (min)', String(kpis.avg_time_to_claim_min)],
        ['Avg batch fill', `${kpis.avg_batch_fill_pct}%`],
        ['On-time rate', `${kpis.on_time_rate_overall}%`],
        ['Delivered', String(kpis.delivered)],
        ['Failed', String(kpis.failed)],
        ['Cancelled', String(kpis.cancelled)],
        ['Drivers total', String(kpis.drivers_total)],
        ['Drivers active', String(kpis.drivers_active)],
        ['Driver utilisation', `${kpis.driver_utilisation_pct}%`],
      ],
    });

    if (areas.length) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Busiest area', 'Batches', 'Stops', 'Avg stops', 'Earnings']],
        body: areas.map((a) => [
          a.area_label,
          String(a.schedules),
          String(a.stop_total),
          String(a.avg_stops),
          formatINR(a.earnings_total),
        ]),
      });
    }

    doc.save(`LogiSync-Marketplace-${effectivePort || 'all-ports'}-${period}.pdf`);
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-canvas)]">
      <div className="px-4 sm:px-6 py-4 border-b border-white/40 dark:border-white/8 flex items-center gap-3 flex-wrap sticky top-0 z-10 bg-[var(--bg-canvas)]/90 backdrop-blur-xl">
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">Marketplace Analytics</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Volume, batch efficiency, on-time rate and driver utilisation
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {!locked && (
            <select
              value={scopePort}
              onChange={(e) => setScopePort(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-800 dark:text-slate-100 text-xs font-bold outline-none focus:border-sky-400"
            >
              <option value="">All ports</option>
              {ports.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          {locked && (
            <span className="px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-cyan-300 text-xs font-bold border border-sky-400/25">
              {ports.find((p) => p.id === user?.assigned_port_id)?.short ?? 'Your depot'}
            </span>
          )}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-500/8 border border-slate-200/60 dark:border-white/8">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition ${
                  period === p.id
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-500/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={exportPdf} disabled={!kpis} icon={<Download className="w-3.5 h-3.5" />}>
            Export
          </Button>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 space-y-5">
        {loading && !kpis ? (
          <div className="h-48 grid place-items-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div id="tutorial-analytics-kpis" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi
                icon={<Timer className="w-4 h-4" />}
                label="Avg time to claim"
                value={kpis ? `${kpis.avg_time_to_claim_min} min` : '-'}
                sub="broadcast → accepted"
                tone="sky"
              />
              <Kpi
                icon={<Package className="w-4 h-4" />}
                label="Avg batch fill"
                value={kpis ? `${kpis.avg_batch_fill_pct}%` : '-'}
                sub={`${kpis?.completed_schedules ?? 0} batches completed`}
                tone="emerald"
              />
              <Kpi
                icon={<TrendingUp className="w-4 h-4" />}
                label="On-time delivery"
                value={kpis ? `${kpis.on_time_rate_overall}%` : '-'}
                sub="within requested window"
                tone="amber"
              />
              <Kpi
                icon={<Users className="w-4 h-4" />}
                label="Driver utilisation"
                value={kpis ? `${kpis.driver_utilisation_pct}%` : '-'}
                sub={`${kpis?.drivers_active ?? 0} active of ${kpis?.drivers_total ?? 0}`}
                tone="indigo"
              />
            </div>

            {/* Tier breakdown */}
            {kpis && (
              <div className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 p-4">
                <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
                  On-time rate by tier
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(['standard', 'express', 'urgent'] as const).map((tier) => {
                    const stat = kpis.on_time_rate_by_tier[tier];
                    const pct = stat?.on_time_pct ?? 0;
                    return (
                      <div key={tier} className="px-3 py-2.5 rounded-xl bg-slate-500/6 border border-slate-200/50 dark:border-white/6">
                        <div className="flex items-center gap-2 mb-1.5">
                          <TierBadge tier={tier} />
                          <span className="text-sm font-black text-slate-900 dark:text-white ml-auto">
                            {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-500/12 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              tier === 'urgent'
                                ? 'bg-rose-500'
                                : tier === 'express'
                                  ? 'bg-sky-500'
                                  : 'bg-slate-400'
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {stat?.delivered ?? 0} delivered
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="grid gap-4 xl:grid-cols-2">
              <div id="tutorial-heatmap-chart" className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 p-4">
                <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Request volume vs deliveries
                </h2>
                <ReactECharts option={volumeOption} style={{ height: 260 }} notMerge />
              </div>
              <div className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 p-4">
                <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Batch fill distribution
                </h2>
                {batches ? (
                  <>
                    <ReactECharts option={batchOption} style={{ height: 210 }} notMerge />
                    <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                      <MiniStat label="p50 claim" value={`${batches.claim_minutes_p50} min`} />
                      <MiniStat label="p95 claim" value={`${batches.claim_minutes_p95} min`} />
                      <MiniStat label="never claimed" value={String(batches.never_claimed)} />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 py-10 text-center">No batches in this window.</p>
                )}
              </div>
            </div>

            {/* Busiest areas */}
            <div id="tutorial-busiest-areas" className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 p-4">
              <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
                Busiest delivery areas
              </h2>
              {areas.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No batches have run yet, so there are no areas to rank.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="pb-2">Area</th>
                        <th className="pb-2 text-right">Batches</th>
                        <th className="pb-2 text-right">Stops</th>
                        <th className="pb-2 text-right">Avg stops</th>
                        <th className="pb-2 text-right">Earnings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-white/6">
                      {areas.map((a) => (
                        <tr key={a.area_label} className="text-xs">
                          <td className="py-2 font-bold text-slate-800 dark:text-slate-100">
                            {a.area_label}
                            <span className="ml-2 text-[10px] font-mono text-slate-400">{a.port_id}</span>
                          </td>
                          <td className="py-2 text-right font-mono text-slate-600 dark:text-slate-300">
                            {a.schedules}
                          </td>
                          <td className="py-2 text-right font-mono text-slate-600 dark:text-slate-300">
                            {a.stop_total}
                          </td>
                          <td className="py-2 text-right font-mono text-slate-600 dark:text-slate-300">
                            {a.avg_stops}
                          </td>
                          <td className="py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatINR(a.earnings_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Cross-port (admin only) */}
            {perPort.length > 0 && (
              <div className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 p-4">
                <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">
                  All depots
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="pb-2">Depot</th>
                        <th className="pb-2 text-right">Requests</th>
                        <th className="pb-2 text-right">Delivered</th>
                        <th className="pb-2 text-right">On-time</th>
                        <th className="pb-2 text-right">Active drivers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-white/6">
                      {perPort.map((r) => (
                        <tr key={r.port_id} className="text-xs">
                          <td className="py-2 font-bold text-slate-800 dark:text-slate-100">{r.port_name}</td>
                          <td className="py-2 text-right font-mono text-slate-600 dark:text-slate-300">{r.requests}</td>
                          <td className="py-2 text-right font-mono text-slate-600 dark:text-slate-300">{r.delivered}</td>
                          <td className="py-2 text-right font-mono text-slate-600 dark:text-slate-300">{r.on_time_pct}%</td>
                          <td className="py-2 text-right font-mono text-slate-600 dark:text-slate-300">{r.active_drivers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const TONE: Record<string, string> = {
  sky: 'text-sky-600 dark:text-cyan-300 bg-sky-500/12',
  emerald: 'text-emerald-600 dark:text-emerald-300 bg-emerald-500/12',
  amber: 'text-amber-600 dark:text-amber-300 bg-amber-500/12',
  indigo: 'text-indigo-600 dark:text-indigo-300 bg-indigo-500/12',
};

function Kpi({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 p-4">
      <div className="flex items-start gap-2.5">
        <div className={`p-2 rounded-xl shrink-0 ${TONE[tone]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight mt-0.5">
            {value}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-1.5 rounded-lg bg-slate-500/6">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-xs font-black font-mono text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}