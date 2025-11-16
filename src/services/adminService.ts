// ============================================================================
// ADMIN SERVICE - Verificación de roles de administrador
// ============================================================================

import { supabase } from './supabase';
import { getClerkUserEmailSync } from '../utils/clerkHelpers';
import { User } from '@clerk/clerk-expo';

/**
 * Verifica si un usuario es admin
 * También busca por email como fallback
 */
export async function checkAdminAccess(userId: string, user?: User | null): Promise<boolean> {
  try {
    // Obtener email si está disponible
    const userEmail = user ? getClerkUserEmailSync(user) : null;
    
    console.log('🔍 checkAdminAccess: Verificando admin para user_id:', userId);
    if (userEmail) {
      console.log('📧 Email del usuario:', userEmail);
    }
    
    // Primero intentar con user_id
    let { data, error } = await supabase
      .from('admin_roles')
      .select('id, role_type, is_active, user_id, email')
      .eq('user_id', userId)
      .eq('role_type', 'admin')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('❌ Error verificando admin:', error);
    }

    // Si no encuentra por user_id pero tenemos email, buscar por email
    if (!data && userEmail) {
      console.log('🔍 No encontrado por user_id, buscando por email:', userEmail);
      // Buscar por email (case-insensitive usando LOWER)
      const { data: emailData, error: emailError } = await supabase
        .from('admin_roles')
        .select('id, role_type, is_active, user_id, email')
        .ilike('email', userEmail) // Case-insensitive search
        .eq('role_type', 'admin')
        .eq('is_active', true)
        .maybeSingle();

      if (emailError) {
        console.error('❌ Error buscando admin por email:', emailError);
      }

      if (emailData) {
        console.log('✅ Admin encontrado por email:', emailData.email);
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
        console.log('❌ No se encontró admin con email:', userEmail);
        // Debug: Listar todos los admins para ver qué hay
        const { data: allAdmins } = await supabase
          .from('admin_roles')
          .select('email, role_type, is_active')
          .eq('role_type', 'admin')
          .limit(10);
        console.log('📋 Admins existentes:', allAdmins);
      }
    } else if (!data && !userEmail) {
      console.log('⚠️ No se pudo obtener email del usuario, solo verificando por user_id');
    }

    const isAdmin = !!data;
    console.log('🔍 checkAdminAccess: Resultado:', isAdmin ? '✅ Es admin' : '❌ No es admin');
    
    return isAdmin;
  } catch (error) {
    console.error('❌ Error inesperado verificando admin:', error);
    return false;
  }
}

