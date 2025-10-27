import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NotificationService } from '@/services/notifications';

export const useNotifications = () => {
  useEffect(() => {
    // Configurar notificaciones al cargar la app
    const setupNotifications = async () => {
      if (Platform.OS !== 'web') {
        await NotificationService.requestPermissions();
        await NotificationService.setupDefaultNotifications();
      }
    };

    setupNotifications();

    // Configurar listeners de notificaciones
    const notificationListener = NotificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notificación recibida:', notification);
      }
    );

    const responseListener = NotificationService.addNotificationResponseListener(
      (response) => {
        console.log('Respuesta a notificación:', response);
        // Aquí puedes manejar la navegación basada en el tipo de notificación
        const { type } = response.notification.request.content.data as any;
        
        switch (type) {
          case 'workout_reminder':
            // Navegar a la pantalla de entrenamiento
            break;
          case 'weekly_progress':
            // Navegar a la pantalla de progreso
            break;
          case 'achievement':
            // Mostrar modal de logro
            break;
          default:
            break;
        }
      }
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);
};
