
-- ============================================================================
-- DIAGNÓSTICO DE ACCESO ADMIN
-- ============================================================================

-- 1. Ver todos los roles de admin activos
SELECT id, user_id, email, role_type, is_active, created_at
FROM admin_roles
ORDER BY created_at DESC;

-- 2. Ver si hay duplicados por email (que podrían causar conflictos)
SELECT email, COUNT(*)
FROM admin_roles
GROUP BY email
HAVING COUNT(*) > 1;

-- 3. Ver usuarios recientes en user_profiles para comparar IDs
SELECT user_id, email, name, created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;
