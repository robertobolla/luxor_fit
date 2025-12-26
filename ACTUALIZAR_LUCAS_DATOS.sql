-- ============================================================================
-- ACTUALIZAR DATOS DE LUCAS - Versión Ultra Simplificada
-- ============================================================================

-- Paso 1: Limpiar e insertar datos
DO $$
DECLARE
  v_lucas_id TEXT;
BEGIN
  SELECT user_id INTO v_lucas_id
  FROM user_profiles
  WHERE email = 'lucas@gmail.com' OR LOWER(name) = 'lucas'
  LIMIT 1;

  IF v_lucas_id IS NULL THEN
    RAISE NOTICE 'ERROR: Lucas no existe. Ejecuta CREAR_Y_CONFIGURAR_LUCAS.sql primero';
    RETURN;
  END IF;

  RAISE NOTICE 'Actualizando datos de Lucas...';
  RAISE NOTICE 'User ID: %', v_lucas_id;

  -- Eliminar datos antiguos
  DELETE FROM workout_completions WHERE user_id = v_lucas_id;
  DELETE FROM nutrition_targets WHERE user_id = v_lucas_id;
  DELETE FROM health_data_daily WHERE user_id = v_lucas_id;
  DELETE FROM body_metrics WHERE user_id = v_lucas_id;

  -- Entrenamientos (últimos 15 días)
  INSERT INTO workout_completions (user_id, completed_at, duration_minutes, notes)
  SELECT 
    v_lucas_id,
    CURRENT_TIMESTAMP - (interval '1 day' * gs),
    45 + (random() * 30)::int,
    CASE 
      WHEN gs % 3 = 0 THEN 'Excelente sesión'
      WHEN gs % 3 = 1 THEN 'Buena intensidad'
      ELSE 'Sesión regular'
    END
  FROM generate_series(1, 15) gs;

  RAISE NOTICE 'OK: 15 entrenamientos insertados';

  -- Nutrición (últimos 7 días)
  INSERT INTO nutrition_targets (user_id, date, calories, protein_g, carbs_g, fats_g, created_at, updated_at)
  SELECT 
    v_lucas_id,
    CURRENT_DATE - gs,
    2500 + (random() * 300)::int,
    180 + (random() * 30)::int,
    280 + (random() * 40)::int,
    70 + (random() * 20)::int,
    NOW(),
    NOW()
  FROM generate_series(0, 6) gs;

  RAISE NOTICE 'OK: Nutricion insertada';

  -- Pasos (últimos 7 días)
  INSERT INTO health_data_daily (user_id, date, steps, created_at, updated_at)
  SELECT 
    v_lucas_id,
    CURRENT_DATE - gs,
    8000 + (random() * 4000)::int,
    NOW(),
    NOW()
  FROM generate_series(0, 6) gs;

  RAISE NOTICE 'OK: Pasos insertados';

  -- Métricas corporales (HOY)
  INSERT INTO body_metrics (
    user_id, date, weight_kg, body_fat_percentage, muscle_percentage, created_at, updated_at
  ) VALUES (
    v_lucas_id, CURRENT_DATE, 82.5, 15.8, 42.3, NOW(), NOW()
  );

  -- Histórico de peso
  INSERT INTO body_metrics (user_id, date, weight_kg, created_at, updated_at)
  SELECT 
    v_lucas_id,
    CURRENT_DATE - (interval '1 week' * gs),
    85.0 - (gs * 0.2),
    NOW(),
    NOW()
  FROM generate_series(1, 12) gs;

  RAISE NOTICE 'OK: Metricas corporales insertadas';
  RAISE NOTICE 'EXITO: Datos actualizados correctamente';
END $$;

-- Paso 2: Probar la función
DO $$
DECLARE
  v_lucas_id TEXT;
  v_empresario_id TEXT;
  v_result JSON;
BEGIN
  SELECT user_id INTO v_lucas_id
  FROM user_profiles
  WHERE email = 'lucas@gmail.com' OR LOWER(name) = 'lucas'
  LIMIT 1;

  SELECT user_id INTO v_empresario_id
  FROM admin_roles
  WHERE role_type = 'empresario' AND is_active = true
  LIMIT 1;

  IF v_lucas_id IS NULL OR v_empresario_id IS NULL THEN
    RAISE NOTICE 'ERROR: Faltan IDs';
    RETURN;
  END IF;

  RAISE NOTICE 'Probando funcion RPC...';
  RAISE NOTICE 'Empresario: %', v_empresario_id;
  RAISE NOTICE 'Lucas: %', v_lucas_id;

  v_result := get_student_stats(
    v_empresario_id,
    v_lucas_id,
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE
  );

  RAISE NOTICE 'RESULTADO:';
  RAISE NOTICE 'Entrenamientos: %', COALESCE((v_result->>'workout_count')::int, 0);
  RAISE NOTICE 'Plan: %', COALESCE(v_result->'active_plan'->>'plan_name', 'NULL');
  RAISE NOTICE 'Peso: %', COALESCE(v_result->'body_metrics'->>'current_weight', 'NULL');
  RAISE NOTICE 'Calorias: %', COALESCE((v_result->'nutrition_stats'->>'avg_calories')::numeric::int, 0);
  RAISE NOTICE 'Pasos: %', COALESCE((v_result->'steps_stats'->>'avg_steps')::numeric::int, 0);

  IF (v_result->>'workout_count')::int > 0 THEN
    RAISE NOTICE 'EXITO: La funcion devuelve datos correctamente';
    RAISE NOTICE 'ACCION: Recarga el dashboard (F5) y haz clic en Ver Info de Lucas';
  ELSE
    RAISE NOTICE 'ERROR: La funcion NO devuelve datos';
  END IF;
END $$;

-- Verificación
SELECT 
  'RESUMEN FINAL' as status,
  up.email,
  up.name,
  (SELECT plan_name FROM workout_plans WHERE user_id = up.user_id AND is_active = true LIMIT 1) as plan,
  (SELECT COUNT(*) FROM workout_completions WHERE user_id = up.user_id AND completed_at >= CURRENT_DATE - INTERVAL '30 days') as workouts,
  (SELECT weight_kg FROM body_metrics WHERE user_id = up.user_id ORDER BY date DESC LIMIT 1) as peso,
  (SELECT COUNT(*) FROM nutrition_targets WHERE user_id = up.user_id AND date >= CURRENT_DATE - INTERVAL '7 days') as nutricion,
  (SELECT COUNT(*) FROM health_data_daily WHERE user_id = up.user_id AND date >= CURRENT_DATE - INTERVAL '7 days') as pasos
FROM user_profiles up
WHERE up.email = 'lucas@gmail.com' OR LOWER(up.name) = 'lucas'
LIMIT 1;


