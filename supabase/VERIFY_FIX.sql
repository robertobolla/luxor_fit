
-- ============================================================================
-- VERIFICACIÓN DE ARREGLO
-- ============================================================================

-- 1. ¿Soy Admin según la nueva función?
-- (Reemplaza el ID con tu ID real si es diferente, o usa auth.uid() en la consola SQL de Supabase si estás logueado)
SELECT 
    auth.uid() as my_auth_id,
    is_admin() as am_i_admin;

-- 2. ¿Puedo ver perfiles ahora?
SELECT count(*) as visible_profiles FROM user_profiles;

-- 3. ¿Puedo ver stats ahora?
SELECT * FROM user_stats;

-- 4. Ver mis roles (raw) para confirmar
SELECT * FROM admin_roles WHERE user_id = auth.uid()::text;
