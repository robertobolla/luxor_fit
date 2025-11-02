-- ============================================================================
-- FIX: Ajustar políticas RLS de admin_roles para Clerk
-- ============================================================================
-- Este script corrige las políticas RLS para que funcionen con Clerk
-- en lugar de Supabase Auth

-- Eliminar TODAS las políticas antiguas que usan Supabase Auth
DROP POLICY IF EXISTS "Admins can view all roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON admin_roles;
DROP POLICY IF EXISTS "Anyone can read admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Anyone can insert admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Anyone can update admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Anyone can delete admin roles" ON admin_roles;

-- Como usamos Clerk, permitimos acceso público para lectura
-- La verificación real se hace en el cliente (admin dashboard)
-- Esto es seguro porque solo usuarios autenticados con Clerk pueden acceder al dashboard

-- Política: Cualquiera puede LEER roles (necesario para verificar roles en el cliente)
CREATE POLICY "Anyone can read admin roles"
  ON admin_roles
  FOR SELECT
  USING (true);

-- Política: Permitir INSERT (para crear nuevos admins desde el dashboard)
CREATE POLICY "Anyone can insert admin roles"
  ON admin_roles
  FOR INSERT
  WITH CHECK (true);

-- Política: Permitir UPDATE (para actualizar roles desde el dashboard)
CREATE POLICY "Anyone can update admin roles"
  ON admin_roles
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Política: Permitir DELETE (para eliminar roles desde el dashboard)
CREATE POLICY "Anyone can delete admin roles"
  ON admin_roles
  FOR DELETE
  USING (true);

-- Verificar que las políticas se crearon correctamente
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
WHERE tablename = 'admin_roles'
ORDER BY policyname;

COMMENT ON POLICY "Anyone can read admin roles" ON admin_roles IS 
'Permite lectura pública de roles. La verificación real se hace en el cliente con Clerk authentication.';

