import { supabase } from './supabase';

type CreateCheckoutResponse = {
  url: string;
};

export const paymentsService = {
  async createCheckoutSession(promoCode?: string): Promise<string> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase.functions.invoke<CreateCheckoutResponse>(
      'create-checkout-session',
      {
        body: {
          user_id: user.id,
          promo_code: promoCode || null,
        },
      }
    );

    if (error || !data?.url) {
      throw new Error(error?.message || 'No se pudo crear la sesión de pago');
    }
    return data.url;
  },

  async getSubscriptionStatus(): Promise<{
    isActive: boolean;
    status?: string | null;
    trialEnd?: string | null;
  }> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('v_user_subscription')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    return {
      isActive: !!data?.is_active,
      status: data?.status ?? null,
      trialEnd: data?.trial_end ?? null,
    };
  },
};


