/**
 * RevenueCat Webhook Handler
 * 
 * Esta Edge Function recibe webhooks de RevenueCat cuando:
 * - Un usuario compra una suscripción
 * - Un usuario usa un Offer Code
 * - Se renueva/cancela una suscripción
 * 
 * Documentación: https://www.revenuecat.com/docs/integrations/webhooks
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Tipos de eventos de RevenueCat que nos interesan
const RELEVANT_EVENTS = [
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'SUBSCRIBER_ALIAS',
];

// Crear cliente de Supabase con service_role para bypass RLS
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const webhookAuthKey = Deno.env.get('REVENUECAT_WEBHOOK_AUTH_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verificar autenticación (opcional pero recomendado)
  const authHeader = req.headers.get('Authorization');
  if (webhookAuthKey && authHeader !== `Bearer ${webhookAuthKey}`) {
    console.error('❌ Invalid webhook auth key');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const payload = await req.json();
    console.log('📥 Webhook received:', JSON.stringify(payload, null, 2));

    const { event } = payload;
    
    if (!event) {
      return new Response('No event in payload', { status: 400 });
    }

    const eventType = event.type;
    const appUserId = event.app_user_id;
    const productId = event.product_id;
    const transactionId = event.transaction_id || event.original_transaction_id;
    const price = event.price || 0;
    const currency = event.currency || 'USD';
    
    // Detectar si viene de un Offer Code
    const offerCode = event.offer_code || null;
    const offerCodeReferenceName = event.presented_offering_identifier || null;
    
    console.log('📊 Event details:', {
      eventType,
      appUserId,
      productId,
      offerCode,
      offerCodeReferenceName,
    });

    // Solo procesar eventos relevantes
    if (!RELEVANT_EVENTS.includes(eventType)) {
      console.log('⏭️ Skipping event type:', eventType);
      return new Response(JSON.stringify({ received: true, processed: false }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Si hay un Offer Code, registrar la redención
    if (offerCode || offerCodeReferenceName) {
      console.log('🎟️ Offer code detected, registering redemption...');
      
      const referenceNameToUse = offerCodeReferenceName || offerCode;
      
      // Buscar campaña asociada
      const { data: campaign } = await supabase
        .from('partner_offer_campaigns')
        .select('id, partner_id')
        .ilike('offer_reference_name', `%${referenceNameToUse}%`)
        .eq('is_active', true)
        .single();

      let partnerId = null;
      let campaignId = null;

      if (campaign) {
        partnerId = campaign.partner_id;
        campaignId = campaign.id;
        console.log('✅ Found campaign:', { partnerId, campaignId });
      } else {
        console.log('⚠️ No campaign found for offer code:', referenceNameToUse);
        
        // Intentar extraer partner del nombre de referencia
        // Formato esperado: "Socio_REFERENCE_CODE" o similar
        if (referenceNameToUse && referenceNameToUse.includes('_')) {
          const parts = referenceNameToUse.split('_');
          if (parts.length >= 2) {
            const possibleCode = parts.slice(1).join('_');
            
            const { data: partner } = await supabase
              .from('partners')
              .select('id')
              .ilike('reference_code', `%${possibleCode}%`)
              .eq('is_active', true)
              .single();
            
            if (partner) {
              partnerId = partner.id;
              console.log('✅ Found partner from reference code:', partnerId);
            }
          }
        }
      }

      // Registrar la redención
      const { error: insertError } = await supabase
        .from('offer_code_redemptions')
        .insert({
          user_id: appUserId,
          partner_id: partnerId,
          campaign_id: campaignId,
          offer_code: offerCode,
          offer_reference_name: referenceNameToUse,
          transaction_id: transactionId,
          product_id: productId,
          price_paid: price,
          currency: currency,
        });

      if (insertError) {
        console.error('❌ Error inserting redemption:', insertError);
      } else {
        console.log('✅ Redemption recorded successfully');
        
        // Incrementar contadores si tenemos campaña/partner
        if (campaignId && partnerId) {
          const { error: rpcError } = await supabase.rpc('increment_redemption_count', {
            p_campaign_id: campaignId,
            p_partner_id: partnerId,
          });
          
          if (rpcError) {
            console.error('❌ Error incrementing counters:', rpcError);
          } else {
            console.log('✅ Counters incremented');
          }
        }
      }
    }

    // Guardar evento para histórico/debugging
    await supabase
      .from('webhook_events')
      .insert({
        source: 'revenuecat',
        event_type: eventType,
        payload: payload,
        processed_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) {
          // La tabla puede no existir, no es crítico
          console.log('ℹ️ Could not save webhook event (table may not exist)');
        }
      });

    return new Response(
      JSON.stringify({ received: true, processed: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
