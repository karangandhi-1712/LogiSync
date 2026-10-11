import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Loader2, Radio, Send } from 'lucide-react';
import { Button } from '../ui/Button';
import { TierBadge, formatINR } from './Badges';
import { haversineKm, type PortInfo } from '../../data/ports';
import type { DeliveryRequest } from '../../types';

interface Props {
  port: PortInfo;
  pending: DeliveryRequest[];
  externalCentre?: { lat: number; lng: number } | null;
  onMapCentre: (c: { lat: number; lng: number }) => void;
  onCreate: (input: {
    area_label: string;
    area_center_lat: number;
    area_center_lng: number;
    radius_km: number;
    departure_window_start: string;
    departure_window_end: string;
    max_batch_size: number;
    request_ids: string[];
  }) => Promise<void>;
  busy: boolean;
}

const RADIUS_MIN = 1;
const RADIUS_MAX = 25;
const CAP_MAX = 12;

/** Mirrors backend services/earnings.py so the quoted figure matches the API. */
function estimateEarnings(tiers: string[], routeKm: number): number {
  const perStop: Record<string, number> = { standard: 120, express: 220, urgent: 350 };
  const stops = tiers.reduce((sum, t) => sum + (perStop[t] ?? 120), 0);
  const distance = Math.max(0, routeKm) * 12;
  const bonus = Math.max(0, tiers.length - 1) * 75;
  return Math.round(stops + distance + bonus);
}

export function ScheduleCreator({ port, pending, externalCentre, onMapCentre, onCreate, busy }: Props) {
  const [areaLabel, setAreaLabel] = useState('');
  const [centre, setCentre] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(6);
  const [windowStart, setWindowStart] = useState('00:00');
  const [windowEnd, setWindowEnd] = useState('23:59');
  const [cap, setCap] = useState(4);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync when externalCentre changes (e.g. clicking a request or map)
  useEffect(() => {
    if (externalCentre) {
      setCentre(externalCentre);
    }
  }, [externalCentre]);

  // Default the area to the depot itself so the form is usable immediately.
  useEffect(() => {
    if (!centre) {
      setCentre({ lat: port.lat, lng: port.lng });
      onMapCentre({ lat: port.lat, lng: port.lng });
    }
  }, [port, centre, onMapCentre]);

  const inRadius = useMemo(() => {
    if (!centre) return [];
    return pending.filter(
      (r) => haversineKm(centre.lat, centre.lng, r.delivery_lat, r.delivery_lng) <= radius,
    );
  }, [pending, centre, radius]);

  // Auto-select everything inside the radius, dropping selections that fell out.
  useEffect(() => {
    const inside = new Set(inRadius.map((r) => r.id));
    setSelected((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (inside.has(id)) next.add(id);
      });
      inRadius.forEach((r) => next.add(r.id));
      return next;
    });
  }, [inRadius]);

  const chosen = useMemo(
    () => inRadius.filter((r) => selected.has(r.id)),
    [inRadius, selected],
  );

  const routeKm = useMemo(() => {
    if (!centre) return 0;
    return haversineKm(port.lat, port.lng, centre.lat, centre.lng) * 1.3;
  }, [port, centre]);

  const estimate = useMemo(
    () => estimateEarnings(chosen.map((r) => r.priority_tier), routeKm),
    [chosen, routeKm],
  );

  function centreOnPending() {
    if (pending.length === 0) return;
    const first = pending[0];
    const c = { lat: first.delivery_lat, lng: first.delivery_lng };
    setCentre(c);
    onMapCentre(c);
    if (!areaLabel.trim()) {
      const parts = first.delivery_address.split(',');
      const guess = parts[0]?.trim() || 'Cluster';
      setAreaLabel(`${guess} Belt`);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit() {
    setError(null);
    if (!areaLabel.trim()) {
      setError('Give the area a name drivers will recognise.');
      return;
    }
    if (chosen.length === 0) {
      setError('Select at least one delivery request inside the radius.');
      return;
    }
    if (chosen.length > cap) {
      setError(`Only ${cap} stop${cap === 1 ? '' : 's'} fit in this batch - deselect some or raise the cap.`);
      return;
    }
    await onCreate({
      area_label: areaLabel.trim(),
      area_center_lat: centre!.lat,
      area_center_lng: centre!.lng,
      radius_km: radius,
      departure_window_start: windowStart,
      departure_window_end: windowEnd,
      max_batch_size: cap,
      request_ids: chosen.map((r) => r.id),
    });
    setAreaLabel('');
    setSelected(new Set());
  }

  return (
    <div className="space-y-3">
      <input
        value={areaLabel}
        onChange={(e) => setAreaLabel(e.target.value)}
        placeholder="e.g. Thoothukudi North - Bryant Nagar belt"
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-sky-400 text-xs"
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="px-2.5 py-2 rounded-xl bg-slate-500/6 border border-slate-200/50 dark:border-white/6">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Radius</p>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="flex-1 accent-sky-500"
            />
            <span className="text-[11px] font-black font-mono text-slate-700 dark:text-slate-200 w-10 text-right">
              {radius} km
            </span>
          </div>
        </div>
        <div className="px-2.5 py-2 rounded-xl bg-slate-500/6 border border-slate-200/50 dark:border-white/6">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Batch cap</p>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min={1}
              max={CAP_MAX}
              value={cap}
              onChange={(e) => setCap(Number(e.target.value))}
              className="flex-1 accent-emerald-500"
            />
            <span className="text-[11px] font-black font-mono text-slate-700 dark:text-slate-200 w-10 text-right">
              {cap} stops
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 shrink-0">
          Depart
        </span>
        <input
          type="time"
          value={windowStart}
          onChange={(e) => setWindowStart(e.target.value)}
          className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-800 dark:text-slate-100 outline-none focus:border-sky-400 font-mono text-xs"
        />
        <span className="text-slate-400 text-[10px]">to</span>
        <input
          type="time"
          value={windowEnd}
          onChange={(e) => setWindowEnd(e.target.value)}
          className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-800 dark:text-slate-100 outline-none focus:border-sky-400 font-mono text-xs"
        />
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
        <span>
          Area centred on{' '}
          <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
            {centre ? `${centre.lat.toFixed(3)}, ${centre.lng.toFixed(3)}` : '-'}
          </span>
        </span>
        <button
          onClick={() => {
            const c = { lat: port.lat, lng: port.lng };
            setCentre(c);
            onMapCentre(c);
          }}
          className="ml-auto inline-flex items-center gap-1 font-bold text-sky-600 dark:text-cyan-300 hover:underline"
        >
          <Crosshair className="w-3 h-3" /> Centre on depot
        </button>
      </div>

      {/* Requests inside the radius */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
          Inside {radius} km · {inRadius.length} request{inRadius.length === 1 ? '' : 's'}
        </p>
        {inRadius.length === 0 ? (
          <div className="py-3 px-3 rounded-xl bg-slate-500/5 border border-dashed border-slate-300 dark:border-white/10 text-center space-y-2">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              0 requests inside {radius} km of this center.
            </p>
            {pending.length > 0 && (
              <button
                type="button"
                onClick={centreOnPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 dark:bg-sky-500/20 dark:text-sky-300 transition shadow-sm"
              >
                <Crosshair className="w-3.5 h-3.5" /> Centre batch on pending requests ({pending.length})
              </button>
            )}
          </div>
        ) : (
          <ul ref={listRef} className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
            {inRadius.map((r) => {
              const on = selected.has(r.id);
              const km = centre
                ? haversineKm(centre.lat, centre.lng, r.delivery_lat, r.delivery_lng)
                : 0;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => toggle(r.id)}
                    disabled={chosen.length >= cap && !on}
                    className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-xl border text-left transition disabled:opacity-40 ${
                      on
                        ? 'bg-sky-500/8 border-sky-400/35'
                        : 'bg-slate-500/5 border-slate-200/50 dark:border-white/6 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded border-2 grid place-items-center shrink-0 mt-0.5 ${
                        on ? 'border-sky-500 bg-sky-500' : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {on && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 break-words">
                        {r.delivery_address}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <TierBadge tier={r.priority_tier} />
                        <span className="text-[10px] font-mono text-slate-400">{km.toFixed(1)} km</span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-500/8 border border-emerald-400/25">
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
          Driver earns ≈
        </span>
        <span className="text-sm font-black text-emerald-600 dark:text-emerald-300">
          {formatINR(estimate)}
        </span>
      </div>

      {error && (
        <p className="text-[11px] font-bold text-rose-600 dark:text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <Button
        variant="primary"
        className="w-full"
        isLoading={busy}
        disabled={busy || chosen.length === 0}
        onClick={submit}
        icon={busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
      >
        Broadcast to available drivers
      </Button>
    </div>
  );
}
