-- ============================================================================
-- VERIFICACION SIMPLE: Datos de Lucas
-- ============================================================================

-- 1. Verificar datos insertados
SELECT 
  'ENTRENAMIENTOS' as tipo,
  COUNT(*) as cantidad
FROM workout_completions 
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg'

UNION ALL

SELECT 
  'PLANES ACTIVOS' as tipo,
  COUNT(*) as cantidad
FROM workout_plans 
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg' 
  AND is_active = true

UNION ALL

SELECT 
  'METRICAS CORPORALES' as tipo,
  COUNT(*) as cantidad
FROM body_metrics 
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg'

UNION ALL

SELECT 
  'NUTRICION' as tipo,
  COUNT(*) as cantidad
FROM nutrition_targets 
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg'

UNION ALL

SELECT 
  'PASOS' as tipo,
  COUNT(*) as cantidad
FROM health_data_daily 
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';

