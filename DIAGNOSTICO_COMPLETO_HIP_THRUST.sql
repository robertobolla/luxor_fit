-- ============================================================================
-- DIAGNÓSTICO COMPLETO: Video de "Hip Thrust"
-- ============================================================================
-- Este script hace un diagnóstico completo para entender por qué no funciona
-- ============================================================================

-- 1. Ver TODOS los registros relacionados con hip thrust
SELECT 
  id,
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

-- 2. Verificar si name_variations incluye "hip thrust" (minúsculas)
SELECT 
  canonical_name,
  name_variations,
  CASE 
    WHEN 'hip thrust' = ANY(SELECT LOWER(unnest(name_variations))) THEN '✅ Incluye "hip thrust"'
    ELSE '❌ NO incluye "hip thrust"'
  END as tiene_hip_thrust_minusculas,
  CASE 
    WHEN 'Hip Thrust' = ANY(name_variations) THEN '✅ Incluye "Hip Thrust"'
    ELSE '❌ NO incluye "Hip Thrust"'
  END as tiene_hip_thrust_mayuscula
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

-- 3. Probar la función find_exercise_video con el nombre exacto que normaliza la app
-- La función normalizeExerciseName hace: toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim()
-- Para "Hip Thrust" debería resultar en "hip thrust"
SELECT 
  'hip thrust (normalizado exacto)' as test,
  canonical_name,
  video_url,
  storage_path,
  is_storage_video,
  CASE 
    WHEN is_storage_video = true AND storage_path IS NOT NULL THEN '✅ Tiene storage_path'
    WHEN video_url IS NOT NULL AND video_url != '' THEN '✅ Tiene video_url'
    ELSE '❌ NO tiene URL válida'
  END as estado
FROM find_exercise_video('hip thrust');

-- 4. Verificar si el storage_path existe en Supabase Storage
-- (Esto requiere verificar manualmente en Storage, pero podemos ver la ruta)
SELECT 
  canonical_name,
  storage_path,
  CONCAT(
    'Ruta completa: exercise-videos/',
    storage_path
  ) as ruta_completa_storage
FROM exercise_videos
WHERE 
  is_storage_video = true 
  AND storage_path IS NOT NULL
  AND LOWER(canonical_name) LIKE '%hip%thrust%';

-- 5. Probar matching directo con canonical_name
SELECT 
  'Matching con canonical_name' as test,
  canonical_name,
  CASE 
    WHEN LOWER(canonical_name) = 'hip thrust' THEN '✅ Coincide exacto'
    WHEN LOWER(canonical_name) LIKE '%hip%thrust%' THEN '✅ Coincide parcial'
    ELSE '❌ No coincide'
  END as matching_canonical,
  CASE 
    WHEN 'hip thrust' = ANY(SELECT LOWER(unnest(name_variations))) THEN '✅ Coincide en variations'
    ELSE '❌ No coincide en variations'
  END as matching_variations
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

-- 6. Verificar la función find_exercise_video directamente
-- Probar con diferentes inputs
SELECT 'Test 1: hip thrust' as test, * FROM find_exercise_video('hip thrust');
SELECT 'Test 2: Hip thrust' as test, * FROM find_exercise_video('Hip thrust');
SELECT 'Test 3: Hip Thrust' as test, * FROM find_exercise_video('Hip Thrust');
SELECT 'Test 4: HIP THRUST' as test, * FROM find_exercise_video('HIP THRUST');
SELECT 'Test 5: hipthrust' as test, * FROM find_exercise_video('hipthrust');

-- 7. Verificar si hay problemas con las políticas RLS
-- (Esto puede afectar si la función no puede leer los datos)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'exercise_videos';

-- 8. Verificar si la función find_exercise_video existe y está correcta
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'find_exercise_video'
  AND routine_schema = 'public';

