// ─── HowToBookTab — steps guide + booking form side by side ──────────────────
import { StepsGuide } from './StepsGuide';
import { BookingForm } from './BookingForm';
import type { PortInfo } from '../../data/ports';
import type { BookingRecord } from '../../data/portServiceData';

interface HowToBookTabProps {
  port: PortInfo | null;
  onBookingConfirmed: (booking: BookingRecord) => void;
}

export function HowToBookTab({ port, onBookingConfirmed }: HowToBookTabProps) {
  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Left — Steps Guide (~35%) */}
      <div className="xl:w-[35%] flex-shrink-0">
        <div className="rounded-2xl border border-white/60 dark:border-white/10
          bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm p-5 sticky top-0">
          <StepsGuide />
        </div>
      </div>

      {/* Right — Booking Form (~65%) */}
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl border border-white/60 dark:border-white/10
          bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm p-5">
          <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4">
            Booking &amp; Driver e-Pass Transmission
          </h3>
          <BookingForm port={port} onBookingConfirmed={onBookingConfirmed} />
        </div>
      </div>
    </div>
  );
}
