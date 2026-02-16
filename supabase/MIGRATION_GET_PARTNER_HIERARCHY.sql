-- RPC para obtener la jerarquía de socios (Mi Red)
-- Devuelve la lista de socios invitados por mí (Nivel 1 de red)
-- y sus estadísticas de ventas (que para mí son Nivel 2 de ganancias)

DROP FUNCTION IF EXISTS get_partner_hierarchy(text);

CREATE OR REPLACE FUNCTION get_partner_hierarchy(p_user_id TEXT)
RETURNS TABLE (
    sub_partner_id UUID,
    sub_partner_user_id TEXT,
    sub_partner_name TEXT,
    sub_partner_email TEXT,
    joined_at TIMESTAMPTZ,
    total_sales_count INTEGER,       -- Ventas que ha hecho este sub-socio
    active_subscriptions_count INTEGER, -- Suscripciones activas que me generan comision N2
    total_earnings_generated NUMERIC  -- Cuánto dinero ha generado de comisiones para ELLOS (o para MI? mejor mostrar ventas)
) AS $$
DECLARE
    v_my_user_id TEXT := TRIM(p_user_id);
BEGIN
    RETURN QUERY
    SELECT 
        ar.id as sub_partner_id,
        ar.user_id as sub_partner_user_id,
        COALESCE(ar.name, 'Sin Nombre') as sub_partner_name,
        ar.email as sub_partner_email,
        ar.created_at as joined_at,
        
        -- Contar sus ventas (Redenciones de su código)
        (SELECT count(*)::int 
         FROM offer_code_redemptions ocr 
         WHERE ocr.partner_id = ar.id) as total_sales_count,
         
        -- Contar sus suscripciones activas
        (SELECT count(*)::int
         FROM subscriptions s
         JOIN offer_code_redemptions ocr ON s.user_id = ocr.user_id
         WHERE ocr.partner_id = ar.id 
         AND s.status IN ('active', 'trialing')) as active_subscriptions_count,

        -- Ganancias generadas (Placeholder)
        0.0::numeric
        
    FROM 
        admin_roles ar
    WHERE 
        ar.referred_by = v_my_user_id
    ORDER BY 
        ar.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION get_partner_hierarchy(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_hierarchy(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_partner_hierarchy(text) TO anon;

-- Asegurar índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_admin_roles_referred_by ON admin_roles(referred_by);
