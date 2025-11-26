-- ============================================================================
-- VERIFICAR Y ARREGLAR POLÍTICAS RLS PARA exercise_videos
-- ============================================================================
-- Este script verifica las políticas RLS existentes y las recrea si es necesario
-- ============================================================================

-- 1. Verificar si RLS está habilitado
SELECT 
  tablename,
  rowsecurity as "RLS Habilitado"
FROM pg_tables
WHERE tablename = 'exercise_videos';

-- 2. Ver todas las políticas actuales
SELECT 
  policyname as "Nombre de Política",
  cmd as "Comando",
  permissive as "Permisiva",
  roles as "Roles",
  qual as "USING",
  with_check as "WITH CHECK"
FROM pg_policies
WHERE tablename = 'exercise_videos'
ORDER BY cmd, policyname;

-- 3. Eliminar TODAS las políticas existentes (para empezar limpio)
DROP POLICY IF EXISTS "Anyone can read exercise videos" ON exercise_videos;
DROP POLICY IF EXISTS "Anyone can insert exercise videos" ON exercise_videos;
DROP POLICY IF EXISTS "Anyone can update exercise videos" ON exercise_videos;
DROP POLICY IF EXISTS "Anyone can delete exercise videos" ON exercise_videos;
DROP POLICY IF EXISTS "Authenticated users can manage exercise videos" ON exercise_videos;
DROP POLICY IF EXISTS "Authenticated users can update exercise videos" ON exercise_videos;
DROP POLICY IF EXISTS "Authenticated users can delete exercise videos" ON exercise_videos;
DROP POLICY IF EXISTS "Admins can delete exercise videos" ON exercise_videos;
DROP POLICY IF EXISTS "Users can delete exercise videos" ON exercise_videos;

-- 4. Asegurar que RLS esté habilitado
ALTER TABLE exercise_videos ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas permisivas (validación en frontend)
-- Política 1: SELECT (lectura pública)
CREATE POLICY "Anyone can read exercise videos"
ON exercise_videos
FOR SELECT
USING (true);

-- Política 2: INSERT (inserción pública - validación en frontend)
CREATE POLICY "Anyone can insert exercise videos"
ON exercise_videos
FOR INSERT
WITH CHECK (true);

-- Política 3: UPDATE (actualización pública - validación en frontend)
CREATE POLICY "Anyone can update exercise videos"
ON exercise_videos
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Política 4: DELETE (eliminación pública - validación en frontend)
CREATE POLICY "Anyone can delete exercise videos"
ON exercise_videos
FOR DELETE
USING (true);

-- 6. Verificar que las políticas se crearon correctamente
SELECT 
  policyname as "Política Creada",
  cmd as "Operación",
  permissive as "Tipo"
FROM pg_policies
WHERE tablename = 'exercise_videos'
ORDER BY cmd, policyname;

-- 7. Probar que las políticas funcionan (esto debería devolver todas las filas)
SELECT COUNT(*) as "Total de ejercicios" FROM exercise_videos;

-- ============================================================================
-- NOTA IMPORTANTE:
-- ============================================================================
-- Estas políticas permiten acceso público a la tabla, pero la validación
-- real de permisos se hace en el frontend (admin-dashboard) verificando
-- si el usuario es admin antes de permitir operaciones.
-- ============================================================================

