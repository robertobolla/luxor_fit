import { supabase } from './supabase';
import { 
  scheduleNotificationAsync, 
  cancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync 
} from 'expo-notifications';

export interface NotificationConfig {
  id: string;
  title: string;
  body: string;
  data?: any;
  trigger?: any;
}

export interface AdherenceData {
  userId: string;
  currentStreak: number;
  weeklyGoal: number;
  weeklyCompleted: number;
  lastWorkoutDate?: string;
  averageWorkoutTime?: string;
  preferredWorkoutDays: string[];
}

export interface NotificationRule {
  id: string;
  name: string;
  condition: (data: AdherenceData) => boolean;
  generateNotification: (data: AdherenceData) => NotificationConfig;
  priority: 'low' | 'medium' | 'high';
  cooldownHours: number; // Evitar spam
}

class SmartNotificationService {
  private rules: NotificationRule[] = [];

  constructor() {
    this.initializeRules();
  }

  private initializeRules() {
    this.rules = [
      // Recordatorio por falta de adherencia
      {
        id: 'missed_workout_reminder',
        name: 'Recordatorio por entrenamiento perdido',
        condition: (data) => {
          if (!data.lastWorkoutDate) return false;
          const daysSinceLastWorkout = this.getDaysSince(data.lastWorkoutDate);
          return daysSinceLastWorkout >= 2 && data.currentStreak > 0;
        },
        generateNotification: (data) => ({
          id: 'missed_workout_reminder',
          title: '💪 ¡No te rindas!',
          body: `Llevas ${this.getDaysSince(data.lastWorkoutDate!)} días sin entrenar. Tu racha de ${data.currentStreak} días te está esperando.`,
          data: { type: 'motivation', action: 'open_workout' }
        }),
        priority: 'medium',
        cooldownHours: 24
      },

      // Felicitación por streak
      {
        id: 'streak_celebration',
        name: 'Celebración de racha',
        condition: (data) => {
          return data.currentStreak > 0 && 
                 (data.currentStreak === 3 || data.currentStreak === 7 || 
                  data.currentStreak === 14 || data.currentStreak % 30 === 0);
        },
        generateNotification: (data) => ({
          id: 'streak_celebration',
          title: '🔥 ¡Racha increíble!',
          body: this.getStreakMessage(data.currentStreak),
          data: { type: 'celebration', streak: data.currentStreak }
        }),
        priority: 'high',
        cooldownHours: 12
      },

      // Recordatorio de meta semanal
      {
        id: 'weekly_goal_reminder',
        name: 'Recordatorio de meta semanal',
        condition: (data) => {
          const today = new Date().getDay(); // 0 = domingo, 6 = sábado
          const isWeekend = today === 0 || today === 6;
          const weeklyProgress = data.weeklyCompleted / data.weeklyGoal;
          
          return isWeekend && weeklyProgress < 0.8 && data.weeklyCompleted > 0;
        },
        generateNotification: (data) => ({
          id: 'weekly_goal_reminder',
          title: '📊 Meta semanal',
          body: `Te faltan ${data.weeklyGoal - data.weeklyCompleted} entrenamientos para cumplir tu meta semanal. ¡Tú puedes!`,
          data: { type: 'goal', weeklyProgress: data.weeklyCompleted / data.weeklyGoal }
        }),
        priority: 'medium',
        cooldownHours: 48
      },

      // Sugerencia de mejor momento para entrenar
      {
        id: 'optimal_timing_suggestion',
        name: 'Sugerencia de horario óptimo',
        condition: (data) => {
          if (!data.averageWorkoutTime) return false;
          const currentHour = new Date().getHours();
          const optimalHour = this.parseWorkoutTime(data.averageWorkoutTime);
          
          // Sugerir 1 hora antes del horario promedio
          return Math.abs(currentHour - (optimalHour - 1)) <= 1 && 
                 data.currentStreak > 0;
        },
        generateNotification: (data) => ({
          id: 'optimal_timing_suggestion',
          title: '⏰ Momento perfecto',
          body: `Es tu hora favorita para entrenar. ¿Listo para mantener tu racha de ${data.currentStreak} días?`,
          data: { type: 'timing', suggestedTime: data.averageWorkoutTime }
        }),
        priority: 'low',
        cooldownHours: 6
      },

      // Motivación para nuevos usuarios
      {
        id: 'new_user_motivation',
        name: 'Motivación para nuevos usuarios',
        condition: (data) => {
          return data.currentStreak === 0 && data.weeklyCompleted === 0;
        },
        generateNotification: (data) => ({
          id: 'new_user_motivation',
          title: '🚀 ¡Comienza tu viaje!',
          body: 'Tu primer entrenamiento te está esperando. Cada gran viaje comienza con un solo paso.',
          data: { type: 'motivation', action: 'open_workout_generator' }
        }),
        priority: 'high',
        cooldownHours: 24
      },

      // Recordatorio de PR
      {
        id: 'pr_reminder',
        name: 'Recordatorio de records personales',
        condition: (data) => {
          const daysSinceLastWorkout = data.lastWorkoutDate ? 
            this.getDaysSince(data.lastWorkoutDate) : 999;
          return daysSinceLastWorkout >= 1 && daysSinceLastWorkout <= 3;
        },
        generateNotification: (data) => ({
          id: 'pr_reminder',
          title: '🏆 ¡Es hora de superarte!',
          body: 'Tu próximo entrenamiento podría ser el de tu nuevo record personal. ¡Vamos!',
          data: { type: 'pr', action: 'open_workout' }
        }),
        priority: 'low',
        cooldownHours: 12
      }
    ];
  }

  private getDaysSince(dateString: string): number {
    const lastDate = new Date(dateString);
    const today = new Date();
    const diffTime = today.getTime() - lastDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  private getStreakMessage(streak: number): string {
    if (streak === 3) return '¡3 días consecutivos! Estás construyendo un hábito sólido.';
    if (streak === 7) return '¡Una semana completa! Tu disciplina es admirable.';
    if (streak === 14) return '¡2 semanas seguidas! Eres una máquina de consistencia.';
    if (streak === 30) return '¡¡¡UN MES COMPLETO!!! Eres una inspiración.';
    if (streak % 30 === 0) return `¡${streak} días consecutivos! Tu dedicación es extraordinaria.`;
    return `¡${streak} días seguidos! Sigue así.`;
  }

  private parseWorkoutTime(timeString: string): number {
    // Parsear formato "HH:MM" o similar
    const match = timeString.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 18; // Default: 6 PM
  }

  async getAdherenceData(userId: string): Promise<AdherenceData> {
    try {
      // Obtener datos del usuario
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Obtener completados de esta semana
      const startOfWeek = this.getStartOfWeek();
      const { data: weeklyCompletions } = await supabase
        .from('workout_completions')
        .select('completed_at')
        .eq('user_id', userId)
        .gte('completed_at', startOfWeek.toISOString());

      // Obtener último entrenamiento
      const { data: lastWorkout } = await supabase
        .from('workout_completions')
        .select('completed_at')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      // Calcular racha actual
      const currentStreak = await this.calculateCurrentStreak(userId);

      // Obtener meta semanal del plan activo
      const { data: activePlan } = await supabase
        .from('workout_plans')
        .select('plan_data')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      let weeklyGoal = 3; // Default
      if (activePlan?.plan_data?.days_per_week) {
        weeklyGoal = activePlan.plan_data.days_per_week;
      }

      // Calcular horario promedio de entrenamiento
      const { data: workoutTimes } = await supabase
        .from('workout_completions')
        .select('completed_at')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(10);

      let averageWorkoutTime: string | undefined;
      if (workoutTimes && workoutTimes.length > 0) {
        const hours = workoutTimes.map(w => new Date(w.completed_at).getHours());
        const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
        averageWorkoutTime = `${avgHour.toString().padStart(2, '0')}:00`;
      }

      return {
        userId,
        currentStreak,
        weeklyGoal,
        weeklyCompleted: weeklyCompletions?.length || 0,
        lastWorkoutDate: lastWorkout?.completed_at,
        averageWorkoutTime,
        preferredWorkoutDays: profile?.available_days ? 
          this.parseAvailableDays(profile.available_days) : []
      };
    } catch (error) {
      console.error('Error obteniendo datos de adherencia:', error);
      return {
        userId,
        currentStreak: 0,
        weeklyGoal: 3,
        weeklyCompleted: 0,
        preferredWorkoutDays: []
      };
    }
  }

  private getStartOfWeek(): Date {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Lunes
    return new Date(today.setDate(diff));
  }

  private async calculateCurrentStreak(userId: string): Promise<number> {
    try {
      const { data: completions } = await supabase
        .from('workout_completions')
        .select('completed_at')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (!completions || completions.length === 0) return 0;

      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      for (const completion of completions) {
        const completionDate = new Date(completion.completed_at);
        completionDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor(
          (currentDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === streak) {
          streak++;
        } else if (diffDays === streak + 1) {
          // Permitir un día de diferencia (ej: entrenó ayer)
          streak++;
          currentDate = completionDate;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculando racha:', error);
      return 0;
    }
  }

  private parseAvailableDays(availableDays: number): string[] {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return days.slice(0, availableDays);
  }

  async scheduleSmartNotifications(userId: string): Promise<void> {
    try {
      const adherenceData = await this.getAdherenceData(userId);
      
      // Cancelar notificaciones existentes
      await this.cancelExistingNotifications(userId);

      // Evaluar reglas y programar notificaciones
      for (const rule of this.rules) {
        if (rule.condition(adherenceData)) {
          const notification = rule.generateNotification(adherenceData);
          await this.scheduleNotification(notification, rule);
        }
      }

      console.log('✅ Notificaciones inteligentes programadas');
    } catch (error) {
      console.error('Error programando notificaciones:', error);
    }
  }

  private async scheduleNotification(
    notification: NotificationConfig, 
    rule: NotificationRule
  ): Promise<void> {
    try {
      const trigger = {
        seconds: this.getRandomDelay(rule.cooldownHours),
        repeats: false
      };

      await scheduleNotificationAsync({
        identifier: `${notification.id}_${Date.now()}`,
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data
        },
        trigger
      });
    } catch (error) {
      console.error('Error programando notificación:', error);
    }
  }

  private getRandomDelay(cooldownHours: number): number {
    // Retraso aleatorio entre 1 hora y el cooldown máximo
    const minDelay = 3600; // 1 hora
    const maxDelay = cooldownHours * 3600;
    return Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
  }

  private async cancelExistingNotifications(userId: string): Promise<void> {
    try {
      // En una implementación real, guardarías los IDs de notificaciones programadas
      // Por ahora, obtenemos todas las notificaciones programadas y las cancelamos
      const scheduledNotifications = await getAllScheduledNotificationsAsync();
      
      // Cancelar todas las notificaciones programadas
      for (const notification of scheduledNotifications) {
        await cancelScheduledNotificationAsync(notification.identifier);
      }
      
      console.log(`🗑️ Canceladas ${scheduledNotifications.length} notificaciones existentes`);
    } catch (error) {
      console.error('Error cancelando notificaciones:', error);
    }
  }

  // Método para notificaciones inmediatas (ej: después de completar entrenamiento)
  async sendImmediateNotification(
    userId: string, 
    type: 'workout_completed' | 'pr_achieved' | 'goal_reached',
    data?: any
  ): Promise<void> {
    const notifications = {
      workout_completed: {
        title: '🎉 ¡Entrenamiento completado!',
        body: 'Excelente trabajo. Tu cuerpo te lo agradecerá.',
        data: { type: 'celebration', action: 'view_progress' }
      },
      pr_achieved: {
        title: '🏆 ¡Nuevo record personal!',
        body: `¡Increíble! Has superado tu mejor marca en ${data?.exercise || 'este ejercicio'}.`,
        data: { type: 'pr', exercise: data?.exercise }
      },
      goal_reached: {
        title: '🎯 ¡Meta alcanzada!',
        body: `¡Felicidades! Has cumplido tu meta de ${data?.goal || 'esta semana'}.`,
        data: { type: 'goal', goal: data?.goal }
      }
    };

    const notification = notifications[type];
    if (notification) {
      await scheduleNotificationAsync({
        identifier: `immediate_${type}_${Date.now()}`,
        content: notification,
        trigger: { seconds: 1 }
      });
    }
  }
}

export const smartNotificationService = new SmartNotificationService();
