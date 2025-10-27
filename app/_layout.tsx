import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProviderWrapper } from '../src/clerk.tsx';
import { useUser } from '@clerk/clerk-expo';
import { setupUserNotifications, setupNotificationListeners } from '../src/services/notificationService';

function NotificationSetup() {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user?.id) {
      // Configurar notificaciones cuando el usuario inicia sesión
      setupUserNotifications(user.id);
    }
  }, [user]);

  useEffect(() => {
    // Configurar listeners para manejar clics en notificaciones
    const cleanup = setupNotificationListeners((data) => {
      console.log('📬 Notificación presionada:', data);
      
      // Navegar según el tipo de notificación
      if (data.type === 'workout_reminder' || data.type === 'workout_reminder_smart') {
        router.push('/(tabs)/workout');
      } else if (data.type === 'lunch_reminder' || data.type === 'lunch_reminder_smart') {
        router.push('/(tabs)/nutrition/log' as any);
      } else if (data.type === 'achievement') {
        // Futuro: navegar a pantalla de logros
        router.push('/(tabs)/profile');
      }
    });

    return cleanup;
  }, []);

  return null;
}

export default function RootLayout() {
  console.log('RootLayout - Renderizando layout principal');

  return (
    <ClerkProviderWrapper>
      <SafeAreaProvider>
        <NotificationSetup />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
        <StatusBar style="light" />
      </SafeAreaProvider>
    </ClerkProviderWrapper>
  );
}
