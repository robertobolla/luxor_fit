-- 1. Agregar columnas para soporte multinivel en admin_roles
ALTER TABLE admin_roles 
ADD COLUMN IF NOT EXISTS parent_partner_id UUID REFERENCES admin_roles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS commission_per_subscription_2nd_level NUMERIC(10, 2) DEFAULT 1.00, -- Comisión Mensual Nivel 2
ADD COLUMN IF NOT EXISTS commission_per_annual_subscription_2nd_level NUMERIC(10, 2) DEFAULT 7.00; -- Comisión Anual Nivel 2

-- 2. Función para obtener estadísticas de red (directos + indirectos)
-- Se usa en el Dashboard principal de Socios y en la vista del Partner
CREATE OR REPLACE FUNCTION get_partner_network_stats(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    partner_role_id UUID;
    
    -- Contadores Directos
    direct_referrals_count INTEGER;
    direct_active_monthly INTEGER;
    direct_active_annual INTEGER;
    
    -- Contadores Indirectos
    indirect_referrals_count INTEGER;
    indirect_active_monthly INTEGER;
    indirect_active_annual INTEGER;
    
    -- Comisiones (Unitarias)
    comm_direct_monthly NUMERIC(10, 2);
    comm_direct_annual NUMERIC(10, 2);
    comm_indirect_monthly NUMERIC(10, 2);
    comm_indirect_annual NUMERIC(10, 2);
    
    -- Ganancias Totales
    earnings_direct NUMERIC(10, 2);
    earnings_indirect NUMERIC(10, 2);
BEGIN
    -- Obtener ID del rol de socio y sus comisiones
    SELECT 
        id, 
        COALESCE(commission_per_subscription, 0), 
        COALESCE(commission_per_annual_subscription, 0),
        COALESCE(commission_per_subscription_2nd_level, 0),
        COALESCE(commission_per_annual_subscription_2nd_level, 0)
    INTO 
        partner_role_id, 
        comm_direct_monthly, 
        comm_direct_annual, 
        comm_indirect_monthly, 
        comm_indirect_annual
    FROM admin_roles 
    WHERE user_id = target_user_id OR id = target_user_id 
    LIMIT 1;

    IF partner_role_id IS NULL THEN
        RETURN json_build_object('error', 'Partner not found');
    END IF;

    -- 1. Estadísticas Directas (Mejorado para distinguir mensual/anual)
    -- Asumimos que la distinción se hace por el precio pagado o algún flag. 
    -- Por simplicidad y robustez:
    --    - Si pagó > 20 (aprox) es anual. 
    --    - O si el plan en RevenueCat dice 'annual' (no siempre tenemos el plan string aquí).
    --    - O revisando offer_code_redemptions.price_paid.
    --    Para suscripciones activas, miramos la tabla subscriptions si tiene info del plan.
    --    Por ahora usaremos una lógica simplificada basada en offer_code_redemptions.price_paid para conteo histórico
    --    y para activas asumiremos distribución similar o tendremos que cruzar con products.
    
    -- Lógica Simplificada para Activas:
    -- Vamos a contar TOTAL activas y aplicar la comisión mensual por defecto si no podemos distinguir,
    -- PERO idealmente deberíamos distinguir.
    -- INTENTO DE DISTINCIÓN: precio en offer_code_redemptions (si existe) -> > $20 es anual.
    
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE (s.status = 'active' OR s.status = 'trialing') AND (ocr.price_paid < 20 OR ocr.price_paid IS NULL)), -- Asumimos mensual si < 20 o null
        COUNT(*) FILTER (WHERE (s.status = 'active' OR s.status = 'trialing') AND ocr.price_paid >= 20) -- Asumimos anual si >= 20
    INTO 
        direct_referrals_count, 
        direct_active_monthly,
        direct_active_annual
    FROM offer_code_redemptions ocr
    LEFT JOIN subscriptions s ON ocr.user_id = s.user_id
    WHERE ocr.partner_id = partner_role_id;

    -- 2. Estadísticas Indirectas (Nivel 2)
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE (s.status = 'active' OR s.status = 'trialing') AND (ocr.price_paid < 20 OR ocr.price_paid IS NULL)),
        COUNT(*) FILTER (WHERE (s.status = 'active' OR s.status = 'trialing') AND ocr.price_paid >= 20)
    INTO 
        indirect_referrals_count, 
        indirect_active_monthly,
        indirect_active_annual
    FROM offer_code_redemptions ocr
    LEFT JOIN subscriptions s ON ocr.user_id = s.user_id
    WHERE ocr.partner_id IN (
        SELECT id FROM admin_roles WHERE parent_partner_id = partner_role_id
    );

    -- 3. Calcular Ganancias
    earnings_direct := (direct_active_monthly * comm_direct_monthly) + (direct_active_annual * comm_direct_annual);
    earnings_indirect := (indirect_active_monthly * comm_indirect_monthly) + (indirect_active_annual * comm_indirect_annual);

    RETURN json_build_object(
        'partner_id', partner_role_id,
        'direct_referrals', direct_referrals_count,
        'direct_active_monthly', direct_active_monthly,
        'direct_active_annual', direct_active_annual,
        'indirect_referrals', indirect_referrals_count,
        'indirect_active_monthly', indirect_active_monthly,
        'indirect_active_annual', indirect_active_annual,
        
        'comm_direct_monthly', comm_direct_monthly,
        'comm_direct_annual', comm_direct_annual,
        'comm_indirect_monthly', comm_indirect_monthly,
        'comm_indirect_annual', comm_indirect_annual,
        
        'earnings_direct', earnings_direct,
        'earnings_indirect', earnings_indirect,
        'total_earnings', earnings_direct + earnings_indirect
    );
END;
$$ LANGUAGE plpgsql;
