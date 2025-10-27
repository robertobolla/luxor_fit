import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { router, useSegments } from 'expo-router';
import { supabase } from '../services/supabase';

export function useOnboardingCheck() {
  const { user, isLoaded } = useUser();
  const segments = useSegments();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    const checkOnboarding = async () => {
      try {
        // Si no hay usuario, no hacer nada (el layout de auth se encargará)
        if (!user) {
          setIsCheckingOnboarding(false);
          return;
        }

        // Verificar si el usuario ya completó el onboarding
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, name, fitness_level')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows returned (esperado si no hay perfil)
          console.error('Error al verificar onboarding:', error);
        }

        const hasProfile = !!data && !!data.name && !!data.fitness_level;
        setHasCompletedOnboarding(hasProfile);

        // Si el usuario no ha completado el onboarding y no está en la ruta de onboarding
        const inOnboarding = segments[0] === 'onboarding';
        const inAuth = segments[0] === '(auth)';

        if (!hasProfile && !inOnboarding && !inAuth) {
          // Redirigir al onboarding
          router.replace('/onboarding');
        } else if (hasProfile && inOnboarding) {
          // Si ya completó el onboarding y está en la ruta de onboarding, ir al dashboard
          router.replace('/(tabs)/dashboard');
        }

        setIsCheckingOnboarding(false);
      } catch (error) {
        console.error('Error inesperado al verificar onboarding:', error);
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [user, isLoaded, segments]);

  return {
    isCheckingOnboarding,
    hasCompletedOnboarding,
  };
}

