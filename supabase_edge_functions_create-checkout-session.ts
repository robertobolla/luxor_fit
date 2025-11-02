// Edge Function para crear sesión de Checkout sin SDK (REST fetch)
// Requiere variables: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_ANNUAL_PRICE_ID, APP_RETURN_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

// deno-lint-ignore-file no-explicit-any

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const { STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_ANNUAL_PRICE_ID, APP_RETURN_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Deno.env.toObject();
    const SUPABASE_SERVICE_ROLE = SUPABASE_SERVICE_ROLE_KEY; // Alias para compatibilidad
    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID || !APP_RETURN_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
      const have = {
        STRIPE_SECRET_KEY: !!STRIPE_SECRET_KEY,
        STRIPE_PRICE_ID: !!STRIPE_PRICE_ID,
        STRIPE_ANNUAL_PRICE_ID: !!STRIPE_ANNUAL_PRICE_ID,
        APP_RETURN_URL: !!APP_RETURN_URL,
        SUPABASE_URL: !!SUPABASE_URL,
        SUPABASE_SERVICE_ROLE: !!SUPABASE_SERVICE_ROLE,
      };
      console.error({ msg: 'env_missing', have });
      return new Response(
        JSON.stringify({
          message: 'Faltan variables de entorno',
          have,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const userId: string | undefined = body?.user_id;
    const promoCode: string | undefined = body?.promo_code ?? undefined;
    const planType: 'monthly' | 'annual' = body?.plan_type || 'monthly';
    
    if (!userId) {
      return new Response(JSON.stringify({ message: 'user_id requerido' }), { status: 400 });
    }
    
    // Seleccionar el Price ID según el tipo de plan
    const selectedPriceId = (planType === 'annual' && STRIPE_ANNUAL_PRICE_ID) 
      ? STRIPE_ANNUAL_PRICE_ID 
      : STRIPE_PRICE_ID;
    
    console.log(`📦 Plan seleccionado: ${planType}, Price ID: ${selectedPriceId}`);

    // Verificar si el código es de un socio con acceso gratuito
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    
    let isPartnerCode = false;
    let partnerId: string | null = null;
    let partnerDiscountPercentage = 0;
    
    if (promoCode && promoCode.length > 0) {
      const { data: partnerData, error: partnerError } = await supabase
        .from('admin_roles')
        .select('user_id, discount_code, free_access, discount_percentage')
        .eq('discount_code', promoCode.toUpperCase().trim())
        .eq('is_active', true)
        .eq('role_type', 'socio')
        .maybeSingle();
      
      if (!partnerError && partnerData) {
        isPartnerCode = true;
        partnerId = partnerData.user_id;
        partnerDiscountPercentage = partnerData.discount_percentage || 0; // Porcentaje de descuento del socio
        
        console.log(`✅ Código de socio: ${promoCode}, descuento: ${partnerDiscountPercentage}%`);
      }
    }

    // Verificar que el PRICE existe y está accesible
    const priceCheck = await fetch(`https://api.stripe.com/v1/prices/${encodeURIComponent(selectedPriceId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
    if (!priceCheck.ok) {
      const priceText = await priceCheck.text();
      console.error({ msg: 'price_lookup', details: priceText });
      return new Response(
        JSON.stringify({ message: 'Stripe error (price lookup)', details: priceText }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Buscar promotion_code en Stripe (opcional)
    // NOTA: Los códigos de socio NO dan descuento, solo se usan para rastreo
    let promotionCodeId: string | undefined;
    if (promoCode && promoCode.length > 0 && !isPartnerCode) {
      const promoRes = await fetch('https://api.stripe.com/v1/promotion_codes?active=true&limit=1&code=' + encodeURIComponent(promoCode), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        },
      });
      if (promoRes.ok) {
        const promoJson: any = await promoRes.json();
        promotionCodeId = promoJson?.data?.[0]?.id;
      }
    }
    
    // Si es código de socio con descuento configurado, crear promotion code en Stripe dinámicamente
    if (isPartnerCode && partnerDiscountPercentage > 0) {
      // Crear coupon y promotion code en Stripe para el socio
      try {
        // Crear coupon con el porcentaje de descuento
        const couponRes = await fetch('https://api.stripe.com/v1/coupons', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            id: `partner_${partnerId}_${Date.now()}`,
            percent_off: String(partnerDiscountPercentage),
            duration: 'once', // Solo aplica una vez al suscribirse
          }).toString(),
        });
        
        if (couponRes.ok) {
          const couponJson: any = await couponRes.json();
          console.log(`✅ Coupon creado: ${couponJson.id}`);
          
          // Crear promotion code con el código del socio
          const promoCodeRes = await fetch('https://api.stripe.com/v1/promotion_codes', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              coupon: couponJson.id,
              code: (promoCode || '').toUpperCase().trim(),
            }).toString(),
          });
          
          if (promoCodeRes.ok) {
            const promoCodeJson: any = await promoCodeRes.json();
            promotionCodeId = promoCodeJson.id;
            console.log(`✅ Promotion code creado: ${promoCodeJson.id}`);
          } else {
            const errorText = await promoCodeRes.text();
            console.error('Error creando promotion code:', errorText);
          }
        } else {
          const errorText = await couponRes.text();
          console.error('Error creando coupon:', errorText);
        }
      } catch (e) {
        console.error('Error creando coupon de socio:', e);
      }
    }

    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('line_items[0][price]', selectedPriceId);
    params.set('line_items[0][quantity]', '1');
    params.set('allow_promotion_codes', 'true');
    params.set('subscription_data[trial_period_days]', '7');
    params.set('subscription_data[metadata][user_id]', userId);
    params.set('subscription_data[metadata][partner_id]', partnerId || '');
    params.set('subscription_data[metadata][discount_code]', promoCode?.toUpperCase().trim() || '');
    params.set('subscription_data[metadata][plan_type]', planType);
    params.set('metadata[user_id]', userId);
    params.set('metadata[partner_id]', partnerId || '');
    params.set('metadata[discount_code]', promoCode?.toUpperCase().trim() || '');
    params.set('metadata[plan_type]', planType);
    params.set('success_url', `${APP_RETURN_URL}?session_id={CHECKOUT_SESSION_ID}`);
    params.set('cancel_url', APP_RETURN_URL);
    if (promotionCodeId) {
      params.set('discounts[0][promotion_code]', promotionCodeId);
    }

    const createRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error({ msg: 'create_session', details: errText });
      return new Response(
        JSON.stringify({ message: 'Stripe error (create session)', details: errText }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sessionJson: any = await createRes.json();
    return new Response(JSON.stringify({ url: sessionJson.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    const errorDetails = {
      message: e?.message || 'Error creando checkout',
      stack: e?.stack || null,
      name: e?.name || null,
      cause: e?.cause || null,
      toString: String(e),
    };
    console.error('create-checkout-session unhandled error:', errorDetails);
    return new Response(
      JSON.stringify({
        message: errorDetails.message,
        error: 'Unhandled exception',
        details: errorDetails.toString,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});


