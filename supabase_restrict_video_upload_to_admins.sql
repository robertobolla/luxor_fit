-- ============================================================================
-- RESTRICCIÓN: Solo Administradores pueden subir videos
-- ============================================================================
-- Nota: Como estamos usando Clerk (no Supabase Auth), las políticas de Storage
-- basadas en auth.uid() no funcionarán directamente. La validación se hace
-- en el frontend (admin-dashboard) verificando el rol en admin_roles.
--
-- Esta política SQL está aquí como documentación y como medida adicional
-- si en el futuro migramos a Supabase Auth o implementamos un sistema híbrido.

-- Eliminar políticas antiguas que permitían a cualquier usuario autenticado
DROP POLICY IF EXISTS "Authenticated users can upload exercise videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update exercise videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete exercise videos" ON storage.objects;

-- Crear nuevas políticas que SOLO permitan a administradores
-- (Estas políticas solo funcionarán si usas Supabase Auth)

-- Policy 1: Solo admins pueden subir videos
CREATE POLICY "Only admins can upload exercise videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exercise-videos' AND
  EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = auth.uid()::text
      AND admin_roles.is_active = true
      AND admin_roles.role_type = 'admin'
  )
);

-- Policy 2: Solo admins pueden actualizar videos
CREATE POLICY "Only admins can update exercise videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'exercise-videos' AND
  EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = auth.uid()::text
      AND admin_roles.is_active = true
      AND admin_roles.role_type = 'admin'
  )
);

-- Policy 3: Solo admins pueden eliminar videos
CREATE POLICY "Only admins can delete exercise videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exercise-videos' AND
  EXISTS (
    SELECT 1 FROM admin_roles
    WHERE admin_roles.user_id = auth.uid()::text
      AND admin_roles.is_active = true
      AND admin_roles.role_type = 'admin'
  )
);

-- IMPORTANTE: La validación real se hace en el frontend (admin-dashboard/src/pages/Exercises.tsx)
-- que verifica el rol del usuario antes de permitir subir videos.

COMMENT ON POLICY "Only admins can upload exercise videos" ON storage.objects IS 
  'Solo administradores pueden subir videos de ejercicios. Validación principal en frontend.';

COMMENT ON POLICY "Only admins can update exercise videos" ON storage.objects IS 
  'Solo administradores pueden actualizar videos de ejercicios. Validación principal en frontend.';

COMMENT ON POLICY "Only admins can delete exercise videos" ON storage.objects IS 
  'Solo administradores pueden eliminar videos de ejercicios. Validación principal en frontend.';

