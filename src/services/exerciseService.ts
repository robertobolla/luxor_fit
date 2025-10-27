import { supabase } from './supabase';

export interface Exercise {
  id?: string;
  user_id: string;
  activity_type: string;
  activity_name: string;
  date: string;
  duration_minutes: number;
  distance_km?: number;
  calories?: number;
  notes?: string;
  has_gps: boolean;
  average_speed_kmh?: number;
  created_at?: string;
}

/**
 * Guardar una nueva actividad de ejercicio
 */
export async function saveExercise(exercise: Exercise): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('💾 Guardando ejercicio:', exercise);

    const { data, error } = await supabase
      .from('exercises')
      .insert([exercise])
      .select()
      .single();

    if (error) {
      console.error('❌ Error al guardar ejercicio:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Ejercicio guardado:', data);
    return { success: true };
  } catch (error) {
    console.error('❌ Error inesperado al guardar ejercicio:', error);
    return { success: false, error: 'Error inesperado al guardar' };
  }
}

/**
 * Obtener ejercicios de un usuario en un rango de fechas
 */
export async function getExercisesByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Exercise[]> {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('❌ Error al obtener ejercicios:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error inesperado al obtener ejercicios:', error);
    return [];
  }
}

/**
 * Obtener ejercicios de un día específico
 */
export async function getExercisesByDate(
  userId: string,
  date: string
): Promise<Exercise[]> {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error al obtener ejercicios del día:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error inesperado al obtener ejercicios del día:', error);
    return [];
  }
}

/**
 * Obtener días con ejercicio en un mes (incluye ejercicios y entrenamientos completados)
 */
export async function getDaysWithExercise(
  userId: string,
  year: number,
  month: number
): Promise<number[]> {
  try {
    // Calcular el último día del mes correctamente
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    // Formato: YYYY-MM-DD
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Obtener días con ejercicios tradicionales
    const { data: exercisesData, error: exercisesError } = await supabase
      .from('exercises')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (exercisesError) {
      console.error('❌ Error al obtener días con ejercicio:', exercisesError);
    }

    // Obtener días con entrenamientos completados
    const { data: workoutCompletionsData, error: completionsError } = await supabase
      .from('workout_completions')
      .select('completed_at')
      .eq('user_id', userId)
      .gte('completed_at', `${startDate}T00:00:00`)
      .lte('completed_at', `${endDate}T23:59:59`);

    if (completionsError) {
      console.error('❌ Error al obtener entrenamientos completados:', completionsError);
    }

    const daysSet = new Set<number>();

    // Agregar días de ejercicios tradicionales
    if (exercisesData) {
      exercisesData.forEach((item) => {
        const date = new Date(item.date);
        daysSet.add(date.getDate());
      });
    }

    // Agregar días de entrenamientos completados
    if (workoutCompletionsData) {
      workoutCompletionsData.forEach((item) => {
        const date = new Date(item.completed_at);
        daysSet.add(date.getDate());
      });
    }

    console.log(`✅ Días con ejercicio/entrenamiento para ${year}-${month + 1}:`, Array.from(daysSet));

    // Convertir Set a Array
    return Array.from(daysSet);
  } catch (error) {
    console.error('❌ Error inesperado al obtener días con ejercicio:', error);
    return [];
  }
}

/**
 * Obtener el número de días de ejercicio en la semana actual
 */
export async function getExerciseDaysThisWeek(userId: string): Promise<number> {
  try {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    console.log('📅 Semana actual:', {
      start: startOfWeek.toISOString(),
      end: endOfWeek.toISOString()
    });

    // Obtener días con ejercicios tradicionales
    const { data: exercisesData, error: exercisesError } = await supabase
      .from('exercises')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startOfWeek.toISOString().split('T')[0])
      .lte('date', endOfWeek.toISOString().split('T')[0]);

    if (exercisesError) {
      console.error('❌ Error al obtener ejercicios:', exercisesError);
    }

    console.log('🏃 Ejercicios tradicionales:', exercisesData?.map(e => e.date));

    // Obtener días con entrenamientos completados
    const { data: workoutCompletionsData, error: completionsError } = await supabase
      .from('workout_completions')
      .select('completed_at, day_name')
      .eq('user_id', userId)
      .gte('completed_at', startOfWeek.toISOString())
      .lte('completed_at', endOfWeek.toISOString());

    if (completionsError) {
      console.error('❌ Error al obtener entrenamientos completados:', completionsError);
    }

    console.log('🏋️ Entrenamientos completados:', workoutCompletionsData?.map(w => ({
      date: w.completed_at,
      day: w.day_name
    })));

    const daysSet = new Set<string>();

    // Agregar días de ejercicios tradicionales
    if (exercisesData) {
      exercisesData.forEach((item) => {
        daysSet.add(item.date);
      });
    }

    // Agregar días de entrenamientos completados
    if (workoutCompletionsData) {
      workoutCompletionsData.forEach((item) => {
        const date = new Date(item.completed_at);
        const dateStr = date.toISOString().split('T')[0];
        daysSet.add(dateStr);
        console.log(`📆 Entrenamiento el ${dateStr} (${item.day_name})`);
      });
    }

    const exerciseDaysCount = daysSet.size;
    console.log(`✅ Días únicos con ejercicio esta semana: ${exerciseDaysCount} (días: ${Array.from(daysSet).join(', ')})`);
    
    return exerciseDaysCount;
  } catch (error) {
    console.error('❌ Error al obtener días de ejercicio de la semana:', error);
    return 0;
  }
}

/**
 * Eliminar un ejercicio
 */
export async function deleteExercise(exerciseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', exerciseId);

    if (error) {
      console.error('❌ Error al eliminar ejercicio:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Ejercicio eliminado');
    return { success: true };
  } catch (error) {
    console.error('❌ Error inesperado al eliminar ejercicio:', error);
    return { success: false, error: 'Error inesperado al eliminar' };
  }
}


