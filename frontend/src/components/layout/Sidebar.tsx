import { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  Hand,
  LogOut,
  MapPinned,
  PackagePlus,
  Settings,
  Shield,
  ShoppingBag,
  Truck,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  path: string;
  icon: any;
  label: string;
  sub: string;
  roles: string[];
}

const ALL_ITEMS: NavItem[] = [
  { path: '/home', icon: MapPinned, label: 'Home', sub: 'Current batch & stops', roles: ['driver'] },
  { path: '/jobs', icon: Hand, label: 'Available Jobs', sub: 'Broadcast feed & claim', roles: ['driver'] },
  { path: '/deliveries', icon: ClipboardList, label: 'My Deliveries', sub: 'Batch history', roles: ['driver'] },
  { path: '/profile', icon: User, label: 'Profile', sub: 'Account & vehicle', roles: ['driver'] },

  { path: '/fleet-manage', icon: Truck, label: 'Delivery Console', sub: 'Queue, batches, oversight', roles: ['fleet_manager'] },

  { path: '/admin/users', icon: Users, label: 'Users', sub: 'Fleet managers & drivers', roles: ['port_admin'] },

  // Customer portal
  { path: '/consumer/orders', icon: ClipboardList, label: 'My Deliveries', sub: 'Track & order history', roles: ['consumer'] },
  { path: '/consumer/book', icon: PackagePlus, label: 'Request Delivery', sub: 'New port-to-door parcel', roles: ['consumer'] },
  { path: '/consumer/profile', icon: User, label: 'Profile', sub: 'Account details', roles: ['consumer'] },

  {
    path: '/analytics',
    icon: BarChart3,
    label: 'Analytics',
    sub: 'Marketplace performance',
    roles: ['port_admin', 'fleet_manager'],
  },
  {
    path: '/settings',
    icon: Settings,
    label: 'Settings',
    sub: 'Preferences',
    roles: ['port_admin', 'fleet_manager', 'driver', 'consumer'],
  },
];

/** Sidebar footer avatar glyph, one per role. */
const ROLE_ICON: Record<string, typeof Truck> = {
  driver: Truck,
  fleet_manager: MapPinned,
  port_admin: Shield,
  consumer: ShoppingBag,
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ?? 'driver';
  const items = ALL_ITEMS.filter((i) => i.roles.includes(role));

  return (
    <aside
      className={`hidden md:flex flex-col flex-shrink-0 border-r border-white/40 dark:border-white/8 bg-white/25 dark:bg-white/[0.02] backdrop-blur-xl transition-all ${
        collapsed ? 'w-[72px]' : 'w-[264px]'
      }`}
    >
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                  isActive
                    ? 'bg-sky-500/10 border-l-[3px] border-sky-500 text-slate-900 dark:text-white'
                    : 'border-l-[3px] border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-500/6'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold truncate">{item.label}</span>
                  <span className="block text-[10px] text-slate-400 truncate">{item.sub}</span>
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/40 dark:border-white/8 p-2.5">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full mb-2 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-500/10 transition"
        >
          {collapsed ? '»' : '«  Collapse'}
        </button>

        {!collapsed && (
          <>
            <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl bg-slate-500/6">
              <div className="p-2 rounded-lg bg-sky-500/15 text-sky-600 dark:text-cyan-300 shrink-0">
                {(() => {
                  const Icon = ROLE_ICON[role] ?? Shield;
                  return <Icon className="w-3.5 h-3.5" />;
                })()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                  {user?.name ?? 'Operator'}
                </p>
                <p className="text-[10px] text-slate-400 capitalize">{role.replace('_', ' ')}</p>
              </div>
            </div>

            {role === 'driver' && user?.vehicle_number && (
              <p className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-slate-500/6 text-[10px] font-mono text-slate-500 dark:text-slate-400 text-center">
                {user.vehicle_number}
              </p>
            )}
            {role === 'fleet_manager' && user?.assigned_port_id && (
              <p className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-slate-500/6 text-[10px] font-mono text-slate-500 dark:text-slate-400 text-center">
                {user.assigned_port_id}
              </p>
            )}
          </>
        )}

        <button
          onClick={() => {
            logout();
            navigate('/');
          }}
          title="Sign out"
          className="w-full mt-2 px-3 py-2 rounded-xl text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 transition flex items-center justify-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          {!collapsed && 'Sign out'}
        </button>

        {!collapsed && (
          <div className="mt-2.5 pt-2 border-t border-white/20 dark:border-white/5 flex items-center justify-center gap-3 text-[10px] text-slate-400">
            <Link to="/privacy" className="hover:underline hover:text-slate-600 dark:hover:text-slate-300">Privacy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:underline hover:text-slate-600 dark:hover:text-slate-300">Terms</Link>
          </div>
        )}
      </div>
    </aside>
  );
}