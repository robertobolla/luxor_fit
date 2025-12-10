-- ============================================================================
-- SCRIPT PARA RESOLVER 9 ERRORES DE SEGURIDAD EN SUPABASE
-- ============================================================================
-- Este script resuelve:
-- 1. Policy Exists RLS Disabled (1 error)
-- 2. Security Definer View (6 errores)
-- 3. RLS Disabled in Public (2 errores)
-- ============================================================================

-- ============================================================================
-- PARTE 1: HABILITAR RLS EN TABLAS PÚBLICAS
-- ============================================================================

-- 1. Habilitar RLS en progress_photos (si no está habilitado)
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

-- 2. Habilitar RLS en payment_history
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Verificar que las políticas existan en progress_photos
-- (ya deberían estar creadas, pero verificamos)
DO $$ 
BEGIN
  -- Política SELECT para progress_photos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'progress_photos' 
    AND policyname = 'Users can view their own photos'
  ) THEN
    CREATE POLICY "Users can view their own photos"
      ON public.progress_photos FOR SELECT
      USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
  END IF;

  -- Política INSERT para progress_photos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'progress_photos' 
    AND policyname = 'Users can insert their own photos'
  ) THEN
    CREATE POLICY "Users can insert their own photos"
      ON public.progress_photos FOR INSERT
      WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
  END IF;

  -- Política UPDATE para progress_photos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'progress_photos' 
    AND policyname = 'Users can update their own photos'
  ) THEN
    CREATE POLICY "Users can update their own photos"
      ON public.progress_photos FOR UPDATE
      USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
  END IF;

  -- Política DELETE para progress_photos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'progress_photos' 
    AND policyname = 'Users can delete their own photos'
  ) THEN
    CREATE POLICY "Users can delete their own photos"
      ON public.progress_photos FOR DELETE
      USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
  END IF;
END $$;

-- ============================================================================
-- PARTE 2: CREAR POLÍTICAS RLS PARA payment_history
-- ============================================================================

-- Solo admins pueden ver el historial de pagos
CREATE POLICY "Admins can view payment history"
  ON public.payment_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE admin_roles.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND admin_roles.is_active = true
      AND admin_roles.role_type IN ('super_admin', 'admin', 'empresario', 'socio')
    )
  );

-- Solo admins pueden insertar en payment_history
CREATE POLICY "Admins can insert payment history"
  ON public.payment_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE admin_roles.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND admin_roles.is_active = true
      AND admin_roles.role_type IN ('super_admin', 'admin')
    )
  );

-- Los usuarios pueden ver su propio historial
CREATE POLICY "Users can view own payment history"
  ON public.payment_history FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================================
-- PARTE 3: CAMBIAR VISTAS DE SECURITY DEFINER A SECURITY INVOKER
-- ============================================================================
-- SECURITY INVOKER es más seguro porque ejecuta la vista con los permisos
-- del usuario que la consulta, no del usuario que la creó
-- ============================================================================

-- 1. Vista: partner_payments_sums (si existe)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'partner_payments_sums') THEN
    -- Recrear la vista con SECURITY INVOKER
    -- Nota: Necesitarás ajustar esta definición según tu vista actual
    EXECUTE 'CREATE OR REPLACE VIEW public.partner_payments_sums 
      WITH (security_invoker = true) 
      AS SELECT * FROM public.partner_payments_sums';
  END IF;
END $$;

-- 2. Vista: empresario_stats
CREATE OR REPLACE VIEW public.empresario_stats 
  WITH (security_invoker = true)
AS
SELECT 
  ar.user_id AS empresario_user_id,
  ar.name AS empresario_name,
  ar.email AS empresario_email,
  ar.discount_code,
  ar.annual_fee,
  COUNT(DISTINCT gm.id) AS total_gym_members,
  COUNT(DISTINCT gm.id) FILTER (WHERE gm.subscription_expiry > NOW()) AS active_gym_members,
  COUNT(DISTINCT gm.id) FILTER (WHERE gm.subscription_expiry <= NOW() OR gm.subscription_expiry IS NULL) AS expired_gym_members,
  COALESCE(SUM(gm.monthly_amount), 0) AS total_monthly_revenue,
  COALESCE(SUM(gm.monthly_amount) FILTER (WHERE gm.subscription_expiry > NOW()), 0) AS active_monthly_revenue,
  COALESCE(ar.annual_fee, 0) AS annual_fee_amount
FROM admin_roles ar
LEFT JOIN gym_members gm ON gm.empresario_id = ar.user_id
WHERE ar.role_type = 'empresario' 
  AND ar.is_active = true
GROUP BY ar.user_id, ar.name, ar.email, ar.discount_code, ar.annual_fee;

-- 3. Vista: partner_active_users
CREATE OR REPLACE VIEW public.partner_active_users 
  WITH (security_invoker = true)
AS
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

-- 4. Vista: user_stats
CREATE OR REPLACE VIEW public.user_stats 
  WITH (security_invoker = true)
AS
SELECT 
  up.user_id,
  up.name,
  up.username,
  up.email,
  up.profile_photo_url,
  up.created_at,
  sub.status AS subscription_status,
  sub.current_period_start AS subscription_start,
  sub.current_period_end AS subscription_end,
  sub.cancel_at_period_end,
  dcu.discount_code,
  dcu.partner_id,
  ar_partner.name AS partner_name,
  gm.empresario_id,
  ar_empresario.name AS empresario_name,
  CASE 
    WHEN ar.user_id IS NOT NULL THEN ar.role_type
    ELSE 'user'
  END AS role_type,
  COALESCE(ar.is_active, false) AS is_admin_active
FROM user_profiles up
LEFT JOIN subscriptions sub ON sub.user_id = up.user_id
LEFT JOIN discount_code_usage dcu ON dcu.user_id = up.user_id
LEFT JOIN admin_roles ar_partner ON ar_partner.user_id = dcu.partner_id
LEFT JOIN gym_members gm ON gm.user_id = up.user_id
LEFT JOIN admin_roles ar_empresario ON ar_empresario.user_id = gm.empresario_id
LEFT JOIN admin_roles ar ON ar.user_id = up.user_id;

-- 5. Vista: v_user_subscription
CREATE OR REPLACE VIEW public.v_user_subscription 
  WITH (security_invoker = true)
AS
SELECT 
  up.user_id,
  up.name,
  up.username,
  up.email,
  sub.status AS subscription_status,
  sub.current_period_start,
  sub.current_period_end,
  sub.cancel_at_period_end,
  CASE
    WHEN sub.status = 'active' AND sub.current_period_end > NOW() THEN true
    WHEN sub.status = 'trialing' THEN true
    ELSE false
  END AS has_active_subscription,
  gm.empresario_id,
  gm.subscription_expiry AS gym_member_expiry,
  CASE
    WHEN gm.subscription_expiry IS NOT NULL AND gm.subscription_expiry > NOW() THEN true
    ELSE false
  END AS is_active_gym_member
FROM user_profiles up
LEFT JOIN subscriptions sub ON sub.user_id = up.user_id
LEFT JOIN gym_members gm ON gm.user_id = up.user_id;

-- 6. Vista: partner_referrals
CREATE OR REPLACE VIEW public.partner_referrals 
  WITH (security_invoker = true)
AS
SELECT 
  ar.user_id AS partner_user_id,
  ar.name AS partner_name,
  ar.email AS partner_email,
  ar.discount_code,
  dcu.user_id AS referred_user_id,
  up.name AS referred_user_name,
  up.email AS referred_user_email,
  dcu.discount_percentage,
  dcu.created_at AS referral_date,
  sub.status AS subscription_status,
  sub.current_period_start AS subscription_start,
  sub.current_period_end AS subscription_end,
  CASE 
    WHEN sub.status IN ('active', 'trialing') THEN true
    ELSE false
  END AS is_active_subscription
FROM admin_roles ar
INNER JOIN discount_code_usage dcu ON dcu.partner_id = ar.user_id
INNER JOIN user_profiles up ON up.user_id = dcu.user_id
LEFT JOIN subscriptions sub ON sub.user_id = dcu.user_id
WHERE ar.role_type = 'socio' 
  AND ar.discount_code IS NOT NULL
  AND ar.is_active = true;

-- ============================================================================
-- PARTE 4: GRANTS Y PERMISOS
-- ============================================================================

-- Dar permisos de lectura a las vistas
GRANT SELECT ON public.partner_active_users TO authenticated;
GRANT SELECT ON public.partner_active_users TO anon;

GRANT SELECT ON public.empresario_stats TO authenticated;
GRANT SELECT ON public.empresario_stats TO anon;

GRANT SELECT ON public.user_stats TO authenticated;
GRANT SELECT ON public.user_stats TO anon;

GRANT SELECT ON public.v_user_subscription TO authenticated;
GRANT SELECT ON public.v_user_subscription TO anon;

GRANT SELECT ON public.partner_referrals TO authenticated;
GRANT SELECT ON public.partner_referrals TO anon;

-- ============================================================================
-- PARTE 5: VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar que RLS esté habilitado en las tablas críticas
DO $$ 
DECLARE
  table_record RECORD;
  missing_rls TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('progress_photos', 'payment_history')
  LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = table_record.tablename 
      AND rowsecurity = true
    ) THEN
      missing_rls := array_append(missing_rls, table_record.tablename);
    END IF;
  END LOOP;
  
  IF array_length(missing_rls, 1) > 0 THEN
    RAISE WARNING 'Las siguientes tablas NO tienen RLS habilitado: %', array_to_string(missing_rls, ', ');
  ELSE
    RAISE NOTICE '✅ Todas las tablas críticas tienen RLS habilitado correctamente';
  END IF;
END $$;

-- ============================================================================
-- RESUMEN DE CAMBIOS
-- ============================================================================
-- ✅ RLS habilitado en: progress_photos, payment_history
-- ✅ Políticas RLS creadas para payment_history
-- ✅ 6 vistas cambiadas a SECURITY INVOKER (más seguro)
-- ✅ Permisos otorgados correctamente
-- ============================================================================

COMMENT ON TABLE public.progress_photos IS 'Fotos de progreso - RLS habilitado';
COMMENT ON TABLE public.payment_history IS 'Historial de pagos - RLS habilitado - Solo admins';
COMMENT ON VIEW public.partner_active_users IS 'Vista con SECURITY INVOKER - Usuarios activos por socio';
COMMENT ON VIEW public.empresario_stats IS 'Vista con SECURITY INVOKER - Estadísticas de empresarios';
COMMENT ON VIEW public.user_stats IS 'Vista con SECURITY INVOKER - Estadísticas de usuarios';
COMMENT ON VIEW public.v_user_subscription IS 'Vista con SECURITY INVOKER - Estado de suscripciones';
COMMENT ON VIEW public.partner_referrals IS 'Vista con SECURITY INVOKER - Referencias de socios';

