-- ============================================================================
-- AGREGAR COLUMNAS DE METADATA A exercise_videos
-- ============================================================================
-- Este script agrega las columnas necesarias para almacenar metadata completa
-- de los ejercicios (músculos, zonas, tipos, objetivos, etc.)
-- Ejecuta este script en Supabase SQL Editor
-- ============================================================================

-- Agregar columna muscles (músculos trabajados)
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS muscles TEXT[];

-- Agregar columna muscle_zones (zonas específicas del músculo)
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS muscle_zones TEXT[];

-- Agregar columna movement_type (tipo de movimiento: push, pull, legs, etc.)
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS movement_type TEXT;

-- Agregar columna exercise_type (tipo de ejercicio: compound, isolation, etc.)
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS exercise_type TEXT;

-- Agregar columna goals (objetivos: weight_loss, muscle_gain, etc.)
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS goals TEXT[];

-- Agregar columna activity_types (tipos de actividad: cardio, strength, etc.)
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS activity_types TEXT[];

-- Agregar columna equipment_alternatives (equipamiento alternativo)
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS equipment_alternatives TEXT[];

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS exercise_videos_movement_type_idx 
  ON exercise_videos(movement_type);

CREATE INDEX IF NOT EXISTS exercise_videos_exercise_type_idx 
  ON exercise_videos(exercise_type);

CREATE INDEX IF NOT EXISTS exercise_videos_muscles_idx 
  ON exercise_videos USING GIN(muscles);

CREATE INDEX IF NOT EXISTS exercise_videos_goals_idx 
  ON exercise_videos USING GIN(goals);

-- Verificar que las columnas se agregaron correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'exercise_videos'
  AND column_name IN ('muscles', 'muscle_zones', 'movement_type', 'exercise_type', 'goals', 'activity_types', 'equipment_alternatives')
ORDER BY column_name;

-- ============================================================================
-- ✅ LISTO! Ahora la tabla tiene todas las columnas de metadata necesarias
-- ============================================================================

