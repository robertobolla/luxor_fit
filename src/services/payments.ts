import { supabase } from './supabase';
import { checkPartnerFreeAccess } from './partnerService';
import { checkGymMemberAccess } from './gymService';
import { checkAdminAccess } from './adminService';

type CreateCheckoutResponse = {
  url: string;
};

export const paymentsService = {
  async createCheckoutSession(promoCode?: string, userId?: string): Promise<string> {
    if (!userId) throw new Error('Usuario no autenticado');
    const invokePromise = supabase.functions.invoke<CreateCheckoutResponse>(
      'create-checkout-session',
      {
        body: {
          user_id: userId,
          promo_code: promoCode || null,
        },
      }
    );

    // Timeout de 15s para evitar spinners infinitos
    const timeoutPromise = new Promise<never>((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error('Tiempo de espera agotado al crear la sesión de pago'));
      }, 15000);
    });

    let result: { data: CreateCheckoutResponse | null; error: any | null };
    try {
      result = await Promise.race([invokePromise, timeoutPromise]) as {
        data: CreateCheckoutResponse | null;
        error: any | null;
      };
    } catch (e: any) {
      console.error('Error al invocar función:', e);
      throw new Error(e?.message || 'Error al invocar la función de pago');
    }

    const { data, error } = result;

    // Log para debugging
    if (error) {
      console.error('Error de función create-checkout-session:', {
        error,
        errorString: JSON.stringify(error, null, 2),
        errorMessage: error?.message,
        errorDetails: error?.details,
      });
    }

    if (error || !data?.url) {
      // Exponer más contexto del error si viene del edge
      let message = 'No se pudo crear la sesión de pago';

      if (error) {
        // Intentar extraer el mensaje del error
        if (typeof error === 'string') {
          message = error;
        } else if (error?.message) {
          message = error.message;
          // Si hay detalles, añadirlos
          if (error?.details && typeof error.details === 'string') {
            try {
              const details = JSON.parse(error.details);
              if (details.message) {
                message = details.message;
                if (details.details) {
                  message += `. ${details.details}`;
                }
              }
            } catch {
              message = `${error.message}. Detalles: ${error.details}`;
            }
          }
        } else if (error?.error?.message) {
          message = error.error.message;
        } else {
          // Intentar parsear el error completo
          try {
            const errorStr = JSON.stringify(error);
            if (errorStr.length < 500) {
              message = `Error: ${errorStr}`;
            } else {
              message = 'Error desconocido al crear sesión de pago. Revisa los logs.';
            }
          } catch {
            message = 'Error desconocido al crear sesión de pago';
          }
        }
      }

      throw new Error(message);
    }
    return data.url;
  },

  async getSubscriptionStatus(userId?: string, user?: any): Promise<{
    isActive: boolean;
    status?: string | null;
    trialEnd?: string | null;
    isPartnerFree?: boolean;
    isGymMember?: boolean;
    isAdmin?: boolean;
  }> {
    if (!userId) {
      // Si no se pasa userId, intentar desde Supabase Auth (fallback)
      try {
        const {
          data: { user: supabaseUser },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !supabaseUser) throw new Error('Usuario no autenticado');
        userId = supabaseUser.id;
      } catch (e) {
        console.error('❌ getSubscriptionStatus: No se pudo obtener user:', e);
        return { isActive: false, isAdmin: false };
      }
    }

    console.log('🔍 getSubscriptionStatus: Verificando acceso para user_id:', userId);

    // PRIMERO verificar si es admin (los admins tienen acceso automático)
    // checkAdminAccess ya es resiliente a errores JWT (usa cliente anon como fallback)
    try {
      const isAdmin = await checkAdminAccess(userId, user);
      if (isAdmin) {
        console.log('✅ Usuario es admin, acceso automático concedido');
        return {
          isActive: true,
          status: 'active',
          trialEnd: null,
          isPartnerFree: false,
          isGymMember: false,
          isAdmin: true,
        };
      }
    } catch (adminError) {
      console.error('❌ Error en checkAdminAccess:', adminError);
      // Continuar con otros checks
    }

    // Verificar suscripción en DB (puede fallar si JWT es inválido o vista no existe)
    let subscription: any = null;
    try {
      const { data, error } = await supabase
        .from('v_user_subscription')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('⚠️ getSubscriptionStatus: Error consultando v_user_subscription:', error.code, error.message);
      } else {
        subscription = data;
      }
    } catch (subError) {
      console.warn('⚠️ getSubscriptionStatus: Error inesperado en v_user_subscription:', subError);
    }

    console.log('🔍 getSubscriptionStatus: Data recibida:', subscription);

    // Verificar acceso por socio/gimnasio (cada uno en su propio try-catch)
    let isPartnerFree = false;
    let isGymMember = false;

    try {
      isPartnerFree = !!userId && (await checkPartnerFreeAccess(userId));
    } catch (e) {
      console.warn('⚠️ Error verificando partner access:', e);
    }

    try {
      isGymMember = !!userId && (await checkGymMemberAccess(userId));
    } catch (e) {
      console.warn('⚠️ Error verificando gym member access:', e);
    }
    const result = {
      isActive: !!subscription?.is_active || isPartnerFree || isGymMember,
      status: subscription?.status ?? null,
      trialEnd: subscription?.trial_end ?? null,
      isPartnerFree,
      isGymMember,
      isAdmin: false,
    };

    console.log('🔍 getSubscriptionStatus: Resultado procesado:', result);

    return result;
  },
};


