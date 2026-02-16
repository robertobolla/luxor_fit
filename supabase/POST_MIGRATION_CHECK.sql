
-- ============================================================================
-- DIAGNÓSTICO POST-MIGRACIÓN
-- ============================================================================

-- 1. Verificar tipos de columnas (Deberían ser 'text')
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name IN ('user_id', 'partner_id', 'id') 
  AND table_name IN ('admin_roles', 'user_profiles', 'subscriptions', 'partners')
  AND table_schema = 'public';

-- 2. Verificar datos en admin_roles (¿Hay filas?)
SELECT COUNT(*) as total_admins FROM admin_roles;

-- 3. Verificar si tu usuario "ve" algo (RLS check)
-- Simula ser tu usuario (reemplaza 'tu_id_de_clerk' si lo tienes, o confía en auth.uid())
SELECT 
    auth.uid() as current_auth_id,
    (SELECT COUNT(*) FROM admin_roles) as visible_admins,
    (SELECT COUNT(*) FROM user_profiles) as visible_profiles,
    (SELECT COUNT(*) FROM partners) as visible_partners;

-- 4. Verificar vistas críticas
SELECT COUNT(*) as stats_rows FROM user_stats;
SELECT COUNT(*) as partner_stats_rows FROM v_partner_stats;

-- 5. Ver tu usuario específico en admin_roles (por email)
SELECT user_id, email, role_type, is_active 
FROM admin_roles 
WHERE email ILIKE '%roberto%'; -- Busca por tu nombre/email
