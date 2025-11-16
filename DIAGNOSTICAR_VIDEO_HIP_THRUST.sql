-- ============================================================================
-- DIAGNÓSTICO: Verificar video de "Hip thrust"
-- ============================================================================
-- Este script te ayuda a ver qué tiene exactamente el registro de "hip thrust"
-- y por qué no se encuentra el video
-- ============================================================================

-- 1. Buscar todos los registros relacionados con "hip thrust" (case insensitive)
SELECT 
  id,
  canonical_name,
  name_variations,
  video_url,
  storage_path,
  is_storage_video,
  thumbnail_url,
  description,
  created_at,
  updated_at
FROM exercise_videos
WHERE 
  LOWER(canonical_name) LIKE '%hip%thrust%'
  OR LOWER(canonical_name) LIKE '%hipthrust%'
  OR EXISTS (
    SELECT 1 
    FROM unnest(name_variations) AS variation
    WHERE LOWER(variation) LIKE '%hip%thrust%'
       OR LOWER(variation) LIKE '%hipthrust%'
  )
ORDER BY canonical_name;

-- 2. Ver las name_variations del registro
SELECT 
  canonical_name,
  name_variations,
  array_length(name_variations, 1) as num_variations
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

-- 3. Probar la función find_exercise_video con diferentes variaciones
-- (La app normaliza a minúsculas y elimina caracteres especiales)
SELECT 'hip thrust (normalizado)' as nombre_buscado, * FROM find_exercise_video('hip thrust');
SELECT 'Hip thrust (original)' as nombre_buscado, * FROM find_exercise_video('Hip thrust');
SELECT 'Hip Thrust (title case)' as nombre_buscado, * FROM find_exercise_video('Hip Thrust');
SELECT 'hipthrust (sin espacio)' as nombre_buscado, * FROM find_exercise_video('hipthrust');

-- 4. Verificar si el video tiene URL o storage_path válido
SELECT 
  canonical_name,
  CASE 
    WHEN is_storage_video = true AND storage_path IS NOT NULL THEN '✅ Tiene storage_path'
    WHEN video_url IS NOT NULL AND video_url != '' THEN '✅ Tiene video_url'
    ELSE '❌ NO tiene ni storage_path ni video_url válido'
  END as estado_video,
  video_url,
  storage_path,
  is_storage_video
FROM exercise_videos
WHERE 
  LOWER(canonical_name) LIKE '%hip%thrust%'
  OR LOWER(canonical_name) LIKE '%hipthrust%';

-- 5. Verificar la URL pública de Supabase Storage (si tiene storage_path)
-- Reemplaza 'TU_BUCKET' y 'TU_PATH' con los valores reales
SELECT 
  canonical_name,
  storage_path,
  CONCAT(
    'https://TU_PROJECT_ID.supabase.co/storage/v1/object/public/exercise-videos/',
    storage_path
  ) as url_publica_estimada
FROM exercise_videos
WHERE 
  is_storage_video = true 
  AND storage_path IS NOT NULL
  AND (LOWER(canonical_name) LIKE '%hip%thrust%' OR LOWER(canonical_name) LIKE '%hipthrust%');

