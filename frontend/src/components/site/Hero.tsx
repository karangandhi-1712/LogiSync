import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Anchor } from 'lucide-react';
import type { PortInfo } from '../../data/ports';
import { factsFor } from './portFacts';
import { HeroNetwork } from './HeroNetwork';
import { Button } from './index';

/**
 * Hero. The whole of India sits behind the copy as a full-bleed map, faded out
 * under the headline by a left-to-right scrim so the type stays crisp while the
 * depots read as the subject of the page.
 *
 * The map is a background layer, not a panel in a column. It used to live in an
 * `aspect-square` box on the right, which forced Leaflet to fit a square and
 * therefore pulled the frame out past India into the Bay of Bengal and Malaysia.
 * Letting it span the full width means the aspect ratio suits India's real
 * proportions.
 *
 * Below `lg` the copy and the map stop sharing a frame — a full-bleed map behind
 * body text is unreadable on a phone — so the map drops into its own contained
 * panel underneath instead.
 *
 * Ports are standalone markers. Hovering one shows its name and a "View facts"
 * affordance; clicking opens a sheet centred on the page.
 */
export function Hero() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<PortInfo | null>(null);

  const facts = selected ? factsFor(selected) : null;

  return (
    <section className="relative isolate overflow-hidden bg-[var(--lw-bg)]">
      {/* ── Map background (desktop) ──────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
        <HeroNetwork
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
          className="pointer-events-auto"
        />
      </div>

      {/* Scrim. Two gradients: one horizontal that clears the copy column, one
          vertical that dissolves the map into the next section so the tile
          edges never show as a hard rectangle. */}
      <div
        className="pointer-events-none absolute inset-0 hidden lg:block"
        aria-hidden
        style={{
          background:
            'linear-gradient(90deg, var(--lw-bg) 0%, var(--lw-bg) 30%, rgba(246,248,251,0.86) 44%, rgba(246,248,251,0.35) 62%, rgba(246,248,251,0.55) 100%),' +
            'linear-gradient(180deg, rgba(246,248,251,0.92) 0%, rgba(246,248,251,0) 22%, rgba(246,248,251,0) 68%, var(--lw-bg) 100%)',
        }}
      />

      <div className="lw-container relative z-10 grid items-center gap-12 py-20 lg:min-h-[720px] lg:grid-cols-2 lg:gap-16 lg:py-28">
        {/* ── Copy ─────────────────────────────────────────────── */}
        <div className="lg:max-w-[38rem]">
          <p className="lw-eyebrow text-[var(--lw-blue)]">Port logistics operations</p>

          <h1 className="lw-display lw-h1 mt-5 text-[var(--lw-ink)]">
            Every port.
            <br />
            Every batch.
            <br />
            <span className="text-[var(--lw-blue)]">Every doorstep.</span>
          </h1>

          <p className="lw-body mt-6 max-w-lg text-[var(--lw-ink-2)]">
            LogiSync coordinates delivery requests across twelve Indian ports — batching
            nearby stops into optimised runs, dispatching drivers, and tracking each parcel
            live until it reaches the door.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => navigate('/login')} trailingIcon={<ArrowRightIcon />}>
              Sign in
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('/signup/consumer')}>
              Request a delivery
            </Button>
          </div>

          <dl className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-3 border-t border-[var(--lw-line)] pt-7">
            {[
              ['12', 'ports'],
              ['2', 'coastlines'],
              ['1', 'console'],
            ].map(([v, l]) => (
              <div key={l} className="flex items-baseline gap-2">
                <dt className="lw-tnum text-sm font-semibold text-[var(--lw-ink)]">{v}</dt>
                <dd className="text-xs text-[var(--lw-ink-3)]">{l}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-[13px] text-[var(--lw-ink-3)]">
            Hover a port on the map for its reference card.
          </p>
        </div>

        {/* Desktop leaves the right half to the map itself. */}
        <div className="hidden lg:block" aria-hidden />
      </div>

      {/* ── Map panel (mobile) ────────────────────────────────────── */}
      <div className="relative z-10 lg:hidden">
        <div className="lw-container pb-16">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[16px] border border-[var(--lw-line)] shadow-[var(--lw-shadow-2)]">
            <HeroNetwork selectedId={selected?.id ?? null} onSelect={setSelected} />
          </div>
          <p className="mt-3 text-center text-[11px] text-[var(--lw-ink-4)]">
            12 major ports · India
          </p>
        </div>
      </div>

      {/* Desktop caption, floated over the map rather than under a panel. */}
      <p className="pointer-events-none absolute bottom-10 right-8 z-10 hidden items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-[11px] text-[var(--lw-ink-3)] shadow-[var(--lw-shadow-2)] backdrop-blur-md lg:inline-flex">
        12 major ports · India
      </p>

      {/* Port fact sheet, centred on the page */}
      {selected && facts && (
        <div className="fixed inset-0 z-[1000] grid place-items-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSelected(null)}
            className="absolute inset-0 bg-[#0B1B3A]/40"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.name} facts`}
            className="relative w-full max-w-md rounded-[16px] border border-[var(--lw-line)] bg-[var(--lw-surface)] p-6 shadow-[var(--lw-shadow-3)]"
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close facts"
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-[var(--lw-ink-3)] hover:bg-[var(--lw-line-2)] hover:text-[var(--lw-ink)]"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--lw-blue-soft)] text-[var(--lw-blue)]">
                <Anchor className="size-5" strokeWidth={1.5} />
              </span>
              <div className="min-w-0 pr-8">
                <p className="lw-display text-lg leading-tight text-[var(--lw-ink)]">
                  {selected.short}
                </p>
                <p className="text-[13px] text-[var(--lw-ink-3)]">
                  {selected.city}, {selected.state}
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-[var(--lw-ink-2)]">{facts.known}</p>

            <dl className="mt-5 divide-y divide-[var(--lw-line)] border-y border-[var(--lw-line)]">
              {[
                ['UN/LOCODE', facts.locode],
                ['Major port since', facts.since],
                ['Cargo FY 2024-25', facts.cargo],
                ['Share', facts.share],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-[13px] text-[var(--lw-ink-3)]">{k}</dt>
                  <dd className="lw-tnum text-[13px] font-medium text-[var(--lw-ink)]">{v}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 text-[11px] leading-5 text-[var(--lw-ink-4)]">
              Corridor: {selected.corridor}
            </p>

            <div className="mt-5 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setSelected(null);
                  navigate('/login/fleet_manager');
                }}
              >
                Dispatch from here
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setSelected(null);
                  navigate('/login');
                }}
              >
                Sign in
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}