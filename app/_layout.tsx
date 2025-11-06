import { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Linking } from 'react-native';
import { ClerkProviderWrapper } from '../src/clerk.tsx';
import { useUser } from '@clerk/clerk-expo';
import { setupUserNotifications, setupNotificationListeners } from '../src/services/notificationService';
import { useSubscription } from '../src/hooks/useSubscription';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

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

function SubscriptionGate() {
  const { user, isSignedIn } = useUser();
  const { loading, isActive, refresh } = useSubscription();
  const pathname = usePathname();
  const router = useRouter();

  // Manejar deep links cuando regresa de Stripe (global para toda la app)
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      try {
        const urlString = event.url;
        console.log('🔗 Deep link recibido:', urlString);
        
        // Parsear el deep link fitmind://paywall/success?session_id=...
        // Puede venir como fitmind://paywall/success o fitmind:///paywall/success
        if (urlString.includes('fitmind://') && urlString.includes('paywall/success')) {
          // Extraer session_id de la URL
          // El formato es fitmind://paywall/success?session_id=...
          let sessionId: string | null = null;
          try {
            // Intentar parsear como URL estándar
            const match = urlString.match(/fitmind:\/\/[^?]+\?session_id=([^&]+)/);
            if (match && match[1]) {
              sessionId = decodeURIComponent(match[1]);
            } else {
              // Fallback: extraer manualmente
              const urlParts = urlString.split('?session_id=');
              if (urlParts.length > 1) {
                sessionId = decodeURIComponent(urlParts[1].split('&')[0]);
              }
            }
          } catch (e) {
            console.error('Error parseando session_id:', e);
          }
          
          if (sessionId) {
            console.log('✅ Session ID encontrado:', sessionId);
            // Refrescar estado de suscripción
            await refresh();
            // Redirigir al home después de un momento
            setTimeout(() => {
              router.replace('/(tabs)/home');
            }, 1000);
          }
        }
      } catch (e) {
        console.error('❌ Error procesando deep link:', e);
      }
    };

    // Escuchar cuando la app se abre desde un deep link (app activa)
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Verificar si la app se abrió con un deep link (app cerrada)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 Deep link inicial:', url);
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []); // Sin dependencias para evitar loops - solo se ejecuta una vez al montar

  useEffect(() => {
    // Desactivar temporalmente el paywall para pruebas
    const TEMP_DISABLE_PAYWALL = false;
    if (TEMP_DISABLE_PAYWALL) return;

    console.log('🚪 SubscriptionGate: isSignedIn:', isSignedIn, 'loading:', loading, 'isActive:', isActive, 'pathname:', pathname);

    if (!isSignedIn) return; // El flujo de auth se maneja aparte
    if (loading) {
      console.log('🚪 SubscriptionGate: Esperando carga...');
      return;
    }

    const isPaywall = pathname?.startsWith('/paywall');

    // Solo redirigir si realmente es necesario (evitar loops)
    if (!isActive && !isPaywall) {
      console.log('🚪 SubscriptionGate: Redirigiendo al paywall (sin suscripción activa)');
      router.replace('/paywall');
    } else if (isActive && isPaywall) {
      console.log('🚪 SubscriptionGate: Redirigiendo al home (tiene suscripción activa)');
      // Usar push en lugar de replace para evitar loops en algunos casos
      setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 100);
    } else {
      console.log('🚪 SubscriptionGate: Sin cambios (isActive:', isActive, 'isPaywall:', isPaywall, ')');
    }
  }, [isSignedIn, loading, isActive, pathname]); // Removido 'router' de dependencias para evitar loops

  return null;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ClerkProviderWrapper>
        <SafeAreaProvider>
          <NotificationSetup />
          <SubscriptionGate />
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
          <StatusBar style="light" />
        </SafeAreaProvider>
      </ClerkProviderWrapper>
    </ErrorBoundary>
  );
}
