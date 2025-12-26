-- ============================================================================
-- INSERTAR DATOS COMPLETOS DE PRUEBA PARA LUCAS (SIN NUTRICIÓN)
-- ============================================================================

-- 1. INSERTAR PLAN DE ENTRENAMIENTO ACTIVO
INSERT INTO workout_plans (
  id,
  user_id,
  plan_name,
  description,
  plan_data,
  is_active,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg',
  'Plan de Fuerza Avanzado',
  'Programa de entrenamiento de fuerza de 4 días por semana',
  '{"weeks": 12, "days_per_week": 4, "focus": "fuerza"}',
  true,
  NOW() - INTERVAL '30 days',
  NOW()
)
ON CONFLICT DO NOTHING;

-- 2. INSERTAR ENTRENAMIENTOS COMPLETADOS (últimos 30 días)
INSERT INTO workout_completions (
  user_id,
  workout_plan_id,
  day_name,
  completed_at,
  duration_minutes,
  notes
)
SELECT 
  'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg',
  (SELECT id FROM workout_plans WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg' AND is_active = true LIMIT 1),
  'Día ' || (n % 4 + 1),
  NOW() - (n || ' days')::INTERVAL,
  45 + (n % 30),
  CASE 
    WHEN n % 3 = 0 THEN 'Excelente sesión'
    WHEN n % 3 = 1 THEN 'Buena intensidad'
    ELSE 'Completado con éxito'
  END
FROM generate_series(1, 15) AS n;

-- 3. INSERTAR MÉTRICAS CORPORALES (últimos 60 días, cada 4 días)
INSERT INTO body_metrics (
  user_id,
  date,
  weight_kg,
  body_fat_percentage,
  muscle_percentage,
  created_at
)
SELECT 
  'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg',
  (NOW() - (n * 4 || ' days')::INTERVAL)::DATE,
  85.0 - (n * 0.3),  -- Peso decreciendo
  18.0 - (n * 0.2),  -- Grasa corporal decreciendo
  38.0 + (n * 0.15), -- Músculo creciendo
  NOW() - (n * 4 || ' days')::INTERVAL
FROM generate_series(0, 15) AS n
ON CONFLICT (user_id, date) DO NOTHING;

-- 4. INSERTAR DATOS DE PASOS DIARIOS (últimos 30 días)
INSERT INTO health_data_daily (
  user_id,
  date,
  steps,
  created_at
)
SELECT 
  'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg',
  (NOW() - (n || ' days')::INTERVAL)::DATE,
  8000 + (n * 100) + ((n * 37) % 3000),  -- Pasos variando entre 8000-11000
  NOW() - (n || ' days')::INTERVAL
FROM generate_series(0, 30) AS n
ON CONFLICT (user_id, date) DO NOTHING;

-- VERIFICAR QUE TODO SE INSERTÓ
SELECT '✅ PLAN ACTIVO' as verificacion, COUNT(*) as cantidad
FROM workout_plans
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg' AND is_active = true
UNION ALL
SELECT '✅ ENTRENAMIENTOS', COUNT(*)
FROM workout_completions
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg'
UNION ALL
SELECT '✅ MÉTRICAS CORPORALES', COUNT(*)
FROM body_metrics
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg'
UNION ALL
SELECT '✅ PASOS DIARIOS', COUNT(*)
FROM health_data_daily
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

-- PROBAR LA FUNCIÓN
SELECT 
  '✅ RESULTADO FINAL' as paso,
  get_student_stats(
    'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'::TEXT,
    'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg'::TEXT,
    '2020-01-01'::DATE,
    CURRENT_DATE::DATE
  ) as stats;

