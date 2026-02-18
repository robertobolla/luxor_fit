// ============================================================================
// NOTIFICATION SERVICE - Sistema de Notificaciones Inteligente
// ============================================================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

// Keys para AsyncStorage
const NOTIFICATIONS_SETUP_KEY = 'notifications_setup_done';
const LAST_WORKOUT_CHECK_KEY = 'last_workout_notification_check';
const LAST_LUNCH_CHECK_KEY = 'last_lunch_notification_check';

// Configurar cómo se muestran las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ============================================================================
// PERMISOS Y CONFIGURACIÓN
// ============================================================================

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00D4AA',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log(i18n.t('notifications.permissionDenied'));
    return null;
  }

  // Obtener token (solo funciona en dispositivos físicos, no en simulador)
  try {
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log(i18n.t('notifications.tokenObtained'), token);
  } catch (error) {
    console.log(i18n.t('notifications.tokenError'));
  }

  return token;
}

// ============================================================================
// CANCELAR TODAS LAS NOTIFICACIONES
// ============================================================================

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log(i18n.t('notifications.allCancelled'));
}

// ============================================================================
// NOTIFICACIÓN: RECORDAR MARCAR ENTRENAMIENTO (8 PM)
// ============================================================================

export async function scheduleWorkoutReminderNotification(userId: string) {
  try {
    // Cancelar notificaciones anteriores de este tipo
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.type === 'workout_reminder') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    // Programar notificación para las 8:00 PM todos los días
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.workoutReminderTitle'),
        body: i18n.t('notifications.workoutReminderBody'),
        data: { type: 'workout_reminder', userId },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: 20,
        minute: 0,
        repeats: true,
      },
    });

    console.log('📅 Notificación de entrenamiento programada para 8:00 PM:', id);
    return id;
  } catch (error) {
    console.error('Error programando notificación de entrenamiento:', error);
    return null;
  }
}

// ============================================================================
// NOTIFICACIÓN: RECORDAR REGISTRAR ALMUERZO (2 PM)
// ============================================================================

export async function scheduleLunchReminderNotification(userId: string) {
  try {
    // Cancelar notificaciones anteriores de este tipo
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.type === 'lunch_reminder') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    // Programar notificación para las 2:00 PM todos los días
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.lunchReminderTitle'),
        body: i18n.t('notifications.lunchReminderBody'),
        data: { type: 'lunch_reminder', userId },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: 14,
        minute: 0,
        repeats: true,
      },
    });

    console.log('📅 Notificación de almuerzo programada para 2:00 PM:', id);
    return id;
  } catch (error) {
    console.error('Error programando notificación de almuerzo:', error);
    return null;
  }
}

// ============================================================================
// NOTIFICACIÓN DE CHECK-IN SEMANAL (Lunes 9 AM)
// ============================================================================

export async function scheduleWeeklyCheckinNotification() {
  try {
    // Cancelar notificaciones anteriores del mismo tipo
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.type === 'weekly_checkin') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }

    // Programar nueva notificación semanal (Lunes a las 9:00 AM)
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.weeklyCheckinTitle'),
        body: i18n.t('notifications.weeklyCheckinBody'),
        data: { type: 'weekly_checkin' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        weekday: 2, // Lunes (1=Domingo, 2=Lunes, ...)
        hour: 9,
        minute: 0,
        repeats: true,
      },
    });

    console.log('✅ Notificación de check-in semanal programada para Lunes 9:00 AM:', id);
    return id;
  } catch (error) {
    console.error('Error programando notificación de check-in:', error);
    return null;
  }
}

// ============================================================================
// CONFIGURAR TODAS LAS NOTIFICACIONES DEL USUARIO (SOLO UNA VEZ)
// ============================================================================

export async function setupUserNotifications(userId: string) {
  try {
    // Verificar si ya se configuraron las notificaciones
    const setupDone = await AsyncStorage.getItem(NOTIFICATIONS_SETUP_KEY);

    // Solicitar permisos
    const token = await registerForPushNotificationsAsync();

    if (!token) {
      console.log(i18n.t('notifications.setupNoPermissions'));
      return false;
    }

    // Solo programar notificaciones si no se han configurado antes
    // o si es un nuevo día (para asegurar que estén activas)
    if (!setupDone) {
      console.log(i18n.t('notifications.setupFirstTime'));

      // Programar recordatorios diarios (solo a sus horas específicas)
      await scheduleWorkoutReminderNotification(userId);
      await scheduleLunchReminderNotification(userId);

      // Programar recordatorio semanal de check-in
      await scheduleWeeklyCheckinNotification();

      // Marcar como configurado
      await AsyncStorage.setItem(NOTIFICATIONS_SETUP_KEY, new Date().toISOString());

      console.log(i18n.t('notifications.setupComplete'));
    } else {
      console.log(i18n.t('notifications.setupAlready'));
    }

    return true;
  } catch (error) {
    console.error(i18n.t('notifications.setupError'), error);
    return false;
  }
}

// ============================================================================
// FORZAR RECONFIGURACIÓN DE NOTIFICACIONES
// ============================================================================

export async function forceReconfigureNotifications(userId: string) {
  try {
    // Limpiar el flag de configuración
    await AsyncStorage.removeItem(NOTIFICATIONS_SETUP_KEY);

    // Cancelar todas las notificaciones existentes
    await cancelAllNotifications();

    // Reconfigurar
    await setupUserNotifications(userId);

    console.log('🔄 Notificaciones reconfiguradas');
    return true;
  } catch (error) {
    console.error('Error reconfigurando notificaciones:', error);
    return false;
  }
}

// ============================================================================
// NOTIFICACIÓN DE LOGRO
// ============================================================================

export async function sendAchievementNotification(
  title: string,
  body: string,
  achievementId: string
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('notifications.achievementTitle', { title }),
      body,
      data: { type: 'achievement', achievementId },
      sound: true,
    },
    trigger: null, // Enviar inmediatamente
  });

  console.log('🏆 Notificación de logro enviada:', title);
}

// ============================================================================
// NOTIFICACIÓN: NUEVO MENSAJE (Solo para mensajes de chat)
// ============================================================================

export async function sendMessageNotification(
  senderName: string,
  messageText: string,
  chatId: string,
  senderId: string
) {
  try {
    // Verificar permisos antes de enviar
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.warn('💬 Permisos de notificación no concedidos:', existingStatus);
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.error('💬 No se pueden enviar notificaciones - permisos denegados');
      return;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.newMessageTitle', { sender: senderName }),
        body: messageText.length > 50 ? `${messageText.substring(0, 50)}...` : messageText,
        data: {
          type: 'new_message',
          chatId,
          senderId
        },
        sound: true,
        badge: 1,
      },
      trigger: null, // Enviar inmediatamente (es un mensaje real)
    });

    console.log('💬 Notificación de mensaje enviada:', notificationId);
  } catch (error: any) {
    console.error('💬 Error enviando notificación de mensaje:', error);
  }
}

// ============================================================================
// NOTIFICACIÓN: ENTRENAMIENTO COMPARTIDO
// ============================================================================

export async function sendWorkoutSharedNotification(
  senderName: string,
  workoutPlanName: string,
  chatId: string,
  senderId: string,
  workoutPlanId: string
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('notifications.workoutSharedTitle', { sender: senderName }),
      body: workoutPlanName,
      data: {
        type: 'workout_shared',
        chatId,
        senderId,
        workoutPlanId
      },
      sound: true,
      badge: 1,
    },
    trigger: null, // Enviar inmediatamente
  });

  console.log('💪 Notificación de entrenamiento compartido enviada');
}

// ============================================================================
// NOTIFICACIÓN: ENTRENAMIENTO ACEPTADO/RECHAZADO
// ============================================================================

export async function sendWorkoutResponseNotification(
  receiverName: string,
  accepted: boolean,
  chatId: string,
  receiverId: string
) {
  const title = accepted
    ? i18n.t('notifications.workoutAcceptedTitle', { name: receiverName })
    : i18n.t('notifications.workoutRejectedTitle', { name: receiverName });

  const body = accepted
    ? i18n.t('notifications.workoutAcceptedBody')
    : i18n.t('notifications.workoutRejectedBody');

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {
        type: accepted ? 'workout_accepted' : 'workout_rejected',
        chatId,
        receiverId
      },
      sound: true,
    },
    trigger: null, // Enviar inmediatamente
  });

  console.log(`💪 Notificación de respuesta de entrenamiento enviada: ${accepted ? 'aceptado' : 'rechazado'}`);
}

// ============================================================================
// NOTIFICACIÓN: SOLICITUD DE AMISTAD
// ============================================================================

export async function sendFriendRequestNotification(
  senderName: string,
  senderId: string
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('notifications.friendRequestTitle', { sender: senderName }),
      body: i18n.t('notifications.friendRequestBody'),
      data: {
        type: 'friend_request',
        senderId
      },
      sound: true,
      badge: 1,
    },
    trigger: null, // Enviar inmediatamente
  });

  console.log('👋 Notificación de solicitud de amistad enviada');
}

// ============================================================================
// LISTENER DE NOTIFICACIONES (para manejar clics)
// ============================================================================

export function setupNotificationListeners(
  onNotificationPress: (data: any) => void
) {
  // Cuando se recibe una notificación mientras la app está abierta
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('📬 Notificación recibida:', notification.request.content.title);
    }
  );

  // Cuando el usuario hace clic en una notificación
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('👆 Usuario hizo clic en notificación:', response.notification.request.content.title);
      const data = response.notification.request.content.data;
      onNotificationPress(data);
    }
  );

  // Retornar función de limpieza
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

// ============================================================================
// DEBUG: Ver notificaciones programadas
// ============================================================================

export async function debugScheduledNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  console.log('📋 Notificaciones programadas:');
  scheduled.forEach((notif, index) => {
    console.log(`  ${index + 1}. ${notif.content.title} - Type: ${notif.content.data?.type}`);
    console.log(`     Trigger:`, notif.trigger);
  });
  return scheduled;
}
