import { supabase } from './supabase';
import { BodyMetric } from '../types/nutrition';

export interface ProgressDataPoint {
  date: string;
  weight?: number;
  bodyFat?: number;
  muscle?: number;
  waist?: number;
}

export interface MacroDataPoint {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFats?: number;
}

export interface ProgressComparison {
  period: 'week' | 'month';
  current: {
    startDate: string;
    endDate: string;
    avgWeight?: number;
    avgBodyFat?: number;
    avgMuscle?: number;
    weightChange?: number;
    bodyFatChange?: number;
    muscleChange?: number;
  };
  previous: {
    startDate: string;
    endDate: string;
    avgWeight?: number;
    avgBodyFat?: number;
    avgMuscle?: number;
  };
}

/**
 * Obtiene datos históricos de body_metrics
 */
export async function getBodyMetricsHistory(
  userId: string,
  days: number = 30
): Promise<ProgressDataPoint[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('body_metrics')
      .select('date, weight_kg, body_fat_percentage, muscle_percentage, waist_cm')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      console.error('Error loading body metrics:', error);
      return [];
    }

    return (data || []).map((metric) => ({
      date: metric.date,
      weight: metric.weight_kg,
      bodyFat: metric.body_fat_percentage || undefined,
      muscle: metric.muscle_percentage || undefined,
      waist: metric.waist_cm || undefined,
    }));
  } catch (err) {
    console.error('Error in getBodyMetricsHistory:', err);
    return [];
  }
}

/**
 * Obtiene datos históricos de macros (targets y logs)
 */
export async function getMacrosHistory(
  userId: string,
  days: number = 30
): Promise<MacroDataPoint[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Obtener targets
    const { data: targetsData, error: targetsError } = await supabase
      .from('nutrition_targets')
      .select('date, calories, protein_g, carbs_g, fats_g')
      .eq('user_id', userId)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });

    if (targetsError) {
      console.error('Error loading nutrition targets:', targetsError);
    }

    // Obtener logs y agregar por día
    const { data: logsData, error: logsError } = await supabase
      .from('meal_logs')
      .select('datetime, calories, protein_g, carbs_g, fats_g')
      .eq('user_id', userId)
      .gte('datetime', `${startDateStr}T00:00:00`)
      .lte('datetime', `${endDateStr}T23:59:59`)
      .order('datetime', { ascending: true });

    if (logsError) {
      console.error('Error loading meal logs:', logsError);
    }

    // Agrupar logs por día
    const dailyLogs: { [date: string]: MacroDataPoint } = {};

    (logsData || []).forEach((log) => {
      const date = log.datetime.split('T')[0];
      if (!dailyLogs[date]) {
        dailyLogs[date] = {
          date,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
        };
      }
      dailyLogs[date].calories += log.calories;
      dailyLogs[date].protein += log.protein_g;
      dailyLogs[date].carbs += log.carbs_g;
      dailyLogs[date].fats += log.fats_g;
    });

    // Combinar targets con logs
    const targetsMap = new Map(
      (targetsData || []).map((t) => [t.date, t])
    );

    const result: MacroDataPoint[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const target = targetsMap.get(dateStr);
      const log = dailyLogs[dateStr];

      if (target || log) {
        result.push({
          date: dateStr,
          calories: log?.calories || 0,
          protein: log?.protein || 0,
          carbs: log?.carbs || 0,
          fats: log?.fats || 0,
          targetCalories: target?.calories,
          targetProtein: target?.protein_g,
          targetCarbs: target?.carbs_g,
          targetFats: target?.fats_g,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  } catch (err) {
    console.error('Error in getMacrosHistory:', err);
    return [];
  }
}

/**
 * Obtiene comparación semana a semana o mes a mes
 */
export async function getProgressComparison(
  userId: string,
  period: 'week' | 'month' = 'week'
): Promise<ProgressComparison | null> {
  try {
    const today = new Date();
    const daysBack = period === 'week' ? 14 : 60;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const { data, error } = await supabase
      .from('body_metrics')
      .select('date, weight_kg, body_fat_percentage, muscle_percentage')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error || !data || data.length === 0) {
      return null;
    }

    const days = period === 'week' ? 7 : 30;
    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate() - days);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - days);

    const currentData = data.filter(
      (m) => m.date >= currentStart.toISOString().split('T')[0]
    );
    const previousData = data.filter(
      (m) =>
        m.date >= previousStart.toISOString().split('T')[0] &&
        m.date < currentStart.toISOString().split('T')[0]
    );

    const calculateAvg = (
      metrics: typeof data,
      field: 'weight_kg' | 'body_fat_percentage' | 'muscle_percentage'
    ) => {
      const values = metrics
        .map((m) => m[field])
        .filter((v): v is number => v !== null && v !== undefined);
      return values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : undefined;
    };

    const currentAvgWeight = calculateAvg(currentData, 'weight_kg');
    const previousAvgWeight = calculateAvg(previousData, 'weight_kg');
    const currentAvgBodyFat = calculateAvg(currentData, 'body_fat_percentage');
    const previousAvgBodyFat = calculateAvg(previousData, 'body_fat_percentage');
    const currentAvgMuscle = calculateAvg(currentData, 'muscle_percentage');
    const previousAvgMuscle = calculateAvg(previousData, 'muscle_percentage');

    return {
      period,
      current: {
        startDate: currentStart.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0],
        avgWeight: currentAvgWeight,
        avgBodyFat: currentAvgBodyFat,
        avgMuscle: currentAvgMuscle,
        weightChange:
          currentAvgWeight && previousAvgWeight
            ? currentAvgWeight - previousAvgWeight
            : undefined,
        bodyFatChange:
          currentAvgBodyFat && previousAvgBodyFat
            ? currentAvgBodyFat - previousAvgBodyFat
            : undefined,
        muscleChange:
          currentAvgMuscle && previousAvgMuscle
            ? currentAvgMuscle - previousAvgMuscle
            : undefined,
      },
      previous: {
        startDate: previousStart.toISOString().split('T')[0],
        endDate: currentStart.toISOString().split('T')[0],
        avgWeight: previousAvgWeight,
        avgBodyFat: previousAvgBodyFat,
        avgMuscle: previousAvgMuscle,
      },
    };
  } catch (err) {
    console.error('Error in getProgressComparison:', err);
    return null;
  }
}

/**
 * Calcula progreso hacia objetivos basado en el perfil del usuario
 */
export async function getProgressToGoals(
  userId: string
): Promise<{
  weightProgress?: {
    current: number;
    target: number;
    progress: number; // 0-100
    direction: 'lose' | 'gain' | 'maintain';
  };
  bodyFatProgress?: {
    current: number;
    target: number;
    progress: number;
  };
  muscleProgress?: {
    current: number;
    target: number;
    progress: number;
  };
} | null> {
  try {
    // Obtener perfil del usuario para objetivos
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('weight, goals, body_fat_percentage, muscle_percentage')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      return null;
    }

    // Obtener última medición
    const { data: latestMetric, error: metricError } = await supabase
      .from('body_metrics')
      .select('weight_kg, body_fat_percentage, muscle_percentage')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (metricError || !latestMetric) {
      return null;
    }

    const result: any = {};

    // Progreso de peso
    if (latestMetric.weight_kg && profile.weight) {
      const goals = profile.goals || [];
      const isCut = goals.includes('cut' as any) || goals.includes('lose_weight' as any);
      const isBulk = goals.includes('bulk' as any) || goals.includes('gain_muscle' as any);

      let target = profile.weight;
      let direction: 'lose' | 'gain' | 'maintain' = 'maintain';

      if (isCut) {
        // Asumir objetivo de perder 5-10% del peso inicial
        target = profile.weight * 0.9;
        direction = 'lose';
      } else if (isBulk) {
        // Asumir objetivo de ganar 5-10% del peso inicial
        target = profile.weight * 1.1;
        direction = 'gain';
      }

      const current = latestMetric.weight_kg;
      const totalChangeNeeded = Math.abs(target - profile.weight);
      const currentChange = Math.abs(current - profile.weight);
      const progress = totalChangeNeeded > 0
        ? Math.min(100, (currentChange / totalChangeNeeded) * 100)
        : 100;

      result.weightProgress = {
        current,
        target,
        progress,
        direction,
      };
    }

    // Progreso de grasa corporal (objetivo saludable: 10-20% hombres, 18-28% mujeres)
    if (latestMetric.body_fat_percentage) {
      const healthyRange = { min: 10, max: 20 }; // Simplificado para hombres
      const current = latestMetric.body_fat_percentage;
      const target = (healthyRange.min + healthyRange.max) / 2;
      const progress =
        current <= target
          ? ((current - healthyRange.min) / (target - healthyRange.min)) * 100
          : 100 - ((current - target) / (healthyRange.max - target)) * 100;

      result.bodyFatProgress = {
        current,
        target,
        progress: Math.max(0, Math.min(100, progress)),
      };
    }

    // Progreso de masa muscular
    if (latestMetric.muscle_percentage) {
      const current = latestMetric.muscle_percentage;
      // Objetivo: aumentar músculo (asumir +5% como objetivo)
      const target = current + 5;
      const progress = Math.min(100, (current / target) * 100);

      result.muscleProgress = {
        current,
        target,
        progress,
      };
    }

    return result;
  } catch (err) {
    console.error('Error in getProgressToGoals:', err);
    return null;
  }
}

