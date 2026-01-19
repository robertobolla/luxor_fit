/**
 * PromoCode Service
 * Servicio para validar y aplicar c?digos promocionales de socios
 */

import { supabase } from './supabase';

export interface PromoCodeInfo {
  isValid: boolean;
  partnerId?: string;
  partnerName?: string;
  discountCode?: string;
  discountPercentage?: number;
  freeAccess?: boolean;
  benefitDurationDays?: number | null; // null = permanente
  codeExpiresAt?: string | null; // fecha de expiraci?n del c?digo
  message?: string;
}

export interface ApplyCodeResult {
  success: boolean;
  grantedFreeAccess: boolean;
  message: string;
  expiresAt?: string; // fecha en que expira el acceso
}

/**
 * Valida un c?digo promocional contra los c?digos de socios
 */
export async function validatePromoCode(code: string): Promise<PromoCodeInfo> {
  if (!code || code.trim().length === 0) {
    return {
      isValid: false,
      message: 'C?digo vac?o',
    };
  }

  try {
    const normalizedCode = code.toUpperCase().trim();

    // Buscar el c?digo en admin_roles (socios)
    const { data: partner, error } = await supabase
      .from('admin_roles')
      .select('user_id, name, email, discount_code, discount_percentage, free_access, is_active, benefit_duration_days, code_expires_at')
      .eq('discount_code', normalizedCode)
      .eq('role_type', 'socio')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error validando c?digo promocional:', error);
      return {
        isValid: false,
        message: 'Error al validar el c?digo',
      };
    }

    if (!partner) {
      return {
        isValid: false,
        message: 'C?digo no v?lido o expirado',
      };
    }

    // Verificar si el c?digo ha expirado
    if (partner.code_expires_at) {
      const expirationDate = new Date(partner.code_expires_at);
      if (expirationDate < new Date()) {
        return {
          isValid: false,
          message: 'Este c?digo ha expirado',
        };
      }
    }

    // C?digo v?lido encontrado
    return {
      isValid: true,
      partnerId: partner.user_id,
      partnerName: partner.name || partner.email || 'Socio',
      discountCode: partner.discount_code,
      discountPercentage: partner.discount_percentage || 0,
      freeAccess: partner.free_access || false,
      benefitDurationDays: partner.benefit_duration_days, // null = permanente
      codeExpiresAt: partner.code_expires_at,
      message: getDiscountMessage(partner.discount_percentage, partner.free_access, partner.benefit_duration_days),
    };
  } catch (error) {
    console.error('Error en validatePromoCode:', error);
    return {
      isValid: false,
      message: 'Error al validar el c?digo',
    };
  }
}

/**
 * Aplica un c?digo promocional que otorga acceso gratuito
 * Crea una suscripci?n gratuita y registra el uso del c?digo
 */
export async function applyFreeAccessCode(
  userId: string,
  promoCode: string,
  partnerId: string
): Promise<ApplyCodeResult> {
  try {
    const normalizedCode = promoCode.toUpperCase().trim();

    // 1. Obtener informaci?n completa del c?digo
    const { data: partner, error: partnerError } = await supabase
      .from('admin_roles')
      .select('user_id, discount_code, discount_percentage, free_access, benefit_duration_days, code_expires_at')
      .eq('discount_code', normalizedCode)
      .eq('role_type', 'socio')
      .eq('is_active', true)
      .maybeSingle();

    if (partnerError || !partner) {
      return {
        success: false,
        grantedFreeAccess: false,
        message: 'C?digo no v?lido',
      };
    }

    // 2. Verificar si el c?digo ha expirado
    if (partner.code_expires_at) {
      const expirationDate = new Date(partner.code_expires_at);
      if (expirationDate < new Date()) {
        return {
          success: false,
          grantedFreeAccess: false,
          message: 'Este c?digo ha expirado',
        };
      }
    }

    // Solo aplicar acceso gratuito si tiene 100% descuento o free_access
    const grantsFreeAccess = partner.discount_percentage === 100 || partner.free_access;
    
    if (!grantsFreeAccess) {
      return {
        success: true,
        grantedFreeAccess: false,
        message: `Este c?digo ofrece ${partner.discount_percentage}% de descuento. Completa la compra para aplicarlo.`,
      };
    }

    // 3. Verificar que el usuario no haya usado ya este c?digo
    const { data: existingUsage } = await supabase
      .from('discount_code_usage')
      .select('id')
      .eq('user_id', userId)
      .eq('discount_code', normalizedCode)
      .maybeSingle();

    if (existingUsage) {
      return {
        success: false,
        grantedFreeAccess: false,
        message: 'Ya has usado este c?digo anteriormente',
      };
    }

    // 4. Calcular fecha de expiraci?n del acceso
    const now = new Date();
    let periodEnd: Date | null = null;
    
    if (partner.benefit_duration_days === null || partner.benefit_duration_days === undefined) {
      // Acceso permanente - usar una fecha muy lejana (100 a?os)
      periodEnd = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
    } else if (partner.benefit_duration_days > 0) {
      // Duraci?n espec?fica en d?as
      periodEnd = new Date(now.getTime() + partner.benefit_duration_days * 24 * 60 * 60 * 1000);
    } else {
      // 0 d?as = acceso permanente tambi?n
      periodEnd = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
    }

    // 5. Crear suscripci?n gratuita
    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        promo_code_used: normalizedCode,
        is_promo_subscription: true,
        updated_at: now.toISOString(),
      }, { onConflict: 'user_id' });

    if (subError) {
      console.error('Error creando suscripci?n gratuita:', subError);
      return {
        success: false,
        grantedFreeAccess: false,
        message: 'Error al activar tu acceso. Intenta de nuevo.',
      };
    }

    // 6. Registrar uso del c?digo
    const { error: usageError } = await supabase
      .from('discount_code_usage')
      .insert({
        user_id: userId,
        discount_code: normalizedCode,
        partner_id: partnerId,
        is_free_access: true,
        discount_amount: 0,
      });

    if (usageError) {
      console.error('Error registrando uso del c?digo:', usageError);
      // No fallar por esto, el acceso ya fue otorgado
    }

    // Generar mensaje de ?xito
    const isPermanent = partner.benefit_duration_days === null || partner.benefit_duration_days === undefined || partner.benefit_duration_days === 0;
    const successMessage = isPermanent
      ? '?C?digo aplicado! Ahora tienes acceso premium permanente.'
      : `?C?digo aplicado! Tienes acceso premium por ${partner.benefit_duration_days} d?as.`;

    return {
      success: true,
      grantedFreeAccess: true,
      message: successMessage,
      expiresAt: isPermanent ? undefined : periodEnd.toISOString(),
    };
  } catch (error) {
    console.error('Error en applyFreeAccessCode:', error);
    return {
      success: false,
      grantedFreeAccess: false,
      message: 'Error al aplicar el c?digo',
    };
  }
}

/**
 * Genera un mensaje descriptivo seg?n el tipo de descuento
 */
function getDiscountMessage(percentage?: number, freeAccess?: boolean, durationDays?: number | null): string {
  const isPermanent = durationDays === null || durationDays === undefined || durationDays === 0;
  
  if (freeAccess || percentage === 100) {
    if (isPermanent) {
      return '?Acceso premium permanente!';
    }
    return `?Acceso premium por ${durationDays} d?as!`;
  }
  if (percentage && percentage > 0) {
    return `${percentage}% de descuento`;
  }
  return 'C?digo de referido v?lido';
}

/**
 * Verifica si un usuario ya tiene una suscripci?n activa por c?digo promocional
 */
export async function hasPromoSubscription(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, is_promo_subscription, current_period_end')
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('is_promo_subscription', true)
      .maybeSingle();

    if (error) {
      console.error('Error verificando suscripci?n promo:', error);
      return false;
    }

    if (!data) return false;

    // Verificar si no ha expirado
    if (data.current_period_end) {
      const periodEnd = new Date(data.current_period_end);
      if (periodEnd < new Date()) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error en hasPromoSubscription:', error);
    return false;
  }
}
