import { supabase } from './supabase';

export interface RoutePoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp?: number;
}

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
  route_points?: RoutePoint[];
  elevation_gain?: number; // Desnivel positivo en metros
  elevation_loss?: number; // Desnivel negativo en metros
  created_at?: string;
}

/**
 * Guardar una nueva actividad de ejercicio
 */
export async function saveExercise(exercise: Exercise): Promise<{ success: boolean; error?: string; exerciseId?: string }> {
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
    return { success: true, exerciseId: data?.id };
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
 * Obtener las fechas de los días con ejercicio en la semana actual
 */
export async function getExerciseDaysDatesThisWeek(userId: string): Promise<string[]> {
  try {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

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
      });
    }

    return Array.from(daysSet);
  } catch (error) {
    console.error('❌ Error al obtener fechas de ejercicio de la semana:', error);
    return [];
  }
}

/**
 * Obtener el número de días de ejercicio en la semana actual
 */
export async function getExerciseDaysThisWeek(userId: string): Promise<number> {
  const dates = await getExerciseDaysDatesThisWeek(userId);
  return dates.length;
}

/**
 * Limpiar planes activos duplicados - mantener solo el más reciente
 */
export async function cleanupActivePlans(userId: string): Promise<void> {
  try {
    console.log('🧹 Limpiando planes activos duplicados...');
    
    // Obtener todos los planes activos ordenados por fecha de creación
    const { data: activePlans, error: fetchError } = await supabase
      .from('workout_plans')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error al obtener planes activos:', fetchError);
      return;
    }

    if (!activePlans || activePlans.length <= 1) {
      console.log('✅ Solo hay un plan activo o ninguno, no se necesita limpieza');
      return;
    }

    console.log(`🔍 Encontrados ${activePlans.length} planes activos, manteniendo solo el más reciente`);

    // Mantener solo el primer plan (más reciente) y desactivar el resto
    const plansToDeactivate = activePlans.slice(1);
    const planIdsToDeactivate = plansToDeactivate.map(plan => plan.id);

    if (planIdsToDeactivate.length > 0) {
      const { error: updateError } = await supabase
        .from('workout_plans')
        .update({ is_active: false })
        .in('id', planIdsToDeactivate);

      if (updateError) {
        console.error('❌ Error al desactivar planes duplicados:', updateError);
      } else {
        console.log(`✅ Desactivados ${planIdsToDeactivate.length} planes duplicados`);
      }
    }
  } catch (error) {
    console.error('❌ Error inesperado al limpiar planes activos:', error);
  }
}

/**
 * Obtener las fechas de los días de gimnasio (solo entrenamientos completados) en la semana actual
 */
export async function getGymDaysDatesThisWeek(userId: string): Promise<string[]> {
  try {
    // Limpiar planes activos duplicados antes de continuar
    await cleanupActivePlans(userId);
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Obtener días con entrenamientos completados (solo gimnasio)
    const { data: workoutCompletionsData, error: completionsError } = await supabase
      .from('workout_completions')
      .select('completed_at, day_name')
      .eq('user_id', userId)
      .gte('completed_at', startOfWeek.toISOString())
      .lte('completed_at', endOfWeek.toISOString());

    if (completionsError) {
      console.error('❌ Error al obtener entrenamientos completados:', completionsError);
      return [];
    }

    const daysSet = new Set<string>();

    // Agregar días de entrenamientos completados
    if (workoutCompletionsData) {
      workoutCompletionsData.forEach((item) => {
        const date = new Date(item.completed_at);
        const dateStr = date.toISOString().split('T')[0];
        daysSet.add(dateStr);
      });
    }

    return Array.from(daysSet);
  } catch (error) {
    console.error('❌ Error al obtener fechas de gimnasio de la semana:', error);
    return [];
  }
}

/**
 * Obtener días de gimnasio (solo entrenamientos completados) en la semana actual
 * Retorna tanto el número de días como la meta del plan de entrenamiento activo
 */
export async function getGymDaysThisWeek(userId: string): Promise<{ days: number; goal: number }> {
  try {
    const dates = await getGymDaysDatesThisWeek(userId);
    const gymDaysCount = dates.length;

    // Obtener la meta del plan de entrenamiento activo
    let goal = 3; // Fallback por defecto
    
    try {
      // Buscar el plan de entrenamiento activo del usuario
      const { data: activePlans, error: planError } = await supabase
        .from('workout_plans')
        .select('plan_data')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!planError && activePlans && activePlans.length > 0) {
        const activePlan = activePlans[0];
        // Contar cuántos días de entrenamiento tiene el plan
        const planData = activePlan.plan_data;
        console.log('📋 Plan data encontrado:', planData);
        
        // El plan_data puede tener diferentes estructuras, vamos a buscar weekly_structure
        let weeklyStructure = null;
        
        if (planData.weekly_structure) {
          weeklyStructure = planData.weekly_structure;
        } else if (planData.weekly_plan) {
          weeklyStructure = planData.weekly_plan;
        } else if (planData.structure) {
          weeklyStructure = planData.structure;
        }
        
        if (weeklyStructure) {
          // weekly_structure es un array de objetos con estructura { day, focus, exercises }
          if (Array.isArray(weeklyStructure)) {
            const trainingDays = weeklyStructure.filter(day => 
              day && day.exercises && day.exercises.length > 0
            );
            goal = trainingDays.length;
            console.log(`🎯 Meta de gimnasio basada en plan activo: ${goal} días (días: ${trainingDays.map(d => d.day).join(', ')})`);
          } else {
            // Si es un objeto con días como claves
            const trainingDays = Object.keys(weeklyStructure).filter(day => 
              weeklyStructure[day] && weeklyStructure[day].exercises && weeklyStructure[day].exercises.length > 0
            );
            goal = trainingDays.length;
            console.log(`🎯 Meta de gimnasio basada en plan activo: ${goal} días (días: ${trainingDays.join(', ')})`);
          }
        } else {
          console.log('⚠️ No se encontró weekly_structure en plan_data, usando meta por defecto: 3 días');
        }
      } else {
        console.log('⚠️ No se encontró plan activo, usando meta por defecto: 3 días');
        if (planError) {
          console.error('❌ Error al buscar plan:', planError);
        }
      }
    } catch (error) {
      console.error('❌ Error al obtener meta del plan:', error);
    }
    
    return { days: gymDaysCount, goal };
  } catch (error) {
    console.error('❌ Error al obtener días de gimnasio de la semana:', error);
    return { days: 0, goal: 3 };
  }
}

/**
 * Obtener días de gimnasio (solo entrenamientos completados) en un mes específico
 */
export async function getGymDaysThisMonth(
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

    console.log('🏋️ Mes para gimnasio:', { year, month: month + 1, startDate, endDate });

    // Obtener días con entrenamientos completados (solo gimnasio)
    const { data: workoutCompletionsData, error: completionsError } = await supabase
      .from('workout_completions')
      .select('completed_at')
      .eq('user_id', userId)
      .gte('completed_at', `${startDate}T00:00:00`)
      .lte('completed_at', `${endDate}T23:59:59`);

    if (completionsError) {
      console.error('❌ Error al obtener entrenamientos completados:', completionsError);
      return [];
    }

    const daysSet = new Set<number>();

    // Agregar días de entrenamientos completados
    if (workoutCompletionsData) {
      workoutCompletionsData.forEach((item) => {
        const date = new Date(item.completed_at);
        daysSet.add(date.getDate());
      });
    }

    console.log(`✅ Días con gimnasio para ${year}-${month + 1}:`, Array.from(daysSet));

    // Convertir Set a Array
    return Array.from(daysSet);
  } catch (error) {
    console.error('❌ Error inesperado al obtener días de gimnasio:', error);
    return [];
  }
}

/**
 * Obtener un ejercicio por ID
 */
export async function getExerciseById(exerciseId: string): Promise<Exercise | null> {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('id', exerciseId)
      .single();

    if (error) {
      console.error('❌ Error al obtener ejercicio:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Error inesperado al obtener ejercicio:', error);
    return null;
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


