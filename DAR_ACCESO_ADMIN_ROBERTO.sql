-- ============================================================================
-- DAR ACCESO DE ADMIN A: robertobolla9@gmail.com
-- ============================================================================
-- Ejecuta este script en Supabase SQL Editor para dar acceso de admin
-- ============================================================================

-- PASO 0: Crear la tabla admin_roles si no existe
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  email TEXT,
  role_type TEXT NOT NULL CHECK (role_type IN ('admin', 'socio', 'empresario')),
  permissions JSONB DEFAULT '{}'::jsonb,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  notes TEXT,
  -- Campos adicionales para empresarios
  monthly_fee NUMERIC(10, 2),
  max_users INTEGER,
  gym_name TEXT,
  gym_address TEXT,
  gym_phone TEXT,
  gym_contact_email TEXT,
  -- Campos adicionales para socios
  discount_code TEXT UNIQUE,
  discount_description TEXT,
  discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  free_access BOOLEAN DEFAULT true,
  referral_stats JSONB DEFAULT '{}'::jsonb,
  -- Campos adicionales para comisiones
  commission_per_subscription NUMERIC(10, 2) DEFAULT 0,
  commission_type TEXT DEFAULT 'fixed' CHECK (commission_type IN ('fixed', 'percentage')),
  total_earnings NUMERIC(10, 2) DEFAULT 0,
  last_payment_date TIMESTAMPTZ,
  payment_notes TEXT
);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS admin_roles_user_id_idx ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS admin_roles_role_type_idx ON admin_roles(role_type);
CREATE INDEX IF NOT EXISTS admin_roles_email_idx ON admin_roles(email);
CREATE INDEX IF NOT EXISTS admin_roles_is_active_idx ON admin_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_roles_empresario ON admin_roles(role_type) WHERE role_type = 'empresario';
CREATE INDEX IF NOT EXISTS idx_admin_roles_discount_code ON admin_roles(discount_code) WHERE discount_code IS NOT NULL;

-- Configurar RLS (Row Level Security) para Clerk
-- Como usamos Clerk, las políticas permiten acceso desde el cliente
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Admins can view all roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON admin_roles;
DROP POLICY IF EXISTS "Allow all for authenticated" ON admin_roles;
DROP POLICY IF EXISTS "Allow all operations" ON admin_roles;

-- Crear políticas permisivas para Clerk (el cliente verifica los roles)
CREATE POLICY "Allow all operations for Clerk"
  ON admin_roles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- PASO 1: Verificar si ya existe
SELECT
  id,
  user_id,
  email,
  role_type,
  is_active,
  name,
  created_at
FROM admin_roles
WHERE email = 'robertobolla9@gmail.com';

-- PASO 2: Crear o actualizar el registro de admin
-- Esto funcionará incluso si el usuario aún no se ha registrado en la app
-- El user_id se actualizará automáticamente cuando inicies sesión

-- Actualizar si ya existe
UPDATE admin_roles
SET
  role_type = 'admin',
  is_active = true,
  name = COALESCE(name, 'Roberto Bolla'),
  updated_at = NOW()
WHERE email = 'robertobolla9@gmail.com';

-- Crear si no existe
INSERT INTO admin_roles (user_id, email, role_type, is_active, name)
SELECT
  'temp_' || gen_random_uuid()::text, -- user_id temporal (se actualizará al iniciar sesión)
  'robertobolla9@gmail.com',
  'admin',
  true,
  'Roberto Bolla'
WHERE NOT EXISTS (
  SELECT 1 FROM admin_roles WHERE email = 'robertobolla9@gmail.com'
);

-- PASO 3: Verificar que se creó/actualizó correctamente
SELECT
  id,
  user_id,
  email,
  role_type,
  is_active,
  name,
  created_at,
  updated_at
FROM admin_roles
WHERE email = 'robertobolla9@gmail.com';

-- ============================================================================
-- ✅ LISTO! Ahora tienes acceso de admin
-- ============================================================================
-- Cuando inicies sesión en la app o en el dashboard con robertobolla9@gmail.com,
-- el sistema detectará automáticamente que eres admin y actualizará tu user_id.
-- ============================================================================

