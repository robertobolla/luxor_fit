import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { supabase } from '../src/services/supabase';

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);

  console.log('Index - Estado de autenticación:', { isLoaded, isSignedIn, user: !!user });
  console.log('Index - Usuario:', user?.id, user?.firstName);

  // Manejar redirección basada en estado de autenticación
  useEffect(() => {
    const handleRedirection = async () => {
      if (!isLoaded) return;

      // Si no está autenticado, ir a login
      if (!isSignedIn) {
        router.replace('/(auth)/login');
        return;
      }

      // Si está autenticado, verificar el onboarding
      if (!user) return;

      try {
        setIsCheckingProfile(true);

        // Verificar si el usuario ya completó el onboarding
        console.log('🔍 Verificando perfil para usuario:', user.id);
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, name, username')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('❌ Error al verificar perfil:', error);
        } else {
          console.log('📊 Datos del perfil:', data);
        }

        // El onboarding simplificado solo requiere name y username
        // fitness_level se recopila más tarde al generar un plan
        const hasProfile = !!data && !!(data as any).name && !!(data as any).username;
        console.log('✅ Usuario tiene perfil completo:', hasProfile);

        if (hasProfile) {
          // Usuario tiene perfil completo, ir a inicio
          router.replace('/(tabs)/home');
        } else {
          // Usuario no tiene perfil, ir al onboarding
          router.replace('/onboarding');
        }
      } catch (error) {
        console.error('Error inesperado al verificar perfil:', error);
        // En caso de error, ir al onboarding por seguridad
        router.replace('/onboarding');
      } finally {
        setIsCheckingProfile(false);
      }
    };

    handleRedirection();
  }, [isLoaded, isSignedIn, user]);

  // Durante la carga inicial o verificación, no mostrar nada
  // El splash se maneja en _layout.tsx
  if (!isLoaded || isCheckingProfile || !isSignedIn) {
    return null;
  }

  // Mientras espera la redirección después de login
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#1a1a1a',
      padding: 20
    }}>
      <Text style={{ 
        color: '#ffffff', 
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center'
      }}>
        ¡Hola, {user?.firstName || 'Roberto'}!
      </Text>
      
      <Text style={{ 
        color: '#ffb300', 
        fontSize: 16,
        marginBottom: 40,
        textAlign: 'center'
      }}>
        Redirigiendo a inicio...
      </Text>

      <ActivityIndicator size="large" color="#ffb300" />
    </View>
  );
}
