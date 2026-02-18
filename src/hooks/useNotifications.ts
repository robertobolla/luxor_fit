import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import {
  setupUserNotifications,
  setupNotificationListeners,
} from '../services/notificationService';

export const useNotifications = () => {
  const { user } = useUser();

  useEffect(() => {
    // Configurar notificaciones al cargar la app
    const setup = async () => {
      if (Platform.OS !== 'web' && user?.id) {
        await setupUserNotifications(user.id);
      }
    };

    setup();

    // Configurar listeners de notificaciones
    const cleanup = setupNotificationListeners((data) => {
      console.log('Respuesta a notificación:', data);
      // Manejar navegación basada en el tipo de notificación
      switch (data?.type) {
        case 'workout_reminder':
          // Navegar a la pantalla de entrenamiento
          break;
        case 'weekly_checkin':
          // Navegar a la pantalla de check-in
          break;
        case 'achievement':
          // Mostrar modal de logro
          break;
        case 'new_message':
          // Navegar al chat
          break;
        default:
          break;
      }
    });

    return cleanup;
  }, [user?.id]);
};
