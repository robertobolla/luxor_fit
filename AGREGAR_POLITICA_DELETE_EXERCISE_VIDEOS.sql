-- ============================================================================
-- AGREGAR POLÍTICA DELETE PARA exercise_videos
-- ============================================================================
-- Este script agrega la política RLS faltante para permitir eliminar ejercicios
-- ============================================================================

-- Verificar políticas actuales
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'exercise_videos';

-- Agregar política para DELETE (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'exercise_videos' 
    AND policyname = 'Anyone can delete exercise videos'
  ) THEN
    CREATE POLICY "Anyone can delete exercise videos"
    ON exercise_videos
    FOR DELETE
    USING (true);
    
    RAISE NOTICE 'Política DELETE creada exitosamente';
  ELSE
    RAISE NOTICE 'La política DELETE ya existe';
  END IF;
END $$;

-- Verificar que la política se creó
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'exercise_videos';

-- ============================================================================
-- NOTA:
-- ============================================================================
-- Esta política permite que cualquiera elimine ejercicios, pero la validación
-- real se hace en el frontend (admin-dashboard) verificando si el usuario es admin.
-- ============================================================================

