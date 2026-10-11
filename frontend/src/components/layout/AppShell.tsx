import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { TopBar } from './TopBar';
import Sidebar from './Sidebar';
import { useTutorial } from '../../context/TutorialContext';

export function AppShell() {
  const location = useLocation();
  const { isTutorialOn, hasSeenWelcome, startTour } = useTutorial();
  const promptedPage = useRef<string | null>(null);

  useEffect(() => {
    const page = location.pathname.replace('/', '') || 'home';
    if (!isTutorialOn || !hasSeenWelcome || promptedPage.current === page) return;
    if (localStorage.getItem(`logisync-tour-seen-${page}`)) return;
    promptedPage.current = page;
    startTour(page);
  }, [location.pathname, isTutorialOn, hasSeenWelcome, startTour]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-canvas)] relative">
      <TopBar />

      <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto relative [scrollbar-gutter:stable]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
