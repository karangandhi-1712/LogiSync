import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, Lock, Mail, Eye, EyeOff, Shield, Zap, Building2 } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0f1e] overflow-hidden relative">

      {/* Grid background */}
      <div className="absolute inset-0 bg-grid-light dark:bg-grid-dark bg-grid pointer-events-none" />

      {/* Ambient glow orbs */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-sky-300/20 dark:bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-blue-300/20 dark:bg-blue-600/10 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[440px] mx-4"
      >
        <div className="rounded-3xl bg-white dark:bg-[rgba(15,23,42,0.85)] border border-slate-200 dark:border-[rgba(100,130,200,0.15)] shadow-[0_4px_40px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(6,182,212,0.1)] backdrop-blur-2xl p-8">

          {/* Logo & Title */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 dark:from-cyan-400 dark:to-blue-500 shadow-glow-sky dark:shadow-glow-cyan mb-4">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">LogiSync</h1>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-sky-100 text-sky-600 dark:bg-cyan-500/20 dark:text-cyan-400 border border-sky-200 dark:border-cyan-500/30">
                v2.0 PRO
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">AI-Powered Port Logistics Command Center</p>
          </div>

          {/* Role Switcher */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/60 p-1 mb-6">
            {(['Port Admin', 'Fleet Mgr', 'Dispatcher'] as RoleTab[]).map(r => (
              <button
                key={r}
                onClick={() => setActiveRole(r)}
                className={clsx(
                  'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200',
                  activeRole === r
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-cyan-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Terminal ID / Security Email"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60
                  border border-slate-200 dark:border-slate-700
                  text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500
                  text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-cyan-500
                  focus:border-transparent transition-all"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Security Passcode / Token"
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60
                  border border-slate-200 dark:border-slate-700
                  text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500
                  text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-cyan-500
                  focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Remember / Reset */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded accent-sky-500 dark:accent-cyan-500"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">Remember device</span>
              </label>
              <button type="button" className="text-xs text-sky-500 dark:text-cyan-400 hover:underline">
                Reset token?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Login CTA */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-xl font-bold text-sm text-white
                bg-gradient-to-r from-sky-500 to-blue-600 dark:from-cyan-500 dark:to-blue-500
                hover:from-sky-600 hover:to-blue-700 dark:hover:from-cyan-600 dark:hover:to-blue-600
                shadow-glow-sky dark:shadow-glow-cyan
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  Sign In to Command Center →
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">OR</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
          </div>

          {/* Demo Login */}
          <motion.button
            onClick={handleDemo}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3 rounded-xl font-bold text-sm
              border-2 border-sky-300 dark:border-cyan-500/50
              text-sky-600 dark:text-cyan-400
              hover:bg-sky-50 dark:hover:bg-cyan-500/10
              transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            ⚡ Launch Demo Session [INSTANT BYPASS]
          </motion.button>

          {/* Security Footer */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <Shield className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
              Secured by AWS Cognito • AES-256 Encrypted • SOC2 Type II
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
