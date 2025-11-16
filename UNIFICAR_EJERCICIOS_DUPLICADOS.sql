-- ============================================================================
-- UNIFICAR EJERCICIOS DUPLICADOS (DIFERENCIAS SOLO EN MAYÚSCULAS/MINÚSCULAS)
-- ============================================================================
-- Este script encuentra ejercicios duplicados que solo difieren en mayúsculas
-- y los unifica manteniendo el que tiene más datos (video, descripción, etc.)
-- ============================================================================

-- PASO 1: Ver ejercicios duplicados (solo diferencias en mayúsculas/minúsculas)
SELECT 
  LOWER(canonical_name) as nombre_normalizado,
  COUNT(*) as cantidad,
  STRING_AGG(canonical_name, ', ' ORDER BY canonical_name) as nombres_duplicados,
  STRING_AGG(
    CASE 
      WHEN (is_storage_video = true AND storage_path IS NOT NULL) OR video_url IS NOT NULL 
      THEN canonical_name || ' (con video)'
      ELSE canonical_name || ' (sin video)'
    END, 
    ', ' 
    ORDER BY 
      CASE 
        WHEN (is_storage_video = true AND storage_path IS NOT NULL) OR video_url IS NOT NULL 
        THEN 1 
        ELSE 2 
      END,
      canonical_name
  ) as estado_videos
FROM exercise_videos
GROUP BY LOWER(canonical_name)
HAVING COUNT(*) > 1
ORDER BY cantidad DESC, nombre_normalizado;

-- PASO 2: Para cada grupo de duplicados, decidir cuál mantener
-- Generalmente se mantiene:
-- 1. El que tiene video (si hay uno con video y otro sin)
-- 2. El que tiene más información (descripción, variaciones, etc.)
-- 3. El más antiguo si todo es igual

-- Ejemplo de unificación manual (reemplaza los valores):
-- Mantener "Press de banca" y eliminar "press de banca"
/*
DELETE FROM exercise_videos
WHERE LOWER(canonical_name) = 'press de banca'
  AND canonical_name != 'Press de banca';
*/

-- PASO 3: Script automático para unificar (mantiene el que tiene más datos)
DO $$
DECLARE
  dup_record RECORD;
  best_record RECORD;
  to_delete_ids UUID[];
BEGIN
  -- Recorrer cada grupo de duplicados
  FOR dup_record IN
    SELECT LOWER(canonical_name) as normalized_name
    FROM exercise_videos
    GROUP BY LOWER(canonical_name)
    HAVING COUNT(*) > 1
  LOOP
    -- Encontrar el mejor registro (el que tiene más información)
    SELECT * INTO best_record
    FROM exercise_videos
    WHERE LOWER(canonical_name) = dup_record.normalized_name
    ORDER BY
      -- Prioridad 1: Tiene video
      CASE 
        WHEN (is_storage_video = true AND storage_path IS NOT NULL) OR video_url IS NOT NULL 
        THEN 1 
        ELSE 2 
      END,
      -- Prioridad 2: Tiene descripción
      CASE WHEN description IS NOT NULL AND description != '' THEN 1 ELSE 2 END,
      -- Prioridad 3: Tiene más variaciones
      CASE WHEN name_variations IS NOT NULL THEN array_length(name_variations, 1) ELSE 0 END DESC,
      -- Prioridad 4: Más antiguo
      created_at ASC
    LIMIT 1;

    -- Si encontramos el mejor registro, eliminar los demás
    IF best_record.id IS NOT NULL THEN
      -- Actualizar name_variations del mejor registro para incluir los nombres de los duplicados
      UPDATE exercise_videos
      SET 
        name_variations = (
          SELECT ARRAY_AGG(DISTINCT unnest_var)
          FROM (
            SELECT unnest(name_variations || ARRAY[canonical_name]) as unnest_var
            FROM exercise_videos
            WHERE LOWER(canonical_name) = dup_record.normalized_name
          ) sub
        ),
        updated_at = NOW()
      WHERE id = best_record.id;

      -- Eliminar los duplicados (excepto el mejor)
      DELETE FROM exercise_videos
      WHERE LOWER(canonical_name) = dup_record.normalized_name
        AND id != best_record.id;
      
      RAISE NOTICE 'Unificado: % -> manteniendo "%"', dup_record.normalized_name, best_record.canonical_name;
    END IF;
  END LOOP;
END $$;

-- PASO 4: Verificar que no quedan duplicados
SELECT 
  LOWER(canonical_name) as nombre_normalizado,
  COUNT(*) as cantidad
FROM exercise_videos
GROUP BY LOWER(canonical_name)
HAVING COUNT(*) > 1;

-- Si esta query no devuelve resultados, significa que no hay duplicados

-- PASO 5: Agregar constraint único case-insensitive (opcional, para prevenir futuros duplicados)
-- Primero verificar si ya existe
DO $$
BEGIN
  -- Intentar crear índice único case-insensitive
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'exercise_videos_canonical_name_lower_unique'
  ) THEN
    CREATE UNIQUE INDEX exercise_videos_canonical_name_lower_unique 
    ON exercise_videos (LOWER(canonical_name));
    
    RAISE NOTICE 'Índice único case-insensitive creado';
  ELSE
    RAISE NOTICE 'Índice único case-insensitive ya existe';
  END IF;
END $$;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. El script automático (PASO 3) unifica duplicados manteniendo el mejor registro
-- 2. El mejor registro es el que tiene video, descripción, o más variaciones
-- 3. Los nombres de los duplicados se agregan a name_variations del registro mantenido
-- 4. Se crea un índice único case-insensitive para prevenir futuros duplicados
-- ============================================================================

