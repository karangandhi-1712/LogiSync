// ─── SlotSchedulingZone — two-tab container ───────────────────────────────────
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { BookOpen, List } from 'lucide-react';
import { HowToBookTab } from './HowToBookTab';
import { MyBookingsTab } from './MyBookingsTab';
import type { PortInfo } from '../../data/ports';
import type { BookingRecord } from '../../data/portServiceData';

const TABS = [
  { id: 'how' as const,  label: 'How to Book',  icon: BookOpen },
  { id: 'mine' as const, label: 'My Bookings',  icon: List },
] as const;

type TabId = typeof TABS[number]['id'];

interface SlotSchedulingZoneProps {
  port: PortInfo | null;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  bookings: BookingRecord[];
  onBookingConfirmed: (booking: BookingRecord) => void;
  onReschedule: (id: string) => void;
  onCancel: (id: string) => void;
  cancellingId: string | null;
}

export function SlotSchedulingZone({
  port,
  activeTab,
  onTabChange,
  bookings,
  onBookingConfirmed,
  onReschedule,
  onCancel,
  cancellingId,
}: SlotSchedulingZoneProps) {
  return (
    <div className="px-6 py-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-white/60 dark:border-white/10 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                'relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 text-xs font-bold',
                isActive
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="slot-tab-indicator"
                  className="absolute inset-0 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-white/80 dark:border-white/15"
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              <Icon className={clsx('w-3.5 h-3.5 relative z-10', isActive ? 'text-cyan-500' : 'text-slate-400')} />
              <span className="relative z-10">{tab.label}</span>
              {tab.id === 'mine' && bookings.length > 0 && (
                <span className={clsx(
                  'relative z-10 ml-0.5 min-w-[18px] h-[18px] rounded-full text-[9px] font-black flex items-center justify-center px-1',
                  isActive
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                )}>
                  {bookings.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'how' ? (
        <HowToBookTab port={port} onBookingConfirmed={onBookingConfirmed} />
      ) : (
        <MyBookingsTab
          port={port}
          bookings={bookings}
          onReschedule={onReschedule}
          onCancel={onCancel}
          cancellingId={cancellingId}
        />
      )}
    </div>
  );
}
