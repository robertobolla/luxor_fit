import { supabase } from './supabase';

/**
 * Verifica si un usuario es socio con acceso gratuito
 */
export async function checkPartnerFreeAccess(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('admin_roles')
      .select('user_id, free_access, is_active')
      .eq('user_id', userId)
      .eq('role_type', 'socio')
      .eq('free_access', true)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('❌ Error verificando acceso gratuito de socio:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('❌ Error inesperado verificando acceso gratuito:', error);
    return false;
  }
}

/**
 * Obtiene la información de un socio por su código de descuento
 */
export async function getPartnerByDiscountCode(discountCode: string): Promise<{
  user_id: string;
  name: string | null;
  email: string | null;
  discount_code: string;
  free_access: boolean;
  discount_percentage: number;
} | null> {
  try {
    const { data, error } = await supabase
      .from('admin_roles')
      .select('user_id, name, email, discount_code, free_access, discount_percentage')
      .eq('discount_code', discountCode.toUpperCase().trim())
      .eq('role_type', 'socio')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('❌ Error obteniendo socio por código:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Error inesperado obteniendo socio:', error);
    return null;
  }
}

