/**
 * Partner Service - Sistema de Tracking de Socios y Offer Codes
 * 
 * Este servicio maneja:
 * - Consulta de estadísticas de socios
 * - Registro de redenciones de códigos (via webhook)
 * - Dashboard de métricas para socios
 */

import { supabase } from './supabase';

// ============================================================================
// TIPOS
// ============================================================================

export interface Partner {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  business_type: string;
  reference_code: string;
  commission_percentage: number;
  is_active: boolean;
  created_at: string;
}

export interface OfferCampaign {
  id: string;
  partner_id: string;
  offer_reference_name: string;
  offer_type: string;
  discount_description: string | null;
  codes_generated: number;
  codes_redeemed: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Redemption {
  id: string;
  user_id: string;
  partner_id: string | null;
  campaign_id: string | null;
  offer_code: string | null;
  offer_reference_name: string | null;
  transaction_id: string | null;
  product_id: string | null;
  price_paid: number | null;
  currency: string;
  redeemed_at: string;
}

export interface PartnerStats {
  total_codes_generated: number;
  total_codes_redeemed: number;
  conversion_rate: number;
  total_revenue: number;
  active_campaigns: number;
}

export interface MonthlyStats {
  year: number;
  month: number;
  codes_redeemed: number;
  total_revenue: number;
  commission_earned: number;
}

// ============================================================================
// FUNCIONES PÚBLICAS
// ============================================================================

/**
 * Obtener todos los socios activos
 */
export async function getActivePartners(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching partners:', error);
    return [];
  }

  return data || [];
}

/**
 * Obtener un socio por su código de referencia
 */
export async function getPartnerByReferenceCode(referenceCode: string): Promise<Partner | null> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('reference_code', referenceCode.toUpperCase())
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching partner:', error);
    return null;
  }

  return data;
}

/**
 * Obtener estadísticas generales de un socio
 */
export async function getPartnerStats(partnerId: string): Promise<PartnerStats | null> {
  const { data, error } = await supabase
    .rpc('get_partner_stats', { p_partner_id: partnerId });

  if (error) {
    console.error('Error fetching partner stats:', error);
    return null;
  }

  if (data && data.length > 0) {
    return {
      total_codes_generated: data[0].total_codes_generated || 0,
      total_codes_redeemed: data[0].total_codes_redeemed || 0,
      conversion_rate: data[0].conversion_rate || 0,
      total_revenue: data[0].total_revenue || 0,
      active_campaigns: data[0].active_campaigns || 0,
    };
  }

  return {
    total_codes_generated: 0,
    total_codes_redeemed: 0,
    conversion_rate: 0,
    total_revenue: 0,
    active_campaigns: 0,
  };
}

/**
 * Obtener campañas de un socio
 */
export async function getPartnerCampaigns(partnerId: string): Promise<OfferCampaign[]> {
  const { data, error } = await supabase
    .from('partner_offer_campaigns')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching campaigns:', error);
    return [];
  }

  return data || [];
}

/**
 * Obtener estadísticas mensuales de un socio
 */
export async function getPartnerMonthlyStats(
  partnerId: string, 
  year?: number
): Promise<MonthlyStats[]> {
  const currentYear = year || new Date().getFullYear();
  
  const { data, error } = await supabase
    .from('partner_monthly_stats')
    .select('*')
    .eq('partner_id', partnerId)
    .eq('year', currentYear)
    .order('month', { ascending: true });

  if (error) {
    console.error('Error fetching monthly stats:', error);
    return [];
  }

  return data || [];
}

/**
 * Obtener redenciones recientes de un socio
 */
export async function getPartnerRedemptions(
  partnerId: string,
  limit: number = 50
): Promise<Redemption[]> {
  const { data, error } = await supabase
    .from('offer_code_redemptions')
    .select('*')
    .eq('partner_id', partnerId)
    .order('redeemed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching redemptions:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// FUNCIONES PARA WEBHOOK (Llamadas desde Edge Function)
// ============================================================================

/**
 * Registrar una redención de código de oferta
 * Esta función es llamada por el webhook de RevenueCat
 */
export async function registerRedemption(
  userId: string,
  offerReferenceName: string,
  transactionId: string,
  productId: string,
  pricePaid: number,
  currency: string = 'USD'
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Buscar la campaña por el nombre de referencia
    const { data: campaign, error: campaignError } = await supabase
      .from('partner_offer_campaigns')
      .select('id, partner_id')
      .eq('offer_reference_name', offerReferenceName)
      .eq('is_active', true)
      .single();

    let partnerId = null;
    let campaignId = null;

    if (campaign && !campaignError) {
      partnerId = campaign.partner_id;
      campaignId = campaign.id;
    } else {
      // Intentar extraer el partner del nombre de referencia
      // Formato esperado: "Socio_REFERENCE_CODE_Fecha"
      const parts = offerReferenceName.split('_');
      if (parts.length >= 2) {
        const referenceCode = parts.slice(1, -1).join('_'); // Todo excepto "Socio_" y la fecha
        const partner = await getPartnerByReferenceCode(referenceCode);
        if (partner) {
          partnerId = partner.id;
        }
      }
    }

    // 2. Registrar la redención
    const { error: insertError } = await supabase
      .from('offer_code_redemptions')
      .insert({
        user_id: userId,
        partner_id: partnerId,
        campaign_id: campaignId,
        offer_reference_name: offerReferenceName,
        transaction_id: transactionId,
        product_id: productId,
        price_paid: pricePaid,
        currency: currency,
      });

    if (insertError) {
      console.error('Error inserting redemption:', insertError);
      return { success: false, error: insertError.message };
    }

    // 3. Incrementar contadores si tenemos campaña/partner
    if (campaignId && partnerId) {
      await supabase.rpc('increment_redemption_count', {
        p_campaign_id: campaignId,
        p_partner_id: partnerId,
      });
    }

    console.log('✅ Redemption registered:', { userId, offerReferenceName, partnerId });
    return { success: true };

  } catch (error: any) {
    console.error('Error registering redemption:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// FUNCIONES DE ADMINISTRACIÓN (Usar con cuidado - requiere service_role)
// ============================================================================

/**
 * Crear un nuevo socio
 */
export async function createPartner(
  name: string,
  referenceCode: string,
  contactEmail?: string,
  businessType: string = 'other',
  commissionPercentage: number = 0
): Promise<{ success: boolean; partner?: Partner; error?: string }> {
  const { data, error } = await supabase
    .from('partners')
    .insert({
      name,
      reference_code: referenceCode.toUpperCase().replace(/\s+/g, '_'),
      contact_email: contactEmail,
      business_type: businessType,
      commission_percentage: commissionPercentage,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating partner:', error);
    return { success: false, error: error.message };
  }

  return { success: true, partner: data };
}

/**
 * Crear una nueva campaña de códigos para un socio
 */
export async function createCampaign(
  partnerId: string,
  offerReferenceName: string,
  offerType: string,
  codesGenerated: number,
  discountDescription?: string,
  validUntil?: Date
): Promise<{ success: boolean; campaign?: OfferCampaign; error?: string }> {
  const { data, error } = await supabase
    .from('partner_offer_campaigns')
    .insert({
      partner_id: partnerId,
      offer_reference_name: offerReferenceName,
      offer_type: offerType,
      codes_generated: codesGenerated,
      discount_description: discountDescription,
      valid_until: validUntil?.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating campaign:', error);
    return { success: false, error: error.message };
  }

  return { success: true, campaign: data };
}
