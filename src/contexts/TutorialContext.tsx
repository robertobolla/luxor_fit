// ============================================================================
// TUTORIAL CONTEXT - Gestión de estado de tutoriales
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TutorialContextType {
  // Estado de tutoriales
  hasCompletedTutorial: (screen: string) => boolean;
  completeTutorial: (screen: string) => Promise<void>;
  resetAllTutorials: () => Promise<void>;
  resetTutorial: (screen: string) => Promise<void>;
  hasCompletedInitialTour: boolean;
  completeInitialTour: () => Promise<void>;
  
  // Control de visibilidad
  shouldShowTooltip: (screen: string) => boolean;
  markTooltipShown: (screen: string) => void;
  
  // Modal de ayuda
  showHelpModal: boolean;
  setShowHelpModal: (show: boolean) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const TUTORIAL_KEYS = {
  INITIAL_TOUR: 'tutorial_initial_tour_completed',
  HOME: 'tutorial_home_completed',
  WORKOUT: 'tutorial_workout_completed',
  NUTRITION: 'tutorial_nutrition_completed',
  PROGRESS: 'tutorial_progress_completed',
  PROFILE: 'tutorial_profile_completed',
  METRICS: 'tutorial_metrics_completed',
  CUSTOM_PLAN: 'tutorial_custom_plan_completed',
};

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [completedTutorials, setCompletedTutorials] = useState<Set<string>>(new Set());
  const [hasCompletedInitialTour, setHasCompletedInitialTour] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [shownTooltips, setShownTooltips] = useState<Set<string>>(new Set());

  // Cargar estado de tutoriales al iniciar
  useEffect(() => {
    loadTutorialState();
  }, []);

  const loadTutorialState = async () => {
    try {
      const keys = Object.values(TUTORIAL_KEYS);
      const values = await AsyncStorage.multiGet(keys);
      
      const completed = new Set<string>();
      let tourCompleted = false;

      values.forEach(([key, value]) => {
        if (value === 'true') {
          if (key === TUTORIAL_KEYS.INITIAL_TOUR) {
            tourCompleted = true;
          } else {
            completed.add(key);
          }
        }
      });

      setCompletedTutorials(completed);
      setHasCompletedInitialTour(tourCompleted);
    } catch (error) {
      console.error('Error loading tutorial state:', error);
    }
  };

  const hasCompletedTutorial = (screen: string): boolean => {
    const key = TUTORIAL_KEYS[screen.toUpperCase() as keyof typeof TUTORIAL_KEYS];
    return key ? completedTutorials.has(key) : false;
  };

  const completeTutorial = async (screen: string): Promise<void> => {
    try {
      const key = TUTORIAL_KEYS[screen.toUpperCase() as keyof typeof TUTORIAL_KEYS];
      if (key) {
        await AsyncStorage.setItem(key, 'true');
        setCompletedTutorials(prev => new Set(prev).add(key));
      }
    } catch (error) {
      console.error('Error completing tutorial:', error);
    }
  };

  const completeInitialTour = async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(TUTORIAL_KEYS.INITIAL_TOUR, 'true');
      setHasCompletedInitialTour(true);
    } catch (error) {
      console.error('Error completing initial tour:', error);
    }
  };

  const resetAllTutorials = async (): Promise<void> => {
    try {
      const keys = Object.values(TUTORIAL_KEYS);
      await AsyncStorage.multiRemove(keys);
      setCompletedTutorials(new Set());
      setHasCompletedInitialTour(false);
      setShownTooltips(new Set());
    } catch (error) {
      console.error('Error resetting tutorials:', error);
    }
  };

  const resetTutorial = async (screen: string): Promise<void> => {
    try {
      const key = TUTORIAL_KEYS[screen.toUpperCase() as keyof typeof TUTORIAL_KEYS];
      if (key) {
        await AsyncStorage.removeItem(key);
        setCompletedTutorials(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
        setShownTooltips(prev => {
          const newSet = new Set(prev);
          newSet.delete(screen);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error resetting tutorial:', error);
    }
  };

  const shouldShowTooltip = (screen: string): boolean => {
    // Solo mostrar tooltip si no se ha completado el tutorial Y no se ha mostrado en esta sesión
    return !hasCompletedTutorial(screen) && !shownTooltips.has(screen);
  };

  const markTooltipShown = (screen: string): void => {
    setShownTooltips(prev => new Set(prev).add(screen));
  };

  return (
    <TutorialContext.Provider
      value={{
        hasCompletedTutorial,
        completeTutorial,
        resetAllTutorials,
        resetTutorial,
        hasCompletedInitialTour,
        completeInitialTour,
        shouldShowTooltip,
        markTooltipShown,
        showHelpModal,
        setShowHelpModal,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}

