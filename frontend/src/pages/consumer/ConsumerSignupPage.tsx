// ─── ConsumerSignupPage - customer self-signup ──────────────────────────────
// No vehicle fields, no OTP: name + mobile + email + password. Signing up with a
// mobile that already has guest orders claims them, so the customer's history is
// there on first login rather than starting empty.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerConsumer } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Anchor, Mail, Lock, User, Phone, ShoppingBag, Sun, Moon, Check, Circle } from 'lucide-react';

function Checklist({ pw }: { pw: string }) {
  const items = [
    ['Minimum 8 characters', pw.length >= 8],
    ['At least one uppercase letter', /[A-Z]/.test(pw)],
    ['At least one number', /\d/.test(pw)],
    ['At least one special character', /[^A-Za-z0-9]/.test(pw)],
  ] as const;
  return (
    <ul className="text-xs space-y-1.5 text-slate-500 dark:text-slate-400">
      {items.map(([t, ok]) => (
        <li key={t} className={`flex items-center gap-1.5 ${ok ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}>
          {ok ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Circle className="w-3 h-3 shrink-0 text-slate-400" />}
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

const inputCls =
  'w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-4 focus:border-sky-500 focus:ring-sky-200 dark:focus:border-sky-400 dark:focus:ring-sky-500/30 transition';

export default function ConsumerSignupPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { adoptSession } = useAuth();
  const [fullName, setFullName] = useState('');
  const [mobileLocal, setMobileLocal] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  function normalizedMobile() {
    const digits = mobileLocal.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    return `+91${digits}`;
  }

  async function doRegister() {
    setMsg('');
    if (!fullName.trim() || !mobileLocal || !email.trim() || !pw) {
      setMsg('Fill all required fields');
      return;
    }
    if (mobileLocal.replace(/\D/g, '').replace(/^91/, '').length !== 10) {
      setMsg('Enter a valid 10-digit mobile number');
      return;
    }
    if (pw !== pw2) {
      setMsg('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await registerConsumer({
        full_name: fullName.trim(),
        mobile: normalizedMobile(),
        email: email.trim(),
        password: pw,
      });
      // Sign in straight away - a customer who just signed up should land in the
      // portal, not be bounced to a login form they already have the answer to.
      await adoptSession(res.access_token);
      navigate('/consumer/orders', { replace: true });
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (detail?.password_errors) setMsg(detail.password_errors.join(' · '));
      else setMsg(typeof detail === 'string' ? detail : 'Could not create your account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${isDark ? 'bg-[#04121f]' : 'bg-[#f0f9ff]'}`}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle,#38bdf8,transparent 65%)' }} />
        <div className="absolute bottom-0 right-0 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle,#0e7490,transparent 65%)' }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <Link to="/login/consumer" className={`inline-flex items-center gap-2 text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            <Anchor className="w-3.5 h-3.5" /> Back to sign in
          </Link>
          <button onClick={toggleTheme} className={`p-2 rounded-xl text-xs ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-500/10'}`} aria-label="Toggle theme">
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
          </button>
        </div>

        <div className={`rounded-2xl p-7 sm:p-8 shadow-2xl border backdrop-blur-xl ${isDark ? 'bg-white/[0.05] border-white/10' : 'bg-white border-gray-200/60'}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-600'}`}>
            <ShoppingBag className="w-6 h-6" />
          </div>

          <h1 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Create your customer account</h1>
          <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Request deliveries, track them live on the map, and keep every order in one place.
          </p>

          <div className="mt-6 space-y-3.5">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input className={inputCls} placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <span className={`absolute left-10 top-1/2 -translate-y-1/2 text-sm font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>+91</span>
              <input
                className={`${inputCls} pl-[4.25rem]`}
                placeholder="Mobile number"
                inputMode="numeric"
                maxLength={12}
                value={mobileLocal}
                onChange={(e) => setMobileLocal(e.target.value.replace(/[^\d]/g, ''))}
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="email" className={inputCls} placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="password" className={inputCls} placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="password" className={inputCls} placeholder="Confirm password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
          </div>

          <div className="mt-3.5">
            <Checklist pw={pw} />
          </div>

          {msg && (
            <p className="mt-4 text-xs font-bold text-rose-600 dark:text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-xl px-3.5 py-2.5">
              {msg}
            </p>
          )}

          <button
            onClick={doRegister}
            disabled={loading}
            className="mt-5 w-full py-3 px-4 rounded-xl text-white text-sm font-black tracking-wide flex items-center justify-center gap-2
                       bg-gradient-to-r from-[#083344] via-[#0e7490] to-[#38bdf8] hover:from-[#0c4a5e] hover:via-[#0891b2] hover:to-[#7dd3fc]
                       shadow-[0_10px_30px_rgba(8,51,68,0.45)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <div className={`mt-5 pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-100'} flex items-center justify-center gap-4 text-xs`}>
            <Link to="/privacy" className="text-slate-500 hover:underline">Privacy policy</Link>
            <span className="text-slate-400">•</span>
            <Link to="/terms" className="text-slate-500 hover:underline">Terms of service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}