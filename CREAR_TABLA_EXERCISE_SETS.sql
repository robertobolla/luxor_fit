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
  workout_session_id UUID, -- Opcional por ahora, sin FK constraint
  exercise_id TEXT NOT NULL, -- Por ahora usamos nombre del ejercicio (UUID cuando tengamos IDs reales)
  exercise_name TEXT, -- Nombre del ejercicio para referencia
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

-- NOTA: La app usa Clerk authentication, no Supabase Auth
-- Por lo tanto, usamos políticas abiertas (true) y la validación
-- real se hace en el frontend verificando el user_id de Clerk

-- Política: Los usuarios pueden ver series
CREATE POLICY "Users can view exercise sets"
  ON public.exercise_sets FOR SELECT
  USING (true);

-- Política: Los usuarios pueden insertar series
CREATE POLICY "Users can insert exercise sets"
  ON public.exercise_sets FOR INSERT
  WITH CHECK (true);

-- Política: Los usuarios pueden actualizar series
CREATE POLICY "Users can update exercise sets"
  ON public.exercise_sets FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Política: Los usuarios pueden eliminar series
CREATE POLICY "Users can delete exercise sets"
  ON public.exercise_sets FOR DELETE
  USING (true);

-- ============================================================================
-- FUNCIÓN PARA OBTENER EL ÚLTIMO ENTRENAMIENTO DEL MISMO MÚSCULO
-- ============================================================================
-- Esta función devuelve todas las series del último entrenamiento
-- que trabajó el mismo ejercicio

CREATE OR REPLACE FUNCTION get_last_muscle_workout_sets(
  p_user_id TEXT,
  p_exercise_id TEXT,
  p_current_session_id UUID DEFAULT NULL
)
RETURNS TABLE (
  set_number INTEGER,
  reps INTEGER,
  weight_kg DECIMAL(6,2),
  duration_seconds INTEGER
) AS $$
DECLARE
  last_workout_date TIMESTAMPTZ;
BEGIN
  -- Obtener la fecha del último entrenamiento de este ejercicio
  SELECT MAX(created_at) INTO last_workout_date
  FROM exercise_sets
  WHERE user_id = p_user_id
    AND exercise_id = p_exercise_id
    AND (p_current_session_id IS NULL OR workout_session_id != p_current_session_id);
  
  -- Si no hay entrenamientos previos, retornar vacío
  IF last_workout_date IS NULL THEN
    RETURN;
  END IF;
  
  -- Retornar todas las series del último entrenamiento
  RETURN QUERY
  SELECT 
    es.set_number,
    es.reps,
    es.weight_kg,
    es.duration_seconds
  FROM exercise_sets es
  WHERE 
    es.user_id = p_user_id
    AND es.exercise_id = p_exercise_id
    AND es.created_at >= last_workout_date
    AND es.created_at < last_workout_date + INTERVAL '5 minutes' -- Series del mismo entrenamiento
  ORDER BY es.set_number ASC
  LIMIT 20; -- Máximo 20 series
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
-- 
-- NOTAS:
-- - workout_session_id es opcional por ahora (sin FK constraint)
-- - exercise_id usa el nombre del ejercicio como string por ahora
-- - En el futuro se puede migrar a UUIDs reales cuando tengamos IDs
-- ============================================================================

