-- RPC ROBUSTO PARA LISTA DE REFERIDOS
-- Incluye TRIM para evitar errores de espacios y GRANTs explícitos

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
    -- 1. Obtener UUID del partner (Con TRIM por seguridad)
    SELECT id INTO v_partner_uuid 
    FROM admin_roles 
    WHERE user_id = TRIM(p_user_id);

    IF v_partner_uuid IS NULL THEN
        -- Si no encuentra al partner, devolvemos vacío
        RETURN;
    END IF;

    -- 2. Retornar los datos directamente
    RETURN QUERY
    SELECT 
        ocr.usage_id,
        p_user_id as partner_user_id,
        ocr.user_id as referred_user_id,
        COALESCE(up.name, 'Usuario Desconocido') as referred_user_name,
        COALESCE(up.email, 'Sin Email') as referred_user_email,
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

-- Permisos CRÍTICOS (Asegurar que la función pueda leer las tablas)
GRANT EXECUTE ON FUNCTION get_partner_referral_list(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_referral_list(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_partner_referral_list(text) TO anon;

GRANT SELECT ON offer_code_redemptions TO authenticated;
GRANT SELECT ON offer_code_redemptions TO anon;
GRANT SELECT ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles TO anon;
GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON subscriptions TO anon;
