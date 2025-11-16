-- ============================================================================
-- VERIFICAR URL PÚBLICA DE STORAGE PARA "Hip Thrust"
-- ============================================================================
-- El problema NO está en la base de datos, sino posiblemente en Storage
-- ============================================================================

-- 1. Ver el registro completo
SELECT 
  canonical_name,
  storage_path,
  is_storage_video,
  video_url
FROM exercise_videos
WHERE canonical_name = 'Hip thrust';

-- 2. Construir la URL pública manualmente
-- Reemplaza 'TU_PROJECT_ID' con tu project ID de Supabase
SELECT 
  canonical_name,
  storage_path,
  CONCAT(
    'https://fseyophzvhafjywyufsa.supabase.co/storage/v1/object/public/exercise-videos/',
    storage_path
  ) as url_publica_estimada
FROM exercise_videos
WHERE canonical_name = 'Hip thrust'
  AND storage_path IS NOT NULL;

-- 3. Verificar que la función find_exercise_video devuelve los datos correctos
SELECT 
  canonical_name,
  storage_path,
  is_storage_video,
  video_url
FROM find_exercise_video('hip thrust');

-- ============================================================================
-- PRUEBAS ADICIONALES:
-- ============================================================================
-- 1. Abre la URL pública en tu navegador para verificar que el archivo existe
-- 2. Si la URL no funciona, el problema está en las políticas de Storage
-- 3. Verifica en Supabase Dashboard → Storage → exercise-videos que el archivo existe
-- 4. Verifica que el bucket "exercise-videos" sea público
-- ============================================================================

