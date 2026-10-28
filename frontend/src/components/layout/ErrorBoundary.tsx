import React from 'react';
import { AlertTriangle, RefreshCw, LogOut, ChevronDown } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string;
}

/**
 * Last line of defence against a blank page.
 *
 * The most likely way to hit this is a context hook rendered without its
 * provider (e.g. `useNotifications()` above no `NotificationProvider`) - that
 * throws during render, which unmounts the whole tree and leaves a white
 * screen with only a console message. Neither tsc nor oxlint can catch that,
 * so it gets a visible failure mode instead.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, componentStack: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep the stack in the console for the full picture; the UI shows a summary.
    console.error('[LogiSync] unhandled render error:', error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? '' });
  }

  private reload = (clearSession: boolean) => {
    if (clearSession) {
      try {
        localStorage.removeItem('logisync_token');
      } catch {
        /* private mode - reload anyway */
      }
    }
    window.location.reload();
  };

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-3xl liquid-glass-elevated border border-white/50 dark:border-white/10 shadow-2xl p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/12 text-rose-600 dark:text-rose-300 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-slate-900 dark:text-white">
                Something went wrong loading this screen
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                The app hit an unexpected error and stopped rendering. Reloading usually clears
                it. If it keeps happening, the details below identify where.
              </p>
            </div>
          </div>

          <div className="mt-4 p-3.5 rounded-xl bg-slate-500/8 border border-slate-200/60 dark:border-white/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Error
            </p>
            <p className="mt-1 text-xs font-mono text-rose-600 dark:text-rose-300 break-words">
              {error.message || error.name}
            </p>
          </div>

          {componentStack && (
            <details className="mt-3 group">
              <summary className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 select-none">
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                Component stack
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto p-3 rounded-xl bg-slate-900 text-slate-200 text-[10px] font-mono whitespace-pre-wrap break-words">
                {componentStack.trim()}
              </pre>
            </details>
          )}

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => this.reload(false)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reload
            </button>
            <button
              onClick={() => this.reload(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/12 text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 text-xs font-bold transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Clear session &amp; reload
            </button>
          </div>

          <p className="mt-4 text-[11px] text-slate-400">
            Is the backend running? Most first-load failures here are the API being unreachable -
            check{' '}
            <a
              href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/healthz`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sky-600 dark:text-sky-400 underline underline-offset-2 hover:opacity-80"
            >
              /healthz
            </a>
            .
          </p>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;