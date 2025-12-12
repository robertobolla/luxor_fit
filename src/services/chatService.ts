import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Chat {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at?: string;
  last_message_text?: string;
  created_at: string;
  other_user?: {
    user_id: string;
    username: string;
    name: string;
    profile_photo_url?: string;
  };
  unread_count?: number;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  message_type: 'text' | 'workout_share' | 'workout_accepted' | 'workout_rejected' | 'image';
  workout_plan_id?: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Obtener o crear un chat entre dos usuarios
 */
export async function getOrCreateChat(userId1: string, userId2: string): Promise<{
  success: boolean;
  data?: Chat;
  error?: string;
}> {
  try {
    // Asegurar orden consistente (user1_id < user2_id)
    const [user1, user2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

    // Buscar chat existente
    const { data: existingChat, error: fetchError } = await supabase
      .from('chats')
      .select('*')
      .eq('user1_id', user1)
      .eq('user2_id', user2)
      .maybeSingle();

    if (existingChat) {
      // Obtener perfil del otro usuario
      const otherUserId = existingChat.user1_id === userId1 ? existingChat.user2_id : existingChat.user1_id;
      const otherUser = await getUserProfile(otherUserId);
      
      return {
        success: true,
        data: {
          ...existingChat,
          other_user: otherUser,
        },
      };
    }

    // Crear nuevo chat
    const { data: newChat, error: createError } = await supabase
      .from('chats')
      .insert({
        user1_id: user1,
        user2_id: user2,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating chat:', createError);
      return { success: false, error: createError.message };
    }

    const otherUserId = newChat.user1_id === userId1 ? newChat.user2_id : newChat.user1_id;
    const otherUser = await getUserProfile(otherUserId);

    return {
      success: true,
      data: {
        ...newChat,
        other_user: otherUser,
      },
    };
  } catch (error: any) {
    console.error('Error getting/creating chat:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener todos los chats de un usuario
 */
export async function getUserChats(userId: string): Promise<{
  success: boolean;
  data?: Chat[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error getting chats:', error);
      return { success: false, error: error.message };
    }

    // Obtener perfiles de los otros usuarios y contar mensajes no leídos
    const chatsWithProfiles = await Promise.all(
      (data || []).map(async (chat) => {
        const otherUserId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;
        const otherUser = await getUserProfile(otherUserId);
        
        // Contar mensajes no leídos
        const unreadCount = await getUnreadMessageCount(chat.id, userId);

        return {
          ...chat,
          other_user: otherUser,
          unread_count: unreadCount,
        };
      })
    );

    return { success: true, data: chatsWithProfiles };
  } catch (error: any) {
    console.error('Error getting chats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener el número total de chats con mensajes sin leer
 */
export async function getTotalUnreadChatsCount(userId: string): Promise<number> {
  try {
    // Obtener todos los chats del usuario
    const { data: chats } = await supabase
      .from('chats')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (!chats) return 0;

    // Contar cuántos chats tienen mensajes sin leer
    let unreadChatsCount = 0;
    
    for (const chat of chats) {
      const unreadCount = await getUnreadMessageCount(chat.id, userId);
      if (unreadCount > 0) {
        unreadChatsCount++;
      }
    }

    return unreadChatsCount;
  } catch (error) {
    console.error('Error getting unread chats count:', error);
    return 0;
  }
}

/**
 * Obtener mensajes de un chat
 */
export async function getChatMessages(chatId: string, limit: number = 50): Promise<{
  success: boolean;
  data?: Message[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting messages:', error);
      return { success: false, error: error.message };
    }

    // Invertir orden para mostrar del más antiguo al más reciente
    return { success: true, data: (data || []).reverse() };
  } catch (error: any) {
    console.error('Error getting messages:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Enviar un mensaje
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  receiverId: string,
  messageText: string,
  messageType: 'text' | 'workout_share' | 'workout_accepted' | 'workout_rejected' | 'image' = 'text',
  workoutPlanId?: string,
  imageUrl?: string
): Promise<{
  success: boolean;
  data?: Message;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        receiver_id: receiverId,
        message_text: messageText,
        message_type: messageType,
        workout_plan_id: workoutPlanId,
        image_url: imageUrl,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error sending message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Marcar mensajes como leídos
 */
export async function markMessagesAsRead(chatId: string, userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking messages as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Suscribirse a nuevos mensajes en tiempo real
 */
export function subscribeToMessages(
  chatId: string,
  onNewMessage: (message: Message) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`chat:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        onNewMessage(payload.new as Message);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Suscribirse a cambios en chats (nuevos mensajes, actualizaciones)
 */
export function subscribeToChats(
  userId: string,
  onChatUpdate: (chat: Chat) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`user_chats:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chats',
        filter: `user1_id=eq.${userId},user2_id=eq.${userId}`,
      },
      (payload) => {
        onChatUpdate(payload.new as Chat);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Suscribirse a todos los mensajes nuevos del usuario para notificaciones
 */
export function subscribeToAllUserMessages(
  userId: string,
  onNewMessage: (message: Message) => void
): RealtimeChannel {
  console.log('💬 Creando suscripción Realtime para usuario:', userId);
  
  const channel = supabase
    .channel(`user_messages:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        console.log('💬 Evento Realtime recibido - payload completo:', JSON.stringify(payload, null, 2));
        console.log('💬 Tipo de evento:', payload.eventType);
        console.log('💬 Nueva fila (payload.new):', payload.new);
        console.log('💬 Schema:', payload.schema);
        console.log('💬 Tabla:', payload.table);
        
        try {
          if (!payload.new) {
            console.error('💬 Error: payload.new es null o undefined');
            return;
          }
          
          const message = payload.new as Message;
          console.log('💬 Mensaje parseado:', {
            id: message.id,
            chat_id: message.chat_id,
            sender_id: message.sender_id,
            receiver_id: message.receiver_id,
            message_type: message.message_type,
            message_text: message.message_text?.substring(0, 50),
          });
          
          onNewMessage(message);
        } catch (error) {
          console.error('💬 Error procesando mensaje Realtime:', error);
          console.error('💬 Stack trace:', error instanceof Error ? error.stack : 'No stack available');
        }
      }
    )
    .subscribe();

  // Verificar el estado de la suscripción después de un breve delay
  setTimeout(() => {
    const state = channel.state;
    if (state === 'joined') {
      console.log('✅ Suscripción Realtime establecida correctamente para:', userId);
    } else if (state === 'errored') {
      console.error('❌ Error en canal Realtime - estado: errored');
    } else if (state === 'closed') {
      console.warn('⚠️ Canal Realtime cerrado');
    } else {
      console.log('💬 Estado de suscripción Realtime:', state);
    }
  }, 1000);

  return channel;
}

/**
 * Helper para obtener perfil de usuario
 */
async function getUserProfile(userId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('user_id, username, name, profile_photo_url')
    .eq('user_id', userId)
    .single();
  
  return data || null;
}

/**
 * Helper para contar mensajes no leídos
 */
async function getUnreadMessageCount(chatId: string, userId: string): Promise<number> {
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('chat_id', chatId)
    .eq('receiver_id', userId)
    .eq('is_read', false);
  
  return count || 0;
}

/**
 * Establecer indicador de escritura
 */
export async function setTypingIndicator(
  chatId: string,
  userId: string,
  isTyping: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('typing_indicators')
      .upsert({
        chat_id: chatId,
        user_id: userId,
        is_typing: isTyping,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'chat_id,user_id'
      });

    if (error) {
      console.error('Error setting typing indicator:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error setting typing indicator:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Suscribirse a indicadores de escritura
 */
export function subscribeToTypingIndicators(
  chatId: string,
  onTypingChange: (userId: string, isTyping: boolean) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`typing:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'typing_indicators',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        const indicator = payload.new as any;
        onTypingChange(indicator.user_id, indicator.is_typing);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Buscar mensajes en un chat
 */
export async function searchMessages(
  chatId: string,
  searchQuery: string,
  limit: number = 50
): Promise<{
  success: boolean;
  data?: Message[];
  error?: string;
}> {
  try {
    if (!searchQuery.trim()) {
      return { success: false, error: 'Query de búsqueda vacío' };
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .ilike('message_text', `%${searchQuery}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching messages:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []).reverse() };
  } catch (error: any) {
    console.error('Error searching messages:', error);
    return { success: false, error: error.message };
  }
}

