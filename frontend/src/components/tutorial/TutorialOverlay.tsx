import { useEffect, useState } from 'react';
import { useTutorial } from '../../context/TutorialContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Sparkles, Compass } from 'lucide-react';
import { Button } from '../ui/Button';

export function TutorialOverlay() {
  const {
    isTutorialOn,
    isTourActive,
    currentTour,
    activeStepIndex,
    nextStep,
    prevStep,
    skipTour,
    hasSeenWelcome,
    dismissWelcome
  } = useTutorial();

  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = currentTour[activeStepIndex];

  // Update target element highlight rect
  useEffect(() => {
    if (!isTourActive || !step) {
      setRect(null);
      return;
    }

    const updatePosition = () => {
      const el = document.querySelector(step.target);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isTourActive, step, activeStepIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isTourActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') nextStep();
      if (e.key === 'ArrowLeft') prevStep();
      if (e.key === 'Escape') skipTour();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourActive, activeStepIndex, currentTour]);

  if (!isTutorialOn) return null;

  return (
    <>
      {/* ─── Layer 3: Welcome Flow (First Launch Only) ────────────────────── */}
      <AnimatePresence>
        {!hasSeenWelcome && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full p-6 rounded-3xl liquid-glass-elevated border border-white/70 dark:border-white/20 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-white shadow-lg">
                  <Compass className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white chroma-text">
                    Welcome to LogiSync v2.0
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    VOC Port Autonomous Logistics Command System
                  </p>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 mb-6">
                LogiSync unifies real-time fleet telematics, AI-driven gate slot optimization, and automated corridor rerouting across VOC Port Thoothukudi. How would you like to explore?
              </p>

              <div className="space-y-2.5">
                <Button
                  variant="primary"
                  className="w-full justify-between"
                  onClick={() => dismissWelcome('full')}
                >
                  <span>Take the full interactive tour</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-between"
                  onClick={() => dismissWelcome('basics')}
                >
                  <span>Just show me the essentials</span>
                  <Sparkles className="w-4 h-4 text-cyan-500" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => dismissWelcome('skip')}
                >
                  Skip — I'll explore on my own
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Layer 1: Guided Tour Spotlight & Tooltip Card ────────────────── */}
      <AnimatePresence>
        {isTourActive && step && rect && (
          <div className="fixed inset-0 z-50 pointer-events-none">
            {/* Spotlight cut-out border around element */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute pointer-events-none rounded-2xl transition-all duration-300 ring-4 ring-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.6)]"
              style={{
                top: rect.top - 6,
                left: rect.left - 6,
                width: rect.width + 12,
                height: rect.height + 12
              }}
            />

            {/* Positioned Tooltip Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute pointer-events-auto p-5 rounded-3xl liquid-glass-elevated border border-white/80 dark:border-white/20 shadow-2xl backdrop-blur-3xl max-w-sm w-80 z-50"
              style={{
                top: Math.min(window.innerHeight - 280, Math.max(20, rect.bottom + 16)),
                left: Math.min(window.innerWidth - 340, Math.max(20, rect.left))
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-400/30">
                  Step {activeStepIndex + 1} of {currentTour.length}
                </span>
                <button
                  onClick={skipTour}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"
                  title="Exit tutorial (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1.5">
                {step.title}
              </h4>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2.5">
                {step.body}
              </p>

              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-700 dark:text-cyan-300 mb-4">
                <span className="font-bold">Why it matters: </span>
                {step.whyItMatters}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  {currentTour.map((_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === activeStepIndex ? 'w-4 bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  {activeStepIndex > 0 && (
                    <Button size="sm" variant="ghost" onClick={prevStep}>
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </Button>
                  )}
                  <Button size="sm" variant="primary" onClick={nextStep}>
                    <span>{activeStepIndex === currentTour.length - 1 ? 'Finish' : 'Next'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
