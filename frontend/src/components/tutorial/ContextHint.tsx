import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTutorial } from '../../context/TutorialContext';

interface ContextHintProps {
  hintId: string;
  text: string;
  className?: string;
}

export function ContextHint({ hintId, text, className = '' }: ContextHintProps) {
  const { isTutorialOn } = useTutorial();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(`logisync-hint-dismissed-${hintId}`) === 'true';
  });

  if (!isTutorialOn || dismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    setOpen(false);
    localStorage.setItem(`logisync-hint-dismissed-${hintId}`, 'true');
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(p => !p);
        }}
        className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-400/40 flex items-center justify-center text-[9px] font-black hover:scale-110 active:scale-95 transition-all shadow-sm"
        title="Tutorial Hint"
      >
        ?
      </button>

      {open && (
        <div className="absolute left-6 top-0 z-40 w-64 p-3 rounded-2xl liquid-glass-elevated border border-white/80 dark:border-white/20 shadow-2xl backdrop-blur-2xl text-[11px] text-slate-700 dark:text-slate-200">
          <div className="flex items-center justify-between mb-1.5 font-bold text-cyan-600 dark:text-cyan-400">
            <span>Tutorial Tip</span>
            <button onClick={handleDismiss} className="opacity-60 hover:opacity-100 p-0.5">
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="leading-relaxed">{text}</p>
        </div>
      )}
    </div>
  );
}
