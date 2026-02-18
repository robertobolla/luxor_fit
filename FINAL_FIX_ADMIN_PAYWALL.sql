-- ============================================================================
-- SOLUCIÓN DEFINITIVA PAYWALL ADMIN (V2 - SIN BORRAR DATOS)
-- ============================================================================

-- 1. Asegurar que las políticas RLS permitan acceso a Clerk (bypass)
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas restrictivas
DROP POLICY IF EXISTS "Admins can view all roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON admin_roles;
-- Y asegurar las permisivas
DROP POLICY IF EXISTS "Anyone can read admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Anyone can insert admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Anyone can update admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Anyone can delete admin roles" ON admin_roles;

CREATE POLICY "Anyone can read admin roles" ON admin_roles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert admin roles" ON admin_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update admin roles" ON admin_roles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete admin roles" ON admin_roles FOR DELETE USING (true);


-- 2. ASEGURAR PERMISOS DE ADMIN (Sin borrar nada para no romper relaciones)

-- Variante 1: ID con 'O' mayúscula (La que ya tienes y es usada por gym_members)
INSERT INTO admin_roles (
  user_id,
  email,
  role_type,
  name,
  is_active
)
VALUES (
  'user_34uvPy06sO0wcE3tfZ44DTmuSdX', 
  'robertobolla9@gmail.com', 
  'admin', 
  'Roberto Bolla (O)', 
  true
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  role_type = 'admin',
  is_active = true,
  email = EXCLUDED.email;

-- Variante 2: ID con '0' cero (Por si acaso Clerk manda este)
INSERT INTO admin_roles (
  user_id,
  email,
  role_type,
  name,
  is_active
)
VALUES (
  'user_34uvPy06s00wcE3tfZ44DTmuSdX', 
  'robertobolla9@gmail.com', 
  'admin', 
  'Roberto Bolla (0)', 
  true
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  role_type = 'admin',
  is_active = true,
  email = EXCLUDED.email;

-- 3. Verificar estado final
SELECT * FROM admin_roles WHERE email LIKE 'robertobolla9%';
