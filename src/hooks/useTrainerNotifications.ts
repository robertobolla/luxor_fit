import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../services/supabase';
import { getPendingTrainerInvitations } from '../services/trainerService';

/**
 * Hook para manejar notificaciones del sistema de entrenador
 */
export function useTrainerNotifications() {
  const { user } = useUser();

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    // Verificar invitaciones pendientes al cargar
    checkPendingInvitations();

    // Suscribirse a cambios en las relaciones de entrenador
    const channel = supabase
      .channel(`trainer_notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trainer_student_relationships',
          filter: `student_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('Nueva invitación de entrenador recibida:', payload);
          
          // Obtener información del entrenador
          const { data: trainerProfile } = await supabase
            .from('user_profiles')
            .select('name, username')
            .eq('user_id', payload.new.trainer_id)
            .maybeSingle();

          const trainerName = trainerProfile?.name || trainerProfile?.username || 'Un entrenador';

          Alert.alert(
            '🏋️ Nueva Invitación de Entrenador',
            `${trainerName} quiere ser tu entrenador. Revisa tus notificaciones para aceptar o rechazar.`,
            [{ text: 'OK' }]
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trainer_student_relationships',
          filter: `trainer_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('Cambio en relación de entrenador:', payload);
          
          // Si un alumno aceptó la invitación
          if (payload.new.status === 'accepted' && payload.old.status === 'pending') {
            const { data: studentProfile } = await supabase
              .from('user_profiles')
              .select('name, username')
              .eq('user_id', payload.new.student_id)
              .maybeSingle();

            const studentName = studentProfile?.name || studentProfile?.username || 'Un alumno';

            Alert.alert(
              '✅ Invitación Aceptada',
              `${studentName} ha aceptado tu invitación. ¡Ahora puedes ver sus estadísticas y entrenamientos!`,
              [{ text: 'Genial' }]
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const checkPendingInvitations = async () => {
    if (!user?.id) return;

    const result = await getPendingTrainerInvitations(user.id);
    if (result.success && result.data && result.data.length > 0) {
      console.log(`Usuario tiene ${result.data.length} invitaciones de entrenador pendientes`);
    }
  };
}

