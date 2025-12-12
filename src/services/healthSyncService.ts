import { supabase } from './supabase';
import { HealthData } from './healthService';

/**
 * Sincroniza datos de salud a Supabase para que los entrenadores puedan verlos
 */
export async function syncHealthDataToSupabase(
  userId: string,
  date: string,
  healthData: HealthData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('health_data_daily')
      .upsert(
        {
          user_id: userId,
          date: date,
          steps: healthData.steps || 0,
          distance_km: healthData.distance || 0,
          calories: healthData.calories || 0,
          active_minutes: 0, // Puedes agregar esto si tienes el dato
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,date',
        }
      );

    if (error) {
      console.error('Error syncing health data to Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error syncing health data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sincroniza múltiples días de datos de salud
 */
export async function syncHealthDataBatch(
  userId: string,
  dataArray: Array<{ date: string; healthData: HealthData }>
): Promise<{ success: boolean; synced: number; error?: string }> {
  try {
    const records = dataArray.map(({ date, healthData }) => ({
      user_id: userId,
      date: date,
      steps: healthData.steps || 0,
      distance_km: healthData.distance || 0,
      calories: healthData.calories || 0,
      active_minutes: 0,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('health_data_daily')
      .upsert(records, {
        onConflict: 'user_id,date',
      });

    if (error) {
      console.error('Error syncing health data batch:', error);
      return { success: false, synced: 0, error: error.message };
    }

    return { success: true, synced: records.length };
  } catch (error: any) {
    console.error('Error syncing health data batch:', error);
    return { success: false, synced: 0, error: error.message };
  }
}

/**
 * Obtener datos de salud sincronizados de Supabase
 */
export async function getHealthDataFromSupabase(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('health_data_daily')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error getting health data from Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error getting health data:', error);
    return { success: false, error: error.message };
  }
}

