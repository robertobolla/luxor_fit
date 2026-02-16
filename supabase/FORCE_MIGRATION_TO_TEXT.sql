
-- ============================================================================
-- MIGRACIÓN FORZADA v13: UUID -> TEXT (Nuclear + Limpieza Final)
-- ============================================================================

BEGIN;

-- 1. ELIMINAR VISTAS Y FUNCIONES DEPENDIENTES
-- NOTA: El orden es CRÍTICO. Las vistas deben borrarse antes que las tablas/columnas que usan.

-- VISTAS (Deben borrarse antes que las funciones y tablas)
DROP VIEW IF EXISTS v_recent_redemptions CASCADE; 
DROP VIEW IF EXISTS trainer_students_view CASCADE; 
DROP VIEW IF EXISTS partner_payments_summary CASCADE;
DROP VIEW IF EXISTS v_partner_stats CASCADE;
DROP VIEW IF EXISTS partner_referrals CASCADE;
DROP VIEW IF EXISTS partner_active_users CASCADE;
DROP VIEW IF EXISTS empresario_stats CASCADE;
DROP VIEW IF EXISTS v_user_subscription CASCADE;
DROP VIEW IF EXISTS user_stats CASCADE;

-- FUNCIONES (Solo las que realmente vamos a recrear o que existen)
DROP FUNCTION IF EXISTS get_partner_network_stats(TEXT);
DROP FUNCTION IF EXISTS get_partner_network_stats(UUID);
-- DROP FUNCTION IF EXISTS get_partner_active_users_stats(TEXT); -- Borrada porque no existe
-- DROP FUNCTION IF EXISTS get_partner_active_users_list(TEXT); -- Borrada porque no existe
-- DROP FUNCTION IF EXISTS get_partner_referral_stats(TEXT); -- Borrada porque no existe
DROP FUNCTION IF EXISTS get_admin_dashboard_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS get_top_partners_leaderboard();


-- 2. ELIMINAR TODAS LAS POLÍTICAS DE TODAS LAS TABLAS POSIBLEMENTE AFECTADAS
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE tablename IN (
            'admin_roles', 'user_profiles', 'subscriptions', 'payment_history', 
            'gym_members', 'discount_code_usage', 'workout_plans', 'partner_payments',
            'webhook_events', 'notifications',
            'partners', 'partner_offer_campaigns', 'offer_code_redemptions', 'partner_monthly_stats'
        )
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename); 
    END LOOP; 
END $$;


-- 3. ALTERAR COLUMNAS (UUID -> TEXT)

-- admin_roles
ALTER TABLE admin_roles DROP CONSTRAINT IF EXISTS admin_roles_user_id_fkey;
ALTER TABLE admin_roles ALTER COLUMN user_id TYPE text;
ALTER TABLE admin_roles DROP CONSTRAINT IF EXISTS admin_roles_referred_by_fkey;
ALTER TABLE admin_roles ALTER COLUMN referred_by TYPE text;

-- user_profiles
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;
ALTER TABLE user_profiles ALTER COLUMN user_id TYPE text;

-- subscriptions
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE subscriptions ALTER COLUMN user_id TYPE text;

-- payment_history
ALTER TABLE payment_history DROP CONSTRAINT IF EXISTS payment_history_user_id_fkey;
ALTER TABLE payment_history ALTER COLUMN user_id TYPE text;

-- gym_members
ALTER TABLE gym_members DROP CONSTRAINT IF EXISTS gym_members_user_id_fkey;
ALTER TABLE gym_members ALTER COLUMN user_id TYPE text;

-- discount_code_usage
ALTER TABLE discount_code_usage DROP CONSTRAINT IF EXISTS discount_code_usage_user_id_fkey;
ALTER TABLE discount_code_usage ALTER COLUMN user_id TYPE text;
ALTER TABLE discount_code_usage DROP CONSTRAINT IF EXISTS discount_code_usage_partner_id_fkey;
ALTER TABLE discount_code_usage ALTER COLUMN partner_id TYPE text;

-- workout_plans
ALTER TABLE workout_plans DROP CONSTRAINT IF EXISTS workout_plans_user_id_fkey;
ALTER TABLE workout_plans ALTER COLUMN user_id TYPE text;

-- partner_payments
ALTER TABLE partner_payments DROP CONSTRAINT IF EXISTS partner_payments_partner_id_fkey;
ALTER TABLE partner_payments ALTER COLUMN partner_id TYPE text;

-- webhook_events
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_events' AND column_name = 'user_id') THEN
        ALTER TABLE webhook_events DROP CONSTRAINT IF EXISTS webhook_events_user_id_fkey;
        ALTER TABLE webhook_events ALTER COLUMN user_id TYPE text;
    END IF;
END $$;

-- notifications
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
        ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
        ALTER TABLE notifications ALTER COLUMN user_id TYPE text;
    END IF;
END $$;

-- partners
ALTER TABLE partners DROP CONSTRAINT IF EXISTS partners_pkey CASCADE;
ALTER TABLE partners ALTER COLUMN id TYPE text;
ALTER TABLE partners ADD PRIMARY KEY (id);

-- partner_offer_campaigns
ALTER TABLE partner_offer_campaigns DROP CONSTRAINT IF EXISTS partner_offer_campaigns_partner_id_fkey;
ALTER TABLE partner_offer_campaigns ALTER COLUMN partner_id TYPE text;

-- offer_code_redemptions
ALTER TABLE offer_code_redemptions DROP CONSTRAINT IF EXISTS offer_code_redemptions_partner_id_fkey;
ALTER TABLE offer_code_redemptions ALTER COLUMN partner_id TYPE text;

-- partner_monthly_stats
ALTER TABLE partner_monthly_stats DROP CONSTRAINT IF EXISTS partner_monthly_stats_partner_id_fkey;
ALTER TABLE partner_monthly_stats ALTER COLUMN partner_id TYPE text;


-- 4. RESTAURAR POLÍTICAS GENÉRICAS

-- admin_roles
CREATE POLICY "Public read for auth check" ON admin_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage everything" ON admin_roles USING (is_admin());

-- user_profiles
CREATE POLICY "Users view own" ON user_profiles FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Users update own" ON user_profiles FOR UPDATE USING (user_id = auth.uid()::text);
CREATE POLICY "Admins view all" ON user_profiles FOR SELECT USING (is_admin());

-- subscriptions
CREATE POLICY "Users view own subs" ON subscriptions FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Admins view all subs" ON subscriptions FOR SELECT USING (is_admin());

-- gym_members
CREATE POLICY "Users view own gym membership" ON gym_members FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Admins manage gym members" ON gym_members USING (is_admin());

-- discount_code_usage
CREATE POLICY "Anyone can read discount code usage" ON discount_code_usage FOR SELECT USING (true);

-- webhook_events
CREATE POLICY "Admins manage webhooks" ON webhook_events USING (is_admin());

-- partners
CREATE POLICY "Admins manage partners" ON partners USING (is_admin());
CREATE POLICY "Public read partners" ON partners FOR SELECT USING (true);

-- offer_code_redemptions
CREATE POLICY "Admins view redemptions" ON offer_code_redemptions USING (is_admin());


-- 5. RESTAURAR VISTAS Y FUNCIONES

-- 5.1 v_user_subscription
CREATE OR REPLACE VIEW public.v_user_subscription AS
  SELECT
    s.user_id,
    s.status,
    s.trial_start,
    s.trial_end,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    GREATEST(
      CASE WHEN s.status IN ('active','past_due') THEN 1 ELSE 0 END,
      CASE WHEN NOW() BETWEEN COALESCE(s.trial_start, NOW() - INTERVAL '1 day') AND COALESCE(s.trial_end, NOW() - INTERVAL '1 day') THEN 1 ELSE 0 END,
      CASE WHEN is_gym_member(s.user_id) THEN 1 ELSE 0 END
    ) = 1 as is_active,
    EXISTS (SELECT 1 FROM gym_members gm WHERE gm.user_id = s.user_id AND gm.is_active = true) as is_gym_member
  FROM public.subscriptions s;

ALTER VIEW v_user_subscription SET (security_invoker = true);
GRANT SELECT ON v_user_subscription TO authenticated, public;


-- 5.2 partner_active_users
CREATE OR REPLACE VIEW partner_active_users AS
SELECT 
  ar.user_id AS partner_user_id,
  ar.name AS partner_name,
  ar.email AS partner_email,
  ar.discount_code,
  dcu.user_id AS referred_user_id,
  up.name AS referred_user_name,
  up.email AS referred_user_email,
  sub.status AS subscription_status,
  sub.current_period_end AS subscription_end_date,
  CASE 
    WHEN sub.status IN ('active', 'trialing') THEN true
    ELSE false
  END AS is_active,
  dcu.created_at AS code_used_at,
  sub.created_at AS subscription_created_at
FROM admin_roles ar
INNER JOIN discount_code_usage dcu ON dcu.partner_id = ar.user_id
INNER JOIN user_profiles up ON up.user_id = dcu.user_id
LEFT JOIN subscriptions sub ON sub.user_id = dcu.user_id
WHERE ar.role_type = 'socio' 
  AND ar.discount_code IS NOT NULL
  AND ar.is_active = true;

ALTER VIEW partner_active_users SET (security_invoker = true);
GRANT SELECT ON partner_active_users TO authenticated, public;


-- 5.3 empresario_stats
CREATE OR REPLACE VIEW empresario_stats AS
SELECT 
  ar.user_id as empresario_id,
  ar.email as empresario_email,
  ar.name as empresario_name,
  ar.gym_name,
  ar.monthly_fee,
  ar.max_users,
  COUNT(DISTINCT gm.user_id) as total_members,
  COUNT(DISTINCT CASE WHEN gm.is_active = true THEN gm.user_id END) as active_members,
  COUNT(DISTINCT CASE WHEN gm.joined_at >= CURRENT_DATE - INTERVAL '30 days' THEN gm.user_id END) as new_members_30d,
  COUNT(DISTINCT CASE WHEN vs.is_active = true THEN gm.user_id END) as members_with_active_subscription
FROM admin_roles ar
LEFT JOIN gym_members gm ON ar.user_id = gm.empresario_id
LEFT JOIN v_user_subscription vs ON gm.user_id = vs.user_id
WHERE ar.role_type = 'empresario' AND ar.is_active = true
GROUP BY ar.user_id, ar.email, ar.name, ar.gym_name, ar.monthly_fee, ar.max_users;

ALTER VIEW empresario_stats SET (security_invoker = true);
GRANT SELECT ON empresario_stats TO authenticated, public;


-- 5.4 user_stats
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  COUNT(DISTINCT up.user_id) as total_users,
  COUNT(DISTINCT CASE WHEN up.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN up.user_id END) as new_users_7d,
  COUNT(DISTINCT CASE WHEN up.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN up.user_id END) as new_users_30d,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.user_id END) as active_subscriptions,
  (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as total_active_subs
FROM user_profiles up
LEFT JOIN subscriptions s ON up.user_id = s.user_id;

ALTER VIEW user_stats SET (security_invoker = true);
GRANT SELECT ON user_stats TO authenticated, public;


-- 5.5 partner_referrals
CREATE OR REPLACE VIEW partner_referrals AS
SELECT 
  ar.user_id AS partner_user_id,
  ar.name AS partner_name,
  ar.email AS partner_email,
  ar.discount_code,
  dcu.id AS usage_id,
  dcu.user_id AS referred_user_id,
  up.name AS referred_user_name,
  up.email AS referred_user_email,
  dcu.is_free_access,
  dcu.discount_amount,
  dcu.created_at AS used_at,
  sub.status AS subscription_status,
  sub.created_at AS subscription_created_at
FROM admin_roles ar
LEFT JOIN discount_code_usage dcu ON dcu.partner_id = ar.user_id
LEFT JOIN user_profiles up ON up.user_id = dcu.user_id
LEFT JOIN subscriptions sub ON sub.user_id = dcu.user_id
WHERE ar.role_type = 'socio' AND ar.discount_code IS NOT NULL;

ALTER VIEW partner_referrals SET (security_invoker = true);
GRANT SELECT ON partner_referrals TO authenticated, public;


-- 5.6 v_partner_stats
CREATE OR REPLACE VIEW v_partner_stats AS
SELECT 
    p.id AS partner_id,
    p.name AS partner_name,
    p.reference_code,
    p.business_type,
    p.is_active,
    count(DISTINCT poc.id) AS total_campaigns,
    sum(COALESCE(poc.total_codes_generated, 0)) AS total_codes_generated,
    sum(COALESCE(poc.codes_redeemed, 0)) AS total_codes_redeemed,
    count(DISTINCT ocr.id) AS total_redemptions
   FROM partners p
     LEFT JOIN partner_offer_campaigns poc ON p.id = poc.partner_id
     LEFT JOIN offer_code_redemptions ocr ON p.id = ocr.partner_id
  GROUP BY p.id, p.name, p.reference_code, p.business_type, p.is_active
  ORDER BY (sum(COALESCE(poc.codes_redeemed, 0))) DESC;

ALTER VIEW v_partner_stats SET (security_invoker = true);
GRANT SELECT ON v_partner_stats TO authenticated, public;


-- 5.7 RESTAURAR FUNCIONES (Actualizadas a TEXT)

-- get_partner_network_stats
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


-- get_admin_dashboard_stats (RESTAURADA)
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
    SELECT COALESCE(SUM(total_paid), 0)
    INTO v_total_revenue_period
    FROM payment_history
    WHERE created_at >= p_start_date AND created_at <= p_end_date;

    -- 2. Socios Activos
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


-- get_top_partners_leaderboard (RESTAURADA y CORREGIDA UUID -> TEXT)
CREATE OR REPLACE FUNCTION get_top_partners_leaderboard()
RETURNS TABLE (
    partner_id TEXT, 
    partner_name TEXT,
    total_revenue NUMERIC,
    active_subs BIGINT,
    total_commission_paid NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ar.user_id::TEXT, 
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


-- 5.8 partner_payments_summary (REQUIERE get_partner_network_stats)
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
  (stats.data->>'total_earnings')::numeric as total_earnings,
  (stats.data->>'direct_active_monthly')::int + (stats.data->>'direct_active_annual')::int + (stats.data->>'indirect_active_monthly')::int + (stats.data->>'indirect_active_annual')::int as active_subscriptions,
  COALESCE((SELECT SUM(amount) FROM partner_payments WHERE partner_id = ar.user_id AND status = 'paid'), 0) as total_paid,
  COALESCE((SELECT SUM(amount) FROM partner_payments WHERE partner_id = ar.user_id AND status = 'pending'), 0) as pending_payments
FROM admin_roles ar
CROSS JOIN LATERAL (
  SELECT get_partner_network_stats(ar.user_id) as data
) stats
WHERE ar.is_active = true;

ALTER VIEW partner_payments_summary SET (security_invoker = true);
GRANT SELECT ON partner_payments_summary TO authenticated, public;


-- 5.9 trainer_students_view (RESTAURADA - MODO ENTRENADOR)
CREATE OR REPLACE VIEW trainer_students_view AS
SELECT 
  tsr.id,
  tsr.trainer_id,
  tsr.student_id,
  tsr.status,
  tsr.created_at,
  tsr.accepted_at,
  up.name as student_name,
  up.username as student_username,
  up.profile_photo_url as student_photo
FROM public.trainer_student_relationships tsr
LEFT JOIN public.user_profiles up ON up.user_id = tsr.student_id
WHERE tsr.status = 'accepted';

ALTER VIEW trainer_students_view SET (security_invoker = true);
GRANT SELECT ON trainer_students_view TO authenticated, public;

-- 5.10 v_recent_redemptions (RESTAURADA - REVENUECAT)
CREATE OR REPLACE VIEW v_recent_redemptions AS
SELECT 
  ocr.id,
  ocr.redeemed_at,
  ocr.offer_code,
  ocr.offer_reference_name,
  ocr.product_id,
  ocr.price_paid,
  ocr.currency,
  p.name AS partner_name,
  poc.offer_type
FROM offer_code_redemptions ocr
LEFT JOIN partners p ON ocr.partner_id = p.id
LEFT JOIN partner_offer_campaigns poc ON ocr.campaign_id = poc.id
ORDER BY ocr.redeemed_at DESC
LIMIT 100;

ALTER VIEW v_recent_redemptions SET (security_invoker = true);
GRANT SELECT ON v_recent_redemptions TO authenticated, public;


-- Grant permisos funciones (SOLO LAS QUE EXISTEN)
GRANT EXECUTE ON FUNCTION get_partner_network_stats(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_top_partners_leaderboard() TO authenticated, anon;

COMMIT;
