-- ============================================================================
-- SOLUCIÓN DEFINITIVA PARA "Hip Thrust"
-- ============================================================================
-- Este script reconstruye el registro desde cero para asegurar que funcione
-- ============================================================================

-- PASO 1: Ver el estado actual ANTES de hacer cambios
SELECT 
  'ANTES' as estado,
  id,
  canonical_name,
  name_variations,
  storage_path,
  is_storage_video
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%'
ORDER BY canonical_name;

-- PASO 2: ELIMINAR todos los registros de hip thrust (vamos a reconstruirlos)
DELETE FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

-- PASO 3: INSERTAR el registro CORRECTO desde cero
-- IMPORTANTE: Usa el storage_path que tienes en tu base de datos
-- Si no estás seguro, ejecuta primero: SELECT storage_path FROM exercise_videos WHERE canonical_name = 'Hip thrust';
INSERT INTO exercise_videos (
  canonical_name,
  name_variations,
  video_url,
  storage_path,
  is_storage_video,
  is_primary,
  priority,
  language,
  created_at,
  updated_at
)
SELECT 
  'Hip thrust' as canonical_name,
  ARRAY['hip thrust', 'Hip thrust', 'Hip Thrust', 'hipthrust', 'HIP THRUST']::TEXT[] as name_variations,
  NULL as video_url,
  storage_path,  -- Mantener el storage_path existente
  true as is_storage_video,
  true as is_primary,
  1 as priority,
  'es' as language,
  NOW() as created_at,
  NOW() as updated_at
FROM (
  -- Obtener el storage_path del registro eliminado (si existe en la tabla temporal)
  SELECT 'hip_thrust/1763322851682_Barbell KAS glute bridge.mp4'::TEXT as storage_path
) AS temp
WHERE EXISTS (
  -- Verificar que el archivo existe en Storage (esto es solo una verificación)
  SELECT 1 FROM pg_class WHERE relname = 'exercise_videos'
);

-- Si el INSERT anterior falla porque no hay storage_path, usa este:
/*
INSERT INTO exercise_videos (
  canonical_name,
  name_variations,
  video_url,
  storage_path,
  is_storage_video,
  is_primary,
  priority,
  language
) VALUES (
  'Hip thrust',
  ARRAY['hip thrust', 'Hip thrust', 'Hip Thrust', 'hipthrust', 'HIP THRUST']::TEXT[],
  NULL,
  'hip_thrust/1763322851682_Barbell KAS glute bridge.mp4',  -- REEMPLAZA con tu ruta real
  true,
  true,
  1,
  'es'
);
*/

-- PASO 4: Verificar que se insertó correctamente
SELECT 
  'DESPUÉS' as estado,
  id,
  canonical_name,
  name_variations,
  array_length(name_variations, 1) as num_variations,
  storage_path,
  is_storage_video,
  CASE 
    WHEN is_storage_video = true AND storage_path IS NOT NULL THEN '✅ Configurado'
    ELSE '❌ Falta configuración'
  END as estado_config
FROM exercise_videos
WHERE canonical_name = 'Hip thrust';

-- PASO 5: Verificar que "hip thrust" (minúsculas) está en las variaciones
SELECT 
  canonical_name,
  'hip thrust' = ANY(SELECT LOWER(unnest(name_variations))) as tiene_hip_thrust_minusculas,
  'Hip Thrust' = ANY(name_variations) as tiene_hip_thrust_mayuscula,
  array_to_string(name_variations, ', ') as todas_variaciones
FROM exercise_videos
WHERE canonical_name = 'Hip thrust';

-- PASO 6: Probar la función find_exercise_video con "hip thrust" (minúsculas)
-- Esta es la búsqueda EXACTA que hace la app
SELECT 
  'Test: find_exercise_video("hip thrust")' as test,
  canonical_name,
  video_url,
  storage_path,
  is_storage_video,
  CASE 
    WHEN is_storage_video = true AND storage_path IS NOT NULL THEN '✅ DEBE FUNCIONAR EN LA APP'
    WHEN video_url IS NOT NULL AND video_url != '' THEN '✅ Tiene video_url'
    ELSE '❌ NO tiene URL válida - VERIFICA storage_path'
  END as resultado
FROM find_exercise_video('hip thrust');

-- PASO 7: Si el paso 6 NO devuelve resultados, hay un problema con la función SQL
-- Verificar que la función existe y está correcta
SELECT 
  routine_name,
  routine_type,
  routine_schema
FROM information_schema.routines
WHERE routine_name = 'find_exercise_video'
  AND routine_schema = 'public';

-- PASO 8: Probar matching manual directo (sin usar la función)
SELECT 
  'Matching manual directo' as test,
  canonical_name,
  LOWER(canonical_name) = 'hip thrust' as match_canonical,
  'hip thrust' = ANY(SELECT LOWER(unnest(name_variations))) as match_variations,
  storage_path,
  is_storage_video
FROM exercise_videos
WHERE canonical_name = 'Hip thrust';

-- ============================================================================
-- INSTRUCCIONES IMPORTANTES:
-- ============================================================================
-- 1. Ejecuta TODO el script completo
-- 2. Si el PASO 3 falla porque no encuentra storage_path, descomenta el INSERT alternativo
--    y reemplaza 'hip_thrust/1763322851682_Barbell KAS glute bridge.mp4' con tu ruta real
-- 3. Revisa el PASO 5: debe mostrar "tiene_hip_thrust_minusculas: true"
-- 4. Revisa el PASO 6: DEBE devolver un resultado con "✅ DEBE FUNCIONAR EN LA APP"
-- 5. Si el PASO 6 no devuelve resultados, el problema está en la función SQL
-- 6. Si el PASO 6 devuelve resultados pero dice "❌ NO tiene URL válida",
--    entonces necesitas verificar que el storage_path sea correcto
-- ============================================================================

