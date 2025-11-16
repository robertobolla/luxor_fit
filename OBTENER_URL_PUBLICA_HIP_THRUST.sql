-- ============================================================================
-- OBTENER URL PÚBLICA DEL VIDEO "Hip Thrust"
-- ============================================================================

SELECT 
  canonical_name,
  storage_path,
  CONCAT(
    'https://fseyophzvhafjywyufsa.supabase.co/storage/v1/object/public/exercise-videos/',
    storage_path
  ) as url_publica
FROM exercise_videos
WHERE canonical_name = 'Hip thrust'
  AND storage_path IS NOT NULL;

-- ============================================================================
-- INSTRUCCIONES:
-- ============================================================================
-- 1. Copia la URL que aparece en "url_publica"
-- 2. Ábrela en tu navegador
-- 3. Si el video se reproduce, el problema está en la app
-- 4. Si da error 404 o "Access Denied", el problema está en Storage:
--    a) El bucket no es público
--    b) Las políticas de Storage no permiten acceso público
--    c) El archivo no existe en esa ruta
-- ============================================================================

