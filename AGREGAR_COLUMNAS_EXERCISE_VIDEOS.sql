-- ============================================================================
-- AGREGAR COLUMNAS FALTANTES A exercise_videos
-- ============================================================================
-- Este script agrega las columnas necesarias para almacenar videos en Supabase Storage
-- Ejecuta este script en Supabase SQL Editor
-- ============================================================================

-- Agregar columna storage_path si no existe
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Agregar columna is_storage_video si no existe
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS is_storage_video BOOLEAN DEFAULT false;

-- Agregar columna thumbnail_url si no existe
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Agregar columna description si no existe
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS description TEXT;

-- Agregar columna category si no existe
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS category TEXT;

-- Agregar columna equipment si no existe
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS equipment TEXT[];

-- Agregar columna language si no existe
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es';

-- Agregar columna is_primary si no existe
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT true;

-- Agregar columna priority si no existe
ALTER TABLE exercise_videos
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;

-- Hacer video_url opcional (puede ser NULL si el video está solo en storage)
ALTER TABLE exercise_videos
ALTER COLUMN video_url DROP NOT NULL;

-- Verificar que las columnas se agregaron correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'exercise_videos'
  AND column_name IN ('storage_path', 'is_storage_video', 'thumbnail_url', 'description', 'category', 'equipment', 'language', 'is_primary', 'priority')
ORDER BY column_name;

-- ============================================================================
-- ✅ LISTO! Ahora la tabla tiene todas las columnas necesarias
-- ============================================================================
-- Después de ejecutar este script, intenta subir un video nuevamente
-- ============================================================================

