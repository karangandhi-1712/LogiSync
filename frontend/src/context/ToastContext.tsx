import React, { createContext, useContext, useState } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    const newToast: Toast = { ...toast, id, duration: toast.duration || 4000 };
    setToasts(prev => [...prev, newToast]);

    if (newToast.duration) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map(t => {
          const borderColors = {
            success: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
            info: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200',
            warning: 'border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200',
            error: 'border-red-500/50 bg-red-500/10 text-red-800 dark:text-red-200'
          };
          return (
            <div
              key={t.id}
              className={`pointer-events-auto p-4 rounded-2xl liquid-glass border shadow-2xl backdrop-blur-2xl transition-all duration-200 flex items-start justify-between gap-3 ${borderColors[t.type]}`}
            >
              <div className="flex-1 min-w-0">
                {t.title && <div className="text-xs font-black mb-0.5">{t.title}</div>}
                <div className="text-xs font-medium text-slate-700 dark:text-slate-200">{t.message}</div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-xs opacity-60 hover:opacity-100 font-bold px-1"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
