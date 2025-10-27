-- ============================================================================
-- AGREGAR CAMPOS DE COMPOSICIÓN CORPORAL
-- ============================================================================
-- Este script agrega campos opcionales para porcentaje de grasa corporal
-- y masa muscular en la tabla user_profiles
-- ============================================================================

-- Agregar columna para porcentaje de grasa corporal
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS body_fat_percentage DECIMAL(5,2);

-- Agregar columna para porcentaje de masa muscular
ALTER TABLE IF NOT EXISTS public.user_profiles
ADD COLUMN IF NOT EXISTS muscle_percentage DECIMAL(5,2);

-- Agregar comentarios para documentación
COMMENT ON COLUMN public.user_profiles.body_fat_percentage IS 'Porcentaje de grasa corporal (ej: 15.5 para 15.5%). Valor opcional para mejorar la personalización de planes nutricionales.';
COMMENT ON COLUMN public.user_profiles.muscle_percentage IS 'Porcentaje de masa muscular (ej: 40.0 para 40%). Valor opcional para mejorar la personalización de planes nutricionales.';

-- Verificar que las columnas fueron creadas
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name IN ('body_fat_percentage', 'muscle_percentage');

