import { Nav } from '../components/site/Nav';
import { Hero } from '../components/site/Hero';
import { Services } from '../components/site/Services';
import { HowItWorks } from '../components/site/HowItWorks';
import { Showcase } from '../components/site/Showcase';
import { Coverage } from '../components/site/Coverage';
import { SiteFooter } from '../components/site/SiteFooter';
import { TRUSTED_BY } from '../components/site/trustData';

/**
 * Trust strip. Sits directly under the hero so the page opens with the claim
 * and its evidence rather than burying it mid-scroll.
 */
function TrustBar() {
  return (
    <section className="border-b border-[var(--lw-line)] bg-[var(--lw-surface)]">
      <div className="lw-container py-10">
        <p className="text-center text-[13px] text-[var(--lw-ink-3)]">
          Trusted by{' '}
          <span className="lw-tnum font-semibold text-[var(--lw-ink-2)]">2,000+</span> businesses
          across the network
        </p>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {TRUSTED_BY.map((name) => (
            <li
              key={name}
              className="text-[15px] font-bold uppercase tracking-[0.12em] text-[var(--lw-ink-4)]"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function RoleSelectPage() {
  return (
    <div className="lw-root lw-shell">
      <a href="#main" className="lw-skip">
        Skip to content
      </a>

      <Nav />

      <main id="main" className="flex-1">
        <Hero />
        <TrustBar />
        <Services />
        <HowItWorks />
        <Showcase />
        <Coverage />
      </main>

      <SiteFooter />
    </div>
  );
}
