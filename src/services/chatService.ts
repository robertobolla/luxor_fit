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
  message_type: 'text' | 'workout_share' | 'workout_accepted' | 'workout_rejected';
  workout_plan_id?: string;
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
  messageType: 'text' | 'workout_share' | 'workout_accepted' | 'workout_rejected' = 'text',
  workoutPlanId?: string
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

