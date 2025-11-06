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
  private lastScheduledTime: Map<string, number> = new Map(); // userId -> timestamp
  private readonly MIN_RESCHEDULE_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas en ms

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
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile for notifications:', profileError);
      }

      // Obtener completados de esta semana
      const startOfWeek = this.getStartOfWeek();
      const { data: weeklyCompletions } = await supabase
        .from('workout_completions')
        .select('completed_at')
        .eq('user_id', userId)
        .gte('completed_at', startOfWeek.toISOString());

      // Obtener último entrenamiento
      const { data: lastWorkout, error: lastWorkoutError } = await supabase
        .from('workout_completions')
        .select('completed_at')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastWorkoutError && lastWorkoutError.code !== 'PGRST116') {
        console.error('Error loading last workout:', lastWorkoutError);
      }

      // Calcular racha actual
      const currentStreak = await this.calculateCurrentStreak(userId);

      // Obtener meta semanal del plan activo
      const { data: activePlan, error: planError } = await supabase
        .from('workout_plans')
        .select('plan_data')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (planError && planError.code !== 'PGRST116') {
        console.error('Error loading active plan for notifications:', planError);
      }

      let weeklyGoal = 3; // Default
      if (activePlan) {
        const planData = (activePlan as any).plan_data;
        if (planData && typeof planData === 'object' && planData !== null && 'days_per_week' in planData) {
          weeklyGoal = planData.days_per_week;
        }
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
        const hours = workoutTimes.map((w: any) => new Date(w.completed_at).getHours());
        const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
        averageWorkoutTime = `${avgHour.toString().padStart(2, '0')}:00`;
      }

      const lastWorkoutDate = lastWorkout && typeof lastWorkout === 'object' && 'completed_at' in lastWorkout
        ? new Date((lastWorkout as any).completed_at).toISOString().split('T')[0]
        : undefined;

      const preferredWorkoutDays = profile && typeof profile === 'object' && profile !== null && 'available_days' in profile && (profile as any).available_days
        ? this.parseAvailableDays((profile as any).available_days)
        : [];

      return {
        userId,
        currentStreak,
        weeklyGoal,
        weeklyCompleted: weeklyCompletions?.length || 0,
        lastWorkoutDate,
        averageWorkoutTime,
        preferredWorkoutDays
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
        const completionDate = new Date((completion as any).completed_at);
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
      // Verificar si ya se programaron notificaciones recientemente
      const lastScheduled = this.lastScheduledTime.get(userId) || 0;
      const timeSinceLastSchedule = Date.now() - lastScheduled;
      
      if (timeSinceLastSchedule < this.MIN_RESCHEDULE_INTERVAL) {
        if (__DEV__) {
          const hoursSince = Math.floor(timeSinceLastSchedule / (60 * 60 * 1000));
          console.log(`⏭️ Saltando reprogramación (programado hace ${hoursSince}h, mínimo 24h)`);
        }
        return;
      }

      // Verificar si ya hay notificaciones inteligentes programadas válidas
      const existingNotifications = await getAllScheduledNotificationsAsync();
      const hasValidSmartNotifications = existingNotifications.some(notif => {
        const identifier = notif.identifier;
        const data = (notif as any).content?.data || (notif as any).request?.content?.data;
        const trigger = notif.trigger as any;
        
        // Verificar si es una notificación inteligente (no diaria)
        const isSmartNotification = identifier.includes(userId) || 
                                    (data?.userId === userId && 
                                     !['workout_reminder', 'lunch_reminder'].includes(data?.type));
        
        if (!isSmartNotification) return false; // No es una notificación inteligente
        
        // Verificar si está programada para el futuro
        if (!trigger) return false;
        
        if (trigger.type === 'timeInterval') {
          return trigger.seconds > 60; // Más de 1 minuto en el futuro
        }
        if (trigger.type === 'daily' || trigger.type === 'date') {
          // Para date, verificar que la fecha sea en el futuro
          if (trigger.type === 'date' && trigger.date) {
            return new Date(trigger.date).getTime() > Date.now();
          }
          return true; // Notificaciones diarias siempre son válidas
        }
        return false;
      });

      if (hasValidSmartNotifications) {
        if (__DEV__) {
          console.log(`⏭️ Ya hay notificaciones inteligentes programadas válidas, saltando reprogramación`);
        }
        return;
      }

      const adherenceData = await this.getAdherenceData(userId);
      
      // Cancelar solo notificaciones de este servicio (no las diarias programadas)
      await this.cancelExistingSmartNotifications(userId);

      // Evaluar reglas y programar notificaciones con horarios específicos
      const scheduledCount = await this.scheduleNotificationsWithSpacing(userId, adherenceData);

      // Guardar timestamp de última programación
      this.lastScheduledTime.set(userId, Date.now());

      if (__DEV__ && scheduledCount > 0) {
        console.log(`✅ ${scheduledCount} notificaciones inteligentes programadas`);
      }
    } catch (error) {
      console.error('Error programando notificaciones:', error);
    }
  }

  /**
   * Programa notificaciones con espaciado inteligente en horarios oportunos
   */
  private async scheduleNotificationsWithSpacing(
    userId: string,
    adherenceData: AdherenceData
  ): Promise<number> {
    let scheduledCount = 0;
    const eligibleRules = this.rules.filter(rule => rule.condition(adherenceData));
    
    if (eligibleRules.length === 0) {
      return 0;
    }

    // Obtener horario preferido del usuario o usar horario por defecto
    const preferredHour = this.getPreferredNotificationHour(adherenceData);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Programar notificaciones espaciadas en diferentes días y horarios
    eligibleRules.forEach((rule, index) => {
      const notification = rule.generateNotification(adherenceData);
      
      // Espaciar notificaciones: una hoy, otra mañana, otra pasado mañana, etc.
      const dayOffset = Math.min(index, 7); // Máximo 7 días de diferencia
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);
      
      // Usar horario preferido con variación pequeña (±30 min)
      const hourVariation = Math.floor(Math.random() * 60) - 30; // -30 a +30 minutos
      const targetHour = preferredHour + (hourVariation / 60);
      const targetMinute = Math.floor((targetHour % 1) * 60);
      const finalHour = Math.floor(targetHour);
      
      targetDate.setHours(finalHour, targetMinute, 0, 0);

      // Si la fecha es en el pasado o muy pronto (menos de 2 horas), moverla al día siguiente
      if (targetDate.getTime() <= now.getTime() + (2 * 60 * 60 * 1000)) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      // Programar notificación para una fecha/hora específica
      const trigger: any = {
        type: 'date',
        date: targetDate,
      };

      scheduleNotificationAsync({
        identifier: `${notification.id}_${userId}_${dayOffset}`,
        content: {
          title: notification.title,
          body: notification.body,
          data: {
            ...notification.data,
            userId,
            scheduledFor: targetDate.toISOString(),
          },
        },
        trigger,
      }).then(() => {
        scheduledCount++;
      }).catch((error) => {
        console.error(`Error programando notificación ${notification.id}:`, error);
      });
    });

    // Esperar un poco para que todas se programen
    await new Promise(resolve => setTimeout(resolve, 500));

    return scheduledCount;
  }

  /**
   * Obtiene el horario preferido para notificaciones del usuario
   */
  private getPreferredNotificationHour(adherenceData: AdherenceData): number {
    // Si tiene horario promedio de entrenamiento, usarlo con offset
    if (adherenceData.averageWorkoutTime) {
      const [hours, minutes] = adherenceData.averageWorkoutTime.split(':').map(Number);
      // Enviar notificación 1 hora antes del entrenamiento típico
      return (hours - 1 + minutes / 60) % 24;
    }

    // Horario por defecto: 6 PM (18:00)
    return 18;
  }

  private getRandomDelay(cooldownHours: number): number {
    // Retraso aleatorio entre 1 hora y el cooldown máximo
    const minDelay = 3600; // 1 hora
    const maxDelay = cooldownHours * 3600;
    return Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
  }

  /**
   * Cancela solo las notificaciones inteligentes (no las diarias programadas)
   */
  private async cancelExistingSmartNotifications(userId: string): Promise<void> {
    try {
      const scheduledNotifications = await getAllScheduledNotificationsAsync();
      let cancelledCount = 0;
      
      // Solo cancelar notificaciones inteligentes (que tienen el userId en el identificador o data)
      for (const notification of scheduledNotifications) {
        const identifier = notification.identifier;
        const data = (notification as any).content?.data || (notification as any).request?.content?.data;
        
        // Cancelar si:
        // 1. Es una notificación inteligente (tiene userId en el identificador)
        // 2. NO es una notificación diaria programada (workout_reminder, lunch_reminder)
        const isSmartNotification = identifier.includes(userId) || 
                                    (data?.userId === userId && 
                                     !['workout_reminder', 'lunch_reminder'].includes(data?.type));
        
        if (isSmartNotification) {
          await cancelScheduledNotificationAsync(identifier);
          cancelledCount++;
        }
      }
      
      if (__DEV__ && cancelledCount > 0) {
        console.log(`🗑️ Canceladas ${cancelledCount} notificaciones inteligentes existentes`);
      }
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
        trigger: { 
          type: 'timeInterval',
          seconds: 1 
        } as any
      });
    }
  }
}

export const smartNotificationService = new SmartNotificationService();
