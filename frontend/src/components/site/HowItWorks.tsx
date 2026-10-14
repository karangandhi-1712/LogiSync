import { PackagePlus, Warehouse, Radio, CheckCircle2 } from 'lucide-react';
import { Eyebrow } from './index';

const STEPS = [
  {
    icon: PackageSearchIcon,
    title: 'Book',
    body: 'Pick an origin and destination, declare the weight and get an instant rate against live lane capacity.',
  },
  {
    icon: Warehouse,
    title: 'Pickup',
    body: 'A vehicle is allocated from the nearest depot. You get the driver name, number and ETA before it leaves.',
  },
  {
    icon: Radio,
    title: 'Track',
    body: 'Position updates every thirty seconds. The recipient can follow the same link without an account.',
  },
  {
    icon: CheckCircle2,
    title: 'Deliver',
    body: 'Proof of delivery with a signature or OTP closes the shipment and settles the invoice automatically.',
  },
];

function PackageSearchIcon(props: { className?: string }) {
  return <PackagePlus {...props} strokeWidth={1.5} />;
}

/**
 * Four steps on a single connected route line. The line is drawn in the SVG
 * behind the row so it reads as one journey rather than four cards, and it
 * stops at the last node instead of running off the edge.
 */
export function HowItWorks() {
  return (
    <section id="how" className="border-b border-[var(--lw-line)]">
      <div className="lw-container py-24 sm:py-28">
        <div className="max-w-2xl">
          <Eyebrow tone="teal">How it works</Eyebrow>
          <h2 className="lw-display lw-h2 mt-4 text-[var(--lw-ink)]">
            Four steps. One tracking ID.
          </h2>
        </div>

        <div className="relative mt-16">
          {/* Connector rail */}
          <svg
            viewBox="0 0 1000 40"
            preserveAspectRatio="none"
            className="absolute inset-x-0 top-[26px] hidden h-10 w-full lg:block"
            aria-hidden="true"
          >
            <line
              x1="40"
              y1="20"
              x2="960"
              y2="20"
              stroke="var(--lw-line)"
              strokeWidth="2"
            />
            {/* Completed portion, drawn in on scroll */}
            <line
              x1="40"
              y1="20"
              x2="960"
              y2="20"
              stroke="var(--lw-blue)"
              strokeWidth="2"
              strokeLinecap="round"
              pathLength={1}
              className="lw-draw"
              style={{ ['--len' as any]: 1, ['--delay' as any]: '300ms' }}
            />
          </svg>

          <ol className="grid gap-10 lg:grid-cols-4 lg:gap-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="lw-reveal relative">
                <div className="flex items-center gap-4 lg:block">
                  {/* Node sits on the rail on desktop, inline on mobile */}
                  <span className="relative z-10 grid size-[52px] shrink-0 place-items-center rounded-full border-2 bg-[var(--lw-surface)]"
                    style={{ borderColor: 'var(--lw-blue)' }}
                  >
                    <span
                      className="grid size-9 place-items-center rounded-full text-white"
                      style={{ background: 'var(--lw-blue)' }}
                    >
                      <step.icon className="size-[18px]" />
                    </span>
                  </span>

                  <div className="lg:mt-6">
                    <span className="lw-tnum text-[13px] font-semibold text-[var(--lw-blue)]">
                      0{i + 1}
                    </span>
                    <h3 className="mt-1 text-lg font-semibold text-[var(--lw-ink)]">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--lw-ink-3)]">{step.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
