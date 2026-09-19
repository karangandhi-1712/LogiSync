import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { useTutorial } from '../../context/TutorialContext';

export function AppShell() {
  const location = useLocation();
  const { isTutorialOn, hasSeenWelcome, startTour } = useTutorial();
  const promptedPage = useRef<string | null>(null);

  useEffect(() => {
    const page = location.pathname.replace('/', '') || 'dashboard';
    if (!isTutorialOn || !hasSeenWelcome || promptedPage.current === page) return;
    if (localStorage.getItem(`logisync-tour-seen-${page}`)) return;
    promptedPage.current = page;
    startTour(page);
  }, [location.pathname, isTutorialOn, hasSeenWelcome, startTour]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-canvas)] relative">
      {/* Shining Dynamic Aurora Background Layer */}
      <div className="aurora-canvas">
        <div className="aurora-orb orb-1" />
        <div className="aurora-orb orb-2" />
        <div className="aurora-orb orb-3" />
      </div>

      {/* TopBar (Floating Liquid Glass) */}
      <TopBar />

      {/* Main Container */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">
        <Sidebar />
        {/* scrollbar-gutter: a transient scrollbar can never resize the page */}
        <main className="flex-1 min-w-0 overflow-auto relative [scrollbar-gutter:stable]">
          <Outlet />
        </main>
      </div>

    </div>
  );
}

