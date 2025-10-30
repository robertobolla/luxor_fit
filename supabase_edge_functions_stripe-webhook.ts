// Ejemplo de Edge Function (Deno) para manejar webhooks de Stripe
// Ubicación sugerida al desplegar: supabase/functions/stripe-webhook/index.ts
// Requiere variables: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE

// deno-lint-ignore-file no-explicit-any
import Stripe from 'https://esm.sh/stripe@12.8.0?target=deno';

export const stripeWebhookHandler = async (req: Request): Promise<Response> => {
  const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE } = Deno.env.toObject();
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return new Response('Faltan variables de entorno', { status: 500 });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  const signature = req.headers.get('stripe-signature');
  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    if (!signature) throw new Error('Falta firma de Stripe');
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Supabase client con service role
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = (session.metadata as any)?.user_id || (session.subscription as string) || null;
        const subscriptionId = session.subscription as string | null;

        if (userId) {
          // Recuperar suscripción para fechas/trial
          let trialStart: string | null = null;
          let trialEnd: string | null = null;
          let currentStart: string | null = null;
          let currentEnd: string | null = null;
          let status: string | null = 'active';

          if (subscriptionId) {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            status = sub.status;
            trialStart = sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null;
            trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
            currentStart = sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null;
            currentEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
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
              },
              { onConflict: 'user_id' }
            );
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = (sub.metadata as any)?.user_id || null;
        if (userId) {
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
              },
              { onConflict: 'user_id' }
            );
        }
        break;
      }
      default:
        // Ignorar otros eventos
        break;
    }
  } catch (e: any) {
    return new Response(`Error interno: ${e?.message}`, { status: 500 });
  }

  return new Response('ok', { status: 200 });
};


