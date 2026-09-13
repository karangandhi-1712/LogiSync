import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, ShieldCheck, ArrowRight, Lock, User, Sparkles, Navigation, Globe } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: { name: string; role: string; email: string }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('dispatcher@logisync.ai');
  const [password, setPassword] = useState('••••••••••••');
  const [role, setRole] = useState<'Chief Dispatcher' | 'Fleet Commander' | 'Logistics Analyst'>('Chief Dispatcher');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({
      name: email.split('@')[0].toUpperCase(),
      role,
      email,
    });
  };

  const handleDemoLogin = () => {
    onLogin({
      name: 'SARAH CONNOR',
      role: 'Chief Dispatcher',
      email: 'lead.dispatch@logisync.ai',
    });
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 text-slate-100 flex items-center justify-center overflow-hidden font-sans select-none">
      {/* Dynamic Background Glow & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Decorative Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4 p-8 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-slate-800 shadow-2xl shadow-cyan-950/40"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl font-black tracking-tight text-white">LogiSync</h1>
            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              PHASE 6 PRO
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Autonomous Multi-Stop Route Optimizer & Real-Time Fleet Dispatch
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Dispatcher Email / ID
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dispatcher@logisync.ai"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Security Clearance Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Operational Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all"
            >
              <option value="Chief Dispatcher">Chief Dispatcher (Full Multi-Stop ML Control)</option>
              <option value="Fleet Commander">Fleet Commander (Real-Time Telemetry & Tracking)</option>
              <option value="Logistics Analyst">Logistics Analyst (Fuel & Carbon Audit)</option>
            </select>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <span>Access Dispatch Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-slate-900 text-slate-500">OR IMMEDIATE ACCESS</span>
          </div>
        </div>

        {/* 1-Click Demo Login */}
        <button
          type="button"
          onClick={handleDemoLogin}
          className="w-full py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all group active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span>Quick Launch (Demo Chief Dispatcher)</span>
        </button>

        {/* Feature Highlights Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/60 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-400">
          <div className="flex flex-col items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Any Global City</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google Maps API</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>ML GA Routing</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
