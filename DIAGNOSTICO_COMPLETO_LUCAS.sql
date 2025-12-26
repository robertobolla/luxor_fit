-- ============================================================================
-- DIAGNÓSTICO COMPLETO - Estadísticas de Lucas
-- ============================================================================

-- Paso 1: Obtener los IDs necesarios
WITH lucas_info AS (
  SELECT user_id, name, email
  FROM user_profiles
  WHERE LOWER(email) LIKE '%lucas%' OR LOWER(name) LIKE '%lucas%'
  ORDER BY created_at DESC
  LIMIT 1
),
empresario_info AS (
  SELECT user_id, name, email
  FROM admin_roles
  WHERE role_type = 'empresario' AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  '📋 IDs NECESARIOS' as seccion,
  (SELECT user_id FROM lucas_info) as lucas_user_id,
  (SELECT name FROM lucas_info) as lucas_name,
  (SELECT email FROM lucas_info) as lucas_email,
  (SELECT user_id FROM empresario_info) as empresario_user_id,
  (SELECT name FROM empresario_info) as empresario_name;

-- Paso 2: Verificar relación gym_members
SELECT 
  '🏢 RELACIÓN GIMNASIO' as seccion,
  gm.empresario_id,
  gm.user_id as lucas_id,
  gm.is_active,
  CASE 
    WHEN gm.user_id IS NOT NULL THEN '✅ Lucas está en el gimnasio'
    ELSE '❌ Lucas NO está en el gimnasio'
  END as status
FROM user_profiles up
LEFT JOIN gym_members gm ON gm.user_id = up.user_id
WHERE (LOWER(up.email) LIKE '%lucas%' OR LOWER(up.name) LIKE '%lucas%')
ORDER BY up.created_at DESC
LIMIT 1;

-- Paso 3: Verificar PLAN DE ENTRENAMIENTO ACTIVO
SELECT 
  '🏋️ PLAN ACTIVO' as seccion,
  wp.id,
  wp.plan_name,
  wp.description,
  wp.is_active,
  wp.plan_data,
  CASE 
    WHEN wp.id IS NOT NULL THEN '✅ Plan encontrado'
    ELSE '❌ NO hay plan activo'
  END as status
FROM user_profiles up
LEFT JOIN workout_plans wp ON wp.user_id = up.user_id AND wp.is_active = true
WHERE (LOWER(up.email) LIKE '%lucas%' OR LOWER(up.name) LIKE '%lucas%')
ORDER BY up.created_at DESC
LIMIT 1;

-- Paso 4: Verificar ENTRENAMIENTOS COMPLETADOS
SELECT 
  '💪 ENTRENAMIENTOS' as seccion,
  COUNT(*) as total_workouts,
  COUNT(*) FILTER (WHERE completed_at >= CURRENT_DATE - INTERVAL '7 days') as last_7_days,
  COUNT(*) FILTER (WHERE completed_at >= CURRENT_DATE - INTERVAL '30 days') as last_30_days,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Entrenamientos encontrados'
    ELSE '❌ NO hay entrenamientos'
  END as status
FROM user_profiles up
LEFT JOIN workout_completions wc ON wc.user_id = up.user_id
WHERE (LOWER(up.email) LIKE '%lucas%' OR LOWER(up.name) LIKE '%lucas%')
GROUP BY up.user_id;

-- Paso 5: Verificar MÉTRICAS CORPORALES
SELECT 
  '📏 MÉTRICAS CORPORALES' as seccion,
  bm.date,
  bm.weight_kg,
  bm.body_fat_percentage,
  bm.muscle_percentage,
  CASE 
    WHEN bm.weight_kg IS NOT NULL THEN '✅ Métricas encontradas'
    ELSE '❌ NO hay métricas'
  END as status
FROM user_profiles up
LEFT JOIN body_metrics bm ON bm.user_id = up.user_id
WHERE (LOWER(up.email) LIKE '%lucas%' OR LOWER(up.name) LIKE '%lucas%')
ORDER BY bm.date DESC
LIMIT 1;

-- Paso 6: Verificar NUTRICIÓN
SELECT 
  '🍎 NUTRICIÓN' as seccion,
  COUNT(*) as total_records,
  AVG(calories)::int as avg_calories,
  AVG(protein_g)::int as avg_protein,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Datos de nutrición encontrados'
    ELSE '❌ NO hay datos de nutrición'
  END as status
FROM user_profiles up
LEFT JOIN nutrition_targets nt ON nt.user_id = up.user_id
WHERE (LOWER(up.email) LIKE '%lucas%' OR LOWER(up.name) LIKE '%lucas%')
  AND nt.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY up.user_id;

-- Paso 7: Verificar PASOS
SELECT 
  '👟 PASOS' as seccion,
  COUNT(*) as total_records,
  AVG(steps)::int as avg_steps,
  SUM(steps)::int as total_steps,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Datos de pasos encontrados'
    ELSE '❌ NO hay datos de pasos'
  END as status
FROM user_profiles up
LEFT JOIN health_data_daily hdd ON hdd.user_id = up.user_id
WHERE (LOWER(up.email) LIKE '%lucas%' OR LOWER(up.name) LIKE '%lucas%')
  AND hdd.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY up.user_id;

-- Paso 8: PROBAR LA FUNCIÓN RPC DIRECTAMENTE
-- (Usa los IDs del Paso 1)
DO $$
DECLARE
  v_lucas_id TEXT;
  v_empresario_id TEXT;
  v_result JSON;
BEGIN
  -- Obtener IDs
  SELECT user_id INTO v_lucas_id
  FROM user_profiles
  WHERE LOWER(email) LIKE '%lucas%' OR LOWER(name) LIKE '%lucas%'
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT user_id INTO v_empresario_id
  FROM admin_roles
  WHERE role_type = 'empresario' AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_lucas_id IS NULL THEN
    RAISE NOTICE '❌ No se encontró usuario Lucas';
    RETURN;
  END IF;

  IF v_empresario_id IS NULL THEN
    RAISE NOTICE '❌ No se encontró empresario';
    RETURN;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🧪 PROBANDO FUNCIÓN RPC get_student_stats';
  RAISE NOTICE '   Empresario: %', v_empresario_id;
  RAISE NOTICE '   Lucas: %', v_lucas_id;
  RAISE NOTICE '';

  -- Llamar a la función
  SELECT get_student_stats(
    v_empresario_id,
    v_lucas_id,
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE
  ) INTO v_result;

  -- Mostrar resultado
  RAISE NOTICE 'RESULTADO COMPLETO:';
  RAISE NOTICE '%', v_result;
  RAISE NOTICE '';

  -- Analizar resultado
  IF (v_result->>'workout_count')::int > 0 THEN
    RAISE NOTICE '✅ workout_count: %', v_result->>'workout_count';
  ELSE
    RAISE NOTICE '❌ workout_count: 0 (no hay entrenamientos)';
  END IF;

  IF v_result->'active_plan' IS NOT NULL AND v_result->'active_plan' != 'null'::json THEN
    RAISE NOTICE '✅ active_plan: %', v_result->'active_plan'->>'plan_name';
  ELSE
    RAISE NOTICE '❌ active_plan: null (no hay plan activo)';
  END IF;

  IF v_result->'body_metrics' IS NOT NULL AND v_result->'body_metrics' != 'null'::json THEN
    RAISE NOTICE '✅ body_metrics: % kg', v_result->'body_metrics'->>'current_weight';
  ELSE
    RAISE NOTICE '❌ body_metrics: null (no hay métricas)';
  END IF;

  IF (v_result->'nutrition_stats'->>'avg_calories')::numeric > 0 THEN
    RAISE NOTICE '✅ nutrition_stats: % cal', v_result->'nutrition_stats'->>'avg_calories';
  ELSE
    RAISE NOTICE '❌ nutrition_stats: 0 (no hay datos de nutrición)';
  END IF;

  IF (v_result->'steps_stats'->>'avg_steps')::numeric > 0 THEN
    RAISE NOTICE '✅ steps_stats: % pasos', v_result->'steps_stats'->>'avg_steps';
  ELSE
    RAISE NOTICE '❌ steps_stats: 0 (no hay datos de pasos)';
  END IF;

END $$;

-- Paso 9: VERIFICAR SI LUCAS ESTÁ EN EL GIMNASIO DEL EMPRESARIO
SELECT 
  '🔐 VERIFICACIÓN DE PERMISOS' as seccion,
  ar.user_id as empresario_id,
  ar.role_type,
  gm.user_id as lucas_id,
  gm.is_active as lucas_activo_en_gym,
  CASE 
    WHEN gm.user_id IS NOT NULL AND gm.is_active = true 
    THEN '✅ Lucas SÍ tiene acceso (está en el gimnasio del empresario)'
    WHEN gm.user_id IS NOT NULL AND gm.is_active = false 
    THEN '⚠️ Lucas está en el gimnasio pero INACTIVO'
    ELSE '❌ Lucas NO está en el gimnasio del empresario'
  END as status
FROM admin_roles ar
CROSS JOIN user_profiles up
LEFT JOIN gym_members gm ON gm.empresario_id = ar.user_id AND gm.user_id = up.user_id
WHERE ar.role_type = 'empresario' 
  AND ar.is_active = true
  AND (LOWER(up.email) LIKE '%lucas%' OR LOWER(up.name) LIKE '%lucas%')
ORDER BY ar.created_at DESC, up.created_at DESC
LIMIT 1;


