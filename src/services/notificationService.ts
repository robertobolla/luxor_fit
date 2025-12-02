// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

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
    console.log('❌ Permiso de notificaciones denegado');
    return null;
  }

  // Obtener token (solo funciona en dispositivos físicos, no en simulador)
  try {
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('✅ Push token obtenido:', token);
  } catch (error) {
    console.log('⚠️ No se pudo obtener token (probablemente simulador)');
  }

  return token;
}

// ============================================================================
// CANCELAR TODAS LAS NOTIFICACIONES
// ============================================================================

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('🔕 Todas las notificaciones canceladas');
}

// ============================================================================
// NOTIFICACIÓN: RECORDAR MARCAR ENTRENAMIENTO
// ============================================================================

export async function scheduleWorkoutReminderNotification(userId: string) {
  // Cancelar notificaciones anteriores de este tipo
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.type === 'workout_reminder') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  // Programar notificación para las 8:00 PM todos los días
  const trigger: Notifications.DailyNotificationTrigger = {
    hour: 20,
    minute: 0,
    repeats: true,
  };

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '💪 ¿Entrenaste hoy?',
      body: 'No olvides marcar tu entrenamiento como completado',
      data: { type: 'workout_reminder', userId },
      sound: true,
    },
    trigger,
  });

  console.log('📅 Notificación de entrenamiento programada:', id);
  return id;
}

// ============================================================================
// NOTIFICACIÓN: RECORDAR REGISTRAR ALMUERZO
// ============================================================================

export async function scheduleLunchReminderNotification(userId: string) {
  // Cancelar notificaciones anteriores de este tipo
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.type === 'lunch_reminder') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  // Programar notificación para las 2:00 PM todos los días
  const trigger: Notifications.DailyNotificationTrigger = {
    hour: 14,
    minute: 0,
    repeats: true,
  };

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🍽️ ¿Ya almorzaste?',
      body: 'Registra tu almuerzo para llevar un mejor control de tu nutrición',
      data: { type: 'lunch_reminder', userId },
      sound: true,
    },
    trigger,
  });

  console.log('📅 Notificación de almuerzo programada:', id);
  return id;
}

// ============================================================================
// VERIFICAR Y ENVIAR RECORDATORIOS INTELIGENTES
// ============================================================================

export async function checkAndSendSmartReminders(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const currentHour = new Date().getHours();

  // Solo verificar después de las 8 PM para el entrenamiento
  if (currentHour >= 20) {
    // Verificar si entrenó hoy
    const { data: completions } = await supabase
      .from('workout_completions')
      .select('id')
      .eq('user_id', userId)
      .gte('completed_at', `${today}T00:00:00`)
      .lte('completed_at', `${today}T23:59:59`)
      .limit(1);

    if (!completions || completions.length === 0) {
      // No ha entrenado, enviar notificación
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💪 ¿Entrenaste hoy?',
          body: 'No olvides marcar tu entrenamiento como completado',
          data: { type: 'workout_reminder_smart', userId },
        },
        trigger: null, // Enviar inmediatamente
      });
    }
  }

  // Solo verificar después de las 2 PM para el almuerzo
  if (currentHour >= 14) {
    // Verificar si registró almuerzo hoy
    const { data: logs } = await supabase
      .from('meal_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('meal_type', 'lunch')
      .gte('datetime', `${today}T00:00:00`)
      .lte('datetime', `${today}T23:59:59`)
      .limit(1);

    if (!logs || logs.length === 0) {
      // No ha registrado almuerzo, enviar notificación
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🍽️ ¿Ya almorzaste?',
          body: 'Registra tu almuerzo para llevar un mejor control',
          data: { type: 'lunch_reminder_smart', userId },
        },
        trigger: null, // Enviar inmediatamente
      });
    }
  }
}

// ============================================================================
// NOTIFICACIÓN DE CHECK-IN SEMANAL
// ============================================================================

/**
 * Programa notificación de recordatorio para check-in semanal
 * Se envía cada lunes a las 9:00 AM
 */
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
        title: '📊 Check-in Semanal',
        body: 'Es hora de registrar tu peso y ajustar tu plan de nutrición',
        data: { type: 'weekly_checkin' },
      },
      trigger: {
        weekday: 2, // Lunes (1=Domingo, 2=Lunes, ...)
        hour: 9,
        minute: 0,
        repeats: true,
      },
    });

    console.log('✅ Notificación de check-in semanal programada:', id);
    return id;
  } catch (error) {
    console.error('Error programando notificación de check-in:', error);
    return null;
  }
}

// ============================================================================
// NOTIFICACIÓN DE LOGRO (para futuro)
// ============================================================================

export async function sendAchievementNotification(
  title: string,
  body: string,
  achievementId: string
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🏆 ${title}`,
      body,
      data: { type: 'achievement', achievementId },
      sound: true,
    },
    trigger: null, // Enviar inmediatamente
  });

  console.log('🏆 Notificación de logro enviada:', title);
}

// ============================================================================
// CONFIGURAR TODAS LAS NOTIFICACIONES DEL USUARIO
// ============================================================================

export async function setupUserNotifications(userId: string) {
  try {
    // Solicitar permisos
    const token = await registerForPushNotificationsAsync();
    
    if (!token) {
      console.log('⚠️ No se pudieron configurar notificaciones');
      return false;
    }

    // Programar recordatorios diarios
    await scheduleWorkoutReminderNotification(userId);
    await scheduleLunchReminderNotification(userId);
    
    // Programar recordatorio semanal de check-in
    await scheduleWeeklyCheckinNotification();

    console.log('✅ Notificaciones configuradas para el usuario:', userId);
    return true;
  } catch (error) {
    console.error('❌ Error configurando notificaciones:', error);
    return false;
  }
}

// ============================================================================
// NOTIFICACIÓN: NUEVO MENSAJE
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
        title: `💬 Nuevo mensaje de ${senderName}`,
        body: messageText.length > 50 ? `${messageText.substring(0, 50)}...` : messageText,
        data: { 
          type: 'new_message', 
          chatId,
          senderId 
        },
        sound: true,
        badge: 1,
      },
      trigger: null, // Enviar inmediatamente
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
      title: `💪 ${senderName} te compartió un entrenamiento`,
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
    ? `✅ ${receiverName} aceptó tu entrenamiento`
    : `❌ ${receiverName} rechazó tu entrenamiento`;
  
  const body = accepted
    ? 'Tu entrenamiento compartido fue aceptado'
    : 'Tu entrenamiento compartido fue rechazado';

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
      title: `👋 ${senderName} te envió una solicitud de amistad`,
      body: 'Toca para ver y responder',
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
      console.log('📬 Notificación recibida:', notification);
    }
  );

  // Cuando el usuario hace clic en una notificación
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('👆 Usuario hizo clic en notificación:', response);
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

