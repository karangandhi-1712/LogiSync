import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerDriver } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { Anchor, Truck, Phone, Mail, Lock, User, Package, Snowflake, Construction, Fuel, Sun, Moon, Check, Circle, X } from 'lucide-react';

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
        <li key={t} className={`flex items-center gap-1.5 ${ok ? 'text-green-600 dark:text-green-400 font-semibold' : ''}`}>
          {ok ? <Check className="w-3.5 h-3.5 shrink-0" /> : <Circle className="w-3 h-3 shrink-0 text-slate-400" />}
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

const VEHICLE_TYPES = [
  { id: 'trailer', label: 'Trailer', icon: Truck },
  { id: 'container_truck', label: 'Container', icon: Package },
  { id: 'reefer_truck', label: 'Reefer', icon: Snowflake },
  { id: 'flatbed', label: 'Flatbed', icon: Construction },
  { id: 'tanker', label: 'Tanker', icon: Fuel },
];

const inputCls = 'w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-white/10 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:border-sky-600 focus:ring-sky-200 dark:focus:border-sky-400 dark:focus:ring-sky-500/30 transition [&>option]:text-slate-900';

export default function SignupPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [fullName, setFullName] = useState('');
  const [mobileLocal, setMobileLocal] = useState('');
  const [email, setEmail] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [vehicleType, setVehicleType] = useState('container_truck');
  const [photo, setPhoto] = useState('');
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
    if (!fullName || !mobileLocal || !email || !vehicle || !pw) { setMsg('Fill all required fields'); return; }
    if (mobileLocal.replace(/\D/g, '').replace(/^91/, '').length !== 10) { setMsg('Enter a valid 10-digit mobile number'); return; }
    if (pw !== pw2) { setMsg('Passwords do not match'); return; }
    setLoading(true);
    try {
      await registerDriver({
        full_name: fullName,
        vehicle_number: vehicle,
        vehicle_type: vehicleType,
        photo_url: photo || null,
        mobile: normalizedMobile(),
        email,
        password: pw,
      });
    // Send the new driver to their own login tab - do not auto-login,
    // so the account always lands on the job feed after sign-in.
    navigate('/login/driver', { state: { justRegistered: true } });
    } catch (e: any) { setMsg(JSON.stringify(e?.response?.data?.detail || 'Registration failed')); }
    finally { setLoading(false); }
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950">
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-800 flex items-center justify-center">
            <Anchor className="w-5 h-5 text-white" />
          </div>
        <span className="font-black tracking-wider text-slate-900 dark:text-white">LogiSync - Driver Signup</span>
        </Link>
        <button onClick={toggleTheme} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'} className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 text-slate-600 dark:text-white text-xs font-bold shadow-sm">{isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
      </header>
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 pb-8">
        <div className="w-full max-w-[640px] rounded-[2rem] bg-white/90 dark:bg-slate-950/85 backdrop-blur-2xl border border-slate-200/60 dark:border-white/15 shadow-[0_24px_70px_rgba(109,40,217,0.18)] dark:shadow-2xl p-7 sm:p-9 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase border bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:border-sky-400/30">Driver onboarding</div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Create driver account</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Account creation does not currently require one-time code verification.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" /><input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Driver full name *" className={inputCls} /></div>
            <div className="relative flex">
              <span className="inline-flex items-center px-3 rounded-l-2xl border border-r-0 border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 text-sm font-bold">+91</span>
              <div className="relative flex-1"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" /><input value={mobileLocal} onChange={e => setMobileLocal(e.target.value.replace(/[^\d]/g, '').slice(0, 10))} placeholder="10-digit mobile *" inputMode="numeric" className={`${inputCls} rounded-l-none pr-14`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 dark:text-slate-400">{normalizedMobile()}</span></div>
            </div>
            <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" /><input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email *" className={inputCls} /></div>
            <div className="relative"><Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" /><input value={vehicle} onChange={e => setVehicle(e.target.value.toUpperCase())} placeholder="Vehicle number (TN01AB1234) *" className={inputCls} /></div>
            <div className="relative sm:col-span-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Vehicle type *</div>
              <div className="flex gap-1.5">
                {VEHICLE_TYPES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setVehicleType(t.id)}
                    className={`flex-1 py-2 rounded-xl border text-center transition-all duration-150 ${
                      vehicleType === t.id
                      ? 'bg-sky-100 dark:bg-sky-500/15 border-sky-500 dark:border-sky-400'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 hover:border-sky-400'
                    }`}
                  >
                    <t.icon className={`w-5 h-5 mx-auto ${vehicleType === t.id ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500'}`} />
                    <div className="text-[8px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" /><input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password *" className={inputCls} /></div>
            <div className="relative sm:col-span-2"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" /><input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Confirm password *" className={inputCls} /></div>
            <input value={photo} onChange={e => setPhoto(e.target.value)} placeholder="Photo URL (optional)" className="sm:col-span-2 w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm" />
          </div>
          <Checklist pw={pw} />
          <div className={`text-xs font-semibold flex items-center gap-1.5 ${!pw2 ? 'text-slate-500 dark:text-slate-400' : pw === pw2 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {pw2 ? (pw === pw2 ? <><Check className="w-3.5 h-3.5" /><span>Passwords match</span></> : <><X className="w-3.5 h-3.5" /><span>Passwords do not match</span></>) : <span>Confirm your password above</span>}
          </div>
          <button disabled={loading} onClick={doRegister} className="w-full py-3 rounded-xl text-white text-sm font-bold bg-sky-700 hover:bg-sky-800 disabled:opacity-60 transition">{loading ? 'Creating account...' : 'Create account'}</button>
          {msg && <div className="text-xs font-medium text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/30 rounded-xl p-3">{msg}</div>}
          <div className="flex items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <Link to="/" className="hover:text-slate-800 dark:hover:text-white">Back to roles</Link>
            <span>•</span>
            <Link to="/login/driver" className="font-bold underline underline-offset-2 text-sky-700 dark:text-sky-300">Sign in</Link>
            <span>•</span>
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:underline">Terms</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
