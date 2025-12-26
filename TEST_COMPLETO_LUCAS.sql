-- ============================================================================
-- TEST COMPLETO - Ver exactamente qué está pasando
-- ============================================================================

-- 1. Verificar que Lucas existe y tiene datos
SELECT 
  'PASO 1: DATOS DE LUCAS' as test,
  up.user_id,
  up.email,
  up.name,
  (SELECT COUNT(*) FROM workout_plans WHERE user_id = up.user_id AND is_active = true) as plan_activo,
  (SELECT COUNT(*) FROM workout_completions WHERE user_id = up.user_id) as total_entrenamientos,
  (SELECT COUNT(*) FROM body_metrics WHERE user_id = up.user_id) as total_metricas,
  (SELECT COUNT(*) FROM nutrition_targets WHERE user_id = up.user_id) as total_nutricion,
  (SELECT COUNT(*) FROM health_data_daily WHERE user_id = up.user_id) as total_pasos
FROM user_profiles up
WHERE email = 'lucas@gmail.com' OR LOWER(name) = 'lucas'
LIMIT 1;

-- 2. Verificar que Lucas está en el gimnasio
SELECT 
  'PASO 2: RELACION GIMNASIO' as test,
  gm.user_id as lucas_id,
  gm.empresario_id,
  gm.is_active,
  ar.name as empresario_name,
  ar.role_type
FROM gym_members gm
JOIN admin_roles ar ON ar.user_id = gm.empresario_id
WHERE gm.user_id IN (SELECT user_id FROM user_profiles WHERE email = 'lucas@gmail.com' OR LOWER(name) = 'lucas')
LIMIT 1;

-- 3. Probar la función RPC DIRECTAMENTE con los IDs reales
DO $$
DECLARE
  v_lucas_id TEXT;
  v_empresario_id TEXT;
  v_result JSON;
  v_error TEXT;
BEGIN
  -- Obtener IDs
  SELECT user_id INTO v_lucas_id
  FROM user_profiles
  WHERE email = 'lucas@gmail.com' OR LOWER(name) = 'lucas'
  LIMIT 1;

  SELECT user_id INTO v_empresario_id
  FROM admin_roles
  WHERE role_type = 'empresario' AND is_active = true
  LIMIT 1;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'PASO 3: PROBAR FUNCION RPC';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Lucas ID: %', v_lucas_id;
  RAISE NOTICE 'Empresario ID: %', v_empresario_id;
  RAISE NOTICE '';

  IF v_lucas_id IS NULL THEN
    RAISE NOTICE 'ERROR: Lucas no existe';
    RETURN;
  END IF;

  IF v_empresario_id IS NULL THEN
    RAISE NOTICE 'ERROR: Empresario no existe';
    RETURN;
  END IF;

  -- Llamar a la función
  BEGIN
    v_result := get_student_stats(
      v_empresario_id,
      v_lucas_id,
      CURRENT_DATE - INTERVAL '30 days',
      CURRENT_DATE
    );
    
    RAISE NOTICE 'Resultado de get_student_stats:';
    RAISE NOTICE '%', v_result::text;
    RAISE NOTICE '';
    RAISE NOTICE 'Workout count: %', v_result->>'workout_count';
    RAISE NOTICE 'Active plan: %', v_result->'active_plan'->>'plan_name';
    RAISE NOTICE 'Weight: %', v_result->'body_metrics'->>'current_weight';
    RAISE NOTICE 'Avg calories: %', v_result->'nutrition_stats'->>'avg_calories';
    RAISE NOTICE 'Avg steps: %', v_result->'steps_stats'->>'avg_steps';
    
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
    RAISE NOTICE 'ERROR al llamar get_student_stats: %', v_error;
  END;
END $$;

-- 4. Verificar si la función existe y tiene la firma correcta
SELECT 
  'PASO 4: VERIFICAR FUNCION' as test,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
WHERE p.proname = 'get_student_stats'
LIMIT 1;

-- 5. Ver datos de entrenamientos con fechas exactas
SELECT 
  'PASO 5: FECHAS DE ENTRENAMIENTOS' as test,
  wc.completed_at::date as fecha,
  wc.duration_minutes,
  CURRENT_DATE - wc.completed_at::date as dias_atras
FROM workout_completions wc
WHERE wc.user_id IN (SELECT user_id FROM user_profiles WHERE email = 'lucas@gmail.com' OR LOWER(name) = 'lucas')
ORDER BY wc.completed_at DESC
LIMIT 5;


