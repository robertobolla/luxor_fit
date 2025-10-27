-- Agregar columna de género a la tabla user_profiles
-- Ejecutar este script en Supabase SQL Editor

-- 1. Agregar la columna gender
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male';

-- 2. Agregar comentario a la columna
COMMENT ON COLUMN user_profiles.gender IS 'Género del usuario: male, female, other';

-- 3. Verificar que la columna se agregó correctamente
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND column_name = 'gender';

