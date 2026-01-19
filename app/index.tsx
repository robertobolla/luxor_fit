import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { router } from 'expo-router';

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  console.log('Index - Estado de autenticación:', { isLoaded, isSignedIn, user: !!user });

  // Manejar redirección basada en estado de autenticación
  // IMPORTANTE: NO verificamos perfil aquí. El flujo es:
  // 1. Login → Index → Home
  // 2. SubscriptionGate verifica suscripción → si no tiene, va al Paywall
  // 3. Después de pagar en Paywall → verifica perfil → si no tiene, va al Onboarding
  // 4. Después del Onboarding → Home
  useEffect(() => {
    if (!isLoaded) return;

    // Si no está autenticado, ir a login
    if (!isSignedIn) {
      router.replace('/(auth)/login');
      return;
    }

    // Si está autenticado, ir a home
    // SubscriptionGate se encargará de verificar la suscripción
    // y redirigir al paywall si es necesario
    if (user) {
      console.log('✅ Usuario autenticado, redirigiendo a home...');
      router.replace('/(tabs)/home');
    }
  }, [isLoaded, isSignedIn, user]);

  // Durante la carga inicial, mostrar indicador
  if (!isLoaded || !isSignedIn) {
    return null;
  }

  // Mientras espera la redirección
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#0a0a0a',
    }}>
      <ActivityIndicator size="large" color="#ffb300" />
    </View>
  );
}
