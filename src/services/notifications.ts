import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  /**
   * Solicita permisos para notificaciones
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permisos de notificación denegados');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error solicitando permisos de notificación:', error);
      return false;
    }
  }

  /**
   * Programa una notificación de recordatorio de entrenamiento
   */
  static async scheduleWorkoutReminder(
    hour: number,
    minute: number,
    days: number[] = [1, 2, 3, 4, 5, 6, 7] // Todos los días por defecto
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💪 ¡Hora de entrenar!',
          body: 'Tu cuerpo te está esperando. ¡Vamos a hacerlo!',
          data: { type: 'workout_reminder' },
        },
        trigger: {
          hour,
          minute,
          repeats: true,
          weekday: days,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error programando recordatorio:', error);
      return null;
    }
  }

  /**
   * Programa una notificación de motivación
   */
  static async scheduleMotivationalMessage(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const motivationalMessages = [
        {
          title: '🌟 ¡Sigue así!',
          body: 'Cada entrenamiento te acerca más a tus objetivos.',
        },
        {
          title: '💪 ¡Eres increíble!',
          body: 'Tu consistencia está dando resultados. ¡No pares!',
        },
        {
          title: '🔥 ¡Día perfecto!',
          body: 'Hoy es un gran día para superar tus límites.',
        },
        {
          title: '⚡ ¡Energía positiva!',
          body: 'Tu dedicación al fitness es inspiradora.',
        },
        {
          title: '🎯 ¡Objetivos claros!',
          body: 'Cada repetición cuenta. ¡Sigue progresando!',
        },
      ];

      const randomMessage = motivationalMessages[
        Math.floor(Math.random() * motivationalMessages.length)
      ];

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          ...randomMessage,
          data: { type: 'motivation' },
        },
        trigger: {
          seconds: 60 * 60 * 24, // 24 horas
          repeats: true,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error programando mensaje motivacional:', error);
      return null;
    }
  }

  /**
   * Programa una notificación de logro
   */
  static async scheduleAchievementNotification(
    achievement: string,
    description: string
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🏆 ${achievement}`,
          body: description,
          data: { type: 'achievement' },
        },
        trigger: null, // Inmediata
      });

      return notificationId;
    } catch (error) {
      console.error('Error programando notificación de logro:', error);
      return null;
    }
  }

  /**
   * Programa una notificación de progreso semanal
   */
  static async scheduleWeeklyProgressReminder(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📊 Resumen semanal',
          body: 'Revisa tu progreso de esta semana y planifica la siguiente.',
          data: { type: 'weekly_progress' },
        },
        trigger: {
          weekday: 1, // Lunes
          hour: 9,
          minute: 0,
          repeats: true,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error programando recordatorio de progreso:', error);
      return null;
    }
  }

  /**
   * Cancela una notificación específica
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error cancelando notificación:', error);
    }
  }

  /**
   * Cancela todas las notificaciones programadas
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error cancelando todas las notificaciones:', error);
    }
  }

  /**
   * Obtiene todas las notificaciones programadas
   */
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error obteniendo notificaciones programadas:', error);
      return [];
    }
  }

  /**
   * Configura notificaciones por defecto para un nuevo usuario
   */
  static async setupDefaultNotifications(): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      // Recordatorio diario a las 7:00 AM
      await this.scheduleWorkoutReminder(7, 0, [1, 2, 3, 4, 5, 6, 7]);
      
      // Recordatorio de tarde a las 6:00 PM (solo días laborables)
      await this.scheduleWorkoutReminder(18, 0, [1, 2, 3, 4, 5]);
      
      // Progreso semanal los lunes a las 9:00 AM
      await this.scheduleWeeklyProgressReminder();
      
      // Mensaje motivacional diario
      await this.scheduleMotivationalMessage();
      
      console.log('Notificaciones por defecto configuradas');
    } catch (error) {
      console.error('Error configurando notificaciones por defecto:', error);
    }
  }

  /**
   * Maneja las respuestas a las notificaciones
   */
  static addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Maneja las notificaciones recibidas mientras la app está abierta
   */
  static addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }
}
