import { ArrowUpRight, Truck, PackageSearch, Warehouse, Shuffle } from 'lucide-react';
import { Card, Eyebrow } from './index';

const SERVICES = [
  {
    icon: Truck,
    title: 'Road Freight',
    body: 'Full-truckload and part-load across 19,000 km of highway, with live position on every vehicle.',
    metric: '19,000 km network',
  },
  {
    icon: PackageSearch,
    title: 'Express & Part-load',
    body: 'Palletised and loose cargo on scheduled daily departures, priced per running kilometre.',
    metric: 'Daily out, daily back',
  },
  {
    icon: Warehouse,
    title: 'Warehousing & Last-mile',
    body: 'Bonded storage, inventory control and doorstep delivery inside 180 pin codes.',
    metric: '180 pin codes',
  },
  {
    icon: Shuffle,
    title: 'Cross-dock Transloading',
    body: 'Port-to-depot and depot-to-depot transfers handled in under six hours.',
    metric: '< 6 hr turnaround',
  },
];

export function Services() {
  return (
    <section id="services" className="border-b border-[var(--lw-line)] bg-[var(--lw-surface)]">
      <div className="lw-container py-24 sm:py-28">
        <div className="max-w-2xl">
          <Eyebrow>What we move</Eyebrow>
          <h2 className="lw-display lw-h2 mt-4 text-[var(--lw-ink)]">
            Four services, one line of sight.
          </h2>
          <p className="lw-body mt-5 text-[var(--lw-ink-3)]">
            Whether it is a single pallet or a full container, the same tracking ID and the same
            live position follow it from pickup to proof of delivery.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <Card key={s.title} interactive className="lw-reveal flex flex-col p-6">
              <span
                className="grid size-11 place-items-center rounded-xl"
                style={{ background: 'var(--lw-blue-soft)', color: 'var(--lw-blue)' }}
              >
                <s.icon className="size-5" strokeWidth={1.5} />
              </span>

              <h3 className="mt-5 text-base font-semibold text-[var(--lw-ink)]">{s.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-[var(--lw-ink-3)]">{s.body}</p>

              <div className="mt-5 flex items-center justify-between border-t border-[var(--lw-line)] pt-4">
                <span className="lw-tnum text-[13px] font-medium text-[var(--lw-ink-2)]">
                  {s.metric}
                </span>
                <a
                  href="#quote"
                  className="flex items-center gap-1 text-[13px] font-semibold text-[var(--lw-blue)] transition-colors hover:text-[var(--lw-blue-hover)]"
                >
                  Learn more
                  <ArrowUpRight className="size-3.5" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
