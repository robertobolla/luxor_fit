-- RPC para obtener la lista de referidos de un socio
-- Se usa para reemplazar la consulta directa a la vista y evitar problemas de RLS

DROP FUNCTION IF EXISTS get_partner_referral_list(text);

CREATE OR REPLACE FUNCTION get_partner_referral_list(p_user_id TEXT)
RETURNS TABLE (
    usage_id UUID,
    partner_user_id TEXT,
    referred_user_id TEXT,
    referred_user_name TEXT,
    referred_user_email TEXT,
    is_free_access BOOLEAN,
    discount_amount NUMERIC,
    used_at TIMESTAMPTZ,
    subscription_status TEXT,
    subscription_created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_partner_uuid UUID;
BEGIN
    -- 1. Obtener UUID del partner
    SELECT id INTO v_partner_uuid FROM admin_roles WHERE user_id = p_user_id;

    IF v_partner_uuid IS NULL THEN
        RETURN;
    END IF;

    -- 2. Retornar los datos directamente
    RETURN QUERY
    SELECT 
        ocr.usage_id,
        p_user_id as partner_user_id,
        ocr.user_id as referred_user_id,
        up.name as referred_user_name,
        up.email as referred_user_email,
        ocr.is_free_access,
        COALESCE(ocr.price_paid, 0) as discount_amount, 
        ocr.used_at,
        CASE 
            WHEN s.status = 'active' OR s.status = 'trialing' THEN 'active'
            WHEN s.status IS NULL THEN 'inactive'
            ELSE s.status 
        END as subscription_status,
        s.created_at as subscription_created_at
    FROM 
        offer_code_redemptions ocr
    LEFT JOIN 
        user_profiles up ON ocr.user_id = up.user_id
    LEFT JOIN 
        subscriptions s ON ocr.user_id = s.user_id
    WHERE 
        ocr.partner_id = v_partner_uuid
    ORDER BY 
        ocr.used_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION get_partner_referral_list(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_referral_list(text) TO service_role;
