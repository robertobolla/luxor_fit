-- RPC para obtener estadísticas básicas de referidos por socio
-- Usado en PartnerReferrals.tsx
-- VERSION ACTUALIZADA: SECURITY DEFINER y sin depender de Views rotas

DROP FUNCTION IF EXISTS get_partner_referral_stats(text);

CREATE OR REPLACE FUNCTION get_partner_referral_stats(partner_user_id TEXT)
RETURNS JSON AS $$
DECLARE
    v_partner_uuid UUID;
    total_referrals INTEGER;
    free_access_referrals INTEGER;
    paid_referrals INTEGER;
    active_subscriptions INTEGER;
    total_revenue NUMERIC(10, 2);
BEGIN
    -- 1. Obtener UUID del partner desde su User ID (Clerk)
    SELECT id INTO v_partner_uuid FROM admin_roles WHERE user_id = partner_user_id;

    IF v_partner_uuid IS NULL THEN
        -- Si no encuentra UUID, retorna todo en 0 para no romper el frontend
        RETURN json_build_object(
            'total_referrals', 0,
            'free_access_referrals', 0,
            'paid_referrals', 0,
            'active_subscriptions', 0,
            'total_revenue', 0,
            'debug_message', 'Partner UUID not found for user_id: ' || partner_user_id
        );
    END IF;

    -- 2. Calcular estadísticas directas de la tabla offer_code_redemptions
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE is_free_access = true),
        COUNT(*) FILTER (WHERE is_free_access = false),
        COALESCE(SUM(price_paid), 0)
    INTO 
        total_referrals,
        free_access_referrals,
        paid_referrals,
        total_revenue
    FROM offer_code_redemptions
    WHERE partner_id = v_partner_uuid;

    -- 3. Calcular suscripciones activas
    SELECT COUNT(*)
    INTO active_subscriptions
    FROM subscriptions s
    JOIN offer_code_redemptions ocr ON s.user_id = ocr.user_id
    WHERE ocr.partner_id = v_partner_uuid
    AND s.status IN ('active', 'trialing');

    RETURN json_build_object(
        'total_referrals', total_referrals,
        'free_access_referrals', free_access_referrals,
        'paid_referrals', paid_referrals,
        'active_subscriptions', active_subscriptions,
        'total_revenue', total_revenue,
        'partner_uuid', v_partner_uuid -- Debug info
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos públicos para asegurar ejecución (la seguridad la da el WHERE interno)
GRANT EXECUTE ON FUNCTION get_partner_referral_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_referral_stats(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_partner_referral_stats(text) TO anon;
