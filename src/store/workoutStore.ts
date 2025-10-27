import { create } from 'zustand';
import { Workout, WorkoutSession, Exercise, AIRecommendation } from '../types';
import { supabase } from '../services/supabase';

interface WorkoutState {
  currentWorkout: Workout | null;
  currentSession: WorkoutSession | null;
  workouts: Workout[];
  sessions: WorkoutSession[];
  exercises: Exercise[];
  recommendations: AIRecommendation[];
  isLoading: boolean;
  
  // Actions
  loadWorkouts: () => Promise<void>;
  loadExercises: () => Promise<void>;
  loadSessions: () => Promise<void>;
  loadRecommendations: () => Promise<void>;
  startWorkout: (workoutId: string) => Promise<{ success: boolean; error?: string }>;
  completeWorkout: (sessionId: string, rpe?: number, notes?: string) => Promise<{ success: boolean; error?: string }>;
  updateExerciseSession: (exerciseSessionId: string, setsData: any[]) => Promise<{ success: boolean; error?: string }>;
  generateWorkout: (userId: string, preferences: any) => Promise<{ success: boolean; error?: string; workout?: Workout }>;
  applyRecommendation: (recommendationId: string) => Promise<{ success: boolean; error?: string }>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  currentWorkout: null,
  currentSession: null,
  workouts: [],
  sessions: [],
  exercises: [],
  recommendations: [],
  isLoading: false,

  loadWorkouts: async () => {
    try {
      set({ isLoading: true });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercise:exercises (*)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ workouts: data as Workout[] });
    } catch (error) {
      console.error('Error al cargar entrenamientos:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadExercises: async () => {
    try {
      set({ isLoading: true });
      
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name');

      if (error) throw error;

      set({ exercises: data as Exercise[] });
    } catch (error) {
      console.error('Error al cargar ejercicios:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadSessions: async () => {
    try {
      set({ isLoading: true });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          workout:workouts (*)
        `)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (error) throw error;

      set({ sessions: data as WorkoutSession[] });
    } catch (error) {
      console.error('Error al cargar sesiones:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadRecommendations: async () => {
    try {
      set({ isLoading: true });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ recommendations: data as AIRecommendation[] });
    } catch (error) {
      console.error('Error al cargar recomendaciones:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  startWorkout: async (workoutId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Usuario no autenticado' };

      // Crear nueva sesión
      const { data: session, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          workout_id: workoutId,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Cargar el entrenamiento completo
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select(`
          *,
          workout_exercises (
            *,
            exercise:exercises (*)
          )
        `)
        .eq('id', workoutId)
        .single();

      if (workoutError) throw workoutError;

      set({ 
        currentWorkout: workout as Workout,
        currentSession: session as WorkoutSession 
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error al iniciar entrenamiento' };
    }
  },

  completeWorkout: async (sessionId: string, rpe?: number, notes?: string) => {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .update({
          completed_at: new Date().toISOString(),
          rpe,
          notes,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      // Limpiar sesión actual
      set({ 
        currentWorkout: null,
        currentSession: null 
      });

      // Recargar sesiones
      await get().loadSessions();

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error al completar entrenamiento' };
    }
  },

  updateExerciseSession: async (exerciseSessionId: string, setsData: any[]) => {
    try {
      // Aquí implementarías la lógica para actualizar las series completadas
      // Por ahora, solo un placeholder
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error al actualizar ejercicio' };
    }
  },

  generateWorkout: async (userId: string, preferences: any) => {
    try {
      // Aquí implementarías la lógica de IA para generar entrenamientos
      // Por ahora, un entrenamiento básico de ejemplo
      const { data, error } = await supabase
        .from('workouts')
        .insert({
          user_id: userId,
          name: 'Entrenamiento Generado',
          description: 'Entrenamiento personalizado por IA',
          duration_minutes: 45,
          difficulty: 5,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, workout: data as Workout };
    } catch (error) {
      return { success: false, error: 'Error al generar entrenamiento' };
    }
  },

  applyRecommendation: async (recommendationId: string) => {
    try {
      // Implementar lógica para aplicar recomendación
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error al aplicar recomendación' };
    }
  },
}));
