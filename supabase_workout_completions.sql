-- ============================================================================
-- WORKOUT COMPLETIONS TABLE
-- ============================================================================
-- Tabla para registrar entrenamientos completados

CREATE TABLE IF NOT EXISTS public.workout_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  workout_plan_id UUID REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  day_name TEXT NOT NULL, -- 'day_1', 'day_2', etc.
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT, -- Notas opcionales del usuario
  exercises_completed JSONB, -- Array de ejercicios completados con sets/reps reales
  duration_minutes INT, -- Duración del entrenamiento en minutos
  difficulty_rating INT CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5), -- 1=Muy fácil, 5=Muy difícil
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_workout_completions_user_id ON public.workout_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_completions_plan_id ON public.workout_completions(workout_plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_completions_completed_at ON public.workout_completions(completed_at);

-- Row Level Security (RLS)
ALTER TABLE public.workout_completions ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS workout_completions_select_policy ON public.workout_completions;
DROP POLICY IF EXISTS workout_completions_insert_policy ON public.workout_completions;
DROP POLICY IF EXISTS workout_completions_update_policy ON public.workout_completions;
DROP POLICY IF EXISTS workout_completions_delete_policy ON public.workout_completions;

-- Policy: Los usuarios pueden ver todos los entrenamientos completados
-- (se filtra por user_id en el cliente)
CREATE POLICY workout_completions_select_policy ON public.workout_completions
  FOR SELECT
  USING (true);

-- Policy: Los usuarios pueden insertar entrenamientos completados
-- (se valida user_id en el cliente)
CREATE POLICY workout_completions_insert_policy ON public.workout_completions
  FOR INSERT
  WITH CHECK (true);

-- Policy: Los usuarios pueden actualizar todos los entrenamientos
CREATE POLICY workout_completions_update_policy ON public.workout_completions
  FOR UPDATE
  USING (true);

-- Policy: Los usuarios pueden eliminar todos los entrenamientos
CREATE POLICY workout_completions_delete_policy ON public.workout_completions
  FOR DELETE
  USING (true);

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON TABLE public.workout_completions IS 'Registros de entrenamientos completados por los usuarios';
COMMENT ON COLUMN public.workout_completions.exercises_completed IS 'JSON con ejercicios y sets/reps realmente completados';
COMMENT ON COLUMN public.workout_completions.difficulty_rating IS 'Calificación de dificultad del entrenamiento (1-5)';

