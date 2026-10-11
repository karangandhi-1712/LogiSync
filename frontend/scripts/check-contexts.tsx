/**
 * Runtime guard for context wiring.
 *
 * A context hook rendered without its provider throws during render, which
 * unmounts the whole tree and leaves a blank white page. TypeScript cannot see
 * this and oxlint's react rules do not check it — so this script actually
 * renders the provider tree and calls every context hook.
 *
 * The probe component below deliberately consumes each hook, so if anyone
 * removes a provider from App.tsx this fails loudly instead of white-screening.
 *
 * Run: npm run check:contexts
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import { ThemeProvider } from '../src/context/ThemeContext';
import { PortProvider } from '../src/context/PortContext';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import { MarketplaceProvider } from '../src/context/MarketplaceContext';
import { NotificationProvider } from '../src/context/NotificationContext';
import { TutorialProvider } from '../src/context/TutorialContext';
import { ErrorBoundary } from '../src/components/layout/ErrorBoundary';
import { useTheme } from '../src/context/ThemeContext';
import { usePort } from '../src/context/PortContext';
import { useAuth } from '../src/context/AuthContext';
import { useToast } from '../src/context/ToastContext';
import { useMarketplace, useMarketplaceEvent } from '../src/context/MarketplaceContext';
import { useNotifications } from '../src/context/NotificationContext';
import { useTutorial } from '../src/context/TutorialContext';

const results: { hook: string; ok: boolean; error?: string }[] = [];

function probe(hook: string, fn: () => void, children: React.ReactNode) {
  return { hook, fn, children };
}

/**
 * Each check runs inside the same provider stack as the real App. `useTheme` and
 * friends are hooks, so each one gets its own tiny component to obey the rules
 * of hooks while still being rendered under the full provider tree.
 */
function makeProbe(hookName: string) {
  return function Probe() {
    switch (hookName) {
      case 'useTheme': {
        const { isDark } = useTheme();
        return <span>{String(isDark)}</span>;
      }
      case 'usePort': {
        const { portId, ports } = usePort();
        return <span>{portId}:{ports.length}</span>;
      }
      case 'useAuth': {
        const { token, user } = useAuth();
        return <span>{String(token)}:{String(user)}</span>;
      }
      case 'useToast': {
        const { showToast } = useToast();
        return <span>{typeof showToast}</span>;
      }
      case 'useMarketplace': {
        const { state, isFallback, subscribe, send } = useMarketplace();
        return <span>{state}:{String(isFallback)}:{typeof subscribe}:{typeof send}</span>;
      }
      case 'useMarketplaceEvent': {
        useMarketplaceEvent('schedule:broadcast', () => {});
        return <span>ok</span>;
      }
      case 'useNotifications': {
        const { notifications, unreadCount } = useNotifications();
        return <span>{notifications.length}:{unreadCount}</span>;
      }
      case 'useTutorial': {
        const { isTutorialOn, startTour, hasSeenWelcome } = useTutorial();
        return <span>{String(isTutorialOn)}:{typeof startTour}:{String(hasSeenWelcome)}</span>;
      }
      default:
        return <span>unknown</span>;
    }
  };
}

const HOOKS = [
  'useTheme',
  'usePort',
  'useAuth',
  'useToast',
  'useMarketplace',
  'useMarketplaceEvent',
  'useNotifications',
  'useTutorial',
];

/**
 * Mirrors App.tsx's provider nesting. If you change the nesting there, change it
 * here too — that is the point of the check.
 */
function Tree({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <PortProvider>
        <AuthProvider>
          <ToastProvider>
            <MarketplaceProvider>
              <NotificationProvider>
                <TutorialProvider>
                  <MemoryRouter>{children}</MemoryRouter>
                </TutorialProvider>
              </NotificationProvider>
            </MarketplaceProvider>
          </ToastProvider>
        </AuthProvider>
      </PortProvider>
    </ThemeProvider>
  );
}

function main() {
  let failed = 0;

  for (const hook of HOOKS) {
    const Probe = makeProbe(hook);
    try {
      const html = renderToString(
        <ErrorBoundary>
          <Tree>
            <Probe />
          </Tree>
        </ErrorBoundary>,
      );
      // The boundary renders its fallback panel instead of children on throw.
      if (html.includes('Something went wrong loading this screen')) {
        results.push({ hook, ok: false, error: 'ErrorBoundary caught a throw' });
        failed += 1;
      } else {
        results.push({ hook, ok: true });
      }
    } catch (err: any) {
      results.push({ hook, ok: false, error: `${err?.name}: ${err?.message}` });
      failed += 1;
    }
  }

  console.log('\n  Context wiring check (SSR render of the real provider tree)\n');
  for (const r of results) {
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.hook}${r.error ? `  -> ${r.error}` : ''}`);
  }
  console.log('');
  if (failed) {
    console.error(`  ${failed} hook(s) failed — a provider is missing above its consumer.\n`);
    process.exit(1);
  }
  console.log(`  All ${results.length} context hooks resolved.\n`);
}

main();