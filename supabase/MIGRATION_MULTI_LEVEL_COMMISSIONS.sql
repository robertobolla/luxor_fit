-- ============================================================================
-- MIGRACIÓN PARA SISTEMA DE COMISIONES DE 2 NIVELES (MULTI-LEVEL MARKETING)
-- ============================================================================

-- 1. Agregar campo `referred_by` a admin_roles para establecer la jerarquía de socios
ALTER TABLE admin_roles
ADD COLUMN IF NOT EXISTS referred_by TEXT REFERENCES admin_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_admin_roles_referred_by ON admin_roles(referred_by);

COMMENT ON COLUMN admin_roles.referred_by IS 'ID del socio que invitó a este socio (Nivel superior)';

-- 1.1 Agregar columnas para comisiones de Nivel 2 (si no existen)
ALTER TABLE admin_roles
ADD COLUMN IF NOT EXISTS commission_per_subscription_2nd_level NUMERIC(10, 2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS commission_per_annual_subscription_2nd_level NUMERIC(10, 2) DEFAULT 7.00;

-- 2. Función PRINCIPAL para estadísticas de red (RPC para el Dashboard)
DROP FUNCTION IF EXISTS get_partner_network_stats(text);
DROP FUNCTION IF EXISTS get_partner_network_stats(uuid); -- Por si acaso existía con UUID

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
    -- Usamos discount_code_usage + subscriptions
    WITH direct_subs AS (
        SELECT 
            s.status,
            s.monthly_amount, -- Usar esto para inferir si es anual (por ejemplo > 20) o usar lógica de periodo
            s.user_id
        FROM discount_code_usage dcu
        JOIN subscriptions s ON dcu.user_id = s.user_id
        WHERE dcu.partner_id = target_user_id
    )
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('active', 'trialing') AND (monthly_amount < 20 OR monthly_amount IS NULL)), -- Mensual aprox
        COUNT(*) FILTER (WHERE status IN ('active', 'trialing') AND monthly_amount >= 20) -- Anual aprox
    INTO 
        direct_referrals_count,
        direct_active_monthly,
        direct_active_annual
    FROM direct_subs;

    -- 2. NIVEL 2 (INDIRECTOS)
    -- Buscamos socios que tengan referred_by = target_user_id
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

    -- 3. CÁLCULO DE GANANCIAS (Mensuales Recurrentes Estimadas)
    -- Esto proyecta cuánto ganan POR MES (o ciclo de facturación promedio normalizado)
    -- Si es ANUAL, el pago es 1 vez al año, pero aquí sumamos el valor de la comisión unitaria.
    -- OJO: Si la comisión anual se paga de golpe, hay que ver si sumarla al "earnings" mensual tiene sentido.
    -- Generalmente "Total Earnings" en dashboard visualiza el valor acumulado o el valor del "portfolio".
    -- Para "Pago Pendiente", se usa esta métrica como base.
    
    earnings_direct := (direct_active_monthly * c_direct_m) + (direct_active_annual * (c_direct_a / 12)); -- Normalizado mensual? O valor total?
    -- El usuario pidió: "$3 usd por cada subscripción activa... $1 usd por indirecto".
    -- Si es pago recurrente mensual, se paga cada mes.
    -- Si es anual, se paga una vez.
    -- Vamos a devolver los VALORES TOTALES DE COMISIÓN que generan estos activos (ej: si hay 1 anual, genera $7 de comisión).
    -- Si el front lo interpreta como "Ganancia Mensual", dividiremos por 12 allí, o aquí.
    -- Interpretación: Valor del Portafolio.
    
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
$$ LANGUAGE plpgsql;

-- 3. RPC para Historial de Pagos
DROP FUNCTION IF EXISTS get_partner_payment_history(text, integer);
DROP FUNCTION IF EXISTS get_partner_payment_history(uuid, integer); -- Por si acaso existía con UUID

CREATE OR REPLACE FUNCTION get_partner_payment_history(partner_user_id TEXT, limit_count INTEGER DEFAULT 100)
RETURNS SETOF partner_payments AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM partner_payments
  WHERE partner_id = partner_user_id
  ORDER BY payment_date DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Actualizar la vista de resumen de pagos para reflejar la nueva lógica (si se usa)
DROP VIEW IF EXISTS partner_payments_summary CASCADE;

CREATE OR REPLACE VIEW partner_payments_summary AS
SELECT 
  ar.user_id AS partner_user_id,
  ar.name AS partner_name,
  ar.email AS partner_email,
  ar.discount_code, 
  ar.commission_per_subscription,
  ar.commission_type,
  ar.referred_by, 
  ar.last_payment_date,
  
  -- Extraer del JSON usando la función
  (stats.data->>'total_earnings')::numeric as total_earnings, -- Valor total del portfolio
  (stats.data->>'direct_active_monthly')::int + (stats.data->>'direct_active_annual')::int + (stats.data->>'indirect_active_monthly')::int + (stats.data->>'indirect_active_annual')::int as active_subscriptions,
  
  -- Pagos
  COALESCE((SELECT SUM(amount) FROM partner_payments WHERE partner_id = ar.user_id AND status = 'paid'), 0) as total_paid,
  COALESCE((SELECT SUM(amount) FROM partner_payments WHERE partner_id = ar.user_id AND status = 'pending'), 0) as pending_payments

FROM admin_roles ar
CROSS JOIN LATERAL (
  SELECT get_partner_network_stats(ar.user_id) as data
) stats
WHERE ar.role_type = 'socio' AND ar.is_active = true;

GRANT SELECT ON partner_payments_summary TO authenticated;
GRANT SELECT ON partner_payments_summary TO anon;
