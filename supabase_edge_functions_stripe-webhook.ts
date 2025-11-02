// Requiere variables: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

// deno-lint-ignore-file no-explicit-any
import Stripe from 'https://esm.sh/stripe@12.8.0?target=deno';

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Deno.env.toObject();
    const SUPABASE_SERVICE_ROLE = SUPABASE_SERVICE_ROLE_KEY; // Alias para compatibilidad
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      return new Response('Faltan variables de entorno', { status: 500 });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
    const signature = req.headers.get('stripe-signature');
    const rawBody = await req.text();
    if (!signature) return new Response('Falta firma de Stripe', { status: 400 });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = (session.metadata as any)?.user_id || null;
          const partnerId = (session.metadata as any)?.partner_id || null;
          const discountCode = (session.metadata as any)?.discount_code || null;
          const subscriptionId = (session.subscription as string) || null;

          if (userId) {
            let trialStart: string | null = null;
            let trialEnd: string | null = null;
            let currentStart: string | null = null;
            let currentEnd: string | null = null;
            let status: string | null = 'active';
            let discountAmount: number | null = null;

            let monthlyAmount: number | null = null;
            
            if (subscriptionId) {
              const sub = await stripe.subscriptions.retrieve(subscriptionId);
              status = sub.status;
              trialStart = sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null;
              trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
              currentStart = sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null;
              currentEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
              
              // Calcular monto mensual
              const priceItem = sub.items.data[0]?.price;
              if (priceItem) {
                const amount = priceItem.unit_amount || 0; // En centavos
                const interval = priceItem.recurring?.interval; // 'month' o 'year'
                
                if (interval === 'month') {
                  monthlyAmount = amount / 100; // Convertir a dólares
                } else if (interval === 'year') {
                  monthlyAmount = amount / 100 / 12; // Convertir a dólares y dividir por 12
                } else {
                  monthlyAmount = amount / 100; // Por defecto asumir mensual
                }
                
                // Aplicar descuento si existe
                if (sub.discount?.coupon) {
                  if (sub.discount.coupon.percent_off) {
                    monthlyAmount = monthlyAmount * (1 - sub.discount.coupon.percent_off / 100);
                  } else if (sub.discount.coupon.amount_off) {
                    const discountInDollars = sub.discount.coupon.amount_off / 100;
                    monthlyAmount = Math.max(0, monthlyAmount - discountInDollars);
                  }
                }
              }
              
              // Calcular descuento aplicado para registro
              if (sub.discount?.coupon) {
                const totalAmount = sub.items.data[0]?.price?.unit_amount || 0;
                if (sub.discount.coupon.percent_off) {
                  discountAmount = (totalAmount * sub.discount.coupon.percent_off) / 100;
                } else if (sub.discount.coupon.amount_off) {
                  discountAmount = sub.discount.coupon.amount_off;
                }
              }
            }

            await supabase
              .from('subscriptions')
              .upsert(
                {
                  user_id: String(userId),
                  stripe_customer_id: session.customer?.toString() ?? null,
                  stripe_subscription_id: subscriptionId,
                  status,
                  trial_start: trialStart,
                  trial_end: trialEnd,
                  current_period_start: currentStart,
                  current_period_end: currentEnd,
                  monthly_amount: monthlyAmount,
                },
                { onConflict: 'user_id' }
              );
            
            // Registrar el uso del código de descuento si existe (para rastreo de socios)
            // Los códigos de socio pueden dar descuento (si está configurado) y también rastrear invitados
            if (discountCode && partnerId) {
              await supabase
                .from('discount_code_usage')
                .insert({
                  user_id: userId,
                  discount_code: discountCode,
                  partner_id: partnerId,
                  stripe_session_id: session.id,
                  subscription_id: userId,
                  discount_amount: discountAmount ? discountAmount / 100 : null, // Convertir de centavos a dólares (si aplicó descuento)
                  is_free_access: false, // El usuario paga (puede tener descuento si está configurado)
                });
            }
          }
          break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.created':
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const userId = (sub.metadata as any)?.user_id || null;
          if (userId) {
            // Calcular monto mensual
            let monthlyAmount: number | null = null;
            const priceItem = sub.items.data[0]?.price;
            if (priceItem) {
              const amount = priceItem.unit_amount || 0; // En centavos
              const interval = priceItem.recurring?.interval; // 'month' o 'year'
              
              if (interval === 'month') {
                monthlyAmount = amount / 100; // Convertir a dólares
              } else if (interval === 'year') {
                monthlyAmount = amount / 100 / 12; // Convertir a dólares y dividir por 12
              } else {
                monthlyAmount = amount / 100; // Por defecto asumir mensual
              }
              
              // Aplicar descuento si existe
              if (sub.discount?.coupon) {
                if (sub.discount.coupon.percent_off) {
                  monthlyAmount = monthlyAmount * (1 - sub.discount.coupon.percent_off / 100);
                } else if (sub.discount.coupon.amount_off) {
                  const discountInDollars = sub.discount.coupon.amount_off / 100;
                  monthlyAmount = Math.max(0, monthlyAmount - discountInDollars);
                }
              }
            }

            await supabase
              .from('subscriptions')
              .upsert(
                {
                  user_id: String(userId),
                  stripe_customer_id: (sub.customer as string) ?? null,
                  stripe_subscription_id: sub.id,
                  status: sub.status,
                  trial_start: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null,
                  trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
                  current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
                  current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
                  cancel_at_period_end: sub.cancel_at_period_end ?? false,
                  canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
                  monthly_amount: monthlyAmount,
                },
                { onConflict: 'user_id' }
              );
          }
          break;
        }
        default:
          break;
      }
    } catch (e: any) {
      console.error('stripe-webhook handler error:', e);
      return new Response(`Error interno: ${e?.message}`, { status: 500 });
    }

    return new Response('ok', { status: 200 });
  } catch (outer: any) {
    console.error('stripe-webhook outer error:', outer);
    return new Response('Error inesperado', { status: 500 });
  }
});


