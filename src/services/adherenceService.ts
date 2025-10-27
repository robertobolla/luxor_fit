import { supabase } from './supabase';

/**
 * Calcula la adherencia de un usuario a los entrenamientos y nutrición
 */
export interface AdherenceMetrics {
  nutritionAdherence: number; // 0-100%
  workoutAdherence: number; // 0-100%
  overallAdherence: number; // 0-100%
  nutritionProgress: {
    loggedMeals: number;
    expectedMeals: number;
    period: string;
  };
  workoutProgress: {
    completedWorkouts: number;
    expectedWorkouts: number;
    period: string;
  };
}

/**
 * Calcula la adherencia del usuario en un período determinado
 */
export async function calculateAdherence(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<AdherenceMetrics> {
  try {
    // Adherencia nutricional
    const nutritionMetrics = await calculateNutritionAdherence(userId, startDate, endDate);
    
    // Adherencia de entrenamientos
    const workoutMetrics = await calculateWorkoutAdherence(userId, startDate, endDate);
    
    // Adherencia general (promedio ponderado)
    const overallAdherence = Math.round(
      (nutritionMetrics.adherence * 0.6 + workoutMetrics.adherence * 0.4)
    );

    return {
      nutritionAdherence: nutritionMetrics.adherence,
      workoutAdherence: workoutMetrics.adherence,
      overallAdherence,
      nutritionProgress: {
        loggedMeals: nutritionMetrics.logged,
        expectedMeals: nutritionMetrics.expected,
        period: `${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`,
      },
      workoutProgress: {
        completedWorkouts: workoutMetrics.completed,
        expectedWorkouts: workoutMetrics.expected,
        period: `${startDate.toLocaleDateString('es-ES')} - ${endDate.toLocaleDateString('es-ES')}`,
      },
    };
  } catch (error) {
    console.error('Error calculating adherence:', error);
    return {
      nutritionAdherence: 0,
      workoutAdherence: 0,
      overallAdherence: 0,
      nutritionProgress: {
        loggedMeals: 0,
        expectedMeals: 0,
        period: '',
      },
      workoutProgress: {
        completedWorkouts: 0,
        expectedWorkouts: 0,
        period: '',
      },
    };
  }
}

/**
 * Calcula la adherencia nutricional
 */
async function calculateNutritionAdherence(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ adherence: number; logged: number; expected: number }> {
  // Obtener comidas registradas en el período
  const { data: mealLogs } = await supabase
    .from('meal_logs')
    .select('id')
    .eq('user_id', userId)
    .gte('datetime', startDate.toISOString())
    .lte('datetime', endDate.toISOString());

  const logged = mealLogs?.length || 0;

  // Calcular comidas esperadas (asumiendo 3 comidas por día)
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const expected = daysDiff * 3; // 3 comidas por día

  const adherence = Math.min(100, Math.round((logged / expected) * 100));

  return { adherence, logged, expected };
}

/**
 * Calcula la adherencia de entrenamientos
 */
async function calculateWorkoutAdherence(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ adherence: number; completed: number; expected: number }> {
  // Obtener entrenamientos completados en el período
  const { data: completions } = await supabase
    .from('workout_completions')
    .select('id')
    .eq('user_id', userId)
    .gte('completed_at', startDate.toISOString())
    .lte('completed_at', endDate.toISOString());

  const completed = completions?.length || 0;

  // Obtener plan de entrenamiento del usuario
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('available_days')
    .eq('user_id', userId)
    .single();

  // Calcular entrenamientos esperados (basado en días disponibles del plan)
  const availableDaysPerWeek = profile?.available_days || 3;
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const weeks = Math.ceil(daysDiff / 7);
  const expected = weeks * availableDaysPerWeek;

  const adherence = Math.min(100, Math.round((completed / expected) * 100));

  return { adherence, completed, expected };
}

/**
 * Obtiene estadísticas de entrenamientos del usuario
 */
export async function getWorkoutStats(userId: string, days: number = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: completions } = await supabase
    .from('workout_completions')
    .select('*')
    .eq('user_id', userId)
    .gte('completed_at', startDate.toISOString())
    .lte('completed_at', endDate.toISOString())
    .order('completed_at', { ascending: false });

  const totalWorkouts = completions?.length || 0;
  const totalDuration = completions?.reduce((sum, c) => sum + (c.duration_minutes || 0), 0) || 0;
  const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0;
  const avgDifficulty = completions?.length > 0
    ? Math.round(completions.reduce((sum, c) => sum + (c.difficulty_rating || 3), 0) / completions.length)
    : 0;

  return {
    totalWorkouts,
    totalDuration,
    avgDuration,
    avgDifficulty,
    completions: completions || [],
  };
}

