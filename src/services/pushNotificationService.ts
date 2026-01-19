// ============================================================================
// PUSH NOTIFICATION SERVICE
// ============================================================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configuración de cómo se comportan las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registra el dispositivo para recibir push notifications
 * @param userId - ID del usuario de Clerk
 * @returns Push token del dispositivo
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  let token: string | null = null;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }

    try {
      // Obtener el token de push
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })
      ).data;

      // Guardar el token en Supabase
      if (token) {
        await savePushToken(userId, token);
      }
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.warn('Must use physical device for Push Notifications');
  }

  // Configuración específica para Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F7931E',
    });
  }

  return token;
}

/**
 * Guardar el push token en Supabase
 */
async function savePushToken(userId: string, pushToken: string) {
  try {
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert({
        user_id: userId,
        push_token: pushToken,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      // Si el error es porque el perfil del usuario no existe aún (foreign key constraint),
      // no mostrar error ya que el token se guardará más tarde cuando el perfil se cree
      // El código 23503 indica violación de clave foránea
      if (error.code === '23503') {
        // El perfil aún no existe, el token se guardará más tarde cuando el perfil se cree
        return;
      }
      console.error('Error saving push token:', error);
    } else {
      console.log('Push token saved successfully');
    }
  } catch (error) {
    // Silenciar errores relacionados con perfiles que no existen aún
    if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
      return;
    }
    console.error('Error in savePushToken:', error);
  }
}

/**
 * Eliminar el push token al cerrar sesión
 */
export async function removePushToken(userId: string) {
  try {
    const { error } = await supabase
      .from('user_push_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing push token:', error);
    }
  } catch (error) {
    console.error('Error in removePushToken:', error);
  }
}

/**
 * Listener para notificaciones recibidas mientras la app está abierta
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Listener para cuando el usuario toca una notificación
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Cancelar todas las notificaciones programadas
 */
export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Obtener el badge count actual
 */
export async function getBadgeCountAsync(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Establecer el badge count
 */
export async function setBadgeCountAsync(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

