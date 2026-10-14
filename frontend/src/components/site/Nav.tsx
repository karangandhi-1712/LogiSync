import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Anchor } from 'lucide-react';
import { Button } from './Button';

const LINKS = [
  { label: 'Solutions', href: '#services' },
  { label: 'Network', href: '#network' },
  { label: 'Pricing', href: '#quote' },
  { label: 'Resources', href: '#how' },
];

/**
 * Sticky navbar.
 *
 * Always a light frosted surface. This used to be transparent over the hero and
 * turn solid on scroll, with white text while transparent — but the hero is
 * light (`--lw-bg`), so at scrollY=0 the white wordmark and white links were
 * rendering on near-white and were invisible. There is no dark hero to go
 * transparent over any more, so the transparent state is gone entirely rather
 * than being re-tuned: one legible state beats two, one of which is broken.
 */
export function Nav() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock the page behind the mobile sheet so the page behind cannot scroll away.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const solid = menuOpen;

  return (
    <header
      className="fixed inset-x-0 top-0 z-[900] transition-colors duration-300"
      style={{
        background: 'rgba(255,255,255,0.86)',
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        borderBottom: `1px solid ${solid ? 'var(--lw-line)' : 'var(--lw-line-2)'}`,
      }}
    >
      {/* Brand sits hard against the viewport's top-left corner rather than
          inside the centred 1200px container the page sections use. */}
      <nav
        className="flex h-[76px] items-center gap-8 pl-5 pr-5 sm:pl-8 sm:pr-8"
        aria-label="Main"
      >
        <Link
          to="/"
          className="flex shrink-0 items-center gap-3"
          aria-label="LogiSync home"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-[var(--lw-blue)] text-white shadow-[var(--lw-shadow-2)]">
            <Anchor className="size-6" strokeWidth={1.5} />
          </span>
          <span
            className="lw-display text-[26px] font-bold leading-none"
            style={{ color: 'var(--lw-ink)' }}
          >
            LogiSync
          </span>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--lw-ink-2)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--lw-blue)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--lw-ink-2)')}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Track Shipment
          </Button>
          <Button onClick={() => navigate('/signup/consumer')}>Get a Quote</Button>
        </div>

        <button
          type="button"
          className="ml-auto grid size-11 place-items-center rounded-[10px] lg:hidden"
          style={{ color: 'var(--lw-ink)' }}
          aria-expanded={menuOpen}
          aria-controls="lw-mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile sheet */}
      {menuOpen && (
        <div
          id="lw-mobile-menu"
          className="border-t lg:hidden"
          style={{ borderColor: 'var(--lw-line)', background: '#fff' }}
        >
          <div className="lw-container space-y-1 py-4">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-3 text-base font-medium text-[var(--lw-ink)] transition-colors hover:bg-[var(--lw-line-2)]"
              >
                {l.label}
              </a>
            ))}
            <div className="space-y-2 pt-3">
              <Button
                className="w-full"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/signup/consumer');
                }}
              >
                Get a Quote
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
