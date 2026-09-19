// ─── SlotBookingPage — Gate Slot Allocation & AI Dispatch (Redesign) ──────────
import { useState, useEffect } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { usePort } from '../context/PortContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { Button } from '../components/ui/Button';
import { PortSelectorBar } from '../components/slot-booking/PortSelectorBar';
import { PortSelectorModal } from '../components/slot-booking/PortSelectorModal';
import { ServiceGateOverview } from '../components/slot-booking/ServiceGateOverview';
import { CongestionSection } from '../components/slot-booking/CongestionSection';
import { SlotSchedulingZone } from '../components/slot-booking/SlotSchedulingZone';
import { PORT_BOOKINGS } from '../data/portServiceData';
import type { BookingRecord } from '../data/portServiceData';
import { getPort } from '../data/ports';

type SlotTab = 'how' | 'mine';

export default function SlotBookingPage() {
  const { portId: globalPortId, setPortId } = usePort();
  const { showToast } = useToast();
  const { addNotification } = useNotifications();

  // ── Page-level state ─────────────────────────────────────────────────────
  const [selectedPortId, setSelectedPortId] = useState<string | null>(
    globalPortId || null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateOffset, setDateOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<SlotTab>('how');
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const port = selectedPortId ? getPort(selectedPortId) : null;

  // Load seeded bookings when port changes
  useEffect(() => {
    if (selectedPortId) {
      const seeded = PORT_BOOKINGS[selectedPortId] ?? [];
      setBookings([...seeded]);
    } else {
      setBookings([]);
    }
  }, [selectedPortId]);

  // ── Port selection handlers ───────────────────────────────────────────────
  const handlePortSelect = (id: string) => {
    setSelectedPortId(id);
    setPortId(id); // sync global context
    setIsModalOpen(false);
    setActiveTab('how');
    setDateOffset(0);
    showToast({
      type: 'success',
      title: 'Port Selected',
      message: `Now viewing ${getPort(id).name}`,
    });
  };

  const handlePortClear = () => {
    setSelectedPortId(null);
    setBookings([]);
    setActiveTab('how');
  };

  // ── Booking handlers ─────────────────────────────────────────────────────
  const handleBookingConfirmed = (booking: BookingRecord) => {
    setBookings(prev => [booking, ...prev]);
    setActiveTab('mine'); // switch to My Bookings tab
    showToast({
      type: 'success',
      title: 'Slot Confirmed!',
      message: `e-Pass ${booking.tokenNumber} issued. Token copied to My Bookings.`,
    });
    // Dispatch notification to the TopBar bell feed
    addNotification({
      type: 'slot',
      title: `Slot Booked — ${booking.tokenNumber}`,
      body: `${booking.driverName} · ${booking.vehicleNumber} · ${booking.gate} · ${booking.timeWindow} on ${booking.date}`,
      bookingDetails: booking,
    });
  };

  const handleReschedule = (id: string) => {
    // Simple demo: bump the time window by 30 mins
    setBookings(prev => prev.map(b => {
      if (b.id !== id) return b;
      const [start] = b.timeWindow.split(' – ');
      const [h, m] = start.split(':').map(Number);
      const newH = String((h + (m >= 30 ? 1 : 0)) % 24).padStart(2, '0');
      const newM = String((m + 30) % 60).padStart(2, '0');
      const newStart = `${newH}:${newM}`;
      const newEnd = `${String((Number(newH) + (Number(newM) >= 30 ? 1 : 0)) % 24).padStart(2, '0')}:${String((Number(newM) + 30) % 60).padStart(2, '0')}`;
      return { ...b, timeWindow: `${newStart} – ${newEnd}` };
    }));
    showToast({ type: 'success', title: 'Rescheduled', message: 'Slot time updated by +30 minutes.' });
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this gate slot? This action cannot be undone.')) return;
    setCancellingId(id);
    await new Promise(r => setTimeout(r, 800));
    setBookings(prev => prev.filter(b => b.id !== id));
    setCancellingId(null);
    showToast({ type: 'success', title: 'Slot Cancelled', message: 'Gate capacity released.' });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 600));
    setIsRefreshing(false);
    showToast({ type: 'success', title: 'Refreshed', message: 'Gate data updated.' });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg-canvas)] relative">

      {/* ── SECTION ZERO: Page Header (unchanged) ─────────────────────────── */}
      <div className="px-6 py-4 border-b border-white/40 dark:border-white/10 flex-shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white chroma-text">
              Gate Slot Allocation &amp; AI Dispatch
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-400/30">
              <Sparkles className="w-2.5 h-2.5 text-cyan-500" />
              AI OPTIMIZED
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time terminal gates availability · Dynamic slot booking · Driver e-Pass encryption
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          isLoading={isRefreshing}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* ── Scrollable content area ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* ── SECTION A: Port Selector ──────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-white/40 dark:border-white/10">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Port Selection
          </p>
          <PortSelectorBar
            selectedPortId={selectedPortId}
            onClick={() => setIsModalOpen(true)}
            onClear={handlePortClear}
          />
          {!selectedPortId && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 text-center">
              ↑ Search or select a port to unlock all features below
            </p>
          )}
        </div>

        {/* ── SECTION B: Service & Gate Overview ───────────────────────── */}
        <ServiceGateOverview port={port} onRefresh={handleRefresh} />

        {/* ── SECTION C: Date Tracker + Congestion Intelligence ─────────── */}
        <CongestionSection
          port={port}
          dateOffset={dateOffset}
          onDateChange={setDateOffset}
        />

        {/* ── SECTION D: Slot Scheduling Zone ───────────────────────────── */}
        <div id="tutorial-booking-form">
          <div className="px-6 pt-4 pb-2 border-t border-white/40 dark:border-white/10">
            <h2 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Slot Scheduling Zone
            </h2>
            {!selectedPortId && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Select a port above to begin booking
              </p>
            )}
          </div>
          <SlotSchedulingZone
            port={port}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            bookings={bookings}
            onBookingConfirmed={handleBookingConfirmed}
            onReschedule={handleReschedule}
            onCancel={handleCancel}
            cancellingId={cancellingId}
          />
        </div>

        {/* Bottom padding */}
        <div className="h-8" />
      </div>

      {/* ── Port Selector Modal (global overlay) ─────────────────────────── */}
      <PortSelectorModal
        isOpen={isModalOpen}
        currentPortId={selectedPortId}
        onSelect={handlePortSelect}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
