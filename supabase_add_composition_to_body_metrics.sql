-- ============================================================================
-- AGREGAR COMPOSICIÓN CORPORAL A BODY_METRICS
-- ============================================================================
-- Este script agrega campos para porcentaje de grasa corporal y masa muscular
-- en la tabla body_metrics para seguimiento semanal
-- ============================================================================

-- Agregar columna para porcentaje de grasa corporal
ALTER TABLE public.body_metrics
ADD COLUMN IF NOT EXISTS body_fat_percentage DECIMAL(5,2);

-- Agregar columna para porcentaje de masa muscular
ALTER TABLE public.body_metrics
ADD COLUMN IF NOT EXISTS muscle_percentage DECIMAL(5,2);

-- Agregar comentarios
COMMENT ON COLUMN public.body_metrics.body_fat_percentage IS 'Porcentaje de grasa corporal en esta medición';
COMMENT ON COLUMN public.body_metrics.muscle_percentage IS 'Porcentaje de masa muscular en esta medición';

-- Verificar que las columnas fueron creadas
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'body_metrics' 
  AND column_name IN ('body_fat_percentage', 'muscle_percentage');

