// ============================================================================
// ADMIN SERVICE - Verificación de roles de administrador
// ============================================================================

import { supabase } from './supabase';
import { getClerkUserEmailSync } from '../utils/clerkHelpers';
import { User } from '@clerk/clerk-expo';

/**
 * Verifica si un usuario tiene un rol especial con acceso automático (admin, empresario, socio)
 * También busca por email como fallback
 */
export async function checkAdminAccess(userId: string, user?: User | null): Promise<boolean> {
  try {
    const userEmail = user ? getClerkUserEmailSync(user) : null;
    
    // Buscar rol activo por user_id
    let { data, error } = await supabase
      .from('admin_roles')
      .select('id, role_type, is_active, user_id, email')
      .eq('user_id', userId)
      .eq('is_active', true)
      .in('role_type', ['admin', 'empresario', 'socio'])
      .maybeSingle();

    if (error) {
      console.error('Error verificando roles:', error);
    }

    // Si no encuentra por user_id, buscar por email
    if (!data && userEmail) {
      const { data: emailData, error: emailError } = await supabase
        .from('admin_roles')
        .select('id, role_type, is_active, user_id, email')
        .ilike('email', userEmail)
        .eq('is_active', true)
        .in('role_type', ['admin', 'empresario', 'socio'])
        .maybeSingle();

      if (emailError) {
        console.error('Error buscando rol por email:', emailError);
      }

      if (emailData) {
        // Actualizar user_id si es diferente
        if (emailData.user_id !== userId) {
          const { error: updateError } = await supabase
            .from('admin_roles')
            .update({ user_id: userId, updated_at: new Date().toISOString() })
            .eq('id', emailData.id);

          if (updateError) {
            console.error('Error actualizando user_id:', updateError);
          }
        }
        data = emailData;
      }
    }
    
    return !!data;
  } catch (error) {
    console.error('Error inesperado verificando roles especiales:', error);
    return false;
  }
}

