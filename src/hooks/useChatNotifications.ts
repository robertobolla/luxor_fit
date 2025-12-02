import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { subscribeToAllUserMessages, Message } from '../services/chatService';
import { supabase } from '../services/supabase';
import {
  sendMessageNotification,
  sendWorkoutSharedNotification,
  sendWorkoutResponseNotification,
} from '../services/notificationService';

/**
 * Hook para manejar notificaciones de chat y entrenamientos compartidos
 * Se suscribe a todos los mensajes nuevos del usuario y envía notificaciones
 */
// Variable global para el chat actual (para evitar notificaciones cuando se está viendo)
let currentChatId: string | null = null;

export function useChatNotifications() {
  const { user } = useUser();

  useEffect(() => {
    if (!user?.id) {
      console.log('💬 useChatNotifications: No hay usuario, cancelando suscripción');
      return;
    }

    console.log('💬 Configurando notificaciones de chat para:', user.id);

    // Suscribirse a todos los mensajes nuevos del usuario
    const channel = subscribeToAllUserMessages(user.id, async (message: Message) => {
      try {
        console.log('💬 ========================================');
        console.log('💬 CALLBACK DE MENSAJE INVOCADO');
        console.log('💬 Nuevo mensaje recibido - datos completos:', {
          id: message.id,
          chat_id: message.chat_id,
          type: message.message_type,
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
          message_text: message.message_text,
          image_url: message.image_url,
          workout_plan_id: message.workout_plan_id,
        });
        console.log('💬 Chat actual (currentChatId):', currentChatId);
        console.log('💬 Chat del mensaje:', message.chat_id);

        // Solo enviar notificación si no estamos viendo ese chat actualmente
        if (currentChatId === message.chat_id) {
          console.log('💬 No enviar notificación - usuario viendo este chat');
          return;
        }
        
        // Obtener perfil del remitente (usar maybeSingle para evitar errores)
        const { data: senderProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('name, username')
          .eq('user_id', message.sender_id)
          .maybeSingle();

        if (profileError) {
          console.error('💬 Error obteniendo perfil del remitente:', profileError);
        }

        const senderName = senderProfile?.name || senderProfile?.username || 'Usuario';

        // Determinar el chat_id del mensaje
        const chatId = message.chat_id;

        // Si es un entrenamiento compartido
        if (message.message_type === 'workout_share' && message.workout_plan_id) {
          console.log('💬 Enviando notificación de entrenamiento compartido');
          
          // Obtener nombre del plan de entrenamiento
          const { data: workoutPlan, error: planError } = await supabase
            .from('workout_plans')
            .select('plan_name')
            .eq('id', message.workout_plan_id)
            .maybeSingle();

          if (planError) {
            console.error('💬 Error obteniendo plan de entrenamiento:', planError);
          }

          const planName = workoutPlan?.plan_name || 'Entrenamiento';

          await sendWorkoutSharedNotification(
            senderName,
            planName,
            chatId,
            message.sender_id,
            message.workout_plan_id
          );
        } 
        // Si es un mensaje de texto normal
        else if (message.message_type === 'text' && message.message_text) {
          console.log('💬 Enviando notificación de mensaje de texto');
          
          await sendMessageNotification(
            senderName,
            message.message_text,
            chatId,
            message.sender_id
          );
        }
        // Si es un mensaje con imagen
        else if (message.message_type === 'image' && message.image_url) {
          console.log('💬 Enviando notificación de mensaje con imagen');
          
          await sendMessageNotification(
            senderName,
            '📷 Imagen',
            chatId,
            message.sender_id
          );
        }
        // Si es una respuesta de entrenamiento (aceptado/rechazado)
        else if (message.message_type === 'workout_accepted' || message.message_type === 'workout_rejected') {
          console.log('💬 Enviando notificación de respuesta de entrenamiento');
          
          const { data: receiverProfile, error: receiverError } = await supabase
            .from('user_profiles')
            .select('name')
            .eq('user_id', message.sender_id)
            .maybeSingle();

          if (receiverError) {
            console.error('💬 Error obteniendo perfil del receptor:', receiverError);
          }

          const receiverName = receiverProfile?.name || 'Usuario';

          await sendWorkoutResponseNotification(
            receiverName,
            message.message_type === 'workout_accepted',
            chatId,
            message.sender_id
          );
        } else {
          console.log('💬 Tipo de mensaje no manejado:', message.message_type);
        }
      } catch (error: any) {
        console.error('💬 Error procesando notificación de mensaje:', error);
      }
    });

    return () => {
      console.log('💬 Desuscribiéndose de notificaciones de chat');
      if (channel) {
        channel.unsubscribe().then(() => {
          console.log('✅ Desuscripción completada');
        }).catch((err) => {
          console.error('❌ Error al desuscribirse:', err);
        });
      }
    };
  }, [user?.id]);
}

/**
 * Función para establecer el chat actual (para no enviar notificaciones si estamos viendo ese chat)
 * Debe ser llamada desde la pantalla de chat cuando se abre/cierra
 */
export function setCurrentChatForNotifications(chatId: string | null) {
  currentChatId = chatId;
  console.log('💬 Chat actual establecido para notificaciones:', chatId);
}

