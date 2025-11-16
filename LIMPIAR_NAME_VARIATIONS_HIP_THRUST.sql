-- ============================================================================
-- LIMPIAR name_variations DE "Hip Thrust" - CORREGIR ARRAY MALFORMADO
-- ============================================================================
-- El problema: name_variations tiene un elemento que es una cadena larga
-- con múltiples variaciones separadas por comas, en lugar de elementos individuales
-- ============================================================================

-- PASO 1: Ver el estado actual (problema)
SELECT 
  canonical_name,
  name_variations,
  array_length(name_variations, 1) as num_elementos,
  array_to_string(name_variations, ' | ') as elementos_visibles
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

-- PASO 2: Limpiar y corregir el array para "Hip thrust" (sin "con barra")
-- Separar cualquier cadena que contenga múltiples variaciones
UPDATE exercise_videos
SET 
  name_variations = ARRAY[
    'hip thrust',           -- Minúsculas (lo que busca la app)
    'Hip thrust',           -- Original
    'Hip Thrust',           -- Como se muestra
    'hipthrust',            -- Sin espacio
    'HIP THRUST'            -- Mayúsculas
  ]::TEXT[],
  updated_at = NOW()
WHERE canonical_name = 'Hip thrust';

-- PASO 3: También limpiar "Hip thrust con barra" si existe
UPDATE exercise_videos
SET 
  name_variations = ARRAY[
    'hip thrust con barra',
    'Hip thrust con barra',
    'Hip Thrust con barra',
    'hipthrust con barra',
    'HIP THRUST CON BARRA'
  ]::TEXT[],
  updated_at = NOW()
WHERE canonical_name = 'Hip thrust con barra';

-- PASO 4: Verificar que se corrigió
SELECT 
  canonical_name,
  name_variations,
  array_length(name_variations, 1) as num_elementos,
  array_to_string(name_variations, ', ') as elementos_limpios,
  'hip thrust' = ANY(SELECT LOWER(unnest(name_variations))) as tiene_hip_thrust_minusculas
FROM exercise_videos
WHERE LOWER(canonical_name) LIKE '%hip%thrust%';

-- PASO 5: Probar la función find_exercise_video
SELECT 
  'Test: hip thrust' as test,
  canonical_name,
  storage_path,
  is_storage_video,
  CASE 
    WHEN is_storage_video = true AND storage_path IS NOT NULL THEN '✅ DEBE FUNCIONAR AHORA'
    ELSE '❌ Falta configuración'
  END as resultado
FROM find_exercise_video('hip thrust');

-- ============================================================================
-- NOTA: El problema era que el array tenía elementos mal formados.
-- Ahora cada variación es un elemento individual del array, lo que permite
-- que la función SQL `ANY(SELECT LOWER(unnest(name_variations)))` funcione correctamente.
-- ============================================================================

