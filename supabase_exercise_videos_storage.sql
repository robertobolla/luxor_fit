-- ============================================================================
-- CONFIGURACIÓN DE STORAGE PARA VIDEOS DE EJERCICIOS
-- ============================================================================

-- Crear bucket para videos de ejercicios
-- Ejecutar en Supabase Dashboard > Storage > Create bucket
-- Nombre del bucket: exercise-videos
-- Public: SÍ (para que los videos sean accesibles públicamente)

-- Políticas de Storage para el bucket 'exercise-videos'
-- Ejecutar después de crear el bucket

-- Policy 1: Cualquiera puede leer los videos (públicos)
CREATE POLICY "Anyone can view exercise videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercise-videos');

-- Policy 2: Usuarios autenticados pueden subir videos
CREATE POLICY "Authenticated users can upload exercise videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exercise-videos' AND
  auth.role() = 'authenticated'
);

-- Policy 3: Usuarios autenticados pueden actualizar videos
CREATE POLICY "Authenticated users can update exercise videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'exercise-videos' AND
  auth.role() = 'authenticated'
);

-- Policy 4: Usuarios autenticados pueden eliminar videos
CREATE POLICY "Authenticated users can delete exercise videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exercise-videos' AND
  auth.role() = 'authenticated'
);

-- Estructura de almacenamiento recomendada:
-- exercise-videos/
--   ├── press-de-banca.mp4
--   ├── sentadillas.mp4
--   ├── peso-muerto.mp4
--   └── ...

COMMENT ON POLICY "Anyone can view exercise videos" ON storage.objects IS 'Permite que cualquiera vea los videos de ejercicios (públicos)';
COMMENT ON POLICY "Authenticated users can upload exercise videos" ON storage.objects IS 'Permite que usuarios autenticados suban videos de ejercicios';
COMMENT ON POLICY "Authenticated users can update exercise videos" ON storage.objects IS 'Permite que usuarios autenticados actualicen videos de ejercicios';
COMMENT ON POLICY "Authenticated users can delete exercise videos" ON storage.objects IS 'Permite que usuarios autenticados eliminen videos de ejercicios';

