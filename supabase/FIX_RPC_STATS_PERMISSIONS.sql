-- CORRECCIÓN: La función get_partner_network_stats puede fallar por RLS en tablas internas.
-- La convertimos a SECURITY DEFINER para que pueda leer discount_code_usage y subscriptions.

CREATE OR REPLACE FUNCTION get_partner_network_stats(target_user_id TEXT)
RETURNS JSON AS $$
DECLARE
    -- Variables para datos del socio
    partner_row admin_roles%ROWTYPE;
    
    -- Contadores Directos
    direct_referrals_count INTEGER := 0;
    direct_active_monthly INTEGER := 0;
    direct_active_annual INTEGER := 0;
    
    -- Contadores Indirectos
    indirect_referrals_count INTEGER := 0;
    indirect_active_monthly INTEGER := 0;
    indirect_active_annual INTEGER := 0;
    
    -- Ganancias
    earnings_direct NUMERIC(10, 2) := 0;
    earnings_indirect NUMERIC(10, 2) := 0;
    
    -- Comisiones
    c_direct_m NUMERIC(10, 2);
    c_direct_a NUMERIC(10, 2);
    c_indirect_m NUMERIC(10, 2);
    c_indirect_a NUMERIC(10, 2);
BEGIN
    -- Obtener datos del socio
    SELECT * INTO partner_row FROM admin_roles WHERE user_id = target_user_id LIMIT 1;
    
    IF partner_row IS NULL THEN
        RETURN json_build_object('error', 'Partner not found');
    END IF;
    
    -- Asignar comisiones (con fallbacks)
    c_direct_m := COALESCE(partner_row.commission_per_subscription, 3.00);
    c_direct_a := COALESCE(partner_row.commission_per_annual_subscription, 21.00);
    c_indirect_m := COALESCE(partner_row.commission_per_subscription_2nd_level, 1.00);
    c_indirect_a := COALESCE(partner_row.commission_per_annual_subscription_2nd_level, 7.00);

    -- 1. NIVEL 1 (DIRECTOS)
    WITH direct_subs AS (
        SELECT 
            s.status,
            s.monthly_amount
        FROM discount_code_usage dcu
        JOIN subscriptions s ON dcu.user_id = s.user_id
        WHERE dcu.partner_id = target_user_id
    )
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('active', 'trialing') AND (monthly_amount < 20 OR monthly_amount IS NULL)),
        COUNT(*) FILTER (WHERE status IN ('active', 'trialing') AND monthly_amount >= 20)
    INTO 
        direct_referrals_count,
        direct_active_monthly,
        direct_active_annual
    FROM direct_subs;

    -- 2. NIVEL 2 (INDIRECTOS)
    WITH indirect_subs AS (
        SELECT 
            s.status,
            s.monthly_amount
        FROM admin_roles child_partner
        JOIN discount_code_usage dcu ON dcu.partner_id = child_partner.user_id
        JOIN subscriptions s ON dcu.user_id = s.user_id
        WHERE child_partner.referred_by = target_user_id
          AND child_partner.is_active = true
    )
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('active', 'trialing') AND (monthly_amount < 20 OR monthly_amount IS NULL)),
        COUNT(*) FILTER (WHERE status IN ('active', 'trialing') AND monthly_amount >= 20)
    INTO 
        indirect_referrals_count,
        indirect_active_monthly,
        indirect_active_annual
    FROM indirect_subs;

    -- 3. CÁLCULO DE GANANCIAS
    earnings_direct := (direct_active_monthly * c_direct_m) + (direct_active_annual * c_direct_a);
    earnings_indirect := (indirect_active_monthly * c_indirect_m) + (indirect_active_annual * c_indirect_a);

    RETURN json_build_object(
        'partner_id', target_user_id,
        'direct_referrals', direct_referrals_count,
        'direct_active_monthly', direct_active_monthly,
        'direct_active_annual', direct_active_annual,
        'indirect_referrals', indirect_referrals_count,
        'indirect_active_monthly', indirect_active_monthly,
        'indirect_active_annual', indirect_active_annual,
        
        'comm_direct_monthly', c_direct_m,
        'comm_direct_annual', c_direct_a,
        'comm_indirect_monthly', c_indirect_m,
        'comm_indirect_annual', c_indirect_a,
        
        'earnings_direct', earnings_direct,
        'earnings_indirect', earnings_indirect,
        'total_earnings', (earnings_direct + earnings_indirect)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION get_partner_network_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_network_stats(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_partner_network_stats(text) TO anon;
