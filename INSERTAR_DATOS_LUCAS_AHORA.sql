-- ============================================================================
-- INSERTAR DATOS DE LUCAS AHORA MISMO
-- ============================================================================

-- Primero, insertar el plan activo para obtener su ID
DO $$
DECLARE
  v_plan_id UUID;
BEGIN
  -- Desactivar planes existentes
  UPDATE workout_plans SET is_active = false 
  WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';

  -- Insertar plan activo
  INSERT INTO workout_plans (
    user_id, plan_name, description, plan_data, is_active, created_at, updated_at
  ) VALUES (
    'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg',
    'Plan de Fuerza Avanzado',
    'Programa de 12 semanas enfocado en aumento de fuerza y masa muscular',
    jsonb_build_object(
      'duration_weeks', 12,
      'days_per_week', 5,
      'focus', 'Fuerza e Hipertrofia',
      'difficulty', 'Avanzado'
    ),
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_plan_id;

  -- Insertar entrenamientos completados con el plan_id
  INSERT INTO workout_completions (user_id, workout_plan_id, day_name, completed_at, duration_minutes, notes)
  VALUES 
    ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', v_plan_id, 'Día 1 - Pecho y Tríceps', CURRENT_TIMESTAMP - INTERVAL '1 day', 55, 'Excelente sesión'),
    ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', v_plan_id, 'Día 2 - Espalda y Bíceps', CURRENT_TIMESTAMP - INTERVAL '2 days', 48, 'Buena intensidad'),
    ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', v_plan_id, 'Día 3 - Piernas', CURRENT_TIMESTAMP - INTERVAL '3 days', 62, 'Sesión regular'),
    ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', v_plan_id, 'Día 4 - Hombros y Abdomen', CURRENT_TIMESTAMP - INTERVAL '4 days', 51, 'Excelente sesión'),
    ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', v_plan_id, 'Día 5 - Full Body', CURRENT_TIMESTAMP - INTERVAL '5 days', 58, 'Buena intensidad'),
    ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', v_plan_id, 'Día 1 - Pecho y Tríceps', CURRENT_TIMESTAMP - INTERVAL '6 days', 47, 'Sesión regular'),
    ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', v_plan_id, 'Día 2 - Espalda y Bíceps', CURRENT_TIMESTAMP - INTERVAL '7 days', 63, 'Excelente sesión'),
    ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', v_plan_id, 'Día 3 - Piernas', CURRENT_TIMESTAMP - INTERVAL '8 days', 52, 'Buena intensidad'),
    ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', v_plan_id, 'Día 4 - Hombros y Abdomen', CURRENT_TIMESTAMP - INTERVAL '9 days', 49, 'Sesión regular'),
    ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', v_plan_id, 'Día 5 - Full Body', CURRENT_TIMESTAMP - INTERVAL '10 days', 60, 'Excelente sesión'),
    ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', v_plan_id, 'Día 1 - Pecho y Tríceps', CURRENT_TIMESTAMP - INTERVAL '11 days', 54, 'Buena intensidad'),
    ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', v_plan_id, 'Día 2 - Espalda y Bíceps', CURRENT_TIMESTAMP - INTERVAL '12 days', 56, 'Sesión regular'),
    ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', v_plan_id, 'Día 3 - Piernas', CURRENT_TIMESTAMP - INTERVAL '13 days', 50, 'Excelente sesión'),
    ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', v_plan_id, 'Día 4 - Hombros y Abdomen', CURRENT_TIMESTAMP - INTERVAL '14 days', 59, 'Buena intensidad'),
    ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', v_plan_id, 'Día 5 - Full Body', CURRENT_TIMESTAMP - INTERVAL '15 days', 53, 'Sesión regular');

END $$;

-- Insertar métricas corporales
INSERT INTO body_metrics (user_id, date, weight_kg, body_fat_percentage, muscle_percentage, created_at)
VALUES 
  ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', CURRENT_DATE, 82.5, 15.8, 42.3, NOW())
ON CONFLICT (user_id, date) 
DO UPDATE SET
  weight_kg = 82.5,
  body_fat_percentage = 15.8,
  muscle_percentage = 42.3;

-- Insertar nutrición (últimos 7 días)
INSERT INTO nutrition_targets (user_id, date, calories, protein_g, carbs_g, fats_g, created_at)
VALUES 
  ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', CURRENT_DATE, 2650, 195, 305, 78, NOW()),
  ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', CURRENT_DATE - 1, 2580, 188, 290, 75, NOW()),
  ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', CURRENT_DATE - 2, 2720, 203, 318, 82, NOW()),
  ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', CURRENT_DATE - 3, 2610, 192, 298, 77, NOW()),
  ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', CURRENT_DATE - 4, 2680, 198, 310, 80, NOW()),
  ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', CURRENT_DATE - 5, 2590, 186, 295, 74, NOW()),
  ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', CURRENT_DATE - 6, 2700, 201, 315, 81, NOW())
ON CONFLICT (user_id, date) 
DO UPDATE SET
  calories = EXCLUDED.calories,
  protein_g = EXCLUDED.protein_g,
  carbs_g = EXCLUDED.carbs_g,
  fats_g = EXCLUDED.fats_g;

-- Insertar pasos (últimos 7 días)
INSERT INTO health_data_daily (user_id, date, steps, created_at)
VALUES 
  ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', CURRENT_DATE, 10250, NOW()),
  ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', CURRENT_DATE - 1, 9840, NOW()),
  ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', CURRENT_DATE - 2, 11320, NOW()),
  ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', CURRENT_DATE - 3, 10100, NOW()),
  ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', CURRENT_DATE - 4, 10680, NOW()),
  ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', CURRENT_DATE - 5, 9920, NOW()),
  ('user_36jCuBUX4OQ8pxqrVkoJQR4fZrg', CURRENT_DATE - 6, 11150, NOW())
ON CONFLICT (user_id, date) 
DO UPDATE SET
  steps = EXCLUDED.steps;

-- Verificar que se insertaron correctamente
SELECT 
  'VERIFICACION' as tipo,
  (SELECT COUNT(*) FROM workout_completions WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg') as entrenamientos,
  (SELECT COUNT(*) FROM workout_plans WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg' AND is_active = true) as plan_activo,
  (SELECT COUNT(*) FROM body_metrics WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg') as metricas,
  (SELECT COUNT(*) FROM nutrition_targets WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg') as nutricion,
  (SELECT COUNT(*) FROM health_data_daily WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg') as pasos;

-- Probar la función directamente
SELECT get_student_stats(
  'user_34Ap3niPCKLyVxhIN7f1gQVdKBo',  -- Tu user_id (admin)
  'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg',  -- Lucas
  (CURRENT_DATE - INTERVAL '30 days')::DATE,
  CURRENT_DATE
) as resultado;
