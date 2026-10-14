import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Package, CheckCircle2, Quote } from 'lucide-react';

/**
 * The 45% visual half of the login page.
 *
 * Hidden below `lg` - on a phone the form needs the full width and a decorative
 * map behind it just makes the fields harder to read.
 */
export function LoginVisual() {
  return (
    <div className="lw-on-navy relative hidden overflow-hidden bg-[var(--lw-navy)] lg:flex lg:flex-col lg:justify-between">
      {/* Brand */}
      <div className="relative z-10 p-12">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-[10px] bg-[var(--lw-blue)] text-white">
            <Package className="size-[18px]" strokeWidth={1.5} />
          </span>
          <span className="lw-display text-[19px] font-bold text-white">LogiSync</span>
        </Link>
      </div>

      {/* Map texture with the same route motif as the hero */}
      <svg
        viewBox="0 0 640 520"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 size-full opacity-70"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="lw-login-sky" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0B1B3A" />
            <stop offset="100%" stopColor="#071228" />
          </linearGradient>
        </defs>
        <rect width="640" height="520" fill="url(#lw-login-sky)" />

        <g stroke="#FFFFFF" strokeWidth="1" opacity=".04">
          {[80, 160, 240, 320, 400, 480].map((y) => (
            <line key={y} x1="0" y1={y} x2="640" y2={y} />
          ))}
          {[80, 160, 240, 320, 400, 480, 560].map((x) => (
            <line key={x} x1={x} y1="0" x2={x} y2="520" />
          ))}
        </g>

        {/* Three lanes at different phases so the panel feels live */}
        <g className="lw-draw" style={{ ['--len' as any]: 900, ['--delay' as any]: '200ms' }}>
          <path d="M40 200 C 160 120, 260 280, 380 210 S 540 120, 620 170" fill="none"
            stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="lw-flow">
          <path d="M40 200 C 160 120, 260 280, 380 210 S 540 120, 620 170" fill="none"
            stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
        </g>

        <g className="lw-draw" style={{ ['--len' as any]: 900, ['--delay' as any]: '600ms' }}>
          <path d="M20 380 C 180 330, 300 440, 460 372 S 580 320, 640 340" fill="none"
            stroke="#14B8A6" strokeWidth="1.75" strokeLinecap="round" />
        </g>
        <g className="lw-flow">
          <path d="M20 380 C 180 330, 300 440, 460 372 S 580 320, 640 340" fill="none"
            stroke="#5EEAD4" strokeWidth="1.75" strokeLinecap="round" />
        </g>

        <g className="lw-draw" style={{ ['--len' as any]: 700, ['--delay' as any]: '1000ms' }}>
          <path d="M60 300 C 200 260, 320 330, 470 286" fill="none"
            stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" opacity=".7" />
        </g>

        {(
          [
            [40, 200, '#60A5FA', 0],
            [620, 170, '#2DD4BF', 600],
            [20, 380, '#60A5FA', 300],
            [640, 340, '#2DD4BF', 900],
          ] as [number, number, string, number][]
        ).map(([cx, cy, color, delay]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r="14" fill={color} opacity=".35"
              className="lw-node-pulse" style={{ animationDelay: `${delay}ms` }} />
            <circle cx={cx} cy={cy} r="6" fill="#0B1B3A" stroke={color} strokeWidth="2.5" />
          </g>
        ))}
      </svg>

      {/* Floating live shipment card */}
      <div className="relative z-10 mx-12 mb-10 rounded-2xl border border-white/12 bg-white/[0.07] p-5 shadow-[0_24px_60px_-12px_rgba(2,8,23,0.6)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <span className="lw-badge lw-badge-teal">
            <span className="lw-dot" />
            Delivered
          </span>
          <span className="lw-tnum text-[11px] text-white/45">2 min ago</span>
        </div>

        <p className="lw-tnum mt-4 text-lg font-semibold text-white">LS-48291-IN</p>
        <p className="mt-1 text-sm text-white/60">Mundra → Indore</p>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
            <div
              className="h-full rounded-full"
              style={{ width: '100%', background: 'linear-gradient(90deg,#2563EB,#14B8A6)' }}
            />
          </div>
          <span className="lw-tnum text-[13px] font-semibold text-white">100%</span>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-white/50">
          <CheckCircle2 className="size-3.5 text-[#5EEAD4]" strokeWidth={1.5} />
          POD captured · invoice settled
        </p>
      </div>

      {/* Stat + quote */}
      <div className="relative z-10 px-12 pb-12">
        <p className="lw-display lw-tnum text-4xl text-white">
          2M<span className="text-[#5EEAD4]">+</span>
        </p>
        <p className="mt-1.5 text-sm text-white/55">shipments tracked every month</p>

        <blockquote className="mt-8 flex gap-3 border-l-2 border-[#14B8A6] pl-4">
          <Quote className="size-4 shrink-0 text-white/30" strokeWidth={1.5} aria-hidden />
          <p className="text-sm leading-6 text-white/65">
            We stopped asking where our trucks were. The portal answers it before the question
            is asked.
          </p>
        </blockquote>
      </div>
    </div>
  );
}

/** Security reassurance row, shown under the form on every breakpoint. */
export function SecurityRow() {
  return (
    <p className="flex items-center justify-center gap-2 text-[13px] text-[var(--lw-ink-3)]">
      <Lock className="size-3.5 shrink-0" strokeWidth={1.5} />
      256-bit encryption · SOC 2 Type II compliant
    </p>
  );
}

/** Divider with "or continue with", per the brief. */
export function OrDivider({ label = 'or continue with' }: { label?: string }) {
  return (
    <div className="relative my-6 flex items-center">
      <span className="h-px flex-1 bg-[var(--lw-line)]" />
      <span className="px-3 text-[13px] text-[var(--lw-ink-4)]">{label}</span>
      <span className="h-px flex-1 bg-[var(--lw-line)]" />
    </div>
  );
}

/** SSO buttons. Marked as not-yet-wired rather than faking a handler. */
export function SsoButtons({ onOtp }: { onOtp: () => void }) {
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => setNotice('Single sign-on is not enabled on this deployment yet.')}
        className="lw-btn lw-btn-secondary w-full"
      >
        <GoogleMark />
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => setNotice('Single sign-on is not enabled on this deployment yet.')}
        className="lw-btn lw-btn-secondary w-full"
      >
        <MicrosoftMark />
        Continue with Microsoft
      </button>

      <button type="button" onClick={onOtp} className="lw-btn lw-btn-ghost w-full">
        Sign in with OTP
      </button>

      <p role="status" aria-live="polite" className="min-h-[18px] text-center text-[13px] text-[var(--lw-ink-3)]">
        {notice}
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  );
}

export { Eye, EyeOff };
