import React, { createContext, useContext, useState, useEffect } from 'react';
import { TUTORIAL_STEPS_BY_PAGE } from '../data/tutorialSteps';
import type { TutorialStep } from '../data/tutorialSteps';

interface TutorialContextType {
  isTutorialOn: boolean;
  toggleTutorial: () => void;
  activeStepIndex: number;
  currentTour: TutorialStep[];
  startTour: (page: string, essentialOnly?: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  currentPage: string;
  hasSeenWelcome: boolean;
  dismissWelcome: (action: 'full' | 'basics' | 'skip') => void;
  isTourActive: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  // Default ON for first-time visitor, OFF for returning users who disabled it
  const [isTutorialOn, setIsTutorialOn] = useState<boolean>(() => {
    const stored = localStorage.getItem('logisync-tutorial');
    if (stored !== null) return stored === 'true';
    const completed = localStorage.getItem('logisync-tutorial-completed');
    return completed ? false : true;
  });

  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean>(() => {
    return localStorage.getItem('logisync-welcome-seen') === 'true';
  });

  const [currentTour, setCurrentTour] = useState<TutorialStep[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [isTourActive, setIsTourActive] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('logisync-tutorial', isTutorialOn ? 'true' : 'false');
    if (!isTutorialOn) {
      setIsTourActive(false);
      setCurrentTour([]);
    }
  }, [isTutorialOn]);

  const toggleTutorial = () => {
    setIsTutorialOn(prev => !prev);
  };

  const startTour = (page: string, essentialOnly: boolean = false) => {
    if (!isTutorialOn) return;
    const steps = TUTORIAL_STEPS_BY_PAGE[page] || [];
    const filtered = essentialOnly ? steps.filter(s => s.essential) : steps;
    if (filtered.length === 0) return;

    setCurrentPage(page);
    setCurrentTour(filtered);
    setActiveStepIndex(0);
    setIsTourActive(true);

    // Smooth scroll to target element
    setTimeout(() => {
      const el = document.querySelector(filtered[0]?.target);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const nextStep = () => {
    if (activeStepIndex < currentTour.length - 1) {
      const nextIdx = activeStepIndex + 1;
      setActiveStepIndex(nextIdx);

      const nextTarget = currentTour[nextIdx]?.target;
      if (nextTarget) {
        const el = document.querySelector(nextTarget);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      skipTour();
    }
  };

  const prevStep = () => {
    if (activeStepIndex > 0) {
      const prevIdx = activeStepIndex - 1;
      setActiveStepIndex(prevIdx);

      const prevTarget = currentTour[prevIdx]?.target;
      if (prevTarget) {
        const el = document.querySelector(prevTarget);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const skipTour = () => {
    setIsTourActive(false);
    setCurrentTour([]);
    localStorage.setItem(`logisync-tour-seen-${currentPage}`, 'true');
    localStorage.setItem('logisync-tutorial-completed', 'true');
  };

  const dismissWelcome = (action: 'full' | 'basics' | 'skip') => {
    localStorage.setItem('logisync-welcome-seen', 'true');
    setHasSeenWelcome(true);
    if (action === 'full') {
      startTour('dashboard', false);
    } else if (action === 'basics') {
      startTour('dashboard', true);
    }
  };

  return (
    <TutorialContext.Provider value={{
      isTutorialOn,
      toggleTutorial,
      activeStepIndex,
      currentTour,
      startTour,
      nextStep,
      prevStep,
      skipTour,
      currentPage,
      hasSeenWelcome,
      dismissWelcome,
      isTourActive
    }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used within TutorialProvider');
  return ctx;
}
