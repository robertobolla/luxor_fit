// Ejemplo de Edge Function (Deno) para crear sesión de Checkout
// Ubicación sugerida al desplegar: supabase/functions/create-checkout-session/index.ts
// Requiere variables: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, APP_RETURN_URL

// deno-lint-ignore-file no-explicit-any
import Stripe from 'https://esm.sh/stripe@12.8.0?target=deno';

export const createCheckoutHandler = async (req: Request): Promise<Response> => {
  try {
    const { STRIPE_SECRET_KEY, STRIPE_PRICE_ID, APP_RETURN_URL } = Deno.env.toObject();
    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID || !APP_RETURN_URL) {
      return new Response(JSON.stringify({ message: 'Faltan variables de entorno' }), { status: 500 });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    const body = await req.json();
    const userId: string | undefined = body?.user_id;
    const promoCode: string | undefined = body?.promo_code ?? undefined;
    if (!userId) {
      return new Response(JSON.stringify({ message: 'user_id requerido' }), { status: 400 });
    }

    // Buscar y aplicar promo_code si llega
    let discounts: Array<{ promotion_code: string }> | undefined = undefined;
    if (promoCode && promoCode.length > 0) {
      const promoList = await stripe.promotionCodes.list({ code: promoCode, active: true, limit: 1 });
      const found = promoList.data?.[0];
      if (found?.id) {
        discounts = [{ promotion_code: found.id }];
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      discounts,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 7,
        metadata: { user_id: userId },
      },
      metadata: { user_id: userId },
      success_url: `${APP_RETURN_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: APP_RETURN_URL,
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ message: e?.message || 'Error creando checkout' }), { status: 500 });
  }
};


