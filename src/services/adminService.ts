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
    // Obtener email si está disponible
    const userEmail = user ? getClerkUserEmailSync(user) : null;
    
    console.log('🔍 checkAdminAccess: Verificando roles especiales para user_id:', userId);
    if (userEmail) {
      console.log('📧 Email del usuario:', userEmail);
    }
    
    // Primero intentar con user_id - Buscar CUALQUIER rol activo (admin, empresario, socio)
    let { data, error } = await supabase
      .from('admin_roles')
      .select('id, role_type, is_active, user_id, email')
      .eq('user_id', userId)
      .eq('is_active', true)
      .in('role_type', ['admin', 'empresario', 'socio'])
      .maybeSingle();

    if (error) {
      console.error('❌ Error verificando roles:', error);
    }

    // Si no encuentra por user_id pero tenemos email, buscar por email
    if (!data && userEmail) {
      console.log('🔍 No encontrado por user_id, buscando por email:', userEmail);
      // Buscar por email (case-insensitive) - CUALQUIER rol activo
      const { data: emailData, error: emailError } = await supabase
        .from('admin_roles')
        .select('id, role_type, is_active, user_id, email')
        .ilike('email', userEmail) // Case-insensitive search
        .eq('is_active', true)
        .in('role_type', ['admin', 'empresario', 'socio'])
        .maybeSingle();

      if (emailError) {
        console.error('❌ Error buscando rol por email:', emailError);
      }

      if (emailData) {
        console.log('✅ Rol especial encontrado por email:', emailData.email, '- Tipo:', emailData.role_type);
        console.log('📝 Datos encontrados:', JSON.stringify(emailData, null, 2));
        
        // Actualizar el user_id en la base de datos para futuras consultas
        if (emailData.user_id !== userId) {
          console.log('🔄 Actualizando user_id de', emailData.user_id, 'a', userId);
          const { error: updateError } = await supabase
            .from('admin_roles')
            .update({ user_id: userId, updated_at: new Date().toISOString() })
            .eq('id', emailData.id);

          if (updateError) {
            console.error('❌ Error actualizando user_id:', updateError);
          } else {
            console.log('✅ user_id actualizado correctamente');
          }
        }
        data = emailData;
      } else {
        console.log('❌ No se encontró rol especial con email:', userEmail);
        // Debug: Listar todos los roles especiales para ver qué hay
        const { data: allRoles } = await supabase
          .from('admin_roles')
          .select('email, role_type, is_active')
          .in('role_type', ['admin', 'empresario', 'socio'])
          .limit(10);
        console.log('📋 Roles especiales existentes:', allRoles);
      }
    } else if (!data && !userEmail) {
      console.log('⚠️ No se pudo obtener email del usuario, solo verificando por user_id');
    }

    const hasSpecialRole = !!data;
    console.log('🔍 checkAdminAccess: Resultado:', hasSpecialRole ? `✅ Tiene rol especial (${data?.role_type})` : '❌ No tiene rol especial');
    
    return hasSpecialRole;
  } catch (error) {
    console.error('❌ Error inesperado verificando roles especiales:', error);
    return false;
  }
}

