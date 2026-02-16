-- ============================================================================
-- RPC: Historial Detallado de Comisiones (Nivel 1 y Nivel 2)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_partner_commission_history(target_user_id TEXT)
RETURNS JSON AS $$
DECLARE
    partner_row admin_roles%ROWTYPE;
    commission_history JSON;
BEGIN
    -- 1. Obtener configuración del partner
    SELECT * INTO partner_row FROM admin_roles WHERE user_id = target_user_id LIMIT 1;
    
    IF partner_row IS NULL THEN
        RETURN json_build_object('error', 'Partner not found');
    END IF;

    -- 2. Calcular historial combinando Nivel 1 y Nivel 2
    WITH level1_commissions AS (
        -- DIRECTOS (Nivel 1)
        SELECT 
            ph.created_at as transaction_date,
            up.name as source_user_name,
            up.email as source_user_email,
            'Nivel 1 (Directo)' as level,
            ph.monthly_amount as payment_amount,
            CASE 
                -- Si es suscripción anual (aprox > $100 o criterio de negocio), usar comisión anual
                WHEN ph.monthly_amount > 100 THEN COALESCE(partner_row.commission_per_annual_subscription, 21.00)
                -- Si es mensual
                ELSE COALESCE(partner_row.commission_per_subscription, 3.00)
            END as commission_amount,
            'Comisión por suscripción directa' as description
        FROM discount_code_usage dcu
        JOIN user_profiles up ON dcu.user_id::text = up.user_id
        JOIN payment_history ph ON ph.user_id = up.user_id::uuid
        WHERE dcu.partner_id = partner_row.id -- Usar ID de la tabla roles
        AND ph.status = 'succeeded'
    ),
    level2_commissions AS (
        -- INDIRECTOS (Nivel 2)
        -- Partners hijos referidos por este partner
        SELECT 
            ph.created_at as transaction_date,
            up.name as source_user_name,
            up.email as source_user_email,
            'Nivel 2 (Indirecto)' as level,
            ph.monthly_amount as payment_amount,
            CASE 
                WHEN ph.monthly_amount > 100 THEN COALESCE(partner_row.commission_per_annual_subscription_2nd_level, 7.00)
                ELSE COALESCE(partner_row.commission_per_subscription_2nd_level, 1.00)
            END as commission_amount,
            'Comisión por referido de ' || child_partner.name as description
        FROM admin_roles child_partner
        JOIN discount_code_usage dcu_child ON dcu_child.partner_id = child_partner.id
        JOIN user_profiles up ON dcu_child.user_id::text = up.user_id
        JOIN payment_history ph ON ph.user_id = up.user_id::uuid
        WHERE child_partner.referred_by = partner_row.id -- Hijos de este partner
        AND ph.status = 'succeeded'
    )
    SELECT json_agg(t) INTO commission_history
    FROM (
        SELECT * FROM level1_commissions
        UNION ALL
        SELECT * FROM level2_commissions
        ORDER BY transaction_date DESC
    ) t;

    RETURN COALESCE(commission_history, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION get_partner_commission_history(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_commission_history(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_partner_commission_history(text) TO anon;
