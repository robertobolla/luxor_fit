
-- ============================================================================
-- SOLUCIÓN DEFINITIVA DE RLS: FUNCIÓN DE SEGURIDAD
-- ============================================================================

-- 1. Crear función SECURITY DEFINER para verificar rol de admin
-- Esta función se salta RLS al leer admin_roles porque se ejecuta con permisos de creador (superuser)
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

-- 3. Actualizar política de user_profiles para usar la función
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING ( is_admin() );

-- 4. Actualizar política de admin_roles (para que puedan verse entre ellos también)
DROP POLICY IF EXISTS "Admins can view all roles" ON admin_roles;

CREATE POLICY "Admins can view all roles"
  ON admin_roles
  FOR SELECT
  USING ( is_admin() );

-- 5. Verificar si las vistas requieren cambios de propietario (opcional)
-- Por si acaso, hacemos user_stats security invoker explicito
ALTER VIEW user_stats SET (security_invoker = true);
