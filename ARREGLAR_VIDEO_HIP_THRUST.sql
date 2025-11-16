-- ============================================================================
-- ARREGLAR VIDEO DE "Hip thrust"
-- ============================================================================
-- Este script asegura que el registro de "Hip thrust" tenga todas las
-- variaciones necesarias para que la búsqueda funcione correctamente
-- ============================================================================

-- 1. Ver el estado actual del registro
SELECT 
  id,
  canonical_name,
  name_variations,
  video_url,
  storage_path,
  is_storage_video,
  CASE 
    WHEN is_storage_video = true AND storage_path IS NOT NULL THEN '✅ Tiene storage_path'
    WHEN video_url IS NOT NULL AND video_url != '' THEN '✅ Tiene video_url'
    ELSE '❌ NO tiene ni storage_path ni video_url válido'
  END as estado_video
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

-- 2. Actualizar el registro para asegurar que tenga todas las variaciones necesarias
-- IMPORTANTE: La app muestra "Hip Thrust" (con mayúscula T), así que necesitamos incluir esa variación
UPDATE exercise_videos
SET 
  name_variations = ARRAY[
    'hip thrust',           -- Minúsculas (como lo normaliza la función normalizeExerciseName)
    'Hip thrust',           -- Original del plan (minúscula t)
    'Hip Thrust',           -- Como se muestra en la app (mayúscula T)
    'hipthrust',            -- Sin espacio
    'HIP THRUST',           -- Mayúsculas
    'hip thrust',           -- Duplicado para asegurar matching
    'Hip Thrust'            -- Duplicado para asegurar matching
  ]::TEXT[],
  updated_at = NOW()
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

-- 3. Verificar que la actualización funcionó
SELECT 
  canonical_name,
  name_variations,
  array_length(name_variations, 1) as num_variations,
  storage_path,
  is_storage_video
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

-- 4. Probar la función find_exercise_video con diferentes variaciones
-- (La app normaliza "Hip Thrust" a "hip thrust", pero también puede buscar "Hip Thrust")
SELECT 
  'hip thrust (normalizado)' as nombre_buscado,
  canonical_name,
  video_url,
  storage_path,
  is_storage_video,
  CASE 
    WHEN is_storage_video = true AND storage_path IS NOT NULL THEN '✅ Tiene storage_path'
    WHEN video_url IS NOT NULL AND video_url != '' THEN '✅ Tiene video_url'
    ELSE '❌ NO tiene URL válida'
  END as estado_video
FROM find_exercise_video('hip thrust');

SELECT 
  'Hip Thrust (como se muestra en app)' as nombre_buscado,
  canonical_name,
  video_url,
  storage_path,
  is_storage_video,
  CASE 
    WHEN is_storage_video = true AND storage_path IS NOT NULL THEN '✅ Tiene storage_path'
    WHEN video_url IS NOT NULL AND video_url != '' THEN '✅ Tiene video_url'
    ELSE '❌ NO tiene URL válida'
  END as estado_video
FROM find_exercise_video('Hip Thrust');

-- 5. Si el registro no existe, crearlo
-- (Solo ejecutar si el SELECT anterior no devolvió resultados)
/*
INSERT INTO exercise_videos (
  canonical_name,
  name_variations,
  video_url,
  is_storage_video,
  storage_path,
  is_primary,
  priority,
  language
)
VALUES (
  'Hip thrust',
  ARRAY['hip thrust', 'Hip thrust', 'Hip Thrust', 'hipthrust', 'HIP THRUST']::TEXT[],
  NULL,
  true,
  'hip_thrust/1763322851682_Barbell KAS glute bridge.mp4',  -- Reemplaza con tu ruta real
  true,
  1,
  'es'
)
ON CONFLICT (canonical_name) DO UPDATE
SET 
  name_variations = EXCLUDED.name_variations,
  is_storage_video = EXCLUDED.is_storage_video,
  storage_path = EXCLUDED.storage_path,
  updated_at = NOW();
*/

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. La app normaliza "Hip thrust" a "hip thrust" (minúsculas)
-- 2. La función find_exercise_video busca en canonical_name y name_variations
-- 3. Asegúrate de que is_storage_video = true y storage_path esté configurado
-- 4. Si el video no se encuentra, verifica los logs de la app para ver qué
--    nombre exacto está buscando
-- ============================================================================

