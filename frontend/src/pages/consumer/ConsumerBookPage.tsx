// ─── ConsumerBookPage - request a delivery from a signed-in customer ─────────
// Same three-step wizard the old anonymous intake used, minus the identity step:
// name and mobile come from the account and are never editable here. The server
// ignores any identity in the body anyway and reads it from the JWT.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  User,
  CreditCard,
  Wallet,
  Clock,
  AlertTriangle,
  Snowflake,
  GlassWater,
  ArrowUp,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { DepotPickerModal, DepotSelectorBar } from '../../components/consumer/DepotPicker';
import { AddressAutocomplete } from '../../components/consumer/AddressAutocomplete';
import { TierBadge } from '../../components/marketplace/Badges';
import { usePort } from '../../context/PortContext';
import { useToast } from '../../context/ToastContext';
import {
  fetchConsumerAccount, fetchNearestPort, placeConsumerOrder,
  estimatePayment, createPaymentOrder, verifyPayment, loadRazorpay,
} from '../../services/api';
import { defaultDeliveryWindow, isWindowStillOpen } from '../../lib/deliveryWindow';
import {
  TIER_OPTIONS, HANDLING_OPTIONS,
  type HandlingFlag, type PaymentEstimate, type PriorityTier, type RazorpayOrder,
} from '../../types';

const PACKAGE_TYPES = ['Carton', 'Pallet', 'Reefer box', 'Sack', 'Drum', 'Documents'];

/** Icon per handling chip, so the requirement is readable at a glance. */
const HANDLING_ICON: Record<HandlingFlag, typeof GlassWater> = {
  fragile: GlassWater,
  upright: ArrowUp,
  refrigerated: Snowflake,
  liquid: Package,
};

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 ' +
  'text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20';

const STEPS = ['Confirm details', 'Pickup & address', 'Package & speed', 'Review & pay'];

export default function ConsumerBookPage() {
  const navigate = useNavigate();
  const { ports } = usePort();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [portId, setPortId] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [packageType, setPackageType] = useState('Carton');
  const [weight, setWeight] = useState('');
  const [handling, setHandling] = useState<string>('');
  const [flags, setFlags] = useState<Set<HandlingFlag>>(new Set());
  const [tier, setTier] = useState<PriorityTier>('standard');

  // Defaults relative to now — see lib/deliveryWindow for why this used to be a
  // hardcoded 10:00–18:00 that silently expired for anyone booking after 18:00.
  const [windowStart, setWindowStart] = useState(() => defaultDeliveryWindow().start);
  const [windowEnd, setWindowEnd] = useState(() => defaultDeliveryWindow().end);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<PaymentEstimate | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Identity comes from the account - fetched once, then read-only.
  useEffect(() => {
    let cancelled = false;
    fetchConsumerAccount()
      .then((acct) => {
        if (cancelled) return;
        setName(acct.full_name);
        setMobile(acct.mobile_number ?? '');
      })
      .catch(() => {
        // Leave the fields blank; the Continue button stays disabled until the
        // account resolves, so this degrades rather than half-fills the form.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canContinueIdentity = name.trim().length >= 2 && mobile.length >= 12;
  const canContinueAddress = portId != null && address.trim().length >= 6;
  const windowOpen = isWindowStillOpen({ start: windowStart, end: windowEnd });

  // Live price for the review step. Debounced on the same three inputs the
  // server prices against, so the number shown is the number charged.
  const estimateKey = `${tier}|${weight}|${[...flags].sort().join(',')}|${packageType}`;
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      estimatePayment({
        priority_tier: tier,
        package_weight: weight ? Number(weight) : null,
        package_type: packageType,
        handling_flags: [...flags],
      })
        .then(e => { if (!cancelled) setEstimate(e); })
        .catch(() => { if (!cancelled) setEstimate(null); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [estimateKey, tier, weight, packageType, flags]);

  const selectedPort = useMemo(
    () => ports.find(p => p.id === portId) ?? null,
    [ports, portId],
  );

  function toggleFlag(f: HandlingFlag) {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }

  async function useMyLocation() {
    if (!navigator.geolocation) {
      setError('This browser cannot share your location.');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const nearest = await fetchNearestPort(latitude, longitude);
          setPortId(nearest.id);
        } catch {
          /* keep manual selection */
        }
        setLocating(false);
      },
      () => {
        setError('Could not read your location - pick the depot manually.');
        setLocating(false);
      },
      { timeout: 8000 },
    );
  }

  function orderPayload() {
    return {
      pickup_port_id: portId!,
      delivery_address: address.trim(),
      delivery_lat: coords?.lat,
      delivery_lng: coords?.lng,
      package_type: packageType,
      package_weight: weight ? Number(weight) : null,
      special_handling: handling.trim() || null,
      handling_flags: [...flags],
      priority_tier: tier,
      requested_window_start: windowStart,
      requested_window_end: windowEnd,
    };
  }

  /**
   * Create the order, then collect.
   *
   * The order is created *before* checkout opens so there is a token for the
   * gateway receipt and for the server to mark paid against. With a gateway
   * configured the parcel sits unpaid until verification succeeds and is kept
   * out of every dispatch queue in the meantime; without one it is paid from
   * birth and we skip straight to tracking.
   */
  async function placeAndPay() {
    if (!portId || !canContinueIdentity) return;
    setSubmitting(true);
    setPaying(true);
    setError(null);
    try {
      const res = await placeConsumerOrder(orderPayload());
      setToken(res.token_number);

      if (!res.requires_payment) {
        showToast({
          type: 'success',
          title: 'Delivery requested',
          message: `Tracking code ${res.token_number}. Pay at the depot on handover.`,
        });
        navigate(`/consumer/orders/${res.token_number}`, { replace: true });
        return;
      }

      const order = await createPaymentOrder(res.token_number);
      if (!('order_id' in order)) {
        throw new Error('Payment is unavailable right now. Please try again shortly.');
      }
      await runCheckout(order as RazorpayOrder);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : e?.message || 'Could not submit your request. Please retry.',
      );
      setSubmitting(false);
      setPaying(false);
    }
  }

  /** Drive the Razorpay modal and verify its result server-side. */
  async function runCheckout(order: RazorpayOrder) {
    const loaded = await loadRazorpay();
    if (!loaded) {
      throw new Error('Could not load the secure checkout. Check your connection and retry.');
    }

    const Razorpay = (window as any).Razorpay;
    await new Promise<void>((resolve, reject) => {
      const rz = new Razorpay({
        key: order.key_id,
        amount: order.amount_paise,
        currency: order.currency,
        name: 'LogiSync',
        description: `Delivery ${order.token_number}`,
        order_id: order.order_id,
        prefill: order.prefill,
        notes: order.notes,
        theme: { color: '#0284c7' },
        handler: async (response: any) => {
          try {
            await verifyPayment({
              token_number: order.token_number,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            showToast({
              type: 'success',
              title: 'Payment complete',
              message: `Your delivery ${order.token_number} is with the depot.`,
            });
            resolve();
          } catch (err: any) {
            const detail = err?.response?.data?.detail;
            reject(new Error(
              typeof detail === 'string' ? detail : 'Payment could not be verified. Contact your depot.',
            ));
          }
        },
        modal: {
          ondismiss: () => reject(new Error('Checkout was closed before payment was completed.')),
        },
      });
      rz.open();
    });

    navigate(`/consumer/orders/${order.token_number}`, { replace: true });
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-black text-slate-900 dark:text-white">Request a delivery</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          From a port depot to your address · tracked live once it is picked up
        </p>
      </header>

      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <div key={label} className="flex-1 flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full grid place-items-center text-[11px] font-black shrink-0 transition ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-sky-500 text-white ring-4 ring-sky-500/20'
                      : 'bg-slate-500/12 text-slate-400'
                }`}
              >
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
              </div>
              <span
                className={`hidden sm:block text-[11px] font-bold truncate ${
                  active ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
              {n < STEPS.length && <div className="flex-1 h-px bg-slate-300/50 dark:bg-white/10" />}
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl liquid-glass-elevated border border-white/50 dark:border-white/10 shadow-lg p-5 sm:p-7 space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-sky-500/6 border border-sky-400/20 p-3.5 text-[11px] text-slate-600 dark:text-slate-300">
              These details come from your account and cannot be changed per order - your driver
              uses them to reach you on delivery.
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                <User className="w-3.5 h-3.5" /> Your name
              </label>
              <input value={name} readOnly disabled className={`${inputCls} opacity-70 cursor-not-allowed`} />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                <Phone className="w-3.5 h-3.5" /> Mobile number
              </label>
              <input value={mobile} readOnly disabled className={`${inputCls} opacity-70 cursor-not-allowed`} />
              <p className="mt-1.5 text-[11px] text-slate-400">
                Need to change this? Update it in{' '}
                <span className="font-bold">Profile</span>.
              </p>
            </div>

            <Button variant="primary" className="w-full" disabled={!canContinueIdentity} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                <MapPin className="w-3.5 h-3.5" /> Pickup depot
              </label>
              <DepotSelectorBar
                ports={ports}
                value={portId}
                onClick={() => setPickerOpen(true)}
                onClear={() => setPortId(null)}
                id="consumer-depot-bar"
              />
              <button
                onClick={useMyLocation}
                disabled={locating}
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-600 dark:text-cyan-300 hover:underline disabled:opacity-50"
              >
                {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                Use my location to find the nearest depot
              </button>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                <Navigation className="w-3.5 h-3.5" /> Delivery address
              </label>
              <AddressAutocomplete
                value={address}
                portId={portId ?? undefined}
                onChange={(val, point) => {
                  setAddress(val);
                  if (point) setCoords(point);
                }}
                placeholder="House / street / landmark, then area or city"
              />
              {coords && (
                <p className="mt-1.5 text-[11px] text-slate-400 font-mono">
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="primary" className="flex-1" disabled={!canContinueAddress} onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                <Package className="w-3.5 h-3.5" /> Package type
              </label>
              <div className="flex flex-wrap gap-2">
                {PACKAGE_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setPackageType(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      packageType === t
                        ? 'bg-sky-500 text-white border-sky-500'
                        : 'bg-white/60 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-sky-400/50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  min={0}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 25"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Structured handling. These were a single free-text box, which
                meant the earnings and pricing models had to guess at intent from
                prose ("glass pls upright"). Picking chips makes the requirement
                explicit and machine-readable; the note below is still there for
                anything the chips cannot express. */}
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Handling
              </label>
              <div className="grid grid-cols-2 gap-2">
                {HANDLING_OPTIONS.map(opt => {
                  const on = flags.has(opt.id);
                  const Icon = HANDLING_ICON[opt.id];
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleFlag(opt.id)}
                      aria-pressed={on}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition ${
                        on
                          ? 'border-amber-400/60 bg-amber-500/10 ring-2 ring-amber-400/20'
                          : 'border-slate-200 dark:border-white/10 hover:border-amber-400/40'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          on ? 'text-amber-600 dark:text-amber-300' : 'text-slate-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-[11px] font-black leading-tight ${
                            on ? 'text-amber-800 dark:text-amber-200' : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {opt.label}
                        </p>
                        <p className="text-[9px] text-slate-400 truncate">{opt.hint}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <input
                value={handling}
                onChange={(e) => setHandling(e.target.value)}
                placeholder="Anything else the driver should know"
                className={`${inputCls} mt-2`}
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                <Clock className="w-3.5 h-3.5" /> Preferred delivery window
              </label>
              <div className="flex items-center gap-2">
                <input type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} className={`flex-1 ${inputCls} py-2.5`} />
                <span className="text-slate-400 text-xs">to</span>
                <input type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} className={`flex-1 ${inputCls} py-2.5`} />
              </div>
              {/* A window that has already closed would be scored as a late
                  delivery no matter how fast the driver is, so say so plainly
                  rather than accepting a booking that cannot succeed. */}
              {!windowOpen && (
                <p className="mt-2 flex items-start gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  This window has already passed today - it can never be counted as on-time.
                </p>
              )}
            </div>

            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Delivery speed
              </label>
              <div className="space-y-2">
                {TIER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setTier(opt.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition ${
                      tier === opt.id
                        ? 'border-sky-400 bg-sky-500/8 ring-2 ring-sky-400/20'
                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 grid place-items-center shrink-0 ${
                        tier === opt.id ? 'border-sky-500' : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {tier === opt.id && <div className="w-2 h-2 rounded-full bg-sky-500" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white">{opt.label}</span>
                        <TierBadge tier={opt.id} />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{opt.desc}</p>
                    </div>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200 shrink-0">
                      {opt.fee === 0 ? 'Free' : `₹${opt.fee}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-xl px-3.5 py-2.5">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => setStep(4)}>
                Review &amp; pay
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            {/* Order summary */}
            <div className="rounded-2xl liquid-glass border border-white/60 dark:border-white/10 p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Review
              </p>
              {[
                ['Pickup depot', selectedPort?.name ?? '—'],
                ['Deliver to', address.trim() || '—'],
                ['Package', packageType + (weight ? ` · ${weight} kg` : '')],
                ['Handling', flags.size ? [...flags].join(', ') : 'Standard handling'],
                ['Speed', TIER_OPTIONS.find(o => o.id === tier)?.label ?? tier],
                ['Window', `${windowStart} – ${windowEnd}`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start gap-3 text-xs">
                  <span className="text-slate-400 w-28 shrink-0">{k}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 break-words">{v}</span>
                </div>
              ))}
            </div>

            {/* Price. Server-quoted, so this is the amount that gets charged. */}
            <div className="rounded-2xl bg-sky-500/6 border border-sky-400/25 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-sky-600 dark:text-cyan-300" />
                <p className="text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-cyan-300">
                  Delivery charge
                </p>
              </div>
              {!estimate ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pricing your parcel…
                </div>
              ) : (
                <>
                  <ul className="space-y-1.5">
                    {estimate.lines.map(line => (
                      <li
                        key={line.label}
                        className={`flex items-center justify-between text-xs ${
                          line.emphasis ? 'font-black text-slate-900 dark:text-white pt-1.5 mt-1.5 border-t border-sky-400/20' : ''
                        }`}
                      >
                        <span className="text-slate-500 dark:text-slate-400">{line.label}</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                          {line.amount === 0 ? 'Free' : `₹${line.amount.toFixed(2)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {estimate.min_charge_applied && (
                    <p className="mt-2 text-[10px] text-slate-400">
                      A minimum charge applies to this parcel.
                    </p>
                  )}
                  <p className="mt-3 pt-2.5 border-t border-sky-400/20 text-lg font-black text-slate-900 dark:text-white tabular-nums">
                    ₹{estimate.total.toFixed(2)}
                  </p>
                </>
              )}
            </div>

            {error && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-xl px-3.5 py-2.5">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(3)} disabled={submitting || paying}>
                Back
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                isLoading={submitting || paying}
                disabled={submitting || paying || !estimate}
                onClick={placeAndPay}
                icon={<CreditCard className="w-4 h-4" />}
              >
                {estimate ? `Place order · ₹${estimate.total.toFixed(2)}` : 'Place order'}
              </Button>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              Your parcel is only released to the depot once payment is confirmed, and you can
              still cancel free of charge until a driver picks it up.
            </p>
          </div>
        )}
      </div>

      {pickerOpen && (
        <DepotPickerModal
          ports={ports}
          value={portId}
          onSelect={setPortId}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}