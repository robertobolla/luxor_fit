-- Script para actualizar la función find_exercise_video
-- Elimina la referencia a key_points que ya no existe en la tabla

-- Primero eliminar la función existente (tiene tipo de retorno diferente)
DROP FUNCTION IF EXISTS find_exercise_video(TEXT);

CREATE OR REPLACE FUNCTION find_exercise_video(exercise_name TEXT)
RETURNS TABLE (
  canonical_name TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  description TEXT,
  is_storage_video BOOLEAN,
  storage_path TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ev.canonical_name,
    ev.video_url,
    ev.thumbnail_url,
    ev.description,
    ev.is_storage_video,
    ev.storage_path
  FROM exercise_videos ev
  WHERE 
    -- Coincidencia exacta (sin distinguir mayúsculas)
    LOWER(ev.canonical_name) = LOWER(exercise_name)
    OR 
    -- Coincidencia en variaciones de nombre
    EXISTS (
      SELECT 1 FROM UNNEST(ev.name_variations) AS variation
      WHERE LOWER(variation) = LOWER(exercise_name)
    )
    OR
    -- Coincidencia parcial (contiene)
    LOWER(ev.canonical_name) LIKE '%' || LOWER(exercise_name) || '%'
  ORDER BY 
    -- Priorizar coincidencias exactas
    CASE WHEN LOWER(ev.canonical_name) = LOWER(exercise_name) THEN 0 ELSE 1 END,
    ev.priority ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
