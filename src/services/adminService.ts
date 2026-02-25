// ============================================================================
// ADMIN SERVICE - Verificación de roles de administrador
// ============================================================================

import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { TokenManager } from './TokenManager';
import { getClerkUserEmailSync } from '../utils/clerkHelpers';

// Cliente Supabase sin JWT (solo anon key) para queries a tablas con USING(true)
// Esto evita PGRST301 cuando el JWT de Clerk no coincide con el secret de Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

/**
 * Verifica si un usuario tiene un rol especial con acceso automático (admin, empresario, socio)
 * Usa cliente autenticado primero, y si falla con JWT error, usa cliente anon como fallback.
 * admin_roles tiene políticas RLS USING(true) por lo que el anon key es suficiente para leer.
 */
export async function checkAdminAccess(userId: string, user?: any | null): Promise<boolean> {
  try {
    const userEmail = user ? getClerkUserEmailSync(user) : null;
    console.log('🔐 checkAdminAccess: userId =', userId, '| email =', userEmail);

    // Intentar con cliente autenticado primero
    let result = await queryAdminRole(supabase, userId, userEmail);

    // Si falló con error JWT (PGRST301), intentar con cliente anon
    if (result.jwtError) {
      console.log('🔄 checkAdminAccess: JWT error detectado, usando cliente anon como fallback...');
      result = await queryAdminRole(supabaseAnon, userId, userEmail);
    }

    if (result.data) {
      console.log('✅ checkAdminAccess: Rol encontrado:', result.data.role_type, 'para', result.data.email);

      // Intentar sincronizar user_id si se encontró por email y el user_id es diferente
      if (result.foundByEmail && result.data.user_id !== userId) {
        try {
          // @ts-ignore
          await (supabaseAnon.rpc as any)('sync_admin_role_id', { p_email: userEmail });
        } catch (e) {
          // Fallback: update directo con cliente anon
          try {
            await supabaseAnon
              .from('admin_roles')
              .update({ user_id: userId })
              .eq('id', result.data.id);
          } catch (e2) {
            console.warn('⚠️ No se pudo sincronizar user_id:', e2);
          }
        }
      }
      return true;
    }

    console.log('🔐 checkAdminAccess: No se encontró rol admin para este usuario');
    return false;
  } catch (error) {
    console.error('❌ Error inesperado verificando roles especiales:', error);
    return false;
  }
}

/**
 * Helper: busca admin role por user_id, luego por email como fallback
 */
async function queryAdminRole(
  client: any,
  userId: string,
  userEmail: string | null
): Promise<{ data: any | null; jwtError: boolean; foundByEmail: boolean }> {
  // Buscar por user_id
  const { data, error } = await client
    .from('admin_roles')
    .select('id, role_type, is_active, user_id, email')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('role_type', ['admin', 'empresario', 'socio'])
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST301') {
      return { data: null, jwtError: true, foundByEmail: false };
    }
    console.warn('⚠️ checkAdminAccess query error:', error.code, error.message);
  }

  if (data) {
    return { data, jwtError: false, foundByEmail: false };
  }

  // Fallback: buscar por email
  if (userEmail) {
    const { data: emailData, error: emailError } = await client
      .from('admin_roles')
      .select('id, role_type, is_active, user_id, email')
      .ilike('email', userEmail)
      .eq('is_active', true)
      .in('role_type', ['admin', 'empresario', 'socio'])
      .maybeSingle();

    if (emailError) {
      if (emailError.code === 'PGRST301') {
        return { data: null, jwtError: true, foundByEmail: false };
      }
      console.warn('⚠️ checkAdminAccess email query error:', emailError.code);
    }

    if (emailData) {
      return { data: emailData, jwtError: false, foundByEmail: true };
    }
  }

  return { data: null, jwtError: false, foundByEmail: false };
}

