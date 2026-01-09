-- ============================================================================
-- DEBUG Y CORRECCIÓN FINAL - Lucas
-- ============================================================================

-- Paso 1: Ver qué datos tiene Lucas actualmente
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
  RAISE NOTICE '🔍 DIAGNÓSTICO DE LUCAS';
  RAISE NOTICE '   User ID: %', v_lucas_id;
  RAISE NOTICE '';

  -- Plan activo
  RAISE NOTICE '📋 PLAN ACTIVO:';
  DECLARE
    r RECORD;
  BEGIN
    FOR r IN 
      SELECT plan_name, description, is_active, created_at::date
      FROM workout_plans 
      WHERE user_id = v_lucas_id 
      ORDER BY created_at DESC 
      LIMIT 1
    LOOP
      RAISE NOTICE '   Nombre: %', r.plan_name;
      RAISE NOTICE '   Activo: %', r.is_active;
      RAISE NOTICE '   Creado: %', r.created_at;
    END LOOP;
  END;

  -- Entrenamientos
  RAISE NOTICE '';
  RAISE NOTICE '🏋️ ENTRENAMIENTOS:';
  RAISE NOTICE '   Total: %', (SELECT COUNT(*) FROM workout_completions WHERE user_id = v_lucas_id);
  RAISE NOTICE '   Último mes: %', (SELECT COUNT(*) FROM workout_completions WHERE user_id = v_lucas_id AND completed_at >= CURRENT_DATE - INTERVAL '30 days');
  RAISE NOTICE '   Fecha más reciente: %', (SELECT MAX(completed_at)::date FROM workout_completions WHERE user_id = v_lucas_id);
  RAISE NOTICE '   Fecha más antigua: %', (SELECT MIN(completed_at)::date FROM workout_completions WHERE user_id = v_lucas_id);

  -- Métricas
  RAISE NOTICE '';
  RAISE NOTICE '📏 MÉTRICAS CORPORALES:';
  RAISE NOTICE '   Total registros: %', (SELECT COUNT(*) FROM body_metrics WHERE user_id = v_lucas_id);
  RAISE NOTICE '   Fecha más reciente: %', (SELECT MAX(date) FROM body_metrics WHERE user_id = v_lucas_id);
  DECLARE
    r RECORD;
  BEGIN
    FOR r IN 
      SELECT weight_kg, body_fat_percentage, muscle_percentage, date
      FROM body_metrics 
      WHERE user_id = v_lucas_id 
      ORDER BY date DESC 
      LIMIT 1
    LOOP
      RAISE NOTICE '   Peso: % kg', r.weight_kg;
      RAISE NOTICE '   Grasa: %%', r.body_fat_percentage;
      RAISE NOTICE '   Músculo: %%', r.muscle_percentage;
      RAISE NOTICE '   Fecha: %', r.date;
    END LOOP;
  END;

  -- Nutrición
  RAISE NOTICE '';
  RAISE NOTICE '🍎 NUTRICIÓN:';
  RAISE NOTICE '   Total registros: %', (SELECT COUNT(*) FROM nutrition_targets WHERE user_id = v_lucas_id);
  RAISE NOTICE '   Últimos 7 días: %', (SELECT COUNT(*) FROM nutrition_targets WHERE user_id = v_lucas_id AND date >= CURRENT_DATE - INTERVAL '7 days');
  RAISE NOTICE '   Fecha más reciente: %', (SELECT MAX(date) FROM nutrition_targets WHERE user_id = v_lucas_id);

  -- Pasos
  RAISE NOTICE '';
  RAISE NOTICE '👟 PASOS:';
  RAISE NOTICE '   Total registros: %', (SELECT COUNT(*) FROM health_data_daily WHERE user_id = v_lucas_id);
  RAISE NOTICE '   Últimos 7 días: %', (SELECT COUNT(*) FROM health_data_daily WHERE user_id = v_lucas_id AND date >= CURRENT_DATE - INTERVAL '7 days');
  RAISE NOTICE '   Fecha más reciente: %', (SELECT MAX(date) FROM health_data_daily WHERE user_id = v_lucas_id);

  RAISE NOTICE '';
END $$;

-- Paso 2: Actualizar fechas para que sean recientes
DO $$
DECLARE
  v_lucas_id TEXT;
BEGIN
  SELECT user_id INTO v_lucas_id
  FROM user_profiles
  WHERE email = 'lucas@gmail.com' OR LOWER(name) = 'lucas'
  LIMIT 1;

  IF v_lucas_id IS NULL THEN
    RAISE NOTICE '❌ Lucas no existe';
    RETURN;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🔄 ACTUALIZANDO FECHAS A HOY...';
  RAISE NOTICE '';

  -- Actualizar entrenamientos para que estén en el último mes
  DELETE FROM workout_completions WHERE user_id = v_lucas_id;
  
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

  RAISE NOTICE '✅ 15 entrenamientos actualizados (últimos 15 días)';

  -- Actualizar nutrición para los últimos 7 días
  DELETE FROM nutrition_targets WHERE user_id = v_lucas_id;
  
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

  RAISE NOTICE '✅ Nutrición actualizada (últimos 7 días)';

  -- Actualizar pasos para los últimos 7 días
  DELETE FROM health_data_daily WHERE user_id = v_lucas_id;
  
  INSERT INTO health_data_daily (user_id, date, steps, created_at, updated_at)
  SELECT 
    v_lucas_id,
    CURRENT_DATE - gs,
    8000 + (random() * 4000)::int,
    NOW(),
    NOW()
  FROM generate_series(0, 6) gs;

  RAISE NOTICE '✅ Pasos actualizados (últimos 7 días)';

  -- Actualizar métrica corporal a HOY
  DELETE FROM body_metrics WHERE user_id = v_lucas_id AND date = CURRENT_DATE;
  
  INSERT INTO body_metrics (
    user_id, date, weight_kg, body_fat_percentage, muscle_percentage, created_at, updated_at
  ) VALUES (
    v_lucas_id, CURRENT_DATE, 82.5, 15.8, 42.3, NOW(), NOW()
  );

  RAISE NOTICE '✅ Métrica corporal de HOY actualizada';

  RAISE NOTICE '';
  RAISE NOTICE '🎉 ¡Fechas actualizadas correctamente!';
  RAISE NOTICE '';
END $$;

-- Paso 3: Probar la función RPC directamente
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
    RAISE NOTICE '❌ Faltan IDs';
    RETURN;
  END IF;

  RAISE NOTICE '🧪 PROBANDO FUNCIÓN RPC get_student_stats';
  RAISE NOTICE '   Empresario: %', v_empresario_id;
  RAISE NOTICE '   Lucas: %', v_lucas_id;
  RAISE NOTICE '';

  -- Llamar con rango de 30 días
  SELECT get_student_stats(
    v_empresario_id,
    v_lucas_id,
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE
  ) INTO v_result;

  RAISE NOTICE '📊 RESULTADO:';
  RAISE NOTICE '';
  RAISE NOTICE '   Entrenamientos: %', COALESCE((v_result->>'workout_count')::int, 0);
  RAISE NOTICE '   Plan activo: %', COALESCE(v_result->'active_plan'->>'plan_name', 'NULL');
  RAISE NOTICE '   Peso: % kg', COALESCE(v_result->'body_metrics'->>'current_weight', 'NULL');
  RAISE NOTICE '   Calorías promedio: %', COALESCE((v_result->'nutrition_stats'->>'avg_calories')::numeric::int, 0);
  RAISE NOTICE '   Pasos promedio: %', COALESCE((v_result->'steps_stats'->>'avg_steps')::numeric::int, 0);
  RAISE NOTICE '';

  IF v_result IS NULL OR v_result = 'null'::json THEN
    RAISE NOTICE '❌ La función NO devuelve datos';
  ELSIF (v_result->>'workout_count')::int > 0 THEN
    RAISE NOTICE '✅ ¡La función SÍ devuelve datos correctamente!';
  ELSE
    RAISE NOTICE '⚠️ La función devuelve datos pero entrenamientos = 0';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📋 JSON completo (para debug):';
  RAISE NOTICE '%', v_result;
  RAISE NOTICE '';
END $$;

-- Verificación final de datos
SELECT 
  '✅ RESUMEN FINAL' as titulo,
  up.user_id,
  up.email,
  up.name,
  (SELECT COUNT(*) FROM workout_plans WHERE user_id = up.user_id AND is_active = true) as planes_activos,
  (SELECT COUNT(*) FROM workout_completions WHERE user_id = up.user_id) as total_workouts,
  (SELECT COUNT(*) FROM workout_completions WHERE user_id = up.user_id AND completed_at >= CURRENT_DATE - INTERVAL '30 days') as workouts_ultimo_mes,
  (SELECT COUNT(*) FROM body_metrics WHERE user_id = up.user_id) as metricas,
  (SELECT COUNT(*) FROM nutrition_targets WHERE user_id = up.user_id AND date >= CURRENT_DATE - INTERVAL '7 days') as nutricion_7_dias,
  (SELECT COUNT(*) FROM health_data_daily WHERE user_id = up.user_id AND date >= CURRENT_DATE - INTERVAL '7 days') as pasos_7_dias
FROM user_profiles up
WHERE up.email = 'lucas@gmail.com' OR LOWER(up.name) = 'lucas'
LIMIT 1;

