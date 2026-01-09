-- ============================================================================
-- FUNCIONES RPC PARA MODO ENTRENADOR
-- Ejecuta este script DESPUÉS del script simple
-- ============================================================================

-- Función 1: Enviar invitación de entrenador
CREATE OR REPLACE FUNCTION send_trainer_invitation(
  p_trainer_id TEXT,
  p_student_username TEXT
)
RETURNS JSON AS $$
DECLARE
  v_student_id TEXT;
  v_relationship_id UUID;
  v_permissions_id UUID;
  v_friendship_exists BOOLEAN;
BEGIN
  -- Buscar el user_id del alumno por username
  SELECT user_id INTO v_student_id
  FROM public.user_profiles
  WHERE username = p_student_username;

  IF v_student_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuario no encontrado'
    );
  END IF;

  -- Verificar que no sea el mismo usuario
  IF v_student_id = p_trainer_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No puedes enviarte una invitación a ti mismo'
    );
  END IF;

  -- Verificar si ya existe una relación
  IF EXISTS (
    SELECT 1 FROM public.trainer_student_relationships
    WHERE trainer_id = p_trainer_id AND student_id = v_student_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ya existe una invitación con este usuario'
    );
  END IF;

  -- Crear la relación
  INSERT INTO public.trainer_student_relationships (trainer_id, student_id, status)
  VALUES (p_trainer_id, v_student_id, 'pending')
  RETURNING id INTO v_relationship_id;

  -- Crear permisos por defecto
  INSERT INTO public.trainer_permissions (relationship_id)
  VALUES (v_relationship_id)
  RETURNING id INTO v_permissions_id;

  -- Verificar si ya son amigos
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (user_id = p_trainer_id AND friend_id = v_student_id AND status = 'accepted')
       OR (user_id = v_student_id AND friend_id = p_trainer_id AND status = 'accepted')
  ) INTO v_friendship_exists;

  -- Si no son amigos, crear solicitud de amistad automáticamente
  IF NOT v_friendship_exists THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.friendships
      WHERE (user_id = p_trainer_id AND friend_id = v_student_id)
         OR (user_id = v_student_id AND friend_id = p_trainer_id)
    ) THEN
      INSERT INTO public.friendships (user_id, friend_id, status)
      VALUES (p_trainer_id, v_student_id, 'pending')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'relationship_id', v_relationship_id,
    'student_id', v_student_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función 2: Responder a invitación de entrenador
CREATE OR REPLACE FUNCTION respond_to_trainer_invitation(
  p_student_id TEXT,
  p_relationship_id UUID,
  p_accept BOOLEAN
)
RETURNS JSON AS $$
DECLARE
  v_trainer_id TEXT;
BEGIN
  -- Obtener el trainer_id
  SELECT trainer_id INTO v_trainer_id
  FROM public.trainer_student_relationships
  WHERE id = p_relationship_id AND student_id = p_student_id AND status = 'pending';

  IF v_trainer_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invitación no encontrada'
    );
  END IF;

  IF p_accept THEN
    -- Aceptar la invitación
    UPDATE public.trainer_student_relationships
    SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
    WHERE id = p_relationship_id;

    -- Aceptar automáticamente la solicitud de amistad si existe
    UPDATE public.friendships
    SET status = 'accepted', updated_at = NOW()
    WHERE (user_id = v_trainer_id AND friend_id = p_student_id)
       OR (user_id = p_student_id AND friend_id = v_trainer_id);

    RETURN json_build_object(
      'success', true,
      'message', 'Invitación aceptada'
    );
  ELSE
    -- Rechazar la invitación
    UPDATE public.trainer_student_relationships
    SET status = 'rejected', updated_at = NOW()
    WHERE id = p_relationship_id;

    RETURN json_build_object(
      'success', true,
      'message', 'Invitación rechazada'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función 3: Obtener estadísticas de un alumno
CREATE OR REPLACE FUNCTION get_student_stats(
  p_trainer_id TEXT,
  p_student_id TEXT,
  p_start_date DATE DEFAULT '2020-01-01',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
  v_has_permission BOOLEAN := false;
  v_is_admin BOOLEAN := false;
  v_is_empresario BOOLEAN := false;
  v_workout_count INTEGER;
  v_active_plan JSON;
  v_recent_workouts JSON;
  v_body_metrics JSON;
  v_nutrition_stats JSON;
  v_steps_stats JSON;
BEGIN
  -- Verificar si es admin (los admins pueden ver TODO)
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = p_trainer_id 
      AND role_type = 'admin'
      AND is_active = true
  ) INTO v_is_admin;

  IF v_is_admin THEN
    -- Los admins tienen permiso automático para ver cualquier usuario
    v_has_permission := true;
  ELSE
    -- Verificar si es empresario del alumno
    SELECT EXISTS (
      SELECT 1 FROM public.admin_roles
      WHERE user_id = p_trainer_id 
        AND role_type = 'empresario'
        AND is_active = true
    ) INTO v_is_empresario;

    IF v_is_empresario THEN
      -- Verificar que el alumno sea miembro de su gimnasio
      SELECT EXISTS (
        SELECT 1 FROM public.gym_members
        WHERE empresario_id = p_trainer_id 
          AND user_id = p_student_id
          AND is_active = true
      ) INTO v_has_permission;
    ELSE
      -- Si no es admin ni empresario, verificar relación de entrenador
      SELECT EXISTS (
        SELECT 1 FROM public.trainer_student_relationships
        WHERE trainer_id = p_trainer_id 
          AND student_id = p_student_id 
          AND status = 'accepted'
      ) INTO v_has_permission;
    END IF;
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
    'success', true,
    'data', json_build_object(
      'workout_count', v_workout_count,
      'active_plan', v_active_plan,
      'recent_workouts', COALESCE(v_recent_workouts, '[]'::JSON),
      'body_metrics', v_body_metrics,
      'nutrition_stats', v_nutrition_stats,
      'steps_stats', v_steps_stats
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear vista
DROP VIEW IF EXISTS trainer_students_view;
CREATE OR REPLACE VIEW trainer_students_view AS
SELECT 
  tsr.id,
  tsr.trainer_id,
  tsr.student_id,
  tsr.status,
  tsr.created_at,
  tsr.accepted_at,
  up.name as student_name,
  up.username as student_username,
  up.profile_photo_url as student_photo
FROM public.trainer_student_relationships tsr
LEFT JOIN public.user_profiles up ON up.user_id = tsr.student_id
WHERE tsr.status = 'accepted';

-- Política RLS para la vista
ALTER VIEW trainer_students_view SET (security_invoker = true);

-- ============================================================================
-- ¡LISTO! Sistema completamente funcional
-- ============================================================================


