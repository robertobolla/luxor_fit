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
 * Obtener días con ejercicio en un mes
 */
export async function getDaysWithExercise(
  userId: string,
  year: number,
  month: number
): Promise<number[]> {
  try {
    // Formato: YYYY-MM-DD
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`;

    const { data, error } = await supabase
      .from('exercises')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('❌ Error al obtener días con ejercicio:', error);
      return [];
    }

    // Extraer los días del mes
    const days = data.map((item) => {
      const date = new Date(item.date);
      return date.getDate();
    });

    // Eliminar duplicados
    return [...new Set(days)];
  } catch (error) {
    console.error('❌ Error inesperado al obtener días con ejercicio:', error);
    return [];
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


