-- ============================================================================
-- AGREGAR ADMINISTRADOR: robertobolla9@gmail.com
-- ============================================================================
-- Este script agrega o actualiza el usuario robertobolla9@gmail.com como admin

-- Insertar o actualizar el registro de admin
INSERT INTO admin_roles (
  user_id,
  email,
  role_type,
  name,
  is_active,
  created_at
)
VALUES (
  'user_34uvPy06s00wcE3tfZ44DTmuSdX',  -- User ID de Clerk
  'robertobolla9@gmail.com',          -- Email
  'admin',                             -- Rol de administrador
  'Roberto Bolla',                     -- Nombre (puedes cambiarlo)
  true,                                -- Activo
  NOW()                                -- Fecha de creación
)
ON CONFLICT (user_id) 
DO UPDATE SET
  email = EXCLUDED.email,
  role_type = EXCLUDED.role_type,
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verificar que se creó correctamente
SELECT 
  user_id,
  email,
  role_type,
  name,
  is_active,
  created_at
FROM admin_roles
WHERE email = 'robertobolla9@gmail.com'
  AND user_id = 'user_34uvPy06s00wcE3tfZ44DTmuSdX';

