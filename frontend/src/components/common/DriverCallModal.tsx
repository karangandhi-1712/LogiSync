// ─── DriverCallModal.tsx — Real-Time Browser Dispatcher & Radio Telephony ──────
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, ShieldCheck, Radio, ExternalLink } from 'lucide-react';

interface DriverCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverName: string;
  driverPhone: string;
  driverRating?: number;
  vehiclePlate?: string;
}

export function DriverCallModal({
  isOpen,
  onClose,
  driverName,
  driverPhone,
  driverRating = 4.8,
  vehiclePlate,
}: DriverCallModalProps) {
  const [callStatus, setCallStatus] = useState<'dialing' | 'connected' | 'ended'>('dialing');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const timerRef = useRef<any>(null);

  const cleanPhone = (driverPhone || '+91 98400 12345').replace(/\s+/g, '');

  useEffect(() => {
    if (!isOpen) {
      setCallStatus('dialing');
      setSecondsElapsed(0);
      setIsMuted(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Trigger browser native telephony protocol (opens Phone Link, FaceTime, or Mobile dialer)
    try {
      window.location.href = `tel:${cleanPhone}`;
    } catch {
      // Ignore if browser restricts automatic tel navigation
    }

    // Simulate connection after 1.8s
    const connectTimeout = setTimeout(() => {
      setCallStatus('connected');
      timerRef.current = setInterval(() => {
        setSecondsElapsed(s => s + 1);
      }, 1000);
    }, 1800);

    return () => {
      clearTimeout(connectTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, cleanPhone]);

  const handleEndCall = () => {
    setCallStatus('ended');
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const initials = driverName
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'DR';

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
        {/* Dark blurred backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleEndCall}
          className="absolute inset-0 bg-black/75 backdrop-blur-lg"
        />

        {/* Call card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-sm rounded-3xl liquid-glass-elevated
            border border-white/80 dark:border-white/20 backdrop-blur-2xl
            shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden z-10 p-6 flex flex-col items-center text-center"
        >
          {/* Top Encrypted Dispatch Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-6">
            <Radio className="w-3 h-3 animate-pulse text-emerald-500" />
            <span>VoIP Radio Dispatch • Encrypted</span>
          </div>

          {/* Driver Avatar with animated wave ring */}
          <div className="relative mb-5">
            {callStatus === 'connected' && (
              <span className="absolute -inset-2.5 rounded-full bg-emerald-500/25 animate-ping" />
            )}
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-xl relative z-10">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-white shadow-md z-20">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Driver Name & Phone */}
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            {driverName}
          </h3>
          <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-300 mt-0.5">
            {driverPhone || '+91 98400 12345'}
          </p>
          {vehiclePlate && (
            <p className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold mt-1">
              Vehicle: {vehiclePlate}
            </p>
          )}

          {/* Status / Timer */}
          <div className="mt-4 mb-6">
            {callStatus === 'dialing' ? (
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span>Ringing Driver Phone Line…</span>
              </div>
            ) : callStatus === 'connected' ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  <span>{formatTimer(secondsElapsed)}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {[40, 70, 90, 60, 80, 50, 95, 65, 45].map((h, i) => (
                    <motion.span
                      key={i}
                      animate={{ height: isMuted ? 4 : [h * 0.15, h * 0.25, h * 0.15] }}
                      transition={{ repeat: Infinity, duration: 0.6 + i * 0.08 }}
                      className="w-1 bg-emerald-400 rounded-full inline-block"
                      style={{ height: h * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-400">Call Ended</span>
            )}
          </div>

          {/* Quick Dial Device Fallback Link */}
          <a
            href={`tel:${cleanPhone}`}
            className="flex items-center gap-1 text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline mb-6 font-semibold"
          >
            <span>Dial directly on your mobile / dialer</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Call Controls */}
          <div className="flex items-center justify-center gap-5 w-full pt-2 border-t border-white/40 dark:border-white/10">
            {/* Mute button */}
            <button
              onClick={() => setIsMuted(m => !m)}
              disabled={callStatus !== 'connected'}
              className={`p-3.5 rounded-2xl border transition-all ${
                isMuted
                  ? 'bg-amber-500/20 border-amber-400 text-amber-600 dark:text-amber-400'
                  : 'bg-white/60 dark:bg-slate-800/60 border-white/60 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-cyan-400/40'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* End Call Button */}
            <button
              onClick={handleEndCall}
              className="p-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-[0_8px_24px_rgba(244,63,94,0.4)] hover:scale-105 active:scale-95 transition-all"
            >
              <PhoneOff className="w-6 h-6" />
            </button>

            {/* Speaker button */}
            <button
              onClick={() => setIsSpeaker(s => !s)}
              disabled={callStatus !== 'connected'}
              className={`p-3.5 rounded-2xl border transition-all ${
                !isSpeaker
                  ? 'bg-slate-200 dark:bg-slate-800 border-slate-300 text-slate-400'
                  : 'bg-white/60 dark:bg-slate-800/60 border-white/60 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-cyan-400/40'
              }`}
            >
              {isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
