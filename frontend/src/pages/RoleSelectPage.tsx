import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Truck,
  ArrowRight,
  Anchor,
  Moon,
  Sun,
  Radio,
  ShoppingBag,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/* ─── ROLE CARDS DATA ─────────────────────────────────────────────────── */
const ROLES = [
  {
    id: 'port_admin',
    title: 'Port Admin',
    desc: 'Manage user access and review port operations.',
    tag: 'Full Port Authority',
    icon: ShieldCheck,
    // Light mode palette
    lightGradient: 'from-slate-50 to-white',
    lightBorder: 'border-blue-200/60',
    lightHover: 'hover:border-blue-400 hover:shadow-[0_8px_40px_rgba(59,130,246,0.25)]',
    lightAccent: 'text-blue-600',
    lightIconBg: 'bg-blue-100 text-blue-600',
    lightTagBg: 'bg-blue-50 text-blue-700 border-blue-200',
    // Dark mode palette
    darkGradient: 'dark:from-slate-900 dark:to-slate-900',
    darkBorder: 'dark:border-cyan-400/25',
    darkHover: 'dark:hover:border-cyan-300 dark:hover:shadow-[0_8px_50px_rgba(6,182,212,0.35)]',
    darkAccent: 'dark:text-cyan-300',
    darkIconBg: 'dark:bg-cyan-500/20 dark:text-cyan-300',
    darkTagBg: 'dark:bg-cyan-500/15 dark:text-cyan-200 dark:border-cyan-400/30',
    subtext: 'admin@logisync.ai',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'fleet_manager',
    title: 'Fleet Manager',
    desc: 'Create delivery batches and coordinate drivers at your assigned port.',
    tag: 'Operational Control',
    icon: Truck,
    lightGradient: 'from-slate-50 to-white',
    lightBorder: 'border-emerald-200/60',
    lightHover: 'hover:border-emerald-400 hover:shadow-[0_8px_40px_rgba(16,185,129,0.25)]',
    lightAccent: 'text-emerald-600',
    lightIconBg: 'bg-emerald-100 text-emerald-600',
    lightTagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    darkGradient: 'dark:from-slate-900 dark:to-slate-900',
    darkBorder: 'dark:border-teal-400/25',
    darkHover: 'dark:hover:border-teal-300 dark:hover:shadow-[0_8px_50px_rgba(20,184,166,0.35)]',
    darkAccent: 'dark:text-teal-300',
    darkIconBg: 'dark:bg-teal-500/20 dark:text-teal-300',
    darkTagBg: 'dark:bg-teal-500/15 dark:text-teal-200 dark:border-teal-400/30',
    subtext: 'Provisioned by Port Admin',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'driver',
    title: 'Driver',
    desc: 'Review available delivery batches and update stop statuses.',
    tag: 'Last-Mile Delivery',
    icon: Truck,
    lightGradient: 'from-slate-50 to-white',
    lightBorder: 'border-sky-200/60',
    lightHover: 'hover:border-sky-400 hover:shadow-[0_8px_40px_rgba(14,165,233,0.25)]',
    lightAccent: 'text-sky-700',
    lightIconBg: 'bg-sky-100 text-sky-700',
    lightTagBg: 'bg-sky-50 text-sky-800 border-sky-200',
    darkGradient: 'dark:from-slate-900 dark:to-slate-900',
    darkBorder: 'dark:border-sky-400/25',
    darkHover: 'dark:hover:border-sky-300 dark:hover:shadow-[0_8px_50px_rgba(14,165,233,0.35)]',
    darkAccent: 'dark:text-sky-300',
    darkIconBg: 'dark:bg-sky-500/20 dark:text-sky-300',
    darkTagBg: 'dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-400/30',
    subtext: 'Self-signup with OTP',
    gradient: 'from-sky-600 to-sky-600',
  },
  {
    id: 'consumer',
    title: 'Customer',
    desc: 'Place delivery requests and follow their status from your account.',
    tag: 'Order & Track',
    icon: ShoppingBag,
    lightGradient: 'from-sky-500/10 via-cyan-500/5 to-blue-500/10',
    lightBorder: 'border-sky-200/60',
    lightHover: 'hover:border-sky-400 hover:shadow-[0_8px_40px_rgba(14,165,233,0.25)]',
    lightAccent: 'text-sky-600',
    lightIconBg: 'bg-sky-100 text-sky-600',
    lightTagBg: 'bg-sky-50 text-sky-700 border-sky-200',
    darkGradient: 'dark:from-slate-900 dark:to-slate-900',
    darkBorder: 'dark:border-cyan-400/25',
    darkHover: 'dark:hover:border-cyan-300 dark:hover:shadow-[0_8px_50px_rgba(34,211,238,0.35)]',
    darkAccent: 'dark:text-cyan-300',
    darkIconBg: 'dark:bg-cyan-500/20 dark:text-cyan-300',
    darkTagBg: 'dark:bg-cyan-500/15 dark:text-cyan-200 dark:border-cyan-400/30',
    subtext: 'Free self-signup',
    gradient: 'from-sky-500 to-cyan-600',
  },
];

/* ─── COMPONENT ───────────────────────────────────────────────────────── */
export default function RoleSelectPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className={`role-select-page relative min-h-screen flex flex-col overflow-hidden select-none ${isDark ? 'rs-dark' : 'rs-light'}`}>
      {/* ─── BACKGROUND CANVAS ────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-950/30" />
      </div>

      {/* ─── TOP HEADER ───────────────────────────────────────────────── */}
      <header className={`rs-header relative z-20 w-full px-5 sm:px-8 py-3.5 flex items-center justify-between
        ${isDark
          ? 'bg-slate-900/60 border-b border-white/10 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.3)]'
          : 'bg-white/60 border-b border-gray-200/60 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.05)]'
        }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-800 flex items-center justify-center">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-black tracking-wide ${isDark ? 'text-white' : 'text-gray-900'}`}>
                LogiSync
              </span>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border
                ${isDark
                  ? 'bg-cyan-400/15 text-cyan-300 border-cyan-400/30'
                  : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}>
                v2.0
              </span>
            </div>
            <div className={`text-[10px] font-medium ${isDark ? 'text-cyan-200/60' : 'text-gray-500'}`}>
              Port logistics operations
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-xs font-medium text-slate-500 dark:text-slate-400">
            Select an account type
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            className={`p-2.5 rounded-xl border transition-all duration-300
              ${isDark
                ? 'bg-white/[0.06] hover:bg-white/[0.12] text-amber-300 border-white/15 hover:border-amber-400/40 hover:shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                : 'bg-white/70 hover:bg-white text-indigo-500 border-gray-200 hover:border-indigo-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]'
              }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-5 sm:px-8 py-8 sm:py-12">
        <div className="w-full max-w-5xl">

          {/* ─── HERO SECTION ─────────────────────────────────────────── */}
          <div className="text-center mb-10 sm:mb-14">
            <h1 className={`text-3xl sm:text-4xl lg:text-[3.25rem] font-black tracking-tight leading-[1.1] mb-4
              ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Choose your account type
            </h1>

            <p className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed
              ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Port administrators, fleet managers, and drivers use their work accounts. Customers can create an account to place and track deliveries.
            </p>
          </div>

          {/* ─── ROLE CARDS ───────────────────────────────────────────── */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
            {ROLES.map(r => (
              <button
                key={r.id}
                onClick={() => navigate(`/login/${r.id}`)}
                className={`rs-role-card group relative rounded-xl p-6 sm:p-7 text-left transition-colors flex flex-col justify-between border bg-white dark:bg-slate-900
                  ${r.lightBorder} ${r.darkBorder}
                  hover:border-sky-500 dark:hover:border-sky-400
                `}
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center
                      ${r.lightIconBg} ${r.darkIconBg}`}>
                      <r.icon className="w-5.5 h-5.5" />
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border tracking-wide
                      ${r.lightTagBg} ${r.darkTagBg}`}>
                      {r.tag}
                    </span>
                  </div>

                  <h2 className={`text-xl font-black mb-2 tracking-tight
                    ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {r.title}
                  </h2>
                  <p className={`text-xs leading-relaxed mb-5
                    ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {r.desc}
                  </p>
                </div>

                <div className={`relative z-10 pt-4 border-t flex items-center justify-between text-xs
                  ${isDark ? 'border-white/10' : 'border-gray-200/60'}`}>
                  <span className={`font-medium text-[11px] truncate max-w-[160px]
                    ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    {r.subtext}
                  </span>
                  <div className={`flex items-center gap-1 font-bold group-hover:translate-x-1 transition-transform duration-300
                    ${r.lightAccent} ${r.darkAccent}`}>
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            ))}
          </div>

        </div>
      </main>

      {/* ─── FOOTER ───────────────────────────────────────────────────── */}
      <footer className={`relative z-10 w-full px-5 sm:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-medium border-t backdrop-blur-2xl
        ${isDark
          ? 'bg-slate-900/50 border-white/8 text-slate-500'
          : 'bg-white/50 border-gray-200/50 text-gray-400'
        }`}>
        <div>LogiSync port and delivery management</div>
        <div className="flex items-center gap-3">
          <Link to="/privacy" className="hover:underline">Privacy</Link>
          <Link to="/terms" className="hover:underline">Terms</Link>
          <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>LOGISYNC v2.0</span>
        </div>
      </footer>
    </div>
  );
}
