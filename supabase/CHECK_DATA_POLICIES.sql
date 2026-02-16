
-- ============================================================================
-- CHECK DATA ACCESS POLICIES
-- ============================================================================

SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    tablename IN ('user_profiles', 'user_stats', 'admin_roles');
