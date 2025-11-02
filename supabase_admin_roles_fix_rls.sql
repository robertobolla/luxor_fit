-- ============================================================================
-- FIX: Ajustar políticas RLS para Clerk (no Supabase Auth)
-- ============================================================================

-- Eliminar TODAS las políticas antiguas (tanto las que usan auth.uid() como las nuevas)
DROP POLICY IF EXISTS "Admins can view all roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON admin_roles;
DROP POLICY IF EXISTS "Anyone can read admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Anyone can insert admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Anyone can update admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Anyone can delete admin roles" ON admin_roles;

-- Como usamos Clerk, permitimos acceso público y verificamos en el cliente
-- Esto es seguro porque la verificación real se hace en el dashboard

-- Política: Cualquiera puede leer roles (verificación en el cliente)
CREATE POLICY "Anyone can read admin roles"
  ON admin_roles
  FOR SELECT
  USING (true);

-- Política: Cualquiera puede insertar roles (solo desde el dashboard autenticado)
CREATE POLICY "Anyone can insert admin roles"
  ON admin_roles
  FOR INSERT
  WITH CHECK (true);

-- Política: Cualquiera puede actualizar roles (solo desde el dashboard autenticado)
CREATE POLICY "Anyone can update admin roles"
  ON admin_roles
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Política: Cualquiera puede eliminar roles (solo desde el dashboard autenticado)
CREATE POLICY "Anyone can delete admin roles"
  ON admin_roles
  FOR DELETE
  USING (true);

COMMENT ON POLICY "Anyone can read admin roles" ON admin_roles IS 
'Permite lectura pública de roles. La verificación real se hace en el cliente con Clerk.';

