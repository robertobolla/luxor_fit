-- ============================================================================
-- AGREGAR COLUMNA USERNAME A USER_PROFILES
-- ============================================================================
-- Este script agrega un campo de nombre de usuario único para preparar
-- la app como red social. El username será usado para identificar usuarios
-- en lugar del email o user_id.

-- Paso 1: Agregar columna username (opcional inicialmente para usuarios existentes)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS username TEXT;

-- Paso 2: Crear índice único para username (permitirá NULLs temporalmente)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username_unique 
ON public.user_profiles(username) 
WHERE username IS NOT NULL;

-- Paso 3: Agregar constraint CHECK para validar formato del username
-- Solo permite letras, números, guiones bajos y guiones
-- Mínimo 3 caracteres, máximo 30 caracteres
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS check_username_format;

ALTER TABLE public.user_profiles
ADD CONSTRAINT check_username_format 
CHECK (
  username IS NULL OR (
    LENGTH(username) >= 3 AND 
    LENGTH(username) <= 30 AND
    username ~ '^[a-zA-Z0-9_-]+$' AND
    LOWER(username) = username -- Solo minúsculas
  )
);

-- Paso 4: Agregar comentario a la columna
COMMENT ON COLUMN public.user_profiles.username IS 
'Nombre de usuario único para identificación en la red social. Debe ser único, entre 3-30 caracteres, solo letras minúsculas, números, guiones y guiones bajos.';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Verificar que la columna se agregó correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
  AND column_name = 'username';

-- Verificar que el índice único existe
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'user_profiles' 
  AND indexname = 'idx_user_profiles_username_unique';

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. La columna username es opcional inicialmente para no romper usuarios existentes
-- 2. El índice único permite NULLs, así que múltiples usuarios pueden tener username NULL
-- 3. El formato solo permite: letras minúsculas, números, guiones (-) y guiones bajos (_)
-- 4. Los usuarios deberán agregar su username en el onboarding o en editar perfil
-- 5. Para hacer username obligatorio en el futuro, ejecutar:
--    ALTER TABLE public.user_profiles ALTER COLUMN username SET NOT NULL;

