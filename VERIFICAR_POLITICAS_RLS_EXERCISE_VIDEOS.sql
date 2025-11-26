-- ============================================================================
-- VERIFICAR Y ARREGLAR POLÍTICAS RLS PARA exercise_videos
-- ============================================================================
-- Este script verifica las políticas RLS existentes y crea políticas permisivas
-- para que los administradores puedan eliminar ejercicios
-- ============================================================================

-- Ver políticas RLS actuales
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'exercise_videos';

-- Verificar si RLS está habilitado
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'exercise_videos';

-- ============================================================================
-- SOLUCIÓN: Crear políticas permisivas para exercise_videos
-- ============================================================================
-- Como estamos usando Clerk (no Supabase Auth), necesitamos políticas
-- que permitan operaciones sin depender de auth.uid()
-- ============================================================================

-- Eliminar políticas antiguas que puedan estar bloqueando
DROP POLICY IF EXISTS "Anyone can read exercise videos" ON exercise_videos;
DROP POLICY IF EXISTS "Anyone can insert exercise videos" ON exercise_videos;
DROP POLICY IF EXISTS "Anyone can update exercise videos" ON exercise_videos;
DROP POLICY IF EXISTS "Anyone can delete exercise videos" ON exercise_videos;
DROP POLICY IF EXISTS "Admins can delete exercise videos" ON exercise_videos;
DROP POLICY IF EXISTS "Users can delete exercise videos" ON exercise_videos;

-- Política 1: Cualquiera puede leer (público)
CREATE POLICY "Anyone can read exercise videos"
ON exercise_videos
FOR SELECT
USING (true);

-- Política 2: Cualquiera puede insertar (validación en frontend)
CREATE POLICY "Anyone can insert exercise videos"
ON exercise_videos
FOR INSERT
WITH CHECK (true);

-- Política 3: Cualquiera puede actualizar (validación en frontend)
CREATE POLICY "Anyone can update exercise videos"
ON exercise_videos
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Política 4: Cualquiera puede eliminar (validación en frontend)
CREATE POLICY "Anyone can delete exercise videos"
ON exercise_videos
FOR DELETE
USING (true);

-- Verificar que las políticas se crearon correctamente
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'exercise_videos';

-- ============================================================================
-- NOTA IMPORTANTE:
-- ============================================================================
-- Estas políticas permiten acceso público a la tabla, pero la validación
-- real de permisos se hace en el frontend (admin-dashboard) verificando
-- si el usuario es admin antes de permitir operaciones.
-- ============================================================================

