-- ============================================================================
-- ARREGLAR VISTAS CON SECURITY DEFINER (6 errores)
-- ============================================================================
-- Cambiar de SECURITY DEFINER a SECURITY INVOKER es más seguro
-- porque ejecuta con los permisos del usuario que consulta, no del creador
-- ============================================================================

-- ============================================================================
-- VERIFICAR VISTAS ACTUALES
-- ============================================================================

-- Ver qué vistas tienen SECURITY DEFINER
SELECT 
  schemaname,
  viewname,
  viewowner,
  CASE 
    WHEN definition LIKE '%SECURITY DEFINER%' THEN 'DEFINER'
    WHEN definition LIKE '%SECURITY INVOKER%' THEN 'INVOKER'
    ELSE 'DEFAULT (INVOKER)'
  END as security_mode
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'partner_payments_sums',
    'empresario_stats',
    'partner_active_users',
    'user_stats',
    'v_user_subscription',
    'partner_referrals'
  )
ORDER BY viewname;

-- ============================================================================
-- RECREAR VISTAS CON SECURITY INVOKER
-- ============================================================================

-- 1. empresario_stats
DROP VIEW IF EXISTS public.empresario_stats CASCADE;
CREATE VIEW public.empresario_stats 
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

GRANT SELECT ON public.empresario_stats TO authenticated, anon;

-- 2. partner_active_users
DROP VIEW IF EXISTS public.partner_active_users CASCADE;
CREATE VIEW public.partner_active_users 
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

GRANT SELECT ON public.partner_active_users TO authenticated, anon;

-- 3. user_stats
DROP VIEW IF EXISTS public.user_stats CASCADE;
CREATE VIEW public.user_stats 
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

GRANT SELECT ON public.user_stats TO authenticated, anon;

-- 4. v_user_subscription
DROP VIEW IF EXISTS public.v_user_subscription CASCADE;
CREATE VIEW public.v_user_subscription 
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

GRANT SELECT ON public.v_user_subscription TO authenticated, anon;

-- 5. partner_referrals
DROP VIEW IF EXISTS public.partner_referrals CASCADE;
CREATE VIEW public.partner_referrals 
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

GRANT SELECT ON public.partner_referrals TO authenticated, anon;

-- 6. partner_payments_sums (si existe)
-- Nota: Esta vista no está en el código local, pero aparece en los errores
-- Si existe en tu base de datos, necesitarás recrearla manualmente con SECURITY INVOKER

-- ============================================================================
-- VERIFICAR CAMBIOS
-- ============================================================================

-- Ver que ahora todas usan INVOKER
SELECT 
  schemaname,
  viewname,
  CASE 
    WHEN definition LIKE '%security_invoker%' THEN '✅ INVOKER (Seguro)'
    ELSE '❌ DEFINER (Inseguro)'
  END as security_mode
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'empresario_stats',
    'partner_active_users',
    'user_stats',
    'v_user_subscription',
    'partner_referrals'
  )
ORDER BY viewname;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- ✅ Todas las vistas deberían mostrar "INVOKER (Seguro)"
-- ============================================================================

