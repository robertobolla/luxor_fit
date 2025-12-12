-- =====================================================
-- VERIFICAR: Función get_student_stats
-- =====================================================
-- Este script verifica si la función existe y cuál es su firma
-- =====================================================

-- Ver todas las funciones con nombre get_student_stats
SELECT 
    p.proname AS function_name,
    pg_catalog.pg_get_function_arguments(p.oid) AS arguments,
    pg_catalog.pg_get_function_result(p.oid) AS return_type,
    CASE
        WHEN p.prokind = 'f' THEN 'function'
        WHEN p.prokind = 'p' THEN 'procedure'
        WHEN p.prokind = 'a' THEN 'aggregate'
        WHEN p.prokind = 'w' THEN 'window'
    END AS function_type
FROM pg_catalog.pg_proc p
     LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'get_student_stats'
  AND n.nspname = 'public';

-- Si no aparece nada, la función NO existe
-- Si aparece con 2 parámetros (TEXT, TEXT), es la versión antigua
-- Si aparece con 4 parámetros (TEXT, TEXT, DATE, DATE), es la versión nueva


