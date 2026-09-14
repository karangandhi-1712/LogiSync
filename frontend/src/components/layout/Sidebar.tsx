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
      'flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out relative',
      'bg-white dark:bg-navy-600 border-r border-slate-200 dark:border-[rgba(100,130,200,0.15)]',
      collapsed ? 'w-[68px]' : 'w-[260px]'
    )}>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(p => !p)}
        className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full
          bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
          shadow-sm flex items-center justify-center
          text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft className="w-3 h-3" />
        }
      </button>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label, sub }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden',
              isActive
                ? 'bg-sky-50 dark:bg-cyan-500/10 text-sky-600 dark:text-cyan-400 border-l-[3px] border-sky-500 dark:border-cyan-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200 border-l-[3px] border-transparent'
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight truncate">{label}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{sub}</div>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Session Card */}
      {!collapsed && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-3 space-y-2">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 dark:from-cyan-400 dark:to-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-white">
                {user?.name?.slice(0, 2) || 'KG'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {user?.name || 'Karanesh G.'}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase truncate">VOC Port Admin</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40">
            <Shield className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              COGNITO AES-256 VERIFIED
            </span>
          </div>

          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-500 dark:text-red-400
              hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      )}

      {/* Collapsed footer */}
      {collapsed && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-2 space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-sky-400 to-blue-600 dark:from-cyan-400 dark:to-blue-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">{user?.name?.slice(0,2) || 'KG'}</span>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex justify-center p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
