-- ============================================================================
-- COPIAR Y PEGAR SOLO ESTE CONTENIDO EN SUPABASE SQL EDITOR
-- ============================================================================

-- Paso 1: Verificar si hay duplicados
SELECT 
  user_id, 
  date, 
  COUNT(*) as cantidad,
  STRING_AGG(id::text, ', ') as ids_duplicados
FROM body_metrics
GROUP BY user_id, date
HAVING COUNT(*) > 1;

-- Si el query anterior muestra resultados, EJECUTAR ESTO para limpiar duplicados:
-- (Descomenta las siguientes líneas quitando el -- al inicio)
-- DELETE FROM body_metrics
-- WHERE id IN (
--   SELECT id FROM (
--     SELECT 
--       id,
--       ROW_NUMBER() OVER (PARTITION BY user_id, date ORDER BY created_at DESC) as rn
--     FROM body_metrics
--   ) sub
--   WHERE rn > 1
-- );

-- Paso 2: Agregar la constraint única
ALTER TABLE public.body_metrics
ADD CONSTRAINT body_metrics_user_date_unique 
UNIQUE (user_id, date);

-- Paso 3: Verificar que se creó correctamente
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'body_metrics'
  AND constraint_type = 'UNIQUE';

-- ¡Listo! Ahora puedes registrar mediciones sin errores

