import { useState } from 'react';
import { MapPin, Layers, Radio, BarChart3 } from 'lucide-react';
import { Eyebrow, Segmented } from './index';

/**
 * Product tabs that mirror screens the platform actually has, rather than
 * invented modules. Each entry names a real surface and shows the fields that
 * surface really works with.
 */
type Tab = 'dispatch' | 'driver' | 'tracking' | 'analytics';

const TABS: { value: Tab; label: string }[] = [
  { value: 'dispatch', label: 'Dispatch board' },
  { value: 'driver', label: 'Driver run' },
  { value: 'tracking', label: 'Customer tracking' },
  { value: 'analytics', label: 'Analytics' },
];

const PANELS: Record<
  Tab,
  { icon: typeof MapPin; heading: string; sub: string; rows: [string, string][]; unit: string }
> = {
  dispatch: {
    icon: Layers,
    heading: 'Delivery console',
    sub: 'Turn a cluster of pending requests into one batch',
    unit: 'batch',
    rows: [
      ['Area label', 'Mundra Industrial Belt'],
      ['Radius', '6 km'],
      ['Batch cap', '4 stops'],
      ['Depot', 'V.O. Chidambaranar'],
      ['Departure window', '06:00 - 09:00'],
      ['Requests in range', '4 of 11 pending'],
    ],
  },
  driver: {
    icon: Radio,
    heading: 'Stop checklist',
    sub: 'Fixed order once the driver departs',
    unit: 'stop',
    rows: [
      ['Stop 1', 'Kadachaneri, Thoothukudi'],
      ['Stop 2', 'Bryant Nagar, Thoothukudi'],
      ['Stop 3', 'Muthiahpuram, Ottapidaram'],
      ['Stop 4', 'Puthatham, Thoothukudi'],
      ['Completed', '2 of 4'],
      ['Earnings', 'Rs 1,140'],
    ],
  },
  tracking: {
    icon: MapPin,
    heading: 'Public tracking',
    sub: 'No account needed, one tracking ID',
    unit: 'shipment',
    rows: [
      ['Tracking ID', 'LS-48291-IN'],
      ['Origin', 'Mundra'],
      ['Destination', 'Indore'],
      ['Last signal', '2 min ago'],
      ['Mode', 'GPS'],
      ['Progress', '68%'],
    ],
  },
  analytics: {
    icon: BarChart3,
    heading: 'Network analytics',
    sub: 'Aggregates from the marketplace, not estimates',
    unit: 'metric',
    rows: [
      ['On-time rate', '98.7%'],
      ['Avg time to claim', '11 min'],
      ['Avg batch fill', '84%'],
      ['Driver utilisation', '73%'],
      ['Batches completed', '1,284'],
      ['Active drivers', '312'],
    ],
  },
};

export function Showcase() {
  const [tab, setTab] = useState<Tab>('dispatch');
  const panel = PANELS[tab];

  return (
    <section className="border-b border-[var(--lw-line)] bg-[var(--lw-surface)]">
      <div className="lw-container py-24 sm:py-28">
        <div className="max-w-2xl">
          <Eyebrow>The product</Eyebrow>
          <h2 className="lw-display lw-h2 mt-4 text-[var(--lw-ink)]">
            Four screens, one shipment record.
          </h2>
          <p className="lw-body mt-5 text-[var(--lw-ink-3)]">
            A request enters the queue, a fleet manager batches it, a driver claims the run and
            the customer watches it arrive. Every step writes to the same record, so there is one
            version of the truth from the depot gate to the doorstep.
          </p>
        </div>

        <div className="mt-10">
          <Segmented<Tab>
            options={TABS}
            value={tab}
            onChange={setTab}
            ariaLabel="Product screen"
            mode="tab"
            className="w-full sm:w-auto"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">
          {/* Screen preview */}
          <div className="overflow-hidden rounded-[16px] border border-[var(--lw-line)] bg-[var(--lw-bg)]">
            <div className="flex items-center gap-2 border-b border-[var(--lw-line)] px-4 py-3">
              <span className="size-2.5 rounded-full bg-[#FF5F57]" />
              <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="size-2.5 rounded-full bg-[#28C840]" />
              <span className="lw-tnum ml-3 text-[11px] text-[var(--lw-ink-4)]">
                logisync.io/{panel.unit}
              </span>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3">
                <span
                  className="grid size-10 place-items-center rounded-xl"
                  style={{ background: 'var(--lw-blue-soft)', color: 'var(--lw-blue)' }}
                >
                  <panel.icon className="size-5" strokeWidth={1.5} />
                </span>
                <div>
                  <p className="text-base font-semibold text-[var(--lw-ink)]">{panel.heading}</p>
                  <p className="text-[13px] text-[var(--lw-ink-3)]">{panel.sub}</p>
                </div>
              </div>

              <dl className="mt-6 divide-y divide-[var(--lw-line)] border-y border-[var(--lw-line)]">
                {panel.rows.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-sm text-[var(--lw-ink-3)]">{k}</dt>
                    <dd className="lw-tnum truncate text-sm font-medium text-[var(--lw-ink)]">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* What actually happens */}
          <div className="space-y-5">
            {[
              {
                t: 'Requests queue by depot',
                b: 'A customer picks a pickup port, enters an address and chooses a time window. Priority tier sets the fee.',
              },
              {
                t: 'Batching is radius-scoped',
                b: 'The fleet manager sets an area and radius. Only requests inside it can join the batch, and the cap is enforced before broadcast.',
              },
              {
                t: 'Claiming is atomic',
                b: 'The broadcast goes to available drivers. The first successful claim keeps the run; everyone else sees it leave their feed.',
              },
              {
                t: 'Departure locks the order',
                b: 'Once loaded and departed, stop sequence is fixed and every update pushes to the depot and the customer in real time.',
              },
            ].map((c) => (
              <div key={c.t} className="flex gap-3.5 border-l-2 border-[var(--lw-line)] pl-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--lw-ink)]">{c.t}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--lw-ink-3)]">{c.b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
