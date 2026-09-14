import { Bell, Sun, Moon, ChevronDown, Truck, Shield, Wifi, Satellite } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const KPI_STRIP = [
  { icon: <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"/></span>, label: 'Fleet', value: '24 Online' },
  { icon: <Wifi className="w-3 h-3 text-amber-500" />, label: 'Gate Queue', value: '4 Trucks' },
  { icon: <Shield className="w-3 h-3 text-emerald-500" />, label: 'Uptime', value: '99.98%' },
  { icon: <Satellite className="w-3 h-3 text-sky-500" />, label: 'GNSS RTK', value: '28 Locked' },
];

export function TopBar() {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications] = useState(4);

  return (
    <header className="h-[60px] flex items-center px-4 gap-4 border-b flex-shrink-0
      bg-white dark:bg-navy-600 border-slate-200 dark:border-[rgba(100,130,200,0.15)]
      shadow-[0_1px_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_rgba(6,182,212,0.08)]
      z-30 relative"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 dark:from-cyan-400 dark:to-blue-500 flex items-center justify-center shadow-glow-sky dark:shadow-glow-cyan flex-shrink-0">
          <Truck className="w-4 h-4 text-white" />
        </div>
        <div className="hidden lg:block min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900 dark:text-white text-sm tracking-tight">LogiSync</span>
            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-sky-100 text-sky-600 dark:bg-cyan-500/20 dark:text-cyan-400 border border-sky-200 dark:border-cyan-500/30">
              v2.0 PRO
            </span>
          </div>
          <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-medium">
            PORT OPS CONSOLE / LIVE TELEMETRY
          </div>
        </div>
      </div>

      {/* KPI Telemetry Strip */}
      <div className="flex items-center gap-1 flex-1 justify-center overflow-x-auto no-scrollbar">
        {KPI_STRIP.map((kpi, i) => (
          <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
            bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50
            flex-shrink-0"
          >
            <span className="flex items-center">{kpi.icon}</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden xl:block">{kpi.label}:</span>
            <span className="text-[11px] font-semibold tabular text-slate-700 dark:text-slate-200">{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Utility Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="w-8 h-8 flex items-center justify-center rounded-xl
            bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700
            border border-slate-200 dark:border-slate-700
            text-slate-600 dark:text-slate-300 transition-colors duration-200"
        >
          {isDark
            ? <Sun className="w-4 h-4 text-amber-400" />
            : <Moon className="w-4 h-4 text-slate-500" />
          }
        </button>

        {/* Notification Bell */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-xl
          bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700
          border border-slate-200 dark:border-slate-700
          text-slate-600 dark:text-slate-300 transition-colors duration-200"
        >
          <Bell className="w-4 h-4" />
          {notifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {notifications}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(p => !p)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl
              bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700
              border border-slate-200 dark:border-slate-700 transition-colors duration-200"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 dark:from-cyan-400 dark:to-blue-500 flex items-center justify-center">
              <span className="text-[9px] font-bold text-white">
                {user?.name?.slice(0, 2) || 'KG'}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                {user?.name?.split(' ')[0] || 'Karanesh G.'}
              </div>
              <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">Port Admin</div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-2xl shadow-card-light dark:shadow-card-dark
              bg-white dark:bg-navy-800 border border-slate-200 dark:border-[rgba(100,130,200,0.15)] z-50 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{user?.email}</div>
                <div className="flex items-center gap-1 mt-1">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">COGNITO AES-256</span>
                </div>
              </div>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
