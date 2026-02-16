-- FUNCIÓN: Obtener estadísticas avanzadas del dashboard (KPIs y Gráficos)
-- Actualizado para aceptar rango de fechas
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_DATE - INTERVAL '30 days'),
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
RETURNS JSON AS $$
DECLARE
    v_total_revenue_period DECIMAL(10, 2);
    v_active_partners_count INT;
    v_churn_rate DECIMAL(5, 2);
    v_revenue_split JSON;
    v_daily_revenue JSON;
    v_users_active_start INT;
    v_users_cancelled_period INT;
BEGIN
    -- 1. Ingresos en el PERIODO seleccionado
    -- Se usa created_at porque payment_date no existe en payment_history
    SELECT COALESCE(SUM(total_paid), 0)
    INTO v_total_revenue_period
    FROM payment_history
    WHERE created_at >= p_start_date AND created_at <= p_end_date;

    -- 2. Socios Activos (Snapshot actual, no depende del periodo)
    SELECT COUNT(DISTINCT ar.user_id)
    INTO v_active_partners_count
    FROM admin_roles ar
    JOIN discount_code_usage dcu ON dcu.partner_id = ar.user_id
    JOIN subscriptions s ON s.user_id = dcu.user_id
    WHERE ar.role_type = 'socio'
    AND s.status = 'active';

    -- 3. Tasa de Cancelación (Churn Rate) en el periodo
    SELECT COUNT(*) INTO v_users_active_start
    FROM subscriptions
    WHERE created_at < p_start_date
    AND (status = 'active' OR (status = 'canceled' AND canceled_at >= p_start_date));
    
    SELECT COUNT(*) INTO v_users_cancelled_period
    FROM subscriptions
    WHERE status = 'canceled' 
    AND canceled_at >= p_start_date AND canceled_at <= p_end_date;

    IF v_users_active_start > 0 THEN
        v_churn_rate := (v_users_cancelled_period::DECIMAL / v_users_active_start::DECIMAL) * 100;
    ELSE
        v_churn_rate := 0; 
    END IF;

    -- 4. Desglose de Ingresos
    WITH RevenueSource AS (
        SELECT 
            CASE 
                WHEN dcu.id IS NOT NULL THEN 'partner' 
                ELSE 'direct' 
            END as source,
            COALESCE(SUM(ph.total_paid), 0) as amount
        FROM payment_history ph
        LEFT JOIN discount_code_usage dcu ON ph.user_id = dcu.user_id
        WHERE ph.created_at >= p_start_date AND ph.created_at <= p_end_date
        GROUP BY 1
    )
    SELECT json_object_agg(source, amount) INTO v_revenue_split FROM RevenueSource;

    -- 5. Ingresos Diarios
    SELECT json_agg(t) INTO v_daily_revenue
    FROM (
        SELECT 
            DATE(created_at) as date,
            SUM(total_paid) as amount
        FROM payment_history
        WHERE created_at >= p_start_date AND created_at <= p_end_date
        GROUP BY 1
        ORDER BY 1
    ) t;

    RETURN json_build_object(
        'revenue_period', v_total_revenue_period,
        'active_partners', v_active_partners_count,
        'churn_rate', v_churn_rate,
        'revenue_split', v_revenue_split,
        'daily_revenue', v_daily_revenue,
        'users_cancelled_period', v_users_cancelled_period,
        'period_start', p_start_date,
        'period_end', p_end_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- FUNCIÓN: Verificar consistencia de datos
CREATE OR REPLACE FUNCTION check_data_consistency()
RETURNS JSON AS $$
DECLARE
    v_orphaned_subs INT;
    v_orphaned_payments INT;
    v_orphaned_roles INT;
    v_inconsistent_gym_users INT;
    v_details JSON;
BEGIN
    -- 1. Suscripciones sin usuario en user_profiles
    SELECT COUNT(*) INTO v_orphaned_subs
    FROM subscriptions s
    LEFT JOIN user_profiles u ON s.user_id = u.user_id
    WHERE u.user_id IS NULL;

    -- 2. Pagos sin usuario
    SELECT COUNT(*) INTO v_orphaned_payments
    FROM payment_history p
    LEFT JOIN user_profiles u ON p.user_id = u.user_id
    WHERE u.user_id IS NULL;

    -- 3. Roles admin sin perfil (opcional, a veces es válido si no han completado onboarding)
    SELECT COUNT(*) INTO v_orphaned_roles
    FROM admin_roles ar
    LEFT JOIN user_profiles u ON ar.user_id = u.user_id
    WHERE u.user_id IS NULL;

    -- 4. Usuarios de gimnasio activos pero con suscripción cancelada/inexistente (Inconsistencia lógica)
    SELECT COUNT(*) INTO v_inconsistent_gym_users
    FROM gym_members gm
    LEFT JOIN subscriptions s ON gm.user_id = s.user_id
    WHERE gm.is_active = true 
    AND (s.status IS NULL OR s.status != 'active')
    AND gm.subscription_expires_at > CURRENT_TIMESTAMP; -- Si tienen fecha futura válida, ignora el estado de subscripción tabla

    -- Construir detalle
    v_details := json_build_array(
        json_build_object('type', 'orphaned_subscriptions', 'count', v_orphaned_subs, 'message', 'Suscripciones cuyo usuario no existe'),
        json_build_object('type', 'orphaned_payments', 'count', v_orphaned_payments, 'message', 'Pagos históricos sin usuario asociado'),
        json_build_object('type', 'orphaned_roles', 'count', v_orphaned_roles, 'message', 'Roles administrativos sin perfil de usuario base'),
        json_build_object('type', 'inconsistent_gym_members', 'count', v_inconsistent_gym_users, 'message', 'Miembros de gimnasio activos sin suscripción válida')
    );

    RETURN json_build_object(
        'has_issues', (v_orphaned_subs + v_orphaned_payments + v_inconsistent_gym_users) > 0,
        'summary', json_build_object(
            'orphaned_subs', v_orphaned_subs,
            'orphaned_payments', v_orphaned_payments,
            'orphaned_roles', v_orphaned_roles,
            'inconsistent_gym', v_inconsistent_gym_users
        ),
        'details', v_details
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCIÓN: Top Partners Leaderboard
CREATE OR REPLACE FUNCTION get_top_partners_leaderboard()
RETURNS TABLE (
    partner_id UUID,
    partner_name TEXT,
    total_revenue NUMERIC,
    active_subs BIGINT,
    total_commission_paid NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ar.user_id::UUID,
        COALESCE(ar.name, ar.email),
        COALESCE(SUM(ph.total_paid), 0) as revenue,
        COUNT(DISTINCT s.user_id) FILTER (WHERE s.status = 'active') as active_subs,
        (SELECT COALESCE(SUM(amount), 0) FROM partner_payments pp WHERE pp.partner_id = ar.user_id AND pp.status = 'paid') as commission_paid
    FROM admin_roles ar
    LEFT JOIN discount_code_usage dcu ON dcu.partner_id = ar.user_id
    LEFT JOIN payment_history ph ON ph.user_id = dcu.user_id
    LEFT JOIN subscriptions s ON s.user_id = dcu.user_id
    WHERE ar.role_type = 'socio'
    GROUP BY ar.user_id, ar.name, ar.email
    ORDER BY revenue DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- CORRECCIONES DE PERMISOS Y VISTAS
-- ==========================================

-- 1. Asegurar que la vista user_stats existe y es correcta
-- "cannot drop columns from view" -> Drop it first to be safe
DROP VIEW IF EXISTS user_stats CASCADE;

CREATE OR REPLACE VIEW user_stats AS
SELECT 
  COUNT(DISTINCT up.user_id) as total_users,
  COUNT(DISTINCT CASE WHEN up.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN up.user_id END) as new_users_7d,
  COUNT(DISTINCT CASE WHEN up.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN up.user_id END) as new_users_30d,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.user_id END) as active_subscriptions,
  COUNT(DISTINCT CASE WHEN wp.is_active = true THEN wp.user_id END) as users_with_workout_plans,
  AVG(up.age) as avg_age,
  COUNT(DISTINCT CASE WHEN up.fitness_level = 'beginner' THEN up.user_id END) as beginners,
  COUNT(DISTINCT CASE WHEN up.fitness_level = 'intermediate' THEN up.user_id END) as intermediate,
  COUNT(DISTINCT CASE WHEN up.fitness_level = 'advanced' THEN up.user_id END) as advanced
FROM user_profiles up
LEFT JOIN subscriptions s ON up.user_id = s.user_id
LEFT JOIN workout_plans wp ON up.user_id = wp.user_id AND wp.is_active = true;

-- 2. Asegurar que los admins pueden ver TODOS los perfiles (RLS Fix)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
    
    CREATE POLICY "Admins can view all profiles"
      ON user_profiles
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM admin_roles ar
          WHERE ar.user_id = auth.uid()::text
            AND ar.role_type IN ('admin', 'socio', 'empresario') 
            AND ar.is_active = true
        )
      );
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;