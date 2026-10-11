import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { roleHome } from '../components/layout/ProtectedRoute';
import {
  ShieldCheck,
  Truck,
  Layers,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ArrowRight,
  Anchor,
  AlertCircle,
  Radio,
  Info,
  Zap,
  BarChart3,
  MapPin,
  Package,
  Users,
  Activity,
  ShoppingBag,
  Clock,
} from 'lucide-react';

interface RoleTheme {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  icon: typeof ShieldCheck;
  defaultEmail: string;
  infoNote?: string;
  iconBox: string;
  iconColor: string;
  badge: string;
  tabActive: string;
  tabIdle: string;
  btnGradient: string;
  inputFocus: string;
  orb1: string;
  orb2: string;
  orb3: string;
  pageBg: string;
  pageBgDark: string;
  topoStroke: string;
  topoStrokeDark: string;
  /* right-panel brand */
  panelBlobA: string;
  panelBlobB: string;
  panelBlobC: string;
  panelAccent: string;
  panelHeading: string;
  panelDesc: string;
  panelPills: { icon: typeof Zap; label: string }[];
}

const ROLES: Record<string, RoleTheme> = {
  port_admin: {
    id: 'port_admin',
    title: 'Port Admin',
    subtitle: 'Terminal Authority & Governance Center',
    tag: 'PORT AUTHORITY • MULTI-TERMINAL',
    icon: ShieldCheck,
    defaultEmail: 'admin@logisync.ai',
    iconBox: 'bg-amber-100 border-amber-300 dark:bg-amber-500/20 dark:border-amber-400/30',
    iconColor: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-400/30',
    tabActive: 'ring-1 ring-amber-400/50 bg-white/75 dark:bg-white/12 text-slate-900 dark:text-white border border-white/80 dark:border-white/18 backdrop-blur-xl shadow-[0_0_14px_rgba(217,119,6,0.35),inset_0_1px_0_rgba(255,255,255,0.75)]',
    tabIdle: 'text-slate-600 hover:text-slate-900 hover:bg-white/40 border border-transparent dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10',
    btnGradient: 'from-[#0b2a4a] via-[#166f9e] to-[#d4a017] hover:from-[#134e6f] hover:via-[#1a8fc1] hover:to-[#e8b923] shadow-[0_10px_30px_rgba(11,42,74,0.45)]',
    inputFocus: 'focus:border-amber-500 focus:ring-amber-200 dark:focus:border-amber-400 dark:focus:ring-amber-500/30',
    orb1: 'none', orb2: 'none', orb3: 'none',
    pageBg: 'linear-gradient(135deg,#081c33 0%,#0b2a4a 35%,#134e6f 60%,#e8dcc3 130%)',
    pageBgDark: 'radial-gradient(1200px 600px at 20% 10%,#b8860b33,transparent),radial-gradient(1000px 700px at 85% 90%,#166f9e55,transparent),linear-gradient(160deg,#040b16,#081c33 60%,#0b2a4a)',
    topoStroke: '#b8860b', topoStrokeDark: '#e8c547',
    panelBlobA: 'radial-gradient(ellipse 70% 55% at 20% 30%, rgba(180,120,0,0.38) 0%, transparent 70%)',
    panelBlobB: 'radial-gradient(ellipse 60% 60% at 80% 70%, rgba(11,42,74,0.58) 0%, transparent 65%)',
    panelBlobC: 'radial-gradient(ellipse 50% 40% at 55% 15%, rgba(22,111,158,0.38) 0%, transparent 70%)',
    panelAccent: 'text-amber-400',
    panelHeading: 'Govern every\nterminal.\nFrom one desk.',
    panelDesc: 'Full authority over 12 live port depots. Approve deliveries, manage users, and analyse network-wide performance in real time.',
    panelPills: [
      { icon: BarChart3, label: 'Live Analytics' },
      { icon: Users, label: 'User Management' },
      { icon: Activity, label: '12 Ports Active' },
    ],
  },
  fleet_manager: {
    id: 'fleet_manager',
    title: 'Fleet Manager',
    subtitle: 'Live Telematics & Port Ingress Command',
    tag: 'OPERATIONAL CLEARANCE • ASSIGNED PORT',
    icon: Truck,
    defaultEmail: 'manager@logisync.ai',
    infoNote: 'Fleet Manager accounts are created by the Port Admin. Sign in with the credentials assigned to your operational terminal.',
    iconBox: 'bg-emerald-100 border-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-400/30',
    iconColor: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/30',
    tabActive: 'ring-1 ring-emerald-400/50 bg-white/75 dark:bg-white/12 text-slate-900 dark:text-white border border-white/80 dark:border-white/18 backdrop-blur-xl shadow-[0_0_14px_rgba(52,211,153,0.35),inset_0_1px_0_rgba(255,255,255,0.75)]',
    tabIdle: 'text-slate-600 hover:text-slate-900 hover:bg-white/40 border border-transparent dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10',
    btnGradient: 'from-[#052e2b] via-[#12936f] to-[#a3e635] hover:from-[#0d5c46] hover:via-[#16b183] hover:to-[#bef264] shadow-[0_10px_30px_rgba(5,46,43,0.45)]',
    inputFocus: 'focus:border-emerald-500 focus:ring-emerald-200 dark:focus:border-lime-300 dark:focus:ring-lime-400/30',
    orb1: 'none', orb2: 'none', orb3: 'none',
    pageBg: 'linear-gradient(135deg,#04211f 0%,#052e2b 35%,#0d5c46 60%,#d9f99d 135%)',
    pageBgDark: 'radial-gradient(1100px 600px at 15% 15%,#a3e6352e,transparent),radial-gradient(900px 650px at 90% 85%,#12936f55,transparent),linear-gradient(160deg,#020f0e,#052e2b 60%,#07332f)',
    topoStroke: '#12936f', topoStrokeDark: '#a3e635',
    panelBlobA: 'radial-gradient(ellipse 65% 55% at 25% 35%, rgba(16,185,129,0.4) 0%, transparent 70%)',
    panelBlobB: 'radial-gradient(ellipse 55% 60% at 75% 65%, rgba(5,46,43,0.6) 0%, transparent 65%)',
    panelBlobC: 'radial-gradient(ellipse 50% 45% at 60% 10%, rgba(163,230,53,0.25) 0%, transparent 70%)',
    panelAccent: 'text-emerald-400',
    panelHeading: 'Coordinate your\nfleet.\nIn real time.',
    panelDesc: 'Live driver positions, batch dispatch, and depot ingress from a single operations board assigned to your terminal.',
    panelPills: [
      { icon: MapPin, label: 'Live Tracking' },
      { icon: Truck, label: 'Fleet Dispatch' },
      { icon: Zap, label: 'Instant Updates' },
    ],
  },
  driver: {
    id: 'driver',
    title: 'Driver',
    subtitle: 'Driver Dispatch & Route Execution',
    tag: 'LOGISTICS CLEARANCE • TRUCK & DRIVER',
    icon: Truck,
    defaultEmail: 'driver@logisync.ai',
    iconBox: 'bg-blue-100 border-blue-300 dark:bg-blue-500/20 dark:border-blue-400/30',
    iconColor: 'text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-400/30',
    tabActive: 'ring-1 ring-blue-400/50 bg-white/75 dark:bg-white/12 text-slate-900 dark:text-white border border-white/80 dark:border-white/18 backdrop-blur-xl shadow-[0_0_14px_rgba(59,130,246,0.35),inset_0_1px_0_rgba(255,255,255,0.75)]',
    tabIdle: 'text-slate-600 hover:text-slate-900 hover:bg-white/40 border border-transparent dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10',
    btnGradient: 'from-[#0f172a] via-[#1e3a8a] to-[#2563eb] hover:from-[#1e293b] hover:via-[#1d4ed8] hover:to-[#3b82f6] shadow-[0_10px_30px_rgba(15,23,42,0.45)]',
    inputFocus: 'focus:border-blue-500 focus:ring-blue-200 dark:focus:border-blue-400 dark:focus:ring-blue-500/30',
    orb1: 'none', orb2: 'none', orb3: 'none',
    pageBg: 'linear-gradient(135deg,#09131f 0%,#0f233a 35%,#1e3a8a 60%,#dbeafe 130%)',
    pageBgDark: 'radial-gradient(1100px 600px at 20% 10%,#2563eb33,transparent),radial-gradient(950px 650px at 85% 90%,#1e3a8a55,transparent),linear-gradient(160deg,#050b14,#0b1524 60%,#0f233a)',
    topoStroke: '#2563eb', topoStrokeDark: '#60a5fa',
    panelBlobA: 'radial-gradient(ellipse 65% 50% at 20% 30%, rgba(37,99,235,0.4) 0%, transparent 70%)',
    panelBlobB: 'radial-gradient(ellipse 60% 60% at 80% 70%, rgba(15,23,42,0.6) 0%, transparent 65%)',
    panelBlobC: 'radial-gradient(ellipse 55% 40% at 60% 5%, rgba(59,130,246,0.3) 0%, transparent 70%)',
    panelAccent: 'text-blue-400',
    panelHeading: 'Claim jobs.\nRun the route.\nClose every stop.',
    panelDesc: 'Dispatched delivery jobs broadcast the moment posted. One tap to claim, assigned route loaded, stops tracked to completion.',
    panelPills: [
      { icon: Package, label: 'Batch Jobs' },
      { icon: MapPin, label: 'Route Assigned' },
      { icon: Zap, label: 'Instant Broadcast' },
    ],
  },
  consumer: {
    id: 'consumer',
    title: 'Customer',
    subtitle: 'Request, Track & Follow Every Delivery',
    tag: 'CUSTOMER ACCOUNT • SELF-SIGNUP',
    icon: ShoppingBag,
    defaultEmail: 'customer@logisync.ai',
    infoNote: 'Create a free customer account to request deliveries, track them live on the map, and keep your full order history.',
    iconBox: 'bg-sky-100 border-sky-300 dark:bg-sky-500/20 dark:border-sky-400/30',
    iconColor: 'text-sky-700 dark:text-sky-300',
    badge: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-400/30',
    tabActive: 'ring-1 ring-sky-400/50 bg-white/75 dark:bg-white/12 text-slate-900 dark:text-white border border-white/80 dark:border-white/18 backdrop-blur-xl shadow-[0_0_14px_rgba(14,165,233,0.35),inset_0_1px_0_rgba(255,255,255,0.75)]',
    tabIdle: 'text-slate-600 hover:text-slate-900 hover:bg-white/40 border border-transparent dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10',
    btnGradient: 'from-[#083344] via-[#0e7490] to-[#38bdf8] hover:from-[#0c4a5e] hover:via-[#0891b2] hover:to-[#7dd3fc] shadow-[0_10px_30px_rgba(8,51,68,0.45)]',
    inputFocus: 'focus:border-sky-500 focus:ring-sky-200 dark:focus:border-sky-400 dark:focus:ring-sky-500/30',
    orb1: 'none', orb2: 'none', orb3: 'none',
    pageBg: 'linear-gradient(135deg,#082f49 0%,#0c4a6e 35%,#0e7490 60%,#bae6fd 130%)',
    pageBgDark: 'radial-gradient(1150px 620px at 18% 12%,#38bdf83d,transparent),radial-gradient(950px 650px at 88% 88%,#0e749066,transparent),linear-gradient(160deg,#020c17,#082f49 60%,#0c4a6e)',
    topoStroke: '#0ea5e9', topoStrokeDark: '#7dd3fc',
    panelBlobA: 'radial-gradient(ellipse 65% 55% at 22% 32%, rgba(14,165,233,0.42) 0%, transparent 70%)',
    panelBlobB: 'radial-gradient(ellipse 58% 60% at 78% 68%, rgba(8,51,68,0.6) 0%, transparent 65%)',
    panelBlobC: 'radial-gradient(ellipse 52% 42% at 58% 12%, rgba(56,189,248,0.3) 0%, transparent 70%)',
    panelAccent: 'text-sky-400',
    panelHeading: 'Send it.\nWatch it arrive.\nDoorstep.',
    panelDesc: 'Request a delivery from any of 12 port depots, follow your driver live on the map, and keep every order in one place.',
    panelPills: [
      { icon: Package, label: 'Request Delivery' },
      { icon: MapPin, label: 'Live Map Tracking' },
      { icon: Clock, label: 'Order History' },
    ],
  },
};

function normalizeRole(r?: string): string {
  if (r === 'dispatcher') return 'driver';
  if (r && r in ROLES) return r;
  return 'port_admin';
}

export default function LoginPage() {
  const { role: urlRole = 'port_admin' } = useParams();
  const initialRole = normalizeRole(urlRole);
  const [currentRole, setCurrentRole] = useState(initialRole);

  const { login, isLoading, error } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = (location.state as any)?.justRegistered === true;

  const currentTheme = ROLES[currentRole] || ROLES.port_admin;

  const [identifier, setIdentifier] = useState(currentTheme.defaultEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sync role when URL param changes
  useEffect(() => {
    const target = normalizeRole(urlRole);
    if (target !== currentRole) {
      handleTabSwitch(target);
    }
  }, [urlRole]);

  const DEMO_CREDS: Record<string, { email: string; pass: string }> = {
    port_admin: { email: 'admin@logisync.ai', pass: 'Admin@123' },
    fleet_manager: { email: 'manager@logisync.ai', pass: 'Manager@123' },
    driver: { email: 'driver@logisync.ai', pass: 'Driver@123' },
    consumer: { email: 'customer@logisync.ai', pass: 'Customer@123' },
  };

  function fillDemoCreds() {
    const cred = DEMO_CREDS[currentRole];
    if (cred) {
      setIdentifier(cred.email);
      setPassword(cred.pass);
    }
  }

  function handleTabSwitch(roleId: string) {
    const target = normalizeRole(roleId);
    setCurrentRole(target);
    navigate(`/login/${target}`, { replace: true });
    const targetTheme = ROLES[target];
    if (targetTheme) {
      setIdentifier(targetTheme.defaultEmail);
      setPassword(DEMO_CREDS[target]?.pass || '');
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const r = await login(identifier, password);
      const normalizedR = normalizeRole(r);
      const normalizedCurrent = normalizeRole(currentRole);
      // The account is authenticated either way - `login()` already stored the
      // token and user. Land on the console that actually matches the role and
      // let the toast explain the detour, instead of stranding the user on a
      // login form they have already passed.
      if (normalizedR !== normalizedCurrent) {
        const expected = ROLES[normalizedR]?.title || r.replace('_', ' ');
        showToast({
          type: 'warning',
          title: `Signed in as ${expected}`,
          message: `You opened the ${ROLES[normalizedCurrent]?.title || normalizedCurrent} tab, so we sent you to the ${expected} console instead.`,
          duration: 6000,
        });
      }
      navigate(roleHome(normalizedR), { replace: true });
    } catch {
      // error handled in AuthContext
    }
  }

  const [focusedField, setFocusedField] = useState<'identifier' | 'password' | null>(null);

  const RoleIcon = currentTheme.icon;

  const roleFocusColor = currentRole === 'port_admin'
    ? { ring: 'rgba(245, 158, 11, 0.65)', glow: 'rgba(245, 158, 11, 0.22)' }
    : currentRole === 'fleet_manager'
    ? { ring: 'rgba(16, 185, 129, 0.65)', glow: 'rgba(16, 185, 129, 0.22)' }
    : { ring: 'rgba(14, 165, 233, 0.65)', glow: 'rgba(14, 165, 233, 0.22)' };

  /* ── Apple Liquid Glass token set ── */
  const chipBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.62)';
  const chipBorder = isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.60)';
  const chipShadow = isDark
    ? 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 24px rgba(0,0,0,0.22)'
    : 'inset 0 1px 0 rgba(255,255,255,0.85), 0 4px 24px rgba(0,0,0,0.06)';

  const lg = {
    // Panel surface - slightly opaque frosted white / near-black with deep blur
    panel: isDark
      ? { background: 'rgba(12,12,18,0.86)', backdropFilter: 'blur(40px) saturate(160%)' }
      : { background: 'rgba(255,255,255,0.76)', backdropFilter: 'blur(40px) saturate(180%)' },
    // Chip - floating glass tile
    chip: isDark
      ? { background: chipBg, border: chipBorder, backdropFilter: 'blur(20px)', boxShadow: chipShadow }
      : { background: chipBg, border: chipBorder, backdropFilter: 'blur(20px)', boxShadow: chipShadow },
    // Input field with specular edge and role-colored ambient focus
    input: (isFocused: boolean) => (isDark
      ? {
          background: isFocused ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)',
          border: isFocused ? `1px solid ${roleFocusColor.ring}` : '1px solid rgba(255,255,255,0.11)',
          backdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: isFocused
            ? `inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.2), 0 0 0 1px ${roleFocusColor.ring}, 0 0 20px ${roleFocusColor.glow}`
            : 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.2)',
        }
      : {
          background: isFocused ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.65)',
          border: isFocused ? `1px solid ${roleFocusColor.ring}` : '1px solid rgba(255,255,255,0.60)',
          backdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: isFocused
            ? `inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(0,0,0,0.04), 0 0 0 1px ${roleFocusColor.ring}, 0 0 20px ${roleFocusColor.glow}`
            : 'inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -1px 0 rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)',
        }),
    // Pill - small rounded badge row
    pill: isDark
      ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }
      : { background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.50)', backdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.80)' },
    // Alert - tinted glass
    alertInfo: isDark
      ? { background: 'rgba(20,184,166,0.10)', border: '1px solid rgba(20,184,166,0.22)', backdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }
      : { background: 'rgba(204,251,241,0.55)', border: '1px solid rgba(20,184,166,0.28)', backdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.80)' },
    alertSuccess: isDark
      ? { background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)', backdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }
      : { background: 'rgba(209,250,229,0.58)', border: '1px solid rgba(16,185,129,0.28)', backdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.80)' },
    alertError: isDark
      ? { background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)', backdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }
      : { background: 'rgba(254,226,226,0.58)', border: '1px solid rgba(239,68,68,0.28)', backdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.80)' },
    alertWarn: isDark
      ? { background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.22)', backdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }
      : { background: 'rgba(254,243,199,0.58)', border: '1px solid rgba(245,158,11,0.28)', backdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.80)' },
    // Top/bottom bars
    bar: isDark
      ? { background: 'rgba(8,8,15,0.70)', backdropFilter: 'blur(28px)', borderColor: 'rgba(255,255,255,0.07)' }
      : { background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(28px)', borderColor: 'rgba(255,255,255,0.55)' },
  };

  return (
    <div className="relative min-h-screen flex overflow-hidden select-none bg-[var(--bg-canvas)] text-slate-900 dark:text-white">

      {/* Ambient liquid lighting underneath */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-20 w-[440px] h-[440px] rounded-full blur-[90px] opacity-35 dark:opacity-20 transition-all duration-1000"
          style={{ background: currentRole === 'port_admin' ? '#f59e0b' : currentRole === 'fleet_manager' ? '#10b981' : '#0284c7' }}
        />
        <div
          className="absolute bottom-10 left-32 w-[380px] h-[380px] rounded-full blur-[100px] opacity-25 dark:opacity-15 transition-all duration-1000"
          style={{ background: currentRole === 'port_admin' ? '#0284c7' : currentRole === 'fleet_manager' ? '#059669' : '#0369a1' }}
        />
      </div>

      {/* ══ LEFT PANEL ══ */}
      <div className="relative z-10 flex flex-col w-full lg:w-[480px] xl:w-[520px] shrink-0 min-h-screen border-r border-white/30 dark:border-white/6"
        style={lg.panel}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: lg.bar.borderColor, background: lg.bar.background, backdropFilter: lg.bar.backdropFilter }}>
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 p-[2px] shadow-lg shadow-sky-300/40 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full rounded-[10px] bg-white flex items-center justify-center">
                <Anchor className="w-4 h-4 text-sky-600 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <span className="text-base font-black tracking-wider">LogiSync</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md text-sky-600 dark:text-sky-300" style={lg.pill}>v2.0</span>
          </Link>
          <button onClick={toggleTheme} type="button" className="p-2 rounded-xl text-slate-500 dark:text-slate-300 transition-all hover:scale-105" style={lg.chip}>
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Form area */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-8 py-8">

          {/* Role tabs - liquid glass tube */}
          <div className="relative mb-5 p-1.5 rounded-2xl flex gap-1.5 overflow-hidden"
            style={{ ...lg.chip, backdropFilter: 'blur(24px)' }}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-white/80 via-white/20 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-white/60 via-white/10 to-transparent" />
            {Object.values(ROLES).map(role => {
              const TabIcon = role.icon;
              const isActive = role.id === currentRole;
              return (
                <button key={role.id} type="button" onClick={() => handleTabSwitch(role.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-300 ${
                    isActive ? `${role.tabActive} font-black` : role.tabIdle
                  }`}>
                  <TabIcon className="w-4 h-4" />
                  <span className="whitespace-nowrap">{role.title}</span>
                </button>
              );
            })}
          </div>

          {/* Card header */}
          <div className="mb-6">
            <div className="flex items-center gap-3.5">
              <div className="rounded-2xl flex items-center justify-center p-3 shrink-0" style={{ background: chipBg, border: chipBorder, backdropFilter: 'blur(16px)', boxShadow: chipShadow }}>
                <RoleIcon className={`w-6 h-6 ${currentTheme.panelAccent}`} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{currentTheme.title} Sign In</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{currentTheme.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400"
                style={lg.pill}>
                <Radio className="w-3 h-3 animate-pulse" />{currentTheme.tag}
              </div>
              <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3" /><span>256-BIT JWT</span>
              </div>
            </div>
          </div>

          {currentTheme.infoNote && (
            <div className="mb-5 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-teal-800 dark:text-teal-200" style={lg.alertInfo}>
              <Info className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" /><span className="leading-relaxed">{currentTheme.infoNote}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {justRegistered && (
              <div className="p-3.5 rounded-2xl text-xs text-emerald-800 dark:text-emerald-200" style={lg.alertSuccess}>Account created - sign in to open your dashboard.</div>
            )}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">{(currentRole === 'driver' || currentRole === 'dispatcher' || currentRole === 'consumer') ? 'Email or Mobile Number' : 'Official Email Address'}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500"><Mail className="w-4 h-4" /></div>
                <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                  onFocus={() => setFocusedField('identifier')}
                  onBlur={() => setFocusedField(null)}
                  placeholder={currentRole === 'port_admin' ? 'admin@logisync.ai' : currentRole === 'fleet_manager' ? 'e.g. manager@port.gov.in' : 'e.g. TN01AB1234 or email'}
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 text-sm font-medium focus:outline-none transition-all duration-200"
                  style={lg.input(focusedField === 'identifier')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500"><Lock className="w-4 h-4" /></div>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password" required
                  className="w-full pl-11 pr-11 py-3.5 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 text-sm font-medium focus:outline-none transition-all duration-200"
                  style={lg.input(focusedField === 'password')} />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 px-3 py-2.5 rounded-2xl" style={lg.pill}>
              <label className="flex items-center gap-2 cursor-pointer text-slate-500 dark:text-slate-400 select-none">
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-white/30 text-sky-500 focus:ring-sky-200 bg-white/40 dark:bg-white/10" />
                <span>Remember this terminal</span>
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">Local JWT</span>
            </div>

            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate mr-2">
                Demo: <span className="font-semibold text-slate-700 dark:text-slate-200">{DEMO_CREDS[currentRole]?.email}</span> / <span className="font-semibold text-slate-700 dark:text-slate-200">{DEMO_CREDS[currentRole]?.pass}</span>
              </div>
              <button
                type="button"
                onClick={fillDemoCreds}
                className="text-[11px] shrink-0 font-bold text-sky-600 dark:text-sky-400 hover:underline"
              >
                Autofill
              </button>
            </div>

              {error && (<div className="p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300" style={lg.alertError}><AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /><div className="flex-1 font-medium">{error}</div></div>)}
            {/* Submit - keep gradient, add glass sheen overlay */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg">
              <button type="submit" disabled={isLoading}
                className={`relative z-10 w-full py-3.5 px-4 rounded-xl text-white text-sm font-black tracking-wide flex items-center justify-center gap-2 bg-gradient-to-r ${currentTheme.btnGradient} transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 border border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]`}>
                {/* Glass sheen bar across the top half of the button */}
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/25 to-transparent" />
                {isLoading ? (<><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>Authenticating…</span></>) : (<><span>Enter Command Center</span><ArrowRight className="w-4 h-4" /></>)}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            {currentRole === 'consumer' ? (
              <p>New customer? <Link to="/signup/consumer" className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-bold underline underline-offset-2">Create a free account</Link></p>
            ) : (currentRole === 'driver' || currentRole === 'dispatcher') ? (
              <p>New driver? <Link to="/signup" className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-bold underline underline-offset-2">Create account with OTP</Link></p>
            ) : (
              <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">Role: <span className="text-slate-700 dark:text-slate-200 font-semibold">{currentTheme.title}</span></div>
            )}
            <Link to="/" className="hover:text-slate-800 dark:hover:text-white font-medium transition-colors flex items-center gap-1"><span>Browse all roles</span><span aria-hidden="true">→</span></Link>
          </div>
        </div>

        <div className="px-6 py-3 border-t flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500"
          style={{ borderColor: lg.bar.borderColor, background: lg.bar.background, backdropFilter: lg.bar.backdropFilter }}>
          <span>PORT CLEARANCE AUTHORITY • VOC THOOTHUKUDI</span>
          <div className="flex items-center gap-3">
            <Link to="/privacy" className="hover:underline text-slate-500 dark:text-slate-400 font-sans">Privacy</Link>
            <Link to="/terms" className="hover:underline text-slate-500 dark:text-slate-400 font-sans">Terms</Link>
            <span className="text-sky-600 dark:text-sky-400 font-semibold">LOGISYNC v2.0</span>
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL - Apple Liquid Glass Showcase ══ */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center p-8 xl:p-14"
        style={{ background: isDark ? 'linear-gradient(160deg,#080810 0%,#0d0d1a 40%,#111120 100%)' : 'linear-gradient(160deg,#d8e8f5 0%,#e5eef8 40%,#eef3fb 100%)' }}>

        {/* Animated colour blobs - change per role */}
        <div className="absolute inset-0 transition-all duration-1000"
          style={{ background: `${currentTheme.panelBlobA}, ${currentTheme.panelBlobB}, ${currentTheme.panelBlobC}` }} />

        {/* Noise overlay for film-grain depth */}
        <div className="absolute inset-0 opacity-[0.022] pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E')" }} />

        {/* Central Frosted Liquid Glass Card */}
        <div className="relative z-10 w-full max-w-lg p-8 sm:p-10 rounded-[2.5rem] transition-all duration-500"
          style={{
            background: isDark ? 'rgba(15, 18, 30, 0.45)' : 'rgba(255, 255, 255, 0.45)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.70)',
            backdropFilter: 'blur(30px) saturate(180%)',
            boxShadow: isDark
              ? 'inset 0 1px 0 rgba(255,255,255,0.18), 0 24px 60px rgba(0,0,0,0.45)'
              : 'inset 0 1px 0 rgba(255,255,255,0.95), 0 24px 60px rgba(15,23,42,0.08)',
          }}>
          <p className={`text-xs font-mono font-bold tracking-[0.22em] uppercase mb-4 ${currentTheme.panelAccent}`}>
            {currentTheme.title.toUpperCase()} PORTAL
          </p>
          <h2 className="text-3xl xl:text-[2.75rem] font-black text-slate-900 dark:text-white leading-[1.12] tracking-tight mb-4 whitespace-pre-line transition-all duration-700">
            {currentTheme.panelHeading}
          </h2>
          <p className="text-sm xl:text-[0.95rem] text-slate-600 dark:text-slate-300 leading-relaxed mb-7 transition-all duration-700">
            {currentTheme.panelDesc}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {currentTheme.panelPills.map(({ icon: PillIcon, label }) => (
              <div key={label} className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.65)',
                  border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.60)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.12)' : 'inset 0 1px 0 rgba(255,255,255,0.85)',
                }}>
                <PillIcon className={`w-3.5 h-3.5 ${currentTheme.panelAccent}`} />{label}
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-white/10 flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">12 PORTS CONNECTED</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">AES-256 ENCRYPTED</span>
          </div>
        </div>
      </div>
    </div>
  );
}

