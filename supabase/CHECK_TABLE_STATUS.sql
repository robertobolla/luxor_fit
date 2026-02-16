
-- ============================================================================
-- VERIFICAR ESTADO DE TABLAS Y RLS
-- ============================================================================

SELECT 
    c.relname AS table_name,
    CASE WHEN c.relkind = 'r' THEN 'table' 
         WHEN c.relkind = 'v' THEN 'view' 
         WHEN c.relkind = 'm' THEN 'materialized_view' 
         ELSE 'other' 
    END AS type,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relname IN ('user_profiles', 'user_stats', 'admin_roles', 'subscriptions');
