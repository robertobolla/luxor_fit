-- ============================================================================
-- TABLA DE FOTOS DE PROGRESO
-- ============================================================================

-- Tabla principal de fotos
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_date DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_type TEXT CHECK (photo_type IN ('front', 'side', 'back', 'other')) NOT NULL DEFAULT 'front',
  weight_kg NUMERIC,
  notes TEXT,
  ai_analysis JSONB, -- Análisis de la IA
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_id ON progress_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_date ON progress_photos(photo_date DESC);
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_date ON progress_photos(user_id, photo_date DESC);
CREATE INDEX IF NOT EXISTS idx_progress_photos_type ON progress_photos(photo_type);

-- RLS (Row Level Security)
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Users can view their own photos"
  ON progress_photos FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own photos"
  ON progress_photos FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own photos"
  ON progress_photos FOR UPDATE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own photos"
  ON progress_photos FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_progress_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_progress_photos_updated_at_trigger ON progress_photos;
CREATE TRIGGER update_progress_photos_updated_at_trigger
  BEFORE UPDATE ON progress_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_progress_photos_updated_at();

-- Comentarios
COMMENT ON TABLE progress_photos IS 'Fotos de progreso de los usuarios con análisis de IA';
COMMENT ON COLUMN progress_photos.photo_type IS 'Tipo de foto: front (frente), side (lado), back (espalda), other (otro)';
COMMENT ON COLUMN progress_photos.ai_analysis IS 'Análisis de cambios físicos realizado por IA (JSON)';
COMMENT ON COLUMN progress_photos.weight_kg IS 'Peso del usuario en el momento de la foto';

-- ============================================================================
-- CONFIGURACIÓN DE STORAGE PARA FOTOS
-- ============================================================================

-- Crear bucket para fotos de progreso (ejecutar en Supabase Dashboard > Storage)
-- Nombre del bucket: progress-photos
-- Public: NO (solo accesible por el usuario dueño)

-- Políticas de Storage (ejecutar después de crear el bucket)
-- 
-- Policy 1: Users can upload their own photos
-- CREATE POLICY "Users can upload photos"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'progress-photos' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );
--
-- Policy 2: Users can view their own photos
-- CREATE POLICY "Users can view own photos"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'progress-photos' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );
--
-- Policy 3: Users can delete their own photos
-- CREATE POLICY "Users can delete own photos"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'progress-photos' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

