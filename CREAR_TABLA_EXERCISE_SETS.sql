-- ============================================================================
-- CREAR TABLA exercise_sets PARA REGISTRO COMPLETO DE SERIES
-- ============================================================================
-- Esta tabla reemplaza el sistema de PRs individuales y permite registrar
-- TODAS las series de cada ejercicio en cada entrenamiento
-- ============================================================================

-- Crear tabla exercise_sets
CREATE TABLE IF NOT EXISTS public.exercise_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  workout_session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercise_videos(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL, -- 1, 2, 3, 4, etc.
  reps INTEGER, -- Repeticiones realizadas (null si usa tiempo)
  weight_kg DECIMAL(6,2), -- Peso usado en kg
  duration_seconds INTEGER, -- Duración en segundos (para ejercicios de tiempo)
  notes TEXT, -- Notas opcionales de la serie
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_set_number CHECK (set_number > 0),
  CONSTRAINT valid_reps CHECK (reps IS NULL OR reps >= 0),
  CONSTRAINT valid_weight CHECK (weight_kg IS NULL OR weight_kg >= 0),
  CONSTRAINT valid_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  CONSTRAINT reps_or_duration CHECK (reps IS NOT NULL OR duration_seconds IS NOT NULL)
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_exercise_sets_user_id ON public.exercise_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_session_id ON public.exercise_sets(workout_session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_exercise_id ON public.exercise_sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_user_exercise ON public.exercise_sets(user_id, exercise_id, created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver sus propias series
CREATE POLICY "Users can view their own exercise sets"
  ON public.exercise_sets FOR SELECT
  USING (auth.uid()::text = user_id OR user_id IN (
    SELECT user_id FROM user_profiles WHERE user_id = auth.uid()::text
  ));

-- Política: Los usuarios pueden insertar sus propias series
CREATE POLICY "Users can insert their own exercise sets"
  ON public.exercise_sets FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR user_id IN (
    SELECT user_id FROM user_profiles WHERE user_id = auth.uid()::text
  ));

-- Política: Los usuarios pueden actualizar sus propias series
CREATE POLICY "Users can update their own exercise sets"
  ON public.exercise_sets FOR UPDATE
  USING (auth.uid()::text = user_id OR user_id IN (
    SELECT user_id FROM user_profiles WHERE user_id = auth.uid()::text
  ))
  WITH CHECK (auth.uid()::text = user_id OR user_id IN (
    SELECT user_id FROM user_profiles WHERE user_id = auth.uid()::text
  ));

-- Política: Los usuarios pueden eliminar sus propias series
CREATE POLICY "Users can delete their own exercise sets"
  ON public.exercise_sets FOR DELETE
  USING (auth.uid()::text = user_id OR user_id IN (
    SELECT user_id FROM user_profiles WHERE user_id = auth.uid()::text
  ));

-- ============================================================================
-- FUNCIÓN PARA OBTENER EL ÚLTIMO ENTRENAMIENTO DEL MISMO MÚSCULO
-- ============================================================================
-- Esta función devuelve todas las series del último entrenamiento
-- que trabajó el mismo grupo muscular

CREATE OR REPLACE FUNCTION get_last_muscle_workout_sets(
  p_user_id TEXT,
  p_exercise_id UUID,
  p_current_session_id UUID DEFAULT NULL
)
RETURNS TABLE (
  set_number INTEGER,
  reps INTEGER,
  weight_kg DECIMAL(6,2),
  duration_seconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    es.set_number,
    es.reps,
    es.weight_kg,
    es.duration_seconds
  FROM exercise_sets es
  JOIN workout_sessions ws ON ws.id = es.workout_session_id
  WHERE 
    es.user_id = p_user_id
    AND es.exercise_id = p_exercise_id
    AND (p_current_session_id IS NULL OR es.workout_session_id != p_current_session_id)
    AND ws.completed_at IS NOT NULL -- Solo sesiones completadas
  ORDER BY ws.completed_at DESC, es.set_number ASC
  LIMIT 20; -- Máximo 20 series del último entrenamiento
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que la tabla se creó correctamente
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'exercise_sets'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'exercise_sets';

-- ============================================================================
-- INSTRUCCIONES:
-- ============================================================================
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. Verifica que no haya errores
-- 3. La tabla exercise_sets estará lista para usar
-- 4. El sistema antiguo de PRs (personal_records) puede quedar como backup
-- ============================================================================

