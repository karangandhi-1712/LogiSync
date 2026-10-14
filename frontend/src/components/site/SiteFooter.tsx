import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Anchor, ArrowRight } from 'lucide-react';
import { Button, Input } from './index';

const COLUMNS = [
  {
    title: 'Services',
    links: ['Road Freight', 'Express & Part-load', 'Warehousing', 'Cross-dock'],
  },
  {
    title: 'Platform',
    links: ['Live Tracking', 'Analytics', 'Documents', 'Billing'],
  },
  {
    title: 'Company',
    links: ['About', 'Careers', 'Press', 'Contact'],
  },
  {
    title: 'Support',
    links: ['Help centre', 'Track a shipment', 'Raise a claim', 'Status'],
  },
];

/**
 * Brand glyphs are hand-drawn here: lucide removed third-party logos in v1 for
 * trademark reasons, and these four are the entire social set.
 */
const SOCIAL_PATHS: { label: string; d: string }[] = [
  { label: 'LogiSync on LinkedIn', d: 'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm6 0h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05 4.02 0 4.76 2.6 4.76 5.99V21h-4v-5.6c0-1.34-.03-3.06-1.9-3.06-1.9 0-2.19 1.46-2.19 2.96V21H9V9Z' },
  { label: 'LogiSync on X', d: 'M17.53 3h3.1l-6.77 7.74L21.75 21h-6.23l-4.88-6.38L5.1 21H2l7.24-8.28L2.5 3h6.39l4.42 5.83L17.53 3Zm-1.09 16.13h1.72L7.63 4.78H5.79l10.65 14.35Z' },
  { label: 'LogiSync on YouTube', d: 'M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.86 4 12 4 12 4s-6.86 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42C1 8.15 1 12 1 12s0 3.85.46 5.58a2.78 2.78 0 0 0 1.95 1.96C5.14 20 12 20 12 20s6.86 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96C23 15.85 23 12 23 12s0-3.85-.46-5.58ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z' },
  { label: 'LogiSync on GitHub', d: 'M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z' },
];

const BADGES = ['ISO 27001', 'SOC 2 Type II', 'GDPR', 'TISAX'];

export function SiteFooter() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'done' | 'error'>('idle');

  function subscribe(e: React.FormEvent) {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    setStatus(ok ? 'done' : 'error');
    if (ok) setEmail('');
  }

  return (
    <footer className="border-t border-[var(--lw-line)] bg-[var(--lw-surface)]">
      <div className="lw-container py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2.6fr]">
          {/* Brand + newsletter */}
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-[10px] bg-[var(--lw-blue)] text-white">
                <Anchor className="size-[18px]" strokeWidth={1.5} />
              </span>
              <span className="lw-display text-[19px] font-bold text-[var(--lw-ink)]">
                LogiSync
              </span>
            </Link>

            <p className="mt-4 max-w-xs text-sm leading-6 text-[var(--lw-ink-3)]">
              Road freight with one tracking ID and one live position, from the depot gate to the
              doorstep.
            </p>

            <form onSubmit={subscribe} noValidate className="mt-6 max-w-sm">
              <label htmlFor="nl-email" className="text-[13px] font-semibold text-[var(--lw-ink)]">
                Lane rate alerts
              </label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="nl-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status !== 'idle') setStatus('idle');
                  }}
                  invalid={status === 'error'}
                  placeholder="you@company.com"
                  autoComplete="email"
                  aria-describedby="nl-status"
                  className="h-11"
                />
                <Button type="submit" className="h-11 shrink-0" aria-label="Subscribe">
                  <ArrowRight className="size-4" />
                </Button>
              </div>
              <p
                id="nl-status"
                role="status"
                className="mt-2 min-h-[20px] text-[13px]"
                style={{
                  color:
                    status === 'error' ? 'var(--lw-red)' : 'var(--lw-ink-3)',
                }}
              >
                {status === 'done' && 'Subscribed. We will only email when a lane rate changes.'}
                {status === 'error' && 'Enter a valid email address.'}
              </p>
            </form>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-[13px] font-semibold text-[var(--lw-ink)]">{col.title}</h3>
                <ul className="mt-3 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l}>
                      <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="text-sm text-[var(--lw-ink-3)] transition-colors hover:text-[var(--lw-blue)]"
                      >
                        {l}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance + socials */}
        <div className="mt-14 flex flex-col gap-6 border-t border-[var(--lw-line)] pt-8 lg:flex-row lg:items-center lg:justify-between">
          <ul className="flex flex-wrap items-center gap-2.5">
            {BADGES.map((b) => (
              <li
                key={b}
                className="rounded-md border border-[var(--lw-line)] bg-[var(--lw-bg)] px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-[var(--lw-ink-3)]"
              >
                {b}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            {SOCIAL_PATHS.map((s) => (
              <a
                key={s.label}
                href="#"
                aria-label={s.label}
                onClick={(e) => e.preventDefault()}
                className="grid size-11 place-items-center rounded-lg text-[var(--lw-ink-3)] transition-colors hover:bg-[var(--lw-line-2)] hover:text-[var(--lw-ink)]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-[18px]"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d={s.d} />
                </svg>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 text-[13px] text-[var(--lw-ink-4)] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 LogiSync Logistics Pvt Ltd. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/privacy" className="transition-colors hover:text-[var(--lw-ink)]">
              Privacy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-[var(--lw-ink)]">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
