import React from 'react';
import { CheckCircle2, Clock, MapPin, Package, Truck, XCircle, Zap } from 'lucide-react';
import type { DeliveryStatus, PriorityTier, ScheduleStatus } from '../../types';

// ── Delivery status ──────────────────────────────────────────────────────────

const DELIVERY_STYLE: Record<DeliveryStatus, { label: string; cls: string; Icon: any }> = {
  pending:     { label: 'Pending',          cls: 'bg-slate-500/12 text-slate-600 dark:text-slate-300 border-slate-400/25', Icon: Clock },
  batched:     { label: 'Batched',          cls: 'bg-sky-500/12 text-sky-600 dark:text-cyan-300 border-sky-400/30',       Icon: Package },
  assigned:    { label: 'Driver Assigned',  cls: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300 border-indigo-400/30', Icon: Truck },
  picked_up:   { label: 'Picked Up',        cls: 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-400/30',   Icon: Package },
  en_route:    { label: 'Out for Delivery', cls: 'bg-amber-500/16 text-amber-700 dark:text-amber-300 border-amber-400/35', Icon: MapPin },
  delivered:   { label: 'Delivered',        cls: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 border-emerald-400/30', Icon: CheckCircle2 },
  failed:      { label: 'Failed',           cls: 'bg-rose-500/12 text-rose-600 dark:text-rose-300 border-rose-400/30',       Icon: XCircle },
  cancelled:   { label: 'Cancelled',        cls: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-400/20',  Icon: XCircle },
};

export function DeliveryStatusBadge({ status, className = '' }: { status: DeliveryStatus; className?: string }) {
  const cfg = DELIVERY_STYLE[status] ?? DELIVERY_STYLE.pending;
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-wider ${cfg.cls} ${className}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Schedule status ──────────────────────────────────────────────────────────

const SCHEDULE_STYLE: Record<ScheduleStatus, string> = {
  broadcasting: 'bg-sky-500/12 text-sky-600 dark:text-cyan-300 border-sky-400/30',
  claimed:       'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300 border-indigo-400/30',
  locked:        'bg-slate-500/12 text-slate-700 dark:text-slate-300 border-slate-400/30',
  in_progress:   'bg-amber-500/14 text-amber-700 dark:text-amber-300 border-amber-400/35',
  completed:     'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 border-emerald-400/30',
  cancelled:     'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-400/20',
};

export function ScheduleStatusBadge({ status, className = '' }: { status: ScheduleStatus; className?: string }) {
  const label = status.replace('_', ' ');
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-wider ${
        SCHEDULE_STYLE[status] ?? SCHEDULE_STYLE.broadcasting
      } ${className}`}
    >
      {status === 'broadcasting' && (
        <span className="relative flex w-1.5 h-1.5">
          <span className="absolute inline-flex w-full h-full rounded-full bg-sky-400 opacity-75 animate-ping" />
          <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-cyan-300" />
        </span>
      )}
      {label}
    </span>
  );
}

// ── Priority tier ────────────────────────────────────────────────────────────

const TIER_STYLE: Record<PriorityTier, { label: string; cls: string }> = {
  standard: { label: 'Standard', cls: 'bg-slate-500/12 text-slate-600 dark:text-slate-300 border-slate-400/25' },
  express:  { label: 'Express',  cls: 'bg-sky-500/12 text-sky-600 dark:text-cyan-300 border-sky-400/30' },
  urgent:   { label: 'Urgent',   cls: 'bg-rose-500/12 text-rose-600 dark:text-rose-300 border-rose-400/30' },
};

export function TierBadge({ tier, className = '' }: { tier: PriorityTier; className?: string }) {
  const cfg = TIER_STYLE[tier] ?? TIER_STYLE.standard;
  const Icon = tier === 'urgent' ? Zap : null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider ${cfg.cls} ${className}`}
    >
      {Icon && <Icon className="w-2.5 h-2.5" />}
      {cfg.label}
    </span>
  );
}

// ── Money / formatting ───────────────────────────────────────────────────────

export function formatINR(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatDistance(km: number | null | undefined): string {
  if (km == null) return '-';
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(km * 1000)} m`;
}

export function formatWindow(start: string, end: string): string {
  return `${start} - ${end}`;
}

export function formatClockTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}