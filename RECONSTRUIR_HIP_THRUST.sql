-- ============================================================================
-- RECONSTRUIR "Hip Thrust" DESDE CERO
-- ============================================================================
-- Script simple y directo para reconstruir el registro correctamente
-- ============================================================================

-- PASO 1: Ver qué storage_path tiene actualmente (para no perderlo)
SELECT 
  canonical_name,
  storage_path,
  is_storage_video
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%'
  AND canonical_name = 'Hip thrust';

-- PASO 2: Guardar el storage_path en una variable temporal
-- (Si el paso 1 muestra un storage_path, úsalo en el paso 3)

-- PASO 3: ELIMINAR el registro actual
DELETE FROM exercise_videos
WHERE canonical_name = 'Hip thrust';

-- PASO 4: INSERTAR el registro NUEVO con array CORRECTO
-- REEMPLAZA 'hip_thrust/1763322851682_Barbell KAS glute bridge.mp4' 
-- con el storage_path que obtuviste en el PASO 1
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
  'hip_thrust/1763322851682_Barbell KAS glute bridge.mp4',  -- ⚠️ REEMPLAZA con tu storage_path real
  true,
  true,
  1,
  'es'
);

-- PASO 5: Verificar que se insertó correctamente
SELECT 
  canonical_name,
  name_variations,
  array_length(name_variations, 1) as num_variations,
  'hip thrust' = ANY(SELECT LOWER(unnest(name_variations))) as tiene_hip_thrust_minusculas,
  storage_path,
  is_storage_video
FROM exercise_videos
WHERE canonical_name = 'Hip thrust';

-- PASO 6: Probar la función find_exercise_video
SELECT 
  canonical_name,
  storage_path,
  is_storage_video,
  CASE 
    WHEN is_storage_video = true AND storage_path IS NOT NULL THEN '✅ DEBE FUNCIONAR'
    ELSE '❌ Falta configuración'
  END as resultado
FROM find_exercise_video('hip thrust');

-- ============================================================================
-- IMPORTANTE:
-- ============================================================================
-- 1. Ejecuta el PASO 1 primero para ver qué storage_path tienes
-- 2. Copia ese storage_path
-- 3. En el PASO 4, reemplaza 'hip_thrust/1763322851682_Barbell KAS glute bridge.mp4'
--    con el storage_path que copiaste
-- 4. Ejecuta los pasos 3, 4, 5 y 6
-- 5. El PASO 6 debe mostrar "✅ DEBE FUNCIONAR"
-- ============================================================================

