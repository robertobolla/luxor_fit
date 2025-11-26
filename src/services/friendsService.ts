import { supabase } from './supabase';

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
  friend_profile?: {
    username: string;
    name: string;
    profile_photo_url?: string;
  };
}

export interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  user_profile?: {
    username: string;
    name: string;
    profile_photo_url?: string;
  };
}

/**
 * Buscar usuarios por username
 */
export async function searchUsersByUsername(username: string, currentUserId: string): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, username, name, profile_photo_url')
      .ilike('username', `%${username}%`)
      .neq('user_id', currentUserId)
      .limit(20);

    if (error) {
      console.error('Error searching users:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error searching users:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Enviar solicitud de amistad
 */
export async function sendFriendRequest(userId: string, friendId: string): Promise<{
  success: boolean;
  data?: Friendship;
  error?: string;
}> {
  try {
    // Verificar que no exista ya una solicitud
    const { data: existing } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') {
        return { success: false, error: 'Ya son amigos' };
      }
      if (existing.status === 'pending') {
        return { success: false, error: 'Ya existe una solicitud pendiente' };
      }
    }

    const { data, error } = await supabase
      .from('friendships')
      .insert({
        user_id: userId,
        friend_id: friendId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending friend request:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error sending friend request:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Aceptar solicitud de amistad
 */
export async function acceptFriendRequest(friendshipId: string, userId: string): Promise<{
  success: boolean;
  data?: Friendship;
  error?: string;
}> {
  try {
    // Verificar que la solicitud existe y es para este usuario
    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .single();

    if (fetchError || !friendship) {
      return { success: false, error: 'Solicitud no encontrada' };
    }

    if (friendship.friend_id !== userId) {
      return { success: false, error: 'No tienes permiso para aceptar esta solicitud' };
    }

    if (friendship.status !== 'pending') {
      return { success: false, error: 'Esta solicitud ya fue procesada' };
    }

    const { data, error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)
      .select()
      .single();

    if (error) {
      console.error('Error accepting friend request:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error accepting friend request:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Rechazar solicitud de amistad
 */
export async function rejectFriendRequest(friendshipId: string, userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: friendship } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .single();

    if (!friendship || friendship.friend_id !== userId) {
      return { success: false, error: 'Solicitud no encontrada' };
    }

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      console.error('Error rejecting friend request:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting friend request:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener lista de amigos
 */
export async function getFriends(userId: string): Promise<{
  success: boolean;
  data?: Friendship[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) {
      console.error('Error getting friends:', error);
      return { success: false, error: error.message };
    }

    // Transformar datos para incluir el perfil del amigo
    const friends = await Promise.all(
      (data || []).map(async (friendship: any) => {
        const isUser1 = friendship.user_id === userId;
        const friendId = isUser1 ? friendship.friend_id : friendship.user_id;
        const friendProfile = await getFriendProfile(friendId);
        
        return {
          ...friendship,
          friend_id: friendId,
          friend_profile: friendProfile,
        };
      })
    );

    return { success: true, data: friends };
  } catch (error: any) {
    console.error('Error getting friends:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener solicitudes pendientes
 */
export async function getPendingFriendRequests(userId: string): Promise<{
  success: boolean;
  data?: FriendRequest[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .eq('friend_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error('Error getting pending requests:', error);
      return { success: false, error: error.message };
    }

    // Obtener perfiles de los usuarios que enviaron las solicitudes
    const requestsWithProfiles = await Promise.all(
      (data || []).map(async (request: any) => {
        const userProfile = await getFriendProfile(request.user_id);
        return {
          ...request,
          user_profile: userProfile,
        };
      })
    );

    return { success: true, data: requestsWithProfiles };
  } catch (error: any) {
    console.error('Error getting pending requests:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper para obtener perfil de un amigo
 */
async function getFriendProfile(friendId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('user_id, username, name, profile_photo_url')
    .eq('user_id', friendId)
    .single();
  
  return data;
}

