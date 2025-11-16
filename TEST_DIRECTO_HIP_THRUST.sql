-- ============================================================================
-- TEST DIRECTO: Verificar por qué no funciona "Hip Thrust"
-- ============================================================================
-- Ejecuta este script y comparte los resultados
-- ============================================================================

-- 1. Ver TODOS los registros de hip thrust
SELECT 
  id,
  canonical_name,
  name_variations,
  storage_path,
  is_storage_video,
  video_url
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%'
ORDER BY canonical_name;

-- 2. Verificar si "hip thrust" (minúsculas) está en name_variations
SELECT 
  canonical_name,
  name_variations,
  'hip thrust' IN (SELECT LOWER(unnest(name_variations))) as tiene_hip_thrust_minusculas,
  'Hip Thrust' = ANY(name_variations) as tiene_hip_thrust_mayuscula
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

-- 3. Probar la función find_exercise_video directamente
SELECT * FROM find_exercise_video('hip thrust');

-- 4. Probar matching manual
SELECT 
  canonical_name,
  LOWER(canonical_name) = 'hip thrust' as match_canonical,
  'hip thrust' = ANY(SELECT LOWER(unnest(name_variations))) as match_variations,
  storage_path,
  is_storage_video
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

-- 5. Verificar si el problema es con el array
SELECT 
  canonical_name,
  name_variations,
  array_to_string(name_variations, ', ') as variations_string,
  array_length(name_variations, 1) as num_variations
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

