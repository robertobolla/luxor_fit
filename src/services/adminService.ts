// ============================================================================
// ADMIN SERVICE - Verificación de roles de administrador
// ============================================================================

import { supabase } from './supabase';
import { TokenManager } from './TokenManager';
import { getClerkUserEmailSync } from '../utils/clerkHelpers';

/**
 * Verifica si un usuario tiene un rol especial con acceso automático (admin, empresario, socio)
 * También busca por email como fallback
 */
export async function checkAdminAccess(userId: string, user?: any | null): Promise<boolean> {
  try {
    const userEmail = user ? getClerkUserEmailSync(user) : null;

    // Obtener token actual para debug
    const token = await TokenManager.getToken();
    console.log('🔐 checkAdminAccess: userId =', userId, '| email =', userEmail, '| hasToken =', !!token);
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          console.log('🕵️ JWT Debug Payload:', {
            iss: payload.iss,
            aud: payload.aud,
            exp: payload.exp
          });
        }
      } catch (e) {
        console.log('⚠️ Error decodificando JWT para debug:', e);
      }
    }

    // Buscar rol activo por user_id
    let { data, error } = await supabase
      .from('admin_roles')
      .select('id, role_type, is_active, user_id, email')
      .eq('user_id', userId)
      .eq('is_active', true)
      .in('role_type', ['admin', 'empresario', 'socio'])
      .maybeSingle();

    console.log('🔐 checkAdminAccess: DB result by userId =', JSON.stringify(data), '| error =', JSON.stringify(error));

    if (error) {
      // Ignorar PGRST301 (JWT invalido) en logs ruidosos, pero si es persistente es un problema
      if (error.code !== 'PGRST116') { // PGRST116 es "no rows returned" (normal)
        console.log('⚠️ CheckAdminAccess Supabase Error:', error.code, error.message);

      }
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

        // Usar la función RPC segura para actualizar el ID (bypass RLS)
        // @ts-ignore - La funcion existe en la DB pero no en los tipos locales
        const { error: rpcError } = await (supabase.rpc as any)('sync_admin_role_id', {
          p_email: userEmail
        });

        if (rpcError) {
          console.warn('Error en RPC sync_admin_role_id mobile:', rpcError);
          // Fallback: intentar update directo
          const { error: updateError } = await supabase
            .from('admin_roles')
            .update({ user_id: userId, updated_at: new Date().toISOString() })
            .eq('id', emailData.id);

          if (updateError) {
            console.error('Error actualizando user_id (fallback):', updateError);
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

