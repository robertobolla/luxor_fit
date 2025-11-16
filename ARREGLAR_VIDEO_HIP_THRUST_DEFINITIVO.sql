-- ============================================================================
-- ARREGLAR VIDEO DE "Hip Thrust" - VERSIÓN DEFINITIVA
-- ============================================================================
-- Este script asegura que el registro funcione sin importar cómo se busque
-- ============================================================================

-- PASO 1: Ver el estado actual
SELECT 
  id,
  canonical_name,
  name_variations,
  storage_path,
  is_storage_video,
  video_url
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

-- PASO 2: Actualizar el registro con TODAS las variaciones posibles
-- Esto asegura que funcione sin importar cómo se busque
UPDATE exercise_videos
SET 
  name_variations = ARRAY[
    'hip thrust',           -- Minúsculas (normalizado por la app)
    'Hip thrust',           -- Original del plan
    'Hip Thrust',           -- Como se muestra en la app
    'hipthrust',            -- Sin espacio
    'HIP THRUST',           -- Mayúsculas
    'hip thrust',           -- Duplicado para asegurar
    'Hip Thrust',           -- Duplicado para asegurar
    'hip thrust',           -- Triple para asegurar matching
    'Hip Thrust'            -- Triple para asegurar matching
  ]::TEXT[],
  updated_at = NOW()
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

-- PASO 3: Asegurar que is_storage_video y storage_path estén correctos
UPDATE exercise_videos
SET 
  is_storage_video = COALESCE(is_storage_video, true),
  storage_path = COALESCE(storage_path, (
    SELECT storage_path 
    FROM exercise_videos 
    WHERE LOWER(canonical_name) LIKE '%hip%thrust%' 
      AND storage_path IS NOT NULL 
    LIMIT 1
  )),
  updated_at = NOW()
WHERE LOWER(canonical_name) LIKE '%hip%thrust%'
  AND (is_storage_video IS NULL OR storage_path IS NULL);

-- PASO 4: Verificar que la actualización funcionó
SELECT 
  canonical_name,
  name_variations,
  array_length(name_variations, 1) as num_variations,
  storage_path,
  is_storage_video,
  CASE 
    WHEN is_storage_video = true AND storage_path IS NOT NULL THEN '✅ Configurado correctamente'
    ELSE '❌ Falta configuración'
  END as estado
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

-- PASO 5: Probar la función find_exercise_video con el nombre normalizado
-- (La app normaliza "Hip Thrust" a "hip thrust")
SELECT 
  'Test: hip thrust (normalizado)' as test,
  canonical_name,
  video_url,
  storage_path,
  is_storage_video,
  CASE 
    WHEN is_storage_video = true AND storage_path IS NOT NULL THEN '✅ DEBE FUNCIONAR'
    WHEN video_url IS NOT NULL AND video_url != '' THEN '✅ Tiene video_url'
    ELSE '❌ NO tiene URL válida'
  END as resultado
FROM find_exercise_video('hip thrust');

-- PASO 6: Verificar matching directo en la tabla
SELECT 
  'Matching directo' as test,
  canonical_name,
  CASE 
    WHEN LOWER(canonical_name) = 'hip thrust' THEN '✅ Coincide canonical_name'
    ELSE '❌ No coincide canonical_name'
  END as match_canonical,
  CASE 
    WHEN 'hip thrust' = ANY(SELECT LOWER(unnest(name_variations))) THEN '✅ Coincide en name_variations'
    ELSE '❌ No coincide en name_variations'
  END as match_variations,
  storage_path,
  is_storage_video
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. La app normaliza "Hip Thrust" a "hip thrust" (minúsculas)
-- 2. La función find_exercise_video busca en canonical_name y name_variations
-- 3. Si después de esto no funciona, el problema puede ser:
--    a) La función find_exercise_video no está funcionando correctamente
--    b) Hay un problema con las políticas RLS
--    c) El storage_path no es correcto o el archivo no existe en Storage
--    d) Hay un problema con la URL pública de Supabase Storage
-- ============================================================================

