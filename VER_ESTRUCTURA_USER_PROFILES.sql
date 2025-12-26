-- ============================================================================
-- VER ESTRUCTURA DE user_profiles
-- ============================================================================

-- Ver las columnas de user_profiles
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Ver un registro de ejemplo
SELECT * FROM user_profiles LIMIT 1;


