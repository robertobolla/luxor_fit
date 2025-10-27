// ============================================================================
// NUTRITION STORE (Zustand)
// ============================================================================

import { create } from 'zustand';
import { WeekPlan, NutritionTarget, GroceryItem, MealLog, HydrationLog } from '../types/nutrition';

interface NutritionState {
  // Data
  todayTarget?: NutritionTarget;
  weekPlan?: WeekPlan;
  grocery?: GroceryItem[];
  todayLogs: MealLog[];
  todayWater: number; // ml

  // UI state
  loading: boolean;
  error?: string;

  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
  setTodayTarget: (target?: NutritionTarget) => void;
  setWeekPlan: (plan?: WeekPlan) => void;
  setGrocery: (items?: GroceryItem[]) => void;
  setTodayLogs: (logs: MealLog[]) => void;
  setTodayWater: (ml: number) => void;
  addWater: (ml: number) => void;
  reset: () => void;
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  // Initial state
  todayLogs: [],
  todayWater: 0,
  loading: false,

  // Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setTodayTarget: (todayTarget) => set({ todayTarget }),
  setWeekPlan: (weekPlan) => set({ weekPlan }),
  setGrocery: (grocery) => set({ grocery }),
  setTodayLogs: (todayLogs) => set({ todayLogs }),
  setTodayWater: (todayWater) => set({ todayWater }),
  addWater: (ml) => set({ todayWater: get().todayWater + ml }),
  reset: () =>
    set({
      todayTarget: undefined,
      weekPlan: undefined,
      grocery: undefined,
      todayLogs: [],
      todayWater: 0,
      loading: false,
      error: undefined,
    }),
}));

