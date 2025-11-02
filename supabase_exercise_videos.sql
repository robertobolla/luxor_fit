-- Tabla para almacenar videos de ejercicios
-- Esta tabla mapea nombres de ejercicios (canónicos y variaciones) a URLs de videos

CREATE TABLE IF NOT EXISTS exercise_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Nombre canónico del ejercicio (ej: "Press de banca")
  canonical_name TEXT NOT NULL,
  
  -- Variaciones del nombre que también deben mapear a este ejercicio
  -- Ej: ["press de banca", "bench press", "press de pecho con barra"]
  name_variations TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- URL del video (puede ser Supabase Storage o externa)
  video_url TEXT NOT NULL,
  
  -- Ruta en Supabase Storage (opcional, si el video está en storage)
  storage_path TEXT,
  
  -- URL de la miniatura (opcional)
  thumbnail_url TEXT,
  
  -- Si el video está almacenado en Supabase Storage
  is_storage_video BOOLEAN DEFAULT false,
  
  -- Descripción del ejercicio (opcional)
  description TEXT,
  
  -- Categoría del ejercicio (opcional, para agrupar)
  category TEXT, -- ej: "chest", "legs", "cardio"
  
  -- Equipamiento requerido (opcional)
  equipment TEXT[], -- ej: ["barbell", "dumbbells"]
  
  -- Idioma del video (opcional)
  language TEXT DEFAULT 'es', -- 'es', 'en', 'both'
  
  -- Si es el video principal o una alternativa
  is_primary BOOLEAN DEFAULT true,
  
  -- Orden de preferencia si hay múltiples videos
  priority INTEGER DEFAULT 1,
  
  -- Metadata adicional
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas rápidas por nombre canónico
CREATE INDEX IF NOT EXISTS exercise_videos_canonical_name_idx 
  ON exercise_videos(canonical_name);

-- Índice GIN para búsquedas en el array de variaciones
CREATE INDEX IF NOT EXISTS exercise_videos_variations_idx 
  ON exercise_videos USING GIN(name_variations);

-- Índice para búsqueda por categoría
CREATE INDEX IF NOT EXISTS exercise_videos_category_idx 
  ON exercise_videos(category);

-- Función para buscar un video por nombre de ejercicio (con matching flexible)
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

-- Habilitar Row Level Security (RLS)
ALTER TABLE exercise_videos ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer los videos de ejercicios
CREATE POLICY "Anyone can read exercise videos"
  ON exercise_videos
  FOR SELECT
  USING (true);

-- Política: Solo admins pueden insertar/actualizar (ajustar según tu sistema de auth)
-- Por ahora, permitir insert/update con autenticación
CREATE POLICY "Authenticated users can manage exercise videos"
  ON exercise_videos
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update exercise videos"
  ON exercise_videos
  FOR UPDATE
  USING (true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_exercise_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_exercise_videos_updated_at
  BEFORE UPDATE ON exercise_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_exercise_videos_updated_at();

-- Datos de ejemplo (puedes insertar más ejercicios aquí)
-- INSERT INTO exercise_videos (canonical_name, name_variations, video_url, category, equipment)
-- VALUES
--   ('Press de banca', 
--    ARRAY['press de banca', 'bench press', 'press de pecho', 'press de pecho con barra'],
--    'https://www.youtube.com/watch?v=EXAMPLE1',
--    'chest',
--    ARRAY['barbell']),
--   ('Sentadillas',
--    ARRAY['sentadillas', 'squats', 'sentadilla', 'sentadilla con peso corporal'],
--    'https://www.youtube.com/watch?v=EXAMPLE2',
--    'legs',
--    ARRAY['bodyweight']);

COMMENT ON TABLE exercise_videos IS 'Almacena videos de demostración para ejercicios. Soporta matching flexible de nombres.';
COMMENT ON FUNCTION find_exercise_video IS 'Busca un video para un ejercicio dado, con matching flexible de nombres.';

