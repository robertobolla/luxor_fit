import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

/**
 * Hook para detectar el estado de la conexión a internet
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true, // Optimista: asumimos conexión inicial
    isInternetReachable: true,
    type: 'unknown',
  });

  useEffect(() => {
    // Obtener estado inicial
    NetInfo.fetch().then((state) => {
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type,
      });
    });

    // Escuchar cambios en el estado de la red
    const unsubscribe = NetInfo.addEventListener((state) => {
      const newStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type,
      };

      setNetworkStatus(newStatus);

      // Mostrar alerta cuando se pierde la conexión
      if (!newStatus.isConnected) {
        Alert.alert(
          'Sin conexión',
          'No tienes conexión a internet. Algunas funciones pueden no estar disponibles.',
          [{ text: 'Entendido' }]
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return networkStatus;
}

/**
 * Verifica si hay conexión a internet antes de ejecutar una operación
 */
export async function checkNetworkBeforeOperation(
  operation: () => Promise<void>,
  showAlert: boolean = true
): Promise<boolean> {
  const state = await NetInfo.fetch();
  const isConnected = state.isConnected ?? false;

  if (!isConnected && showAlert) {
    Alert.alert(
      'Sin conexión',
      'Necesitas conexión a internet para realizar esta acción.',
      [{ text: 'Entendido' }]
    );
    return false;
  }

  if (isConnected) {
    try {
      await operation();
      return true;
    } catch (error: any) {
      // Si el error es de red, mostrar mensaje amigable
      if (
        error?.message?.includes('Network') ||
        error?.message?.includes('fetch') ||
        error?.message?.includes('Failed to fetch')
      ) {
        if (showAlert) {
          Alert.alert(
            'Error de conexión',
            'No se pudo completar la operación. Verifica tu conexión a internet.',
            [{ text: 'Entendido' }]
          );
        }
        return false;
      }
      throw error; // Re-lanzar otros errores
    }
  }

  return false;
}

