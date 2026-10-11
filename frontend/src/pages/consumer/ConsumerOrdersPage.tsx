// ─── ConsumerOrdersPage - the customer's delivery list ───────────────────────
// Everything this account has ordered, split into what is moving now and what is
// history. Socket events patch rows in place so the list stays live without a
// refetch on every ping.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ChevronRight,
  Inbox,
  Loader2,
  MapPin,
  PackagePlus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { DeliveryStatusBadge, TierBadge, formatINR, formatWindow } from '../../components/marketplace/Badges';
import { useMarketplaceEvent } from '../../context/MarketplaceContext';
import { useToast } from '../../context/ToastContext';
import { cancelMyOrder, fetchMyOrders } from '../../services/api';
import type { ConsumerOrder, DeliveryStatus } from '../../types';

type Filter = 'all' | 'active' | 'done';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'In progress' },
  { id: 'done', label: 'Completed' },
];

const TERMINAL: DeliveryStatus[] = ['delivered', 'failed', 'cancelled'];

export default function ConsumerOrdersPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<ConsumerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setOrders(await fetchMyOrders());
      setError(null);
    } catch (e: any) {
      setError(e?.response?.status === 401 ? 'Your session expired. Please sign in again.' : 'Could not load your deliveries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // A driver advancing a stop (or cancelling) should light the row up immediately.
  useMarketplaceEvent('delivery:status_changed', (d: { request?: { id?: string; status?: DeliveryStatus } }) => {
    const patch = d?.request;
    if (!patch?.id || !patch.status) return;
    setOrders((prev) =>
      prev.map((o) => (o.id === patch.id ? { ...o, status: patch.status as DeliveryStatus } : o)),
    );
  });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter === 'active' && TERMINAL.includes(o.status)) return false;
      if (filter === 'done' && !TERMINAL.includes(o.status)) return false;
      if (!q) return true;
      return (
        o.token_number.toLowerCase().includes(q) ||
        o.delivery_address.toLowerCase().includes(q)
      );
    });
  }, [orders, filter, query]);

  const activeCount = orders.filter((o) => !TERMINAL.includes(o.status)).length;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">My Deliveries</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {activeCount > 0
              ? `${activeCount} delivery${activeCount === 1 ? '' : 'ies'} in progress`
              : 'Nothing in transit right now'}
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/consumer/book')} icon={<PackagePlus className="w-3.5 h-3.5" />}>
          Request a delivery
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-500/6 border border-white/40 dark:border-white/8">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition ${
                filter === f.id
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[12rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by tracking code or address"
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
          />
        </div>

        <button
          onClick={() => load()}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-500/10 transition"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/8 p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-300 shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-rose-700 dark:text-rose-200">{error}</p>
        </div>
      )}

      {loading && !orders.length ? (
        <div className="flex items-center justify-center gap-2.5 py-20 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs font-bold">Loading your deliveries…</span>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-3xl liquid-glass border border-white/50 dark:border-white/10 py-16 flex flex-col items-center text-center px-6">
          <div className="p-4 rounded-2xl bg-slate-500/10 text-slate-400">
            <Inbox className="w-6 h-6" />
          </div>
          <h2 className="mt-4 text-sm font-black text-slate-800 dark:text-slate-100">
            {orders.length ? 'Nothing matches that filter' : 'No deliveries yet'}
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            {orders.length
              ? 'Try a different filter or clear your search.'
              : 'Request a parcel from any of our 12 port depots and it will show up here the moment it is accepted.'}
          </p>
          {!orders.length && (
            <Button variant="primary" className="mt-5" onClick={() => navigate('/consumer/book')}>
              Request your first delivery
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((order) => (
            <li key={order.id}>
              <OrderRow
                order={order}
                onChanged={() => load(true)}
                onError={(m) => showToast({ type: 'error', title: 'Could not cancel', message: m })}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderRow({
  order,
  onChanged,
  onError,
}: {
  order: ConsumerOrder;
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);
  const trackable = order.status === 'assigned' || order.status === 'picked_up' || order.status === 'en_route';

  async function cancel() {
    if (cancelling) return;
    setCancelling(true);
    try {
      await cancelMyOrder(order.token_number, 'cancelled by customer');
      onChanged();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      onError(typeof detail === 'string' ? detail : 'Please try again.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="rounded-2xl liquid-glass border border-white/50 dark:border-white/10 p-4 hover:border-sky-400/40 transition">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
              {order.token_number}
            </span>
            <DeliveryStatusBadge status={order.status} />
            <TierBadge tier={order.priority_tier} />
            {order.is_live && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 text-[10px] font-black uppercase border border-emerald-400/30">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            )}
          </div>

          <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="break-words">{order.delivery_address}</span>
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              Pickup: <span className="font-semibold">{order.pickup_port?.short ?? order.pickup_port?.name ?? order.pickup_port_id}</span>
            </span>
            {order.requested_window_start && (
              <span>
                Window: <span className="font-semibold">{formatWindow(order.requested_window_start, order.requested_window_end ?? '')}</span>
              </span>
            )}
            {order.tier_fee > 0 && <span>Fee: <span className="font-semibold">{formatINR(order.tier_fee)}</span></span>}
            <span>Booked: <span className="font-semibold">{new Date(order.created_at ?? Date.now()).toLocaleDateString('en-IN')}</span></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {order.is_cancellable && (
            <Button variant="ghost" onClick={cancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </Button>
          )}
          <Button
            variant={trackable ? 'primary' : 'ghost'}
            onClick={() => navigate(`/consumer/orders/${order.token_number}`)}
            icon={<ChevronRight className="w-3.5 h-3.5" />}
          >
            {trackable ? 'Track live' : 'Details'}
          </Button>
        </div>
      </div>
    </div>
  );
}