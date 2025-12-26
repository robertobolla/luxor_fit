-- ============================================================================
-- VERIFICAR FECHAS DE LOS DATOS DE LUCAS
-- ============================================================================

-- 1. Ver fechas de los entrenamientos
SELECT 
  'ENTRENAMIENTOS' as tipo,
  id,
  completed_at,
  day_name,
  duration_minutes,
  CURRENT_DATE - completed_at::DATE as dias_atras
FROM workout_completions
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg'
ORDER BY completed_at DESC
LIMIT 5;

-- 2. Ver el plan activo
SELECT 
  'PLAN ACTIVO' as tipo,
  id,
  plan_name,
  is_active,
  created_at
FROM workout_plans
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg'
ORDER BY created_at DESC;

-- 3. Ver métricas corporales
SELECT 
  'METRICAS CORPORALES' as tipo,
  date,
  weight_kg,
  body_fat_percentage,
  muscle_percentage,
  CURRENT_DATE - date as dias_atras
FROM body_metrics
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg'
ORDER BY date DESC;

-- 4. Ver nutrición
SELECT 
  'NUTRICION' as tipo,
  date,
  calories,
  CURRENT_DATE - date as dias_atras
FROM nutrition_targets
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg'
ORDER BY date DESC;

-- 5. Ver pasos
SELECT 
  'PASOS' as tipo,
  date,
  steps,
  CURRENT_DATE - date as dias_atras
FROM health_data_daily
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg'
ORDER BY date DESC;


