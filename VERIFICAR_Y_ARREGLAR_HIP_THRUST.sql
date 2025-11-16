-- ============================================================================
-- VERIFICAR Y ARREGLAR "Hip Thrust" - VERSIÓN COMPLETA
-- ============================================================================
-- Este script verifica el estado actual y lo arregla completamente
-- ============================================================================

-- PASO 1: Ver el estado ACTUAL de todos los registros
SELECT 
  id,
  canonical_name,
  name_variations,
  storage_path,
  is_storage_video,
  video_url,
  array_length(name_variations, 1) as num_variations
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%'
ORDER BY canonical_name;

-- PASO 2: Verificar si "hip thrust" (minúsculas) está en las variaciones
SELECT 
  canonical_name,
  'hip thrust' = ANY(SELECT LOWER(unnest(name_variations))) as tiene_hip_thrust_minusculas,
  array_to_string(name_variations, ' | ') as todas_las_variaciones
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

-- PASO 3: ELIMINAR registros duplicados o mal formados, mantener solo "Hip thrust"
-- (Si hay "Hip thrust con barra", lo mantenemos, pero limpiamos "Hip thrust")
DELETE FROM exercise_videos
WHERE canonical_name != 'Hip thrust'
  AND canonical_name != 'Hip thrust con barra'
  AND LOWER(canonical_name) LIKE '%hip%thrust%';

-- PASO 4: ACTUALIZAR "Hip thrust" con array CORRECTO y LIMPIO
UPDATE exercise_videos
SET 
  name_variations = ARRAY[
    'hip thrust',
    'Hip thrust',
    'Hip Thrust',
    'hipthrust',
    'HIP THRUST'
  ]::TEXT[],
  is_storage_video = COALESCE(is_storage_video, true),
  updated_at = NOW()
WHERE canonical_name = 'Hip thrust';

-- PASO 5: Verificar que se actualizó correctamente
SELECT 
  canonical_name,
  name_variations,
  array_length(name_variations, 1) as num_variations,
  'hip thrust' = ANY(SELECT LOWER(unnest(name_variations))) as tiene_hip_thrust_minusculas,
  storage_path,
  is_storage_video,
  CASE 
    WHEN is_storage_video = true AND storage_path IS NOT NULL THEN '✅ Configurado'
    ELSE '❌ Falta configuración'
  END as estado
FROM exercise_videos
WHERE canonical_name = 'Hip thrust';

-- PASO 6: Probar la función find_exercise_video con "hip thrust" (minúsculas)
-- Esta es la búsqueda exacta que hace la app
SELECT 
  'Test find_exercise_video("hip thrust")' as test,
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

-- PASO 7: Probar matching directo en la tabla
SELECT 
  'Matching directo' as test,
  canonical_name,
  LOWER(canonical_name) = 'hip thrust' as match_canonical,
  'hip thrust' = ANY(SELECT LOWER(unnest(name_variations))) as match_variations,
  storage_path IS NOT NULL as tiene_storage_path,
  is_storage_video as es_storage_video
FROM exercise_videos
WHERE canonical_name = 'Hip thrust';

-- PASO 8: Si el paso 6 no devuelve resultados, hay un problema con la función SQL
-- Verificar la función directamente
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'find_exercise_video'
  AND routine_schema = 'public';

-- ============================================================================
-- INSTRUCCIONES:
-- ============================================================================
-- 1. Ejecuta TODO el script completo
-- 2. Revisa el PASO 5: debe mostrar "tiene_hip_thrust_minusculas: true"
-- 3. Revisa el PASO 6: debe devolver un resultado con "✅ DEBE FUNCIONAR"
-- 4. Si el PASO 6 no devuelve resultados, el problema está en la función SQL
-- 5. Si el PASO 6 devuelve resultados pero dice "❌ NO tiene URL válida",
--    entonces el problema es que falta storage_path o is_storage_video
-- ============================================================================

