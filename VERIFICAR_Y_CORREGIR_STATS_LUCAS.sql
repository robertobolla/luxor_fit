-- ============================================================================
-- VERIFICAR Y CORREGIR - Estadísticas de Lucas
-- ============================================================================

-- Paso 1: Verificar si Lucas existe y obtener su user_id
SELECT 
  user_id,
  name,
  email,
  '✅ Usuario encontrado' as status
FROM user_profiles
WHERE LOWER(email) LIKE '%lucas%' OR LOWER(name) LIKE '%lucas%'
ORDER BY created_at DESC
LIMIT 1;

-- Paso 2: Verificar datos insertados para Lucas
-- (Reemplaza 'USER_ID_DE_LUCAS' con el user_id del paso 1)
DO $$
DECLARE
  v_lucas_id TEXT;
  v_plan_count INT;
  v_workout_count INT;
  v_metrics_count INT;
  v_nutrition_count INT;
  v_steps_count INT;
BEGIN
  -- Buscar user_id de Lucas
  SELECT user_id INTO v_lucas_id
  FROM user_profiles
  WHERE LOWER(email) LIKE '%lucas%' OR LOWER(name) LIKE '%lucas%'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_lucas_id IS NULL THEN
    RAISE NOTICE '❌ No se encontró usuario Lucas';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Usuario Lucas: %', v_lucas_id;
  RAISE NOTICE '';

  -- Verificar plan de entrenamiento
  SELECT COUNT(*) INTO v_plan_count
  FROM workout_plans
  WHERE user_id = v_lucas_id AND is_active = true;
  
  RAISE NOTICE '📋 Planes activos: %', v_plan_count;

  -- Verificar entrenamientos
  SELECT COUNT(*) INTO v_workout_count
  FROM workout_completions
  WHERE user_id = v_lucas_id;
  
  RAISE NOTICE '🏋️ Entrenamientos completados: %', v_workout_count;

  -- Verificar métricas corporales
  SELECT COUNT(*) INTO v_metrics_count
  FROM body_metrics
  WHERE user_id = v_lucas_id;
  
  RAISE NOTICE '📏 Métricas corporales: %', v_metrics_count;

  -- Verificar nutrición
  SELECT COUNT(*) INTO v_nutrition_count
  FROM nutrition_targets
  WHERE user_id = v_lucas_id;
  
  RAISE NOTICE '🍎 Registros de nutrición: %', v_nutrition_count;

  -- Verificar pasos
  SELECT COUNT(*) INTO v_steps_count
  FROM health_data_daily
  WHERE user_id = v_lucas_id;
  
  RAISE NOTICE '👟 Registros de pasos: %', v_steps_count;
  RAISE NOTICE '';

  -- Si no hay datos, mostrar advertencia
  IF v_plan_count = 0 AND v_workout_count = 0 AND v_metrics_count = 0 THEN
    RAISE NOTICE '⚠️ No hay datos. Ejecuta DATOS_PRUEBA_LUCAS.sql primero';
  END IF;
END $$;

-- Paso 3: ACTUALIZAR la función get_student_stats para permitir empresarios
CREATE OR REPLACE FUNCTION get_student_stats(
  p_trainer_id TEXT,
  p_student_id TEXT,
  p_start_date DATE DEFAULT '2020-01-01',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
  v_has_permission BOOLEAN;
  v_is_admin_or_empresario BOOLEAN;
  v_workout_count INTEGER;
  v_active_plan JSON;
  v_recent_workouts JSON;
  v_body_metrics JSON;
  v_nutrition_stats JSON;
  v_steps_stats JSON;
BEGIN
  -- Verificar si es admin o empresario del alumno
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = p_trainer_id 
      AND role_type IN ('admin', 'empresario')
      AND is_active = true
  ) INTO v_is_admin_or_empresario;

  -- Si es admin/empresario, verificar que el alumno sea miembro de su gimnasio
  IF v_is_admin_or_empresario THEN
    SELECT EXISTS (
      SELECT 1 FROM public.gym_members
      WHERE empresario_id = p_trainer_id 
        AND user_id = p_student_id
        AND is_active = true
    ) OR p_trainer_id = 'admin' INTO v_has_permission;
  ELSE
    -- Si no es admin/empresario, verificar relación de entrenador
    SELECT EXISTS (
      SELECT 1 FROM public.trainer_student_relationships
      WHERE trainer_id = p_trainer_id 
        AND student_id = p_student_id 
        AND status = 'accepted'
    ) INTO v_has_permission;
  END IF;

  IF NOT v_has_permission THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No tienes permiso para ver estos datos'
    );
  END IF;

  -- Obtener estadísticas de entrenamientos (con rango de fechas)
  SELECT COUNT(*) INTO v_workout_count
  FROM public.workout_completions
  WHERE user_id = p_student_id
    AND completed_at::DATE >= p_start_date
    AND completed_at::DATE <= p_end_date;

  -- Obtener plan activo
  SELECT json_build_object(
    'id', id,
    'plan_name', plan_name,
    'description', description,
    'plan_data', plan_data,
    'created_at', created_at
  ) INTO v_active_plan
  FROM public.workout_plans
  WHERE user_id = p_student_id AND is_active = true
  LIMIT 1;

  -- Obtener entrenamientos recientes (con rango de fechas)
  SELECT json_agg(
    json_build_object(
      'id', id,
      'completed_at', completed_at,
      'duration_minutes', duration_minutes,
      'notes', notes
    ) ORDER BY completed_at DESC
  ) INTO v_recent_workouts
  FROM (
    SELECT * FROM public.workout_completions
    WHERE user_id = p_student_id
      AND completed_at::DATE >= p_start_date
      AND completed_at::DATE <= p_end_date
    ORDER BY completed_at DESC
    LIMIT 10
  ) recent;

  -- Obtener métricas corporales recientes
  SELECT json_build_object(
    'current_weight', weight_kg,
    'body_fat_percentage', body_fat_percentage,
    'muscle_percentage', muscle_percentage,
    'recorded_at', date
  ) INTO v_body_metrics
  FROM public.body_metrics
  WHERE user_id = p_student_id
  ORDER BY date DESC
  LIMIT 1;

  -- Obtener estadísticas de nutrición (últimos 7 días)
  SELECT json_build_object(
    'avg_calories', COALESCE(AVG(calories), 0),
    'avg_protein', COALESCE(AVG(protein_g), 0),
    'avg_carbs', COALESCE(AVG(carbs_g), 0),
    'avg_fats', COALESCE(AVG(fats_g), 0)
  ) INTO v_nutrition_stats
  FROM public.nutrition_targets
  WHERE user_id = p_student_id
    AND date >= CURRENT_DATE - INTERVAL '7 days';

  -- Obtener estadísticas de pasos (últimos 7 días)
  SELECT json_build_object(
    'avg_steps', COALESCE(AVG(steps), 0),
    'total_steps', COALESCE(SUM(steps), 0)
  ) INTO v_steps_stats
  FROM public.health_data_daily
  WHERE user_id = p_student_id
    AND date >= CURRENT_DATE - INTERVAL '7 days';

  RETURN json_build_object(
    'workout_count', v_workout_count,
    'active_plan', v_active_plan,
    'recent_workouts', COALESCE(v_recent_workouts, '[]'::JSON),
    'body_metrics', v_body_metrics,
    'nutrition_stats', v_nutrition_stats,
    'steps_stats', v_steps_stats
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Paso 4: Probar la función directamente
-- (Reemplaza los IDs con los valores reales)
/*
SELECT get_student_stats(
  'TU_EMPRESARIO_ID',  -- user_id del empresario (Roberto)
  'USER_ID_DE_LUCAS',  -- user_id de Lucas
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE
);
*/

-- ============================================================================
-- RESUMEN DE VERIFICACIÓN
-- ============================================================================
SELECT 
  '🎯 Ejecuta este script completo' as instruccion,
  '1. Verifica los datos de Lucas' as paso_1,
  '2. Actualiza la función get_student_stats' as paso_2,
  '3. Recarga la página del dashboard' as paso_3;

