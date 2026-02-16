
-- ============================================================================
-- DIAGNÓSTICO DE ESTADO ACTUAL
-- ============================================================================

-- 1. Ver exactamente qué datos tiene tu usuario en admin_roles
SELECT id, user_id, email, role_type, is_active 
FROM admin_roles 
WHERE email = 'robertobolla9@gmail.com';

-- 2. Verificar si la política de lectura pública está activa
SELECT tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'admin_roles';

-- 3. Probar si la base de datos te reconoce como admin AHORA MISMO
-- (Esto depende de tu sesión en el editor SQL)
SELECT 
  auth.uid() as mi_auth_id,
  is_admin() as soy_admin_db;
