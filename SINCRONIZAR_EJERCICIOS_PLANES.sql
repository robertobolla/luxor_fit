-- ============================================================================
-- SINCRONIZAR EJERCICIOS DE PLANES DE ENTRENAMIENTO CON exercise_videos
-- ============================================================================
-- Este script extrae todos los nombres únicos de ejercicios de los planes
-- de entrenamiento generados y los agrega a exercise_videos si no existen
-- ============================================================================

-- Función para extraer todos los nombres de ejercicios de los planes
CREATE OR REPLACE FUNCTION extract_exercises_from_plans()
RETURNS TABLE (exercise_name TEXT) AS $$
DECLARE
  plan_record RECORD;
  day_data JSONB;
  exercise_data JSONB;
  exercise_name TEXT;
BEGIN
  -- Recorrer todos los planes de entrenamiento
  FOR plan_record IN 
    SELECT plan_data FROM workout_plans WHERE plan_data IS NOT NULL
  LOOP
    -- Verificar si tiene weekly_structure
    IF plan_record.plan_data ? 'weekly_structure' THEN
      -- Recorrer cada día de la semana
      FOR day_data IN 
        SELECT * FROM jsonb_array_elements(plan_record.plan_data->'weekly_structure')
      LOOP
        -- Verificar si el día tiene ejercicios
        IF day_data ? 'exercises' THEN
          -- Recorrer cada ejercicio
          FOR exercise_data IN 
            SELECT * FROM jsonb_array_elements(day_data->'exercises')
          LOOP
            -- Extraer el nombre del ejercicio
            -- Puede ser un string o un objeto con campo "name"
            IF jsonb_typeof(exercise_data) = 'string' THEN
              exercise_name := exercise_data::TEXT;
            ELSIF jsonb_typeof(exercise_data) = 'object' AND exercise_data ? 'name' THEN
              exercise_name := exercise_data->>'name';
            END IF;
            
            -- Limpiar el nombre (quitar comillas si las tiene)
            IF exercise_name IS NOT NULL THEN
              exercise_name := TRIM(BOTH '"' FROM exercise_name);
              exercise_name := TRIM(exercise_name);
              
              -- Solo retornar si tiene contenido
              IF LENGTH(exercise_name) > 0 THEN
                RETURN NEXT;
              END IF;
            END IF;
          END LOOP;
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- PASO 1: Ver todos los ejercicios únicos encontrados en los planes
SELECT DISTINCT 
  exercise_name,
  LENGTH(exercise_name) as nombre_length
FROM extract_exercises_from_plans()
WHERE exercise_name IS NOT NULL
  AND TRIM(exercise_name) != ''
ORDER BY exercise_name;

-- PASO 2: Insertar ejercicios que no existen en exercise_videos
-- Esto crea registros sin video para que aparezcan en el dashboard
INSERT INTO exercise_videos (
  canonical_name,
  name_variations,
  video_url,
  is_storage_video,
  is_primary,
  priority,
  language
)
SELECT DISTINCT
  exercise_name as canonical_name,
  ARRAY[LOWER(TRIM(exercise_name))] as name_variations,
  NULL as video_url,  -- Sin video aún
  false as is_storage_video,
  true as is_primary,
  1 as priority,
  'es' as language
FROM extract_exercises_from_plans()
WHERE exercise_name IS NOT NULL
  AND TRIM(exercise_name) != ''
  AND NOT EXISTS (
    SELECT 1 FROM exercise_videos 
    WHERE LOWER(TRIM(canonical_name)) = LOWER(TRIM(exercise_name))
  )
ON CONFLICT (canonical_name) DO NOTHING;

-- PASO 3: Verificar cuántos ejercicios se agregaron
SELECT 
  COUNT(*) as total_ejercicios_en_planes,
  COUNT(DISTINCT canonical_name) as ejercicios_unicos_en_videos
FROM (
  SELECT DISTINCT exercise_name as canonical_name
  FROM extract_exercises_from_plans()
  WHERE exercise_name IS NOT NULL AND TRIM(exercise_name) != ''
) subquery
LEFT JOIN exercise_videos ev ON LOWER(TRIM(ev.canonical_name)) = LOWER(TRIM(subquery.canonical_name));

-- PASO 4: Ver ejercicios que están en planes pero no tienen video
SELECT 
  ev.canonical_name,
  ev.video_url,
  ev.is_storage_video,
  ev.storage_path,
  CASE 
    WHEN ev.video_url IS NULL AND (ev.is_storage_video = false OR ev.is_storage_video IS NULL) THEN '❌ Sin video'
    WHEN ev.is_storage_video = true AND ev.storage_path IS NOT NULL THEN '✅ Video en Storage'
    WHEN ev.video_url IS NOT NULL THEN '✅ Video externo'
    ELSE '⚠️ Configuración incompleta'
  END as estado
FROM exercise_videos ev
WHERE EXISTS (
  SELECT 1 
  FROM extract_exercises_from_plans() e
  WHERE LOWER(TRIM(e.exercise_name)) = LOWER(TRIM(ev.canonical_name))
)
ORDER BY 
  CASE 
    WHEN ev.video_url IS NULL AND (ev.is_storage_video = false OR ev.is_storage_video IS NULL) THEN 1
    ELSE 2
  END,
  ev.canonical_name;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Este script extrae ejercicios de TODOS los planes de entrenamiento
-- 2. Crea registros en exercise_videos para ejercicios que no existen
-- 3. Los ejercicios nuevos aparecerán en el dashboard sin video (estado "Sin Video")
-- 4. Puedes subir videos para estos ejercicios desde el dashboard
-- 5. Ejecuta este script periódicamente para mantener sincronizados los ejercicios
-- ============================================================================

