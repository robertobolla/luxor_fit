import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { useFocusEffect } from '@react-navigation/native';
import { smartNotificationService } from '../services/smartNotifications';
import React from 'react';

/**
 * Hook para manejar notificaciones inteligentes
 * Se ejecuta cuando la app se enfoca y cuando el usuario cambia
 * 
 * IMPORTANTE: Las notificaciones solo se reprograman si han pasado 24 horas
 * desde la última programación para evitar spam
 */
export function useSmartNotifications() {
  const { user } = useUser();
  const hasInitialized = React.useRef(false);

  // Programar notificaciones solo una vez al iniciar (si no se han programado recientemente)
  useEffect(() => {
    if (user?.id && !hasInitialized.current) {
      hasInitialized.current = true;
      
      // Usar un pequeño delay para evitar que se ejecute demasiado pronto
      const timer = setTimeout(() => {
        smartNotificationService.scheduleSmartNotifications(user.id);
      }, 2000); // 2 segundos de delay

      return () => clearTimeout(timer);
    }
  }, [user?.id]);

  // NO reprogramar cada vez que la app recibe focus - esto causaba el spam
  // Solo se reprograman automáticamente si han pasado 24 horas
}
