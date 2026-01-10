-- Script para corregir columnas de notas en exercise_videos
-- Ya que las notas son escritas por el usuario, solo necesitamos una columna

-- Eliminar la columna notes_en que no necesitamos
ALTER TABLE public.exercise_videos
DROP COLUMN IF EXISTS notes_en;

-- Verificar que solo queda la columna notes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'exercise_videos' 
  AND column_name IN ('notes', 'notes_en');
