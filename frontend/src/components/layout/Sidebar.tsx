import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, CalendarClock, Truck, BarChart3, Settings,
  ChevronLeft, ChevronRight, Shield, LogOut
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',    sub: 'Command Center & Port Map' },
  { path: '/slots',     icon: CalendarClock,   label: 'Slot Booking', sub: 'Gate Allocation & AI Rec.' },
  { path: '/fleet',     icon: Truck,           label: 'Fleet Tracker',sub: 'Telematics & Live GIS' },
  { path: '/analytics', icon: BarChart3,       label: 'Analytics',    sub: 'Heatmaps & Turnaround' },
  { path: '/settings',  icon: Settings,        label: 'Settings',     sub: 'Sensors, OCR & Cognito' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className={clsx(
      'flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out relative z-20',
      'liquid-glass border-r border-r-white/50 dark:border-r-white/10 backdrop-blur-2xl',
      'shadow-[4px_0_30px_rgba(0,0,0,0.04)] dark:shadow-[4px_0_30px_rgba(0,0,0,0.3)]',
      collapsed ? 'w-[72px]' : 'w-[264px]'
    )}>

      {/* 3D Tactile Collapse Toggle Orb */}
      <button
        onClick={() => setCollapsed(p => !p)}
        className="absolute -right-3.5 top-6 z-30 w-7 h-7 rounded-full
          bg-white dark:bg-slate-800 border border-white/80 dark:border-white/20
          neu-button flex items-center justify-center
          text-slate-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors shadow-md"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5" />
          : <ChevronLeft className="w-3.5 h-3.5" />
        }
      </button>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-5 space-y-1.5 px-3">
        {NAV_ITEMS.map(({ path, icon: Icon, label, sub }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => clsx(
              'flex items-center gap-3.5 px-3 py-2.5 rounded-2xl transition-all duration-150 group relative overflow-hidden active:scale-[0.99]',
              isActive
                ? 'bg-black/[0.05] dark:bg-white/[0.08] text-[#1D1D1F] dark:text-white font-bold border-l-[3px] border-[#1D4ED8] dark:border-cyan-400'
                : 'text-[#6B7280] dark:text-slate-400 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] hover:text-[#1D1D1F] dark:hover:text-white border-l-[3px] border-transparent'
            )}
          >
            <div className="relative flex-shrink-0">
              <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-bold leading-tight truncate">{label}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-400 truncate font-normal mt-0.5">{sub}</div>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Session Card (Liquid Neu-Glass Card) */}
      {!collapsed && (
        <div className="border-t border-white/40 dark:border-white/10 p-3.5 space-y-2.5">
          <div className="p-2.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 neu-flat-sm">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-xs font-black text-white">
                  {user?.name?.slice(0, 2) || 'KG'}
                </span>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {user?.name || 'Karanesh G.'}
                </div>
                <div className="text-[9px] text-cyan-600 dark:text-cyan-400 font-semibold tracking-wider uppercase truncate">
                  VOC Port Admin
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 mt-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Shield className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">
                COGNITO AES-256
              </span>
            </div>
          </div>

          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-red-500 dark:text-red-400
              hover:bg-red-500/10 active:scale-95 transition-all text-xs font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Console</span>
          </button>
        </div>
      )}

      {/* Collapsed footer */}
      {collapsed && (
        <div className="border-t border-white/40 dark:border-white/10 p-2 space-y-2.5 flex flex-col items-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center shadow-md">
            <span className="text-xs font-bold text-white">{user?.name?.slice(0, 2) || 'KG'}</span>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-9 h-9 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
