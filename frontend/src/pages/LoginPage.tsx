import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, Lock, Mail, Eye, EyeOff, Shield, Zap, Building2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';

type RoleTab = 'Port Admin' | 'Fleet Mgr' | 'Dispatcher';

const ROLE_MAP: Record<RoleTab, string> = {
  'Port Admin':  'port_admin',
  'Fleet Mgr':   'fleet_manager',
  'Dispatcher':  'dispatcher',
};

export default function LoginPage() {
  const { login, loginDemo, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const [activeRole, setActiveRole] = useState<RoleTab>('Port Admin');
  const [email, setEmail]           = useState('karanesh@vocport.gov.in');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [remember, setRemember]     = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch { /* error shown via context */ }
  }

  function handleDemo() {
    loginDemo(ROLE_MAP[activeRole]);
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)] overflow-hidden relative p-4">

      {/* Extraordinary Shining Aurora Mesh Background */}
      <div className="aurora-canvas">
        <div className="aurora-orb orb-1" />
        <div className="aurora-orb orb-2" />
        <div className="aurora-orb orb-3" />
      </div>

      {/* Floating Sparkle Particles / Ambient Glow Layers */}
      <div className="absolute top-1/4 left-1/5 w-72 h-72 rounded-full bg-cyan-400/20 dark:bg-cyan-400/15 blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/5 w-80 h-80 rounded-full bg-purple-500/20 dark:bg-violet-600/15 blur-3xl pointer-events-none animate-pulse-slow" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[460px]"
      >
        {/* Liquid Glass Monolith Card */}
        <div className="rounded-[2.5rem] liquid-glass-elevated border border-white/70 dark:border-white/15 p-8 md:p-9 shadow-2xl backdrop-blur-3xl overflow-hidden relative">

          {/* Top Specular Glare Accent */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-cyan-400/60 to-transparent pointer-events-none" />

          {/* Logo & Brand Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600 blur-md opacity-70 animate-pulse-slow" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-600 flex items-center justify-center shadow-xl">
                <Truck className="w-8 h-8 text-white drop-shadow-md" />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-1.5">
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white chroma-text">
                LogiSync
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-400/30">
                <Sparkles className="w-2.5 h-2.5 text-cyan-500" />
                v2.0 PRO
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Autonomous AI Port Terminal Command Console
            </p>
          </div>

          {/* Neumorphic Segmented Role Switcher */}
          <div id="tutorial-login-roles" className="flex rounded-2xl bg-slate-200/50 dark:bg-slate-900/60 p-1.5 mb-6 neu-inset">
            {(['Port Admin', 'Fleet Mgr', 'Dispatcher'] as RoleTab[]).map(r => (
              <button id="tutorial-login-password-toggle"
                key={r}
                onClick={() => setActiveRole(r)}
                className={clsx(
                  'flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200',
                  activeRole === r
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-cyan-400 shadow-md scale-100 border border-white/60 dark:border-white/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field with Inset Well */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                Security Identifier / Email
              </label>
              <div className="relative rounded-2xl bg-white/50 dark:bg-slate-900/60 border border-white/80 dark:border-white/10 neu-inset overflow-hidden transition-all focus-within:ring-2 focus-within:ring-cyan-400">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Terminal ID / Security Email"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs font-medium focus:outline-none"
                />
              </div>
            </div>

            {/* Password Field with Inset Well */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                Passcode / Access Token
              </label>
              <div className="relative rounded-2xl bg-white/50 dark:bg-slate-900/60 border border-white/80 dark:border-white/10 neu-inset overflow-hidden transition-all focus-within:ring-2 focus-within:ring-cyan-400">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Security Passcode / Token"
                  className="w-full pl-10 pr-11 py-3 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs font-medium focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Device & Reset */}
            <div className="flex items-center justify-between pt-1">
              <label id="tutorial-login-remember" className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded-md accent-cyan-500"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Remember terminal</span>
              </label>
              <button type="button" className="text-xs font-semibold text-sky-600 dark:text-cyan-400 hover:underline">
                Reset Token?
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-600 dark:text-red-400 shadow-sm">
                {error}
              </div>
            )}

            {/* Submit Button (Tactile 3D Luminous CTA) */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider text-white
                bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-600
                hover:from-sky-600 hover:via-cyan-600 hover:to-indigo-700
                shadow-[0_4px_20px_rgba(6,182,212,0.4)] hover:shadow-[0_6px_25px_rgba(6,182,212,0.6)]
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-all duration-200 flex items-center justify-center gap-2 border border-white/20"
            >
              {isLoading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  Sign In to Terminal Console →
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-300/60 dark:bg-slate-700/60" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
              FAST ACCESS
            </span>
            <div className="flex-1 h-px bg-slate-300/60 dark:bg-slate-700/60" />
          </div>

          {/* Instant Bypass Demo Button (Tactile Neu-Glass Action) */}
          <motion.button
            id="tutorial-login-demo-btn"
            onClick={handleDemo}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 rounded-2xl font-bold text-xs
              bg-white/60 dark:bg-slate-900/60
              border border-cyan-400/40 dark:border-cyan-400/30
              text-cyan-700 dark:text-cyan-300
              hover:bg-cyan-500/10 hover:border-cyan-400
              neu-flat-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
          >
            <Zap className="w-4 h-4 text-cyan-500 animate-pulse" />
            <span>Launch Demo Session [INSTANT BYPASS]</span>
          </motion.button>

          {/* Security Footer Badge */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium">
              AWS Cognito Verified • AES-256 GCM • SOC2 Type II Certified
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
