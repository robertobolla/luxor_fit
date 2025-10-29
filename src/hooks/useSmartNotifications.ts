import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { useFocusEffect } from '@react-navigation/native';
import { smartNotificationService } from '../services/smartNotifications';
import React from 'react';

/**
 * Hook para manejar notificaciones inteligentes
 * Se ejecuta cuando la app se enfoca y cuando el usuario cambia
 */
export function useSmartNotifications() {
  const { user } = useUser();

  // Reprogramar notificaciones cuando la app se enfoca
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        console.log('🔔 Reprogramando notificaciones inteligentes...');
        smartNotificationService.scheduleSmartNotifications(user.id);
      }
    }, [user?.id])
  );

  // Reprogramar notificaciones cuando el usuario cambia
  useEffect(() => {
    if (user?.id) {
      console.log('👤 Usuario detectado, programando notificaciones...');
      smartNotificationService.scheduleSmartNotifications(user.id);
    }
  }, [user?.id]);
}
