/**
 * Servicio para manejar records personales (PR) de ejercicios
 */

import { supabase } from './supabase';

export interface PersonalRecord {
  id?: string;
  user_id: string;
  exercise_name: string;
  workout_plan_id?: string;
  day_name?: string;
  date: string;
  weight_kg: number;
  reps: number;
  sets?: number;
  notes?: string;
  is_pr?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PRHistoryItem {
  id: string;
  date: string;
  weight_kg: number;
  reps: number;
  sets: number;
  notes?: string;
  is_pr: boolean;
  workout_plan_id?: string;
  day_name?: string;
}

/**
 * Guardar un nuevo record personal
 */
export async function savePersonalRecord(record: Omit<PersonalRecord, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string; data?: PersonalRecord }> {
  try {
    console.log('💾 Guardando record personal:', record);

    const { data, error } = await supabase
      .from('personal_records')
      .insert([record])
      .select()
      .single();

    if (error) {
      console.error('❌ Error al guardar record personal:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Record personal guardado:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error inesperado al guardar record:', error);
    return { success: false, error: 'Error inesperado al guardar' };
  }
}

/**
 * Obtener historial de records personales para un ejercicio específico
 */
export async function getExercisePRHistory(
  userId: string, 
  exerciseName: string
): Promise<{ success: boolean; data?: PRHistoryItem[]; error?: string }> {
  try {
    console.log('📊 Obteniendo historial PR para:', { userId, exerciseName });

    const { data, error } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_name', exerciseName)
      .order('date', { ascending: false })
      .order('weight_kg', { ascending: false })
      .order('reps', { ascending: false });

    if (error) {
      console.error('❌ Error al obtener historial PR:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Historial PR obtenido: ${data?.length || 0} registros`);
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('❌ Error inesperado al obtener historial PR:', error);
    return { success: false, error: 'Error inesperado al obtener historial' };
  }
}

/**
 * Obtener el mejor record personal (PR) para un ejercicio específico
 */
export async function getExercisePR(
  userId: string, 
  exerciseName: string
): Promise<{ success: boolean; data?: PersonalRecord; error?: string }> {
  try {
    console.log('🏆 Obteniendo PR para:', { userId, exerciseName });

    const { data, error } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', userId)
      .eq('exercise_name', exerciseName)
      .eq('is_pr', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No hay PR registrado aún
        console.log('ℹ️ No hay PR registrado para este ejercicio');
        return { success: true, data: undefined };
      }
      console.error('❌ Error al obtener PR:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ PR obtenido:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Error inesperado al obtener PR:', error);
    return { success: false, error: 'Error inesperado al obtener PR' };
  }
}

/**
 * Obtener todos los PRs del usuario
 */
export async function getAllUserPRs(userId: string): Promise<{ success: boolean; data?: PersonalRecord[]; error?: string }> {
  try {
    console.log('🏆 Obteniendo todos los PRs del usuario:', userId);

    const { data, error } = await supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', userId)
      .eq('is_pr', true)
      .order('exercise_name', { ascending: true });

    if (error) {
      console.error('❌ Error al obtener PRs:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ PRs obtenidos: ${data?.length || 0} ejercicios`);
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('❌ Error inesperado al obtener PRs:', error);
    return { success: false, error: 'Error inesperado al obtener PRs' };
  }
}

/**
 * Eliminar un record personal
 */
export async function deletePersonalRecord(recordId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ Eliminando record personal:', recordId);

    const { error } = await supabase
      .from('personal_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error('❌ Error al eliminar record:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Record personal eliminado');
    return { success: true };
  } catch (error) {
    console.error('❌ Error inesperado al eliminar record:', error);
    return { success: false, error: 'Error inesperado al eliminar' };
  }
}

/**
 * Formatear peso para mostrar
 */
export function formatWeight(weightKg: number): string {
  if (weightKg >= 1000) {
    return `${(weightKg / 1000).toFixed(1)}t`;
  } else if (weightKg >= 1) {
    return `${weightKg.toFixed(1)}kg`;
  } else {
    return `${(weightKg * 1000).toFixed(0)}g`;
  }
}

/**
 * Formatear fecha para mostrar
 */
export function formatPRDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return 'Ayer';
  } else if (diffDays < 7) {
    return `Hace ${diffDays} días`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Hace ${weeks} semana${weeks > 1 ? 's' : ''}`;
  } else {
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}
