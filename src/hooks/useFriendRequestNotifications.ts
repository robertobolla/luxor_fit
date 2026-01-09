import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../../src/services/supabase';
import { sendFriendRequestNotification } from '../services/notificationService';

/**
 * Hook para manejar notificaciones de solicitudes de amistad
 * Se suscribe a nuevas solicitudes de amistad y envía notificaciones push
 */
export function useFriendRequestNotifications() {
  const { user } = useUser();

  useEffect(() => {
    if (!user?.id) return;

    console.log('👋 Suscribiéndose a solicitudes de amistad para:', user.id);

    // Suscribirse a nuevas solicitudes de amistad
    const channel = supabase
      .channel(`friend_requests:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friendships',
          filter: `friend_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('👋 Nueva solicitud de amistad recibida:', payload);
          
          const newRequest = payload.new as any;
          
          // Solo enviar notificación si el estado es 'pending'
          if (newRequest.status === 'pending') {
            // Obtener perfil del remitente
            const { data: senderProfile } = await supabase
              .from('user_profiles')
              .select('name, username')
              .eq('user_id', newRequest.user_id)
              .maybeSingle();

            const senderName = senderProfile?.name || senderProfile?.username || 'Usuario';

            // Enviar notificación push
            await sendFriendRequestNotification(
              senderName,
              newRequest.user_id
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log('👋 Desuscribiéndose de solicitudes de amistad');
      channel.unsubscribe();
    };
  }, [user?.id]);
}

