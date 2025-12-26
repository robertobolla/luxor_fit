-- ================================================================
-- ACTUALIZAR FUNCIÓN find_exercise_video PARA INCLUIR KEY_POINTS
-- ================================================================

-- Primero eliminar la función existente
DROP FUNCTION IF EXISTS find_exercise_video(text);

-- Crear la función con el nuevo tipo de retorno
CREATE OR REPLACE FUNCTION find_exercise_video(exercise_name TEXT)
RETURNS TABLE (
  canonical_name TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  description TEXT,
  is_storage_video BOOLEAN,
  storage_path TEXT,
  key_points TEXT[]  -- AGREGADO: puntos clave del ejercicio
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ev.canonical_name,
    ev.video_url,
    ev.thumbnail_url,
    ev.description,
    ev.is_storage_video,
    ev.storage_path,
    ev.key_points  -- AGREGADO
  FROM exercise_videos ev
  WHERE 
    -- Coincidencia exacta con nombre canónico (case insensitive)
    LOWER(ev.canonical_name) = LOWER(exercise_name)
    OR
    -- Coincidencia exacta con alguna variación
    LOWER(exercise_name) = ANY(
      SELECT LOWER(unnest(ev.name_variations))
    )
    OR
    -- Coincidencia parcial (el nombre contiene el canónico o viceversa)
    LOWER(ev.canonical_name) LIKE '%' || LOWER(exercise_name) || '%'
    OR
    LOWER(exercise_name) LIKE '%' || LOWER(ev.canonical_name) || '%'
    OR
    -- Coincidencia parcial con variaciones
    EXISTS (
      SELECT 1 
      FROM unnest(ev.name_variations) AS variation
      WHERE 
        LOWER(variation) LIKE '%' || LOWER(exercise_name) || '%'
        OR
        LOWER(exercise_name) LIKE '%' || LOWER(variation) || '%'
    )
  ORDER BY 
    -- Priorizar coincidencias exactas primero
    CASE 
      WHEN LOWER(ev.canonical_name) = LOWER(exercise_name) THEN 1
      WHEN LOWER(exercise_name) = ANY(SELECT LOWER(unnest(ev.name_variations))) THEN 2
      ELSE 3
    END,
    ev.priority ASC,
    ev.is_primary DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

