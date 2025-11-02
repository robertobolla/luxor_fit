import { supabase } from './supabase';

/**
 * Verifica si un usuario es miembro activo de un gimnasio (tiene acceso gratuito)
 * También verifica que la suscripción no haya expirado
 */
export async function checkGymMemberAccess(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('gym_members')
      .select('user_id, is_active, subscription_expires_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('❌ Error verificando acceso de gimnasio:', error);
      return false;
    }

    if (!data) {
      return false;
    }

    // Si no hay fecha de expiración, acceso permanente
    if (!data.subscription_expires_at) {
      return true;
    }

    // Verificar que la fecha de expiración no haya pasado
    const expiresAt = new Date(data.subscription_expires_at);
    const now = new Date();
    return expiresAt > now;
  } catch (error) {
    console.error('❌ Error inesperado verificando acceso de gimnasio:', error);
    return false;
  }
}

/**
 * Obtiene la información del empresario de un usuario
 */
export async function getGymEmpresario(userId: string): Promise<{
  empresario_id: string;
  gym_name: string | null;
  name: string | null;
  email: string | null;
} | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_gym_empresario', { check_user_id: userId });

    if (error || !data) {
      return null;
    }

    // Obtener información del empresario
    const { data: empresarioData, error: empresarioError } = await supabase
      .from('admin_roles')
      .select('user_id, gym_name, name, email')
      .eq('user_id', data)
      .eq('is_active', true)
      .maybeSingle();

    if (empresarioError || !empresarioData) {
      return null;
    }

    return {
      empresario_id: empresarioData.user_id,
      gym_name: empresarioData.gym_name,
      name: empresarioData.name,
      email: empresarioData.email,
    };
  } catch (error) {
    console.error('❌ Error inesperado obteniendo empresario:', error);
    return null;
  }
}

/**
 * Obtiene todos los usuarios de un empresario
 */
export async function getEmpresarioUsers(empresarioId: string) {
  try {
    const { data, error } = await supabase
      .rpc('get_empresario_users', { p_empresario_id: empresarioId });

    if (error) {
      console.error('❌ Error obteniendo usuarios del empresario:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Error inesperado obteniendo usuarios:', error);
    throw error;
  }
}

/**
 * Crea un nuevo usuario y lo asocia a un empresario
 */
export async function createGymMember(
  userData: {
    email: string;
    name?: string;
    empresario_id: string;
  }
): Promise<{ user_id: string }> {
  try {
    // NOTA: En Clerk, necesitarás crear el usuario primero con Clerk Admin API
    // Por ahora, asumimos que el user_id ya existe
    // Esto debería hacerse desde el dashboard del empresario o desde el admin dashboard

    // La creación del usuario real se haría con Clerk Admin SDK
    // Por ahora retornamos un placeholder
    throw new Error('La creación de usuarios debe hacerse a través de Clerk Admin API');
  } catch (error) {
    console.error('❌ Error creando miembro de gimnasio:', error);
    throw error;
  }
}

/**
 * Asocia un usuario existente a un empresario
 */
export async function addUserToGym(userId: string, empresarioId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('gym_members')
      .insert({
        user_id: userId,
        empresario_id: empresarioId,
        is_active: true,
      });

    if (error) {
      console.error('❌ Error agregando usuario al gimnasio:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Error inesperado agregando usuario:', error);
    throw error;
  }
}

/**
 * Desactiva un miembro del gimnasio
 */
export async function removeGymMember(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('gym_members')
      .update({
        is_active: false,
        left_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error removiendo miembro del gimnasio:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Error inesperado removiendo miembro:', error);
    throw error;
  }
}

