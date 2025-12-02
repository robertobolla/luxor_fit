import { supabase } from './supabase';
import { applyWeeklyAdjustment } from './nutrition';
import { scheduleNotificationAsync } from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Servicio para gestionar el check-in semanal y ajuste de dieta
 */

// Keys para AsyncStorage
const LAST_CHECKIN_KEY = 'last_weekly_checkin_date';
const CHECKIN_REMINDER_SHOWN_KEY = 'checkin_reminder_shown_this_week';

export interface BodyMeasurement {
  id?: string;
  user_id: string;
  measured_at: string;
  weight_kg: number;
  body_fat_percentage?: number | null;
  muscle_percentage?: number | null;
  chest_cm?: number | null;
  waist_cm?: number | null;
  hips_cm?: number | null;
  arms_cm?: number | null;
  thighs_cm?: number | null;
  notes?: string | null;
  source?: string;
}

export interface WeeklyChanges {
  weight_change_kg: number;
  body_fat_change: number | null;
  muscle_change: number | null;
  weeks_tracked: number;
}

export interface CheckinStatus {
  needsCheckin: boolean;
  lastCheckin: BodyMeasurement | null;
  weeksSinceLastCheckin: number;
  currentWeekStart: string;
}

/**
 * Obtiene el inicio de la semana actual (Lunes)
 */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar al lunes
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

/**
 * Verifica si el usuario necesita hacer check-in esta semana
 */
export async function checkIfNeedsWeeklyCheckin(userId: string): Promise<CheckinStatus> {
  try {
    const currentWeekStart = getWeekStart();
    
    // Obtener última medida del usuario
    const { data: lastMeasurement } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .order('measured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastMeasurement) {
      // Primera vez - necesita check-in
      return {
        needsCheckin: true,
        lastCheckin: null,
        weeksSinceLastCheckin: 0,
        currentWeekStart,
      };
    }

    // Calcular semanas desde último check-in
    const lastCheckinDate = new Date(lastMeasurement.measured_at);
    const lastCheckinWeek = getWeekStart(lastCheckinDate);
    
    // Si el último check-in fue esta semana, no necesita otro
    const needsCheckin = lastCheckinWeek !== currentWeekStart;
    
    // Calcular semanas transcurridas
    const weeksDiff = Math.floor(
      (new Date(currentWeekStart).getTime() - new Date(lastCheckinWeek).getTime()) / 
      (7 * 24 * 60 * 60 * 1000)
    );

    return {
      needsCheckin,
      lastCheckin: lastMeasurement as BodyMeasurement,
      weeksSinceLastCheckin: weeksDiff,
      currentWeekStart,
    };
  } catch (error) {
    console.error('Error checking weekly checkin status:', error);
    return {
      needsCheckin: false,
      lastCheckin: null,
      weeksSinceLastCheckin: 0,
      currentWeekStart: getWeekStart(),
    };
  }
}

/**
 * Guarda una nueva medida corporal
 */
export async function saveBodyMeasurement(
  userId: string,
  measurement: Omit<BodyMeasurement, 'id' | 'user_id' | 'measured_at'>
): Promise<{ success: boolean; measurement?: BodyMeasurement; error?: string }> {
  try {
    console.log('💾 Guardando medida corporal...');
    
    const newMeasurement: BodyMeasurement = {
      user_id: userId,
      measured_at: new Date().toISOString(),
      ...measurement,
      source: measurement.source || 'manual',
    };

    const { data, error } = await supabase
      .from('body_measurements')
      .insert(newMeasurement)
      .select()
      .single();

    if (error) {
      console.error('Error guardando medida:', error);
      return { success: false, error: error.message };
    }

    // Actualizar también el perfil del usuario con el nuevo peso
    await supabase
      .from('user_profiles')
      .update({ 
        weight: measurement.weight_kg,
        body_fat_percentage: measurement.body_fat_percentage,
        muscle_percentage: measurement.muscle_percentage,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Guardar fecha del último check-in
    await AsyncStorage.setItem(LAST_CHECKIN_KEY, new Date().toISOString());
    await AsyncStorage.removeItem(CHECKIN_REMINDER_SHOWN_KEY);

    console.log('✅ Medida corporal guardada exitosamente');
    return { success: true, measurement: data as BodyMeasurement };
  } catch (err: any) {
    console.error('Error en saveBodyMeasurement:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene el historial de medidas del usuario
 */
export async function getBodyMeasurementHistory(
  userId: string,
  limit: number = 12
): Promise<BodyMeasurement[]> {
  try {
    const { data, error } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', userId)
      .order('measured_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error obteniendo historial:', error);
      return [];
    }

    return (data || []) as BodyMeasurement[];
  } catch (error) {
    console.error('Error en getBodyMeasurementHistory:', error);
    return [];
  }
}

/**
 * Calcula los cambios semanales
 */
export async function calculateWeeklyChanges(userId: string): Promise<WeeklyChanges | null> {
  try {
    // Obtener las dos últimas medidas
    const measurements = await getBodyMeasurementHistory(userId, 2);
    
    if (measurements.length < 2) {
      // No hay suficientes datos para comparar
      return null;
    }

    const latest = measurements[0];
    const previous = measurements[1];

    return {
      weight_change_kg: latest.weight_kg - previous.weight_kg,
      body_fat_change: 
        latest.body_fat_percentage && previous.body_fat_percentage
          ? latest.body_fat_percentage - previous.body_fat_percentage
          : null,
      muscle_change:
        latest.muscle_percentage && previous.muscle_percentage
          ? latest.muscle_percentage - previous.muscle_percentage
          : null,
      weeks_tracked: measurements.length,
    };
  } catch (error) {
    console.error('Error calculando cambios semanales:', error);
    return null;
  }
}

/**
 * Proceso completo de check-in: guarda medidas y ajusta dieta
 */
export async function performWeeklyCheckin(
  userId: string,
  measurement: Omit<BodyMeasurement, 'id' | 'user_id' | 'measured_at'>
): Promise<{
  success: boolean;
  measurement?: BodyMeasurement;
  adjustment?: {
    calories: number;
    caloriesChange: number;
    explanation: string;
    educationalMessage: string;
  };
  changes?: WeeklyChanges;
  error?: string;
}> {
  try {
    console.log('🔄 Iniciando check-in semanal...');

    // 1. Guardar la medida
    const measurementResult = await saveBodyMeasurement(userId, measurement);
    if (!measurementResult.success) {
      return { success: false, error: measurementResult.error };
    }

    // 2. Calcular cambios semanales
    const changes = await calculateWeeklyChanges(userId);

    // 3. Aplicar ajuste de dieta si hay datos suficientes
    let adjustment;
    if (changes && changes.weeks_tracked >= 2) {
      console.log('📊 Aplicando ajuste de dieta basado en progreso...');
      const adjustmentResult = await applyWeeklyAdjustment(userId);
      
      if (adjustmentResult.success && adjustmentResult.adjustment) {
        adjustment = adjustmentResult.adjustment;
        console.log('✅ Dieta ajustada:', {
          calorías: adjustment.calories,
          cambio: adjustment.caloriesChange,
        });
      }
    } else {
      console.log('⚠️ No hay suficientes datos para ajustar dieta (se necesitan al menos 2 semanas)');
    }

    return {
      success: true,
      measurement: measurementResult.measurement,
      adjustment,
      changes: changes || undefined,
    };
  } catch (err: any) {
    console.error('Error en performWeeklyCheckin:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Verifica si debe mostrar recordatorio de check-in
 */
export async function shouldShowCheckinReminder(): Promise<boolean> {
  try {
    // Verificar si ya se mostró el recordatorio esta semana
    const reminderShown = await AsyncStorage.getItem(CHECKIN_REMINDER_SHOWN_KEY);
    const currentWeek = getWeekStart();
    
    if (reminderShown === currentWeek) {
      return false; // Ya se mostró esta semana
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Marca que se mostró el recordatorio de check-in
 */
export async function markCheckinReminderShown(): Promise<void> {
  try {
    const currentWeek = getWeekStart();
    await AsyncStorage.setItem(CHECKIN_REMINDER_SHOWN_KEY, currentWeek);
  } catch (error) {
    console.error('Error marcando recordatorio:', error);
  }
}

/**
 * Programa notificación de recordatorio de check-in semanal
 */
export async function scheduleWeeklyCheckinReminder(): Promise<void> {
  try {
    // Cancelar notificaciones anteriores de check-in
    const allNotifications = await scheduleNotificationAsync({
      content: {
        title: '📊 Check-in Semanal',
        body: 'Es hora de registrar tu peso y ajustar tu dieta para esta semana',
        data: { type: 'weekly_checkin' },
      },
      trigger: {
        weekday: 2, // Lunes (1 = Domingo, 2 = Lunes)
        hour: 9,
        minute: 0,
        repeats: true,
      },
    });

    console.log('✅ Recordatorio de check-in semanal programado');
  } catch (error) {
    console.error('Error programando recordatorio de check-in:', error);
  }
}

/**
 * Obtiene estadísticas de progreso
 */
export async function getProgressStats(userId: string): Promise<{
  totalWeeks: number;
  totalWeightChange: number;
  avgWeightChangePerWeek: number;
  bodyFatChange: number | null;
  muscleChange: number | null;
} | null> {
  try {
    const measurements = await getBodyMeasurementHistory(userId, 52); // Último año
    
    if (measurements.length < 2) {
      return null;
    }

    const latest = measurements[0];
    const oldest = measurements[measurements.length - 1];
    
    const weeksBetween = Math.floor(
      (new Date(latest.measured_at).getTime() - new Date(oldest.measured_at).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
    );

    const totalWeightChange = latest.weight_kg - oldest.weight_kg;
    
    return {
      totalWeeks: weeksBetween,
      totalWeightChange,
      avgWeightChangePerWeek: weeksBetween > 0 ? totalWeightChange / weeksBetween : 0,
      bodyFatChange:
        latest.body_fat_percentage && oldest.body_fat_percentage
          ? latest.body_fat_percentage - oldest.body_fat_percentage
          : null,
      muscleChange:
        latest.muscle_percentage && oldest.muscle_percentage
          ? latest.muscle_percentage - oldest.muscle_percentage
          : null,
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return null;
  }
}

