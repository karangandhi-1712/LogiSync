import { useNavigate } from 'react-router-dom';
import { MapPin, PackageCheck, Clock3, Building2 } from 'lucide-react';
import { FALLBACK_PORT_INFOS } from '../../data/ports';
import { Button, Card, Eyebrow } from './index';

/**
 * Replaces the invented quote calculator. Nothing here prices freight, because
 * the product does not price freight - it batches and dispatches deliveries.
 * These are the depots the platform actually runs on, read straight from the
 * same registry the app uses, with the corridors it maps.
 */
const CORRIDORS = ['NH-48', 'NH-44', 'NH-16', 'NH-6', 'SH-1'];

export function Coverage() {
  const navigate = useNavigate();
  const ports = FALLBACK_PORT_INFOS;
  const east = ports.filter((p) => p.coast === 'East').length;

  return (
    <section id="quote" className="border-b border-[var(--lw-line)]">
      <div className="lw-container py-24 sm:py-28">
        <div className="max-w-2xl">
          <Eyebrow>Coverage</Eyebrow>
          <h2 className="lw-display lw-h2 mt-4 text-[var(--lw-ink)]">
            Twelve depots on both coasts.
          </h2>
          <p className="lw-body mt-5 text-[var(--lw-ink-3)]">
            Each depot is a dispatch point with its own pending queue and its own driver pool.
            Batches are scoped to a radius around one, so a driver only ever sees work that
            runs out of their own port.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Depot table */}
          <Card flush className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Depots served, with corridor and coast</caption>
              <thead>
                <tr className="border-b border-[var(--lw-line)]">
                  {['Depot', 'City', 'Coast', 'Corridor'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-5 py-3 text-xs font-medium text-[var(--lw-ink-3)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--lw-line)]">
                {ports.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" className="px-5 py-3 text-left font-medium text-[var(--lw-ink)]">
                      {p.short}
                    </th>
                    <td className="px-5 py-3 text-[var(--lw-ink-3)]">
                      {p.city}
                      <span className="block text-xs text-[var(--lw-ink-4)]">{p.state}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-[var(--lw-ink-2)]">{p.coast}</span>
                    </td>
                    <td className="lw-tnum px-5 py-3 text-xs text-[var(--lw-ink-3)]">
                      {p.corridor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Summary */}
          <div className="space-y-5">
            <Card className="p-6">
              <dl className="grid grid-cols-2 gap-5">
                {[
                  { icon: Building2, v: String(ports.length), l: 'Depots' },
                  { icon: MapPin, v: String(east), l: 'East coast' },
                  { icon: PackageCheck, v: String(ports.length - east), l: 'West coast' },
                  { icon: Clock3, v: CORRIDORS.length.toString(), l: 'Highway corridors' },
                ].map((s) => (
                  <div key={s.l}>
                    <s.icon className="size-4 text-[var(--lw-ink-3)]" strokeWidth={1.5} />
                    <dt className="mt-2 flex items-baseline gap-1.5">
                      <span className="lw-display lw-tnum text-2xl text-[var(--lw-ink)]">
                        {s.v}
                      </span>
                      <span className="text-xs text-[var(--lw-ink-3)]">{s.l}</span>
                    </dt>
                  </div>
                ))}
              </dl>

              <div className="mt-6 border-t border-[var(--lw-line)] pt-5">
                <p className="text-[13px] text-[var(--lw-ink-3)]">
                  Corridors in service
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {CORRIDORS.map((c) => (
                    <li
                      key={c}
                      className="lw-tnum rounded border border-[var(--lw-line)] bg-[var(--lw-bg)] px-2 py-1 text-[11px] text-[var(--lw-ink-2)]"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-base font-semibold text-[var(--lw-ink)]">
                Not on a network yet?
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--lw-ink-3)]">
                Your depot can be onboarded with its own port, corridor and driver pool. Most
                go live in under two weeks.
              </p>
              <Button className="mt-5 w-full" onClick={() => navigate('/signup/consumer')}>
                Talk to us
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
