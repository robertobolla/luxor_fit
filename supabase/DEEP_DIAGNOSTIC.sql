
-- ============================================================================
-- DIAGNÓSTICO PROFUNDO DE RLS Y TIPOS
-- ============================================================================

-- 1. Verificar tipos de columnas
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name IN ('admin_roles', 'user_profiles') 
    AND column_name = 'user_id';

-- 2. Simular la política para el usuario Roberto
-- Sustituir 'user_34Ap3niPCkLyVxhmN7f6yQWdKBe' con el ID real de Roberto si es diferente
-- Esto nos dirá si la subconsulta de la política devuelve TRUE o FALSE
SELECT 
    EXISTS (
        SELECT 1
        FROM admin_roles ar
        WHERE ar.user_id = 'user_34Ap3niPCkLyVxhmN7f6yQWdKBe' -- ID Nuevo de Roberto
        AND ar.role_type IN ('admin', 'socio', 'empresario')
        AND ar.is_active = true
    ) as can_view_all_profiles;

-- 3. Contar perfiles visibles (sin RLS, ya que somos postgres/service_role aquí)
SELECT count(*) as total_profiles FROM user_profiles;
