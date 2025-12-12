-- ============================================================================
-- SISTEMA DE ENTRENADOR-ALUMNO
-- ============================================================================

-- Tabla de relaciones entrenador-alumno
CREATE TABLE IF NOT EXISTS public.trainer_student_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id TEXT NOT NULL, -- ID del entrenador
  student_id TEXT NOT NULL, -- ID del alumno
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMPTZ,
  UNIQUE(trainer_id, student_id),
  CHECK (trainer_id != student_id)
);

-- Índices para mejorar rendimiento (usar IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_trainer_relationships_trainer 
  ON public.trainer_student_relationships(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_relationships_student 
  ON public.trainer_student_relationships(student_id);
CREATE INDEX IF NOT EXISTS idx_trainer_relationships_status 
  ON public.trainer_student_relationships(status);

-- Tabla de permisos de entrenador (qué puede ver/editar el entrenador)
CREATE TABLE IF NOT EXISTS public.trainer_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.trainer_student_relationships(id) ON DELETE CASCADE,
  can_view_workouts BOOLEAN DEFAULT TRUE,
  can_edit_workouts BOOLEAN DEFAULT TRUE,
  can_view_nutrition BOOLEAN DEFAULT TRUE,
  can_view_steps BOOLEAN DEFAULT TRUE,
  can_view_body_metrics BOOLEAN DEFAULT TRUE,
  can_view_progress_photos BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Eliminar triggers existentes si existen
DROP TRIGGER IF EXISTS update_trainer_relationships_updated_at ON public.trainer_student_relationships;
DROP TRIGGER IF EXISTS update_trainer_permissions_updated_at ON public.trainer_permissions;

-- Crear triggers
CREATE TRIGGER update_trainer_relationships_updated_at 
  BEFORE UPDATE ON public.trainer_student_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainer_permissions_updated_at 
  BEFORE UPDATE ON public.trainer_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.trainer_student_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_permissions ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Trainers can view their relationships" ON public.trainer_student_relationships;
DROP POLICY IF EXISTS "Students can view their relationships" ON public.trainer_student_relationships;
DROP POLICY IF EXISTS "Trainers can create relationships" ON public.trainer_student_relationships;
DROP POLICY IF EXISTS "Students can update relationship status" ON public.trainer_student_relationships;
DROP POLICY IF EXISTS "Trainers can delete their relationships" ON public.trainer_student_relationships;
DROP POLICY IF EXISTS "Students can delete their relationships" ON public.trainer_student_relationships;
DROP POLICY IF EXISTS "View permissions for trainer or student" ON public.trainer_permissions;
DROP POLICY IF EXISTS "Students can update their permissions" ON public.trainer_permissions;
DROP POLICY IF EXISTS "Trainers can insert permissions" ON public.trainer_permissions;

-- Políticas para trainer_student_relationships
-- Los entrenadores pueden ver sus relaciones
CREATE POLICY "Trainers can view their relationships"
  ON public.trainer_student_relationships
  FOR SELECT
  USING (auth.uid()::TEXT = trainer_id);

-- Los alumnos pueden ver sus relaciones
CREATE POLICY "Students can view their relationships"
  ON public.trainer_student_relationships
  FOR SELECT
  USING (auth.uid()::TEXT = student_id);

-- Los entrenadores pueden crear relaciones (enviar invitaciones)
CREATE POLICY "Trainers can create relationships"
  ON public.trainer_student_relationships
  FOR INSERT
  WITH CHECK (auth.uid()::TEXT = trainer_id);

-- Los alumnos pueden actualizar el estado (aceptar/rechazar)
CREATE POLICY "Students can update relationship status"
  ON public.trainer_student_relationships
  FOR UPDATE
  USING (auth.uid()::TEXT = student_id)
  WITH CHECK (auth.uid()::TEXT = student_id);

-- Los entrenadores pueden eliminar relaciones
CREATE POLICY "Trainers can delete their relationships"
  ON public.trainer_student_relationships
  FOR DELETE
  USING (auth.uid()::TEXT = trainer_id);

-- Los alumnos pueden eliminar relaciones
CREATE POLICY "Students can delete their relationships"
  ON public.trainer_student_relationships
  FOR DELETE
  USING (auth.uid()::TEXT = student_id);

-- Políticas para trainer_permissions
-- Los entrenadores y alumnos pueden ver los permisos de sus relaciones
CREATE POLICY "View permissions for trainer or student"
  ON public.trainer_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_student_relationships
      WHERE id = relationship_id
      AND (trainer_id = auth.uid()::TEXT OR student_id = auth.uid()::TEXT)
    )
  );

-- Los alumnos pueden actualizar sus permisos
CREATE POLICY "Students can update their permissions"
  ON public.trainer_permissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trainer_student_relationships
      WHERE id = relationship_id
      AND student_id = auth.uid()::TEXT
    )
  );

-- Los entrenadores pueden insertar permisos por defecto al crear relación
CREATE POLICY "Trainers can insert permissions"
  ON public.trainer_permissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainer_student_relationships
      WHERE id = relationship_id
      AND trainer_id = auth.uid()::TEXT
    )
  );

-- ============================================================================
-- FUNCIONES RPC PARA EL SISTEMA DE ENTRENADOR
-- ============================================================================

-- Función para enviar invitación de entrenador
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
    -- Verificar que no exista una solicitud pendiente
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

-- Función para aceptar/rechazar invitación de entrenador
CREATE OR REPLACE FUNCTION respond_to_trainer_invitation(
  p_student_id TEXT,
  p_relationship_id UUID,
  p_accept BOOLEAN
)
RETURNS JSON AS $$
DECLARE
  v_trainer_id TEXT;
  v_friendship_exists BOOLEAN;
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

-- Función para obtener estadísticas de un alumno (solo para el entrenador)
CREATE OR REPLACE FUNCTION get_student_stats(
  p_trainer_id TEXT,
  p_student_id TEXT
)
RETURNS JSON AS $$
DECLARE
  v_has_permission BOOLEAN;
  v_workout_count INTEGER;
  v_active_plan JSON;
  v_recent_workouts JSON;
  v_body_metrics JSON;
  v_nutrition_stats JSON;
  v_steps_stats JSON;
BEGIN
  -- Verificar que el entrenador tenga una relación aceptada con el alumno
  SELECT EXISTS (
    SELECT 1 FROM public.trainer_student_relationships
    WHERE trainer_id = p_trainer_id 
      AND student_id = p_student_id 
      AND status = 'accepted'
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No tienes permiso para ver estos datos'
    );
  END IF;

  -- Obtener estadísticas de entrenamientos
  SELECT COUNT(*) INTO v_workout_count
  FROM public.workout_completions
  WHERE user_id = p_student_id;

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

  -- Obtener entrenamientos recientes
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
    ORDER BY completed_at DESC
    LIMIT 10
  ) recent;

  -- Obtener métricas corporales recientes
  SELECT json_build_object(
    'current_weight', weight,
    'body_fat_percentage', body_fat_percentage,
    'muscle_percentage', muscle_percentage,
    'recorded_at', recorded_at
  ) INTO v_body_metrics
  FROM public.body_metrics
  WHERE user_id = p_student_id
  ORDER BY recorded_at DESC
  LIMIT 1;

  -- Obtener estadísticas de nutrición (últimos 7 días)
  SELECT json_build_object(
    'avg_calories', COALESCE(AVG(calories), 0),
    'avg_protein', COALESCE(AVG(protein), 0),
    'avg_carbs', COALESCE(AVG(carbs), 0),
    'avg_fats', COALESCE(AVG(fats), 0)
  ) INTO v_nutrition_stats
  FROM public.daily_nutrition
  WHERE user_id = p_student_id
    AND date >= CURRENT_DATE - INTERVAL '7 days';

  -- Obtener estadísticas de pasos (últimos 7 días)
  SELECT json_build_object(
    'avg_steps', COALESCE(AVG(steps), 0),
    'total_steps', COALESCE(SUM(steps), 0)
  ) INTO v_steps_stats
  FROM public.daily_steps
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

-- ============================================================================
-- VISTAS PARA FACILITAR CONSULTAS
-- ============================================================================

-- Vista de relaciones con información de perfil
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

COMMENT ON TABLE public.trainer_student_relationships IS 'Relaciones entre entrenadores y alumnos';
COMMENT ON TABLE public.trainer_permissions IS 'Permisos específicos de cada relación entrenador-alumno';

