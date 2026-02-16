
-- ============================================================================
-- REPARACIÓN COMPLETA: CREAR VISTA user_stats Y ARREGLAR RLS
-- ============================================================================

-- 1. Crear función SECURITY DEFINER para verificar rol de admin (SI NO EXISTE)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM admin_roles
    WHERE user_id = auth.uid()::text
    AND role_type IN ('admin', 'socio', 'empresario') 
    AND is_active = true
  );
END;
$$;

-- 2. Conceder permisos de ejecución
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO public;
GRANT SELECT ON admin_roles TO public; -- Asegurar lectura básica pública (controlada por RLS)

-- 3. Actualizar política de user_profiles para usar la función is_admin()
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING ( is_admin() );

-- 4. Actualizar política de admin_roles
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all roles" ON admin_roles;

CREATE POLICY "Admins can view all roles"
  ON admin_roles
  FOR SELECT
  USING ( is_admin() );

-- 5. RECREAR LA VISTA user_stats (que faltaba)
DROP VIEW IF EXISTS user_stats CASCADE;

CREATE OR REPLACE VIEW user_stats AS
SELECT 
  COUNT(DISTINCT up.user_id) as total_users,
  COUNT(DISTINCT CASE WHEN up.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN up.user_id END) as new_users_7d,
  COUNT(DISTINCT CASE WHEN up.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN up.user_id END) as new_users_30d,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.user_id END) as active_subscriptions,
  -- COUNT independent subqueries if tables don't exist is risky, usually they exist. 
  -- Assuming workout_plans exists, if not this might fail. We'll join simpler.
  (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as total_active_subs
FROM user_profiles up
LEFT JOIN subscriptions s ON up.user_id = s.user_id;

-- 6. Hacer la vista accesible (security_invoker para que use los permisos del usuario)
ALTER VIEW user_stats SET (security_invoker = true);
GRANT SELECT ON user_stats TO authenticated;
GRANT SELECT ON user_stats TO public;
