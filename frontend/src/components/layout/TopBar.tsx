import { Bell, Sun, Moon, ChevronDown, Truck, Shield, Wifi, Satellite, Sparkles, GraduationCap } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useTutorial } from '../../context/TutorialContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications, markNotificationRead, createTelemetryWebSocket, fetchTelemetryStats } from '../../services/api';
import type { Notification } from '../../types';

export function TopBar() {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { isTutorialOn, toggleTutorial } = useTutorial();
  const navigate = useNavigate();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const [telemetryStats, setTelemetryStats] = useState({
    fleet: '24 Online',
    queue: '4 Trucks',
    uptime: '99.98%',
    gnss: '28 Locked'
  });

  // Load notifications + REST telemetry fallback (shown until WS live stats arrive)
  useEffect(() => {
    fetchNotifications().then(data => setNotifications(data)).catch(() => {});
    fetchTelemetryStats().then(stats => {
      if (stats) {
        setTelemetryStats({
          fleet: `${(stats as any).total_active_trucks ?? 24} Online`,
          queue: '4 Trucks',
          uptime: '99.98%',
          gnss: `${(stats as any).gnss_locked_count ?? 24} Locked`,
        });
      }
    }).catch(() => {});
  }, []);

  // Connect live WebSocket
  useEffect(() => {
    const handle = createTelemetryWebSocket(
      'thoothukudi',
      () => {},
      (stats) => {
        if (stats) {
          setTelemetryStats({
            fleet: `${stats.total_active_trucks || 24} Online`,
            queue: `${stats.queue_depth || 4} Trucks`,
            uptime: `${stats.system_uptime_pct || 99.98}%`,
            gnss: `${stats.gnss_locked_count || 28} Locked`
          });
        }
      },
      (status) => {
        setWsStatus(status);
      }
    );

    return () => handle.close();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleRead = async (id: string) => {
    await markNotificationRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const KPI_STRIP = [
    {
      icon: (
        <span className="relative flex h-2.5 w-2.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${wsStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${wsStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500'}`} />
        </span>
      ),
      label: 'Fleet',
      value: telemetryStats.fleet,
    },
    {
      icon: <Wifi className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />,
      label: 'Gate Queue',
      value: telemetryStats.queue,
    },
    {
      icon: <Shield className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />,
      label: 'Uptime',
      value: telemetryStats.uptime,
    },
    {
      icon: <Satellite className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />,
      label: 'GNSS RTK',
      value: telemetryStats.gnss,
    },
  ];

  return (
    <header className="h-[64px] flex items-center px-4 md:px-6 gap-4 border-b flex-shrink-0
      liquid-glass border-b-white/40 dark:border-b-white/10
      shadow-[0_4px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
      z-30 relative backdrop-blur-2xl"
    >
      {/* Brand & Console Badge */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative group">
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-500 opacity-75 blur-sm group-hover:opacity-100 transition duration-300" />
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 dark:from-cyan-400 dark:to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 dark:shadow-cyan-500/30">
            <Truck className="w-5 h-5 text-white drop-shadow-md" />
          </div>
        </div>

        <div className="hidden lg:block min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900 dark:text-white text-base tracking-tight chroma-text">
              LogiSync
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-gradient-to-r from-sky-500/15 to-cyan-500/15 dark:from-cyan-500/25 dark:to-blue-500/25 text-sky-600 dark:text-cyan-300 border border-sky-300/40 dark:border-cyan-400/30 shadow-sm">
              <Sparkles className="w-2.5 h-2.5 text-cyan-500 dark:text-cyan-400" />
              v2.0 PRO
            </span>
          </div>
          <div className="text-[9px] text-slate-400 dark:text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <span>PORT OPS CONSOLE</span>
            <span className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-cyan-600 dark:text-cyan-400 font-mono">
              {wsStatus === 'connected' ? 'LIVE 5G TELEMETRY' : 'RECONNECTING...'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Telemetry Strip */}
      <div className="flex items-center gap-2 flex-1 justify-center overflow-x-auto no-scrollbar py-1">
        {KPI_STRIP.map((kpi, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full
              bg-white/60 dark:bg-slate-900/60
              border border-white/60 dark:border-white/10
              neu-flat-sm dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)]
              flex-shrink-0 transition-transform duration-200 hover:scale-105 backdrop-blur-md"
          >
            <span className="flex items-center">{kpi.icon}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden xl:block">
              {kpi.label}:
            </span>
            <span className="text-[11px] font-bold tabular text-slate-800 dark:text-slate-100 font-mono">
              {kpi.value}
            </span>
          </div>
        ))}
      </div>

      {/* Utility Actions */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* ─── Part 2.1: Tutorial Toggle Switch ─────────────────────────────── */}
        <button
          onClick={toggleTutorial}
          title={isTutorialOn ? "Tutorial mode is on — guided help is active" : "Tutorial mode is off"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-200 neu-button ${
            isTutorialOn
              ? 'bg-gradient-to-r from-sky-500/20 to-cyan-500/20 border-cyan-400/50 text-cyan-600 dark:text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)] scale-[1.02]'
              : 'bg-white/60 dark:bg-slate-800/60 border-white/60 dark:border-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <GraduationCap className={`w-4 h-4 ${isTutorialOn ? 'text-cyan-500 animate-bounce' : 'text-slate-400'}`} />
          <span className="text-xs font-bold hidden md:inline">Tutorial</span>
          <span className={`w-2 h-2 rounded-full ${isTutorialOn ? 'bg-cyan-400 shadow-[0_0_6px_#00f5d4]' : 'bg-slate-400'}`} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="w-9 h-9 flex items-center justify-center rounded-xl
            bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800
            border border-white/80 dark:border-white/10
            neu-button
            text-slate-700 dark:text-slate-200 transition-all duration-200"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 hover:text-sky-600 transition-colors" />
          )}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifPanel(p => !p)}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl
              bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800
              border border-white/80 dark:border-white/10
              neu-button
              text-slate-700 dark:text-slate-200 transition-all duration-200"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifPanel && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl liquid-glass-elevated border border-white/80 dark:border-white/20 z-50 p-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/40 dark:border-white/10">
                <span className="text-xs font-black text-slate-900 dark:text-white">Terminal Alerts</span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">{unreadCount} Unread</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleRead(n.id)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      n.read
                        ? 'bg-white/30 dark:bg-slate-900/30 border-white/30 dark:border-white/5 opacity-60'
                        : 'bg-white/70 dark:bg-slate-800/70 border-cyan-400/40 shadow-sm'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-slate-900 dark:text-white">{n.title}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-300 mt-0.5">{n.body}</div>
                    <div className="text-[9px] text-slate-400 mt-1">{n.timestamp}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(p => !p)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl
              bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800
              border border-white/80 dark:border-white/10
              neu-button
              transition-all duration-200"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="text-[10px] font-black text-white">
                {user?.name?.slice(0, 2) || 'KG'}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100">
                {user?.name?.split(' ')[0] || 'Karanesh G.'}
              </div>
              <div className="text-[9px] text-cyan-600 dark:text-cyan-400 uppercase font-semibold">Port Admin</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl liquid-glass-elevated
              border border-white/60 dark:border-white/15 z-50 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{user?.email}</div>
                <div className="flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold tracking-wider">COGNITO AES-256</span>
                </div>
              </div>
              <button
                onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors"
              >
                Settings & Preferences
              </button>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="w-full text-left px-4 py-3 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
              >
                Sign Out Console
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

