-- ============================================================================
-- DEBUG Y CORRECCIÓN FINAL - Lucas (Versión Simplificada)
-- ============================================================================

-- Paso 1: Actualizar fechas para que sean recientes
DO $$
DECLARE
  v_lucas_id TEXT;
BEGIN
  SELECT user_id INTO v_lucas_id
  FROM user_profiles
  WHERE email = 'lucas@gmail.com' OR LOWER(name) = 'lucas'
  LIMIT 1;

  IF v_lucas_id IS NULL THEN
    RAISE NOTICE '❌ Lucas no existe. Ejecuta CREAR_Y_CONFIGURAR_LUCAS.sql primero';
    RETURN;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🔄 ACTUALIZANDO DATOS DE LUCAS...';
  RAISE NOTICE '   User ID: %', v_lucas_id;
  RAISE NOTICE '';

  -- Eliminar datos antiguos
  DELETE FROM workout_completions WHERE user_id = v_lucas_id;
  DELETE FROM nutrition_targets WHERE user_id = v_lucas_id;
  DELETE FROM health_data_daily WHERE user_id = v_lucas_id;
  DELETE FROM body_metrics WHERE user_id = v_lucas_id;

  -- Insertar entrenamientos de los últimos 15 días
  INSERT INTO workout_completions (user_id, completed_at, duration_minutes, notes)
  SELECT 
    v_lucas_id,
    CURRENT_TIMESTAMP - (interval '1 day' * gs),
    45 + (random() * 30)::int,
    CASE 
      WHEN gs % 3 = 0 THEN 'Excelente sesión, aumenté peso'
      WHEN gs % 3 = 1 THEN 'Buena intensidad'
      ELSE 'Sesión regular'
    END
  FROM generate_series(1, 15) gs;

  RAISE NOTICE '✅ 15 entrenamientos insertados (últimos 15 días)';

  -- Insertar nutrición de los últimos 7 días
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

  RAISE NOTICE '✅ Nutrición insertada (últimos 7 días)';

  -- Insertar pasos de los últimos 7 días
  INSERT INTO health_data_daily (user_id, date, steps, created_at, updated_at)
  SELECT 
    v_lucas_id,
    CURRENT_DATE - gs,
    8000 + (random() * 4000)::int,
    NOW(),
    NOW()
  FROM generate_series(0, 6) gs;

  RAISE NOTICE '✅ Pasos insertados (últimos 7 días)';

  -- Insertar métrica corporal de HOY
  INSERT INTO body_metrics (
    user_id, date, weight_kg, body_fat_percentage, muscle_percentage, created_at, updated_at
  ) VALUES (
    v_lucas_id, CURRENT_DATE, 82.5, 15.8, 42.3, NOW(), NOW()
  );

  -- Insertar histórico de peso (últimas 12 semanas)
  INSERT INTO body_metrics (user_id, date, weight_kg, created_at, updated_at)
  SELECT 
    v_lucas_id,
    CURRENT_DATE - (interval '1 week' * gs),
    85.0 - (gs * 0.2),
    NOW(),
    NOW()
  FROM generate_series(1, 12) gs;

  RAISE NOTICE '✅ Métricas corporales insertadas (HOY + histórico)';

  RAISE NOTICE '';
  RAISE NOTICE '🎉 ¡Datos actualizados correctamente!';
  RAISE NOTICE '';
END $$;

-- Paso 2: Probar la función RPC
DO $$
DECLARE
  v_lucas_id TEXT;
  v_empresario_id TEXT;
  v_result JSON;
  v_workout_count INT;
  v_plan_name TEXT;
  v_weight TEXT;
  v_calories INT;
  v_steps INT;
BEGIN
  SELECT user_id INTO v_lucas_id
  FROM user_profiles
  WHERE email = 'lucas@gmail.com' OR LOWER(name) = 'lucas'
  LIMIT 1;

  SELECT user_id INTO v_empresario_id
  FROM admin_roles
  WHERE role_type = 'empresario' AND is_active = true
  LIMIT 1;

  IF v_lucas_id IS NULL THEN
    RAISE NOTICE '❌ Lucas no existe';
    RETURN;
  END IF;

  IF v_empresario_id IS NULL THEN
    RAISE NOTICE '❌ Empresario no existe';
    RETURN;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🧪 PROBANDO FUNCIÓN RPC get_student_stats';
  RAISE NOTICE '   Empresario: %', v_empresario_id;
  RAISE NOTICE '   Lucas: %', v_lucas_id;
  RAISE NOTICE '';

  -- Llamar a la función con rango de 30 días
  v_result := get_student_stats(
    v_empresario_id,
    v_lucas_id,
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE
  );

  -- Extraer valores
  v_workout_count := COALESCE((v_result->>'workout_count')::int, 0);
  v_plan_name := COALESCE(v_result->'active_plan'->>'plan_name', 'NULL');
  v_weight := COALESCE(v_result->'body_metrics'->>'current_weight', 'NULL');
  v_calories := COALESCE((v_result->'nutrition_stats'->>'avg_calories')::numeric::int, 0);
  v_steps := COALESCE((v_result->'steps_stats'->>'avg_steps')::numeric::int, 0);

  RAISE NOTICE '📊 RESULTADO:';
  RAISE NOTICE '';
  RAISE NOTICE '   ✅ Entrenamientos completados: %', v_workout_count;
  RAISE NOTICE '   ✅ Plan activo: %', v_plan_name;
  RAISE NOTICE '   ✅ Peso actual: % kg', v_weight;
  RAISE NOTICE '   ✅ Calorías promedio: %', v_calories;
  RAISE NOTICE '   ✅ Pasos promedio: %', v_steps;
  RAISE NOTICE '';

  IF v_workout_count > 0 AND v_plan_name != 'NULL' THEN
    RAISE NOTICE '🎉 ¡LA FUNCIÓN DEVUELVE DATOS CORRECTAMENTE!';
    RAISE NOTICE '';
    RAISE NOTICE '🌐 Ahora RECARGA el dashboard (F5) y haz clic en "Ver Info" de Lucas';
  ELSE
    RAISE NOTICE '⚠️ La función NO devuelve todos los datos esperados';
    RAISE NOTICE '';
    RAISE NOTICE '📋 JSON completo:';
    RAISE NOTICE '%', v_result;
  END IF;

  RAISE NOTICE '';
END $$;

-- Paso 3: Verificación final
SELECT 
  '✅ RESUMEN FINAL' as status,
  up.user_id,
  up.email,
  up.name,
  (SELECT plan_name FROM workout_plans WHERE user_id = up.user_id AND is_active = true LIMIT 1) as plan_activo,
  (SELECT COUNT(*) FROM workout_completions WHERE user_id = up.user_id) as total_workouts,
  (SELECT COUNT(*) FROM workout_completions WHERE user_id = up.user_id AND completed_at >= CURRENT_DATE - INTERVAL '30 days') as workouts_ultimo_mes,
  (SELECT weight_kg FROM body_metrics WHERE user_id = up.user_id ORDER BY date DESC LIMIT 1) as peso_actual,
  (SELECT COUNT(*) FROM nutrition_targets WHERE user_id = up.user_id AND date >= CURRENT_DATE - INTERVAL '7 days') as nutricion_7_dias,
  (SELECT COUNT(*) FROM health_data_daily WHERE user_id = up.user_id AND date >= CURRENT_DATE - INTERVAL '7 days') as pasos_7_dias,
  (SELECT is_active FROM gym_members WHERE user_id = up.user_id LIMIT 1) as activo_en_gym
FROM user_profiles up
WHERE up.email = 'lucas@gmail.com' OR LOWER(up.name) = 'lucas'
LIMIT 1;


