-- ============================================================================
-- ARREGLAR VISTAS CON SECURITY DEFINER (6 errores) - VERSIÓN CORREGIDA
-- ============================================================================
-- Este script corrige los nombres de columnas y usa la estructura correcta
-- ============================================================================

-- ============================================================================
-- PASO 1: VERIFICAR VISTAS ACTUALES
-- ============================================================================

SELECT 
  schemaname,
  viewname,
  CASE 
    WHEN definition LIKE '%SECURITY DEFINER%' THEN 'DEFINER (Inseguro)'
    WHEN definition LIKE '%security_invoker%' THEN 'INVOKER (Seguro)'
    ELSE 'DEFAULT'
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
-- PASO 2: RECREAR VISTAS CON SECURITY INVOKER Y COLUMNAS CORRECTAS
-- ============================================================================

-- 1. empresario_stats (CORREGIDO: usa subscription_expires_at y sin monthly_amount)
DROP VIEW IF EXISTS public.empresario_stats CASCADE;
CREATE VIEW public.empresario_stats 
WITH (security_invoker = true)
AS
SELECT 
  ar.user_id AS empresario_id,
  ar.email AS empresario_email,
  ar.name AS empresario_name,
  ar.gym_name,
  ar.monthly_fee,
  ar.annual_fee,
  ar.max_users,
  COUNT(DISTINCT gm.user_id) AS total_members,
  COUNT(DISTINCT CASE WHEN gm.is_active = true THEN gm.user_id END) AS active_members,
  COUNT(DISTINCT CASE WHEN gm.joined_at >= NOW() - INTERVAL '30 days' THEN gm.user_id END) AS new_members_30d,
  COUNT(DISTINCT CASE WHEN gm.is_active = true AND (gm.subscription_expires_at IS NULL OR gm.subscription_expires_at > NOW()) THEN gm.user_id END) AS members_with_access
FROM admin_roles ar
LEFT JOIN gym_members gm ON ar.user_id = gm.empresario_id
WHERE ar.role_type = 'empresario'
GROUP BY ar.user_id, ar.email, ar.name, ar.gym_name, ar.monthly_fee, ar.annual_fee, ar.max_users;

GRANT SELECT ON public.empresario_stats TO authenticated, anon;
COMMENT ON VIEW public.empresario_stats IS 'Estadísticas de empresarios (SECURITY INVOKER)';

-- 2. partner_active_users (CORRECTO)
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
COMMENT ON VIEW public.partner_active_users IS 'Usuarios activos por socio (SECURITY INVOKER)';

-- 3. user_stats (CORRECTO)
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
COMMENT ON VIEW public.user_stats IS 'Estadísticas de usuarios (SECURITY INVOKER)';

-- 4. v_user_subscription (CORREGIDO: usa subscription_expires_at)
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
    WHEN gm.is_active = true AND (gm.subscription_expires_at IS NULL OR gm.subscription_expires_at > NOW()) THEN true
    ELSE false
  END AS has_active_subscription,
  gm.empresario_id,
  gm.subscription_expires_at AS gym_member_expiry,
  CASE
    WHEN gm.is_active = true AND (gm.subscription_expires_at IS NULL OR gm.subscription_expires_at > NOW()) THEN true
    ELSE false
  END AS is_active_gym_member
FROM user_profiles up
LEFT JOIN subscriptions sub ON sub.user_id = up.user_id
LEFT JOIN gym_members gm ON gm.user_id = up.user_id;

GRANT SELECT ON public.v_user_subscription TO authenticated, anon;
COMMENT ON VIEW public.v_user_subscription IS 'Estado de suscripción de usuarios (SECURITY INVOKER)';

-- 5. partner_referrals (CORRECTO)
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
COMMENT ON VIEW public.partner_referrals IS 'Referencias de socios (SECURITY INVOKER)';

-- ============================================================================
-- PASO 3: VERIFICAR CAMBIOS
-- ============================================================================

-- Ver que ahora todas usan INVOKER
SELECT 
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
-- PASO 4: VERIFICAR QUE LAS VISTAS FUNCIONEN
-- ============================================================================

-- Probar cada vista
SELECT COUNT(*) as count_empresario_stats FROM empresario_stats;
SELECT COUNT(*) as count_partner_active_users FROM partner_active_users;
SELECT COUNT(*) as count_user_stats FROM user_stats;
SELECT COUNT(*) as count_v_user_subscription FROM v_user_subscription;
SELECT COUNT(*) as count_partner_referrals FROM partner_referrals;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- ✅ Todas las vistas deberían mostrar "INVOKER (Seguro)"
-- ✅ Los conteos deberían devolver resultados sin errores
-- ============================================================================

