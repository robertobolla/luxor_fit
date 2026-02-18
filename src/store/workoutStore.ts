// ============================================================================
// WORKOUT STORE (Zustand)
// ============================================================================

import { create } from 'zustand';
import { supabase } from '../services/supabase';

interface Workout {
    id: string;
    name: string;
    difficulty: number;
    exercises: any[];
    type?: string;
    [key: string]: any;
}

interface WorkoutSession {
    id: string;
    workout: Workout;
    started_at: string;
    completed_at: string | null;
    [key: string]: any;
}

interface WorkoutState {
    workouts: Workout[];
    sessions: WorkoutSession[];
    isLoading: boolean;
    loadWorkouts: () => Promise<void>;
    loadSessions: () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
    workouts: [],
    sessions: [],
    isLoading: false,

    loadWorkouts: async () => {
        try {
            set({ isLoading: true });
            const { data, error } = await supabase
                .from('workouts')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                set({ workouts: data });
            }
        } catch (e) {
            console.error('Error loading workouts:', e);
        } finally {
            set({ isLoading: false });
        }
    },

    loadSessions: async () => {
        try {
            const { data, error } = await supabase
                .from('workout_sessions')
                .select('*, workout:workouts(*)')
                .order('started_at', { ascending: false })
                .limit(10);

            if (!error && data) {
                set({ sessions: data as any });
            }
        } catch (e) {
            console.error('Error loading sessions:', e);
        }
    },
}));
