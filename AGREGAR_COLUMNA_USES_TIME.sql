-- ============================================================================
-- AGREGAR COLUMNA uses_time A exercise_videos
-- ============================================================================
-- Este script agrega la columna para indicar si un ejercicio usa tiempo
-- en lugar de repeticiones (ej: battle ropes, plancha, cardio, etc.)
-- Ejecuta este script en Supabase SQL Editor
-- ============================================================================

-- Agregar columna uses_time si no existe
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS uses_time BOOLEAN DEFAULT false;

-- Verificar que la columna se agregó correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'exercise_videos'
  AND column_name = 'uses_time';

-- ============================================================================
-- INSTRUCCIONES:
-- ============================================================================
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. La columna se agregará con valor por defecto false
-- 3. Los ejercicios existentes mantendrán false (no usan tiempo)
-- 4. Puedes marcar ejercicios específicos como uses_time = true desde el dashboard
-- ============================================================================

