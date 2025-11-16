-- ============================================================================
-- VERIFICAR Y CREAR ADMIN POR EMAIL
-- ============================================================================
-- Este script verifica si un usuario existe como admin y lo crea si no existe
-- Útil cuando el user_id de Clerk no coincide con el de la base de datos

-- IMPORTANTE: Reemplaza estos valores:
-- - 'pablochavez1192@gmail.com' con el email del admin
-- - 'user_id_de_clerk' con el user_id real de Clerk (opcional, se puede dejar NULL)

-- ============================================================================
-- PASO 1: Verificar si existe
-- ============================================================================

SELECT 
  id,
  user_id,
  email,
  role_type,
  is_active,
  name,
  created_at
FROM admin_roles
WHERE email = 'pablochavez1192@gmail.com'
   OR user_id LIKE '%pablochavez%'; -- Buscar por coincidencia parcial si no tienes el user_id exacto

-- ============================================================================
-- PASO 2: Si NO existe, crear el registro
-- ============================================================================
-- Descomenta y ejecuta si el usuario no existe

/*
INSERT INTO admin_roles (user_id, email, role_type, is_active, name)
VALUES (
  NULL, -- Se puede dejar NULL si no tienes el user_id de Clerk
  'pablochavez1192@gmail.com',
  'admin',
  true,
  'Pablo Chavez'
)
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    role_type = 'admin',
    is_active = true,
    updated_at = NOW();
*/

-- ============================================================================
-- PASO 3: Si existe pero el user_id está mal, actualizarlo
-- ============================================================================
-- Descomenta y ejecuta si necesitas actualizar el user_id
-- Reemplaza 'user_id_correcto_de_clerk' con el user_id real

/*
UPDATE admin_roles
SET 
  user_id = 'user_id_correcto_de_clerk',
  updated_at = NOW()
WHERE email = 'pablochavez1192@gmail.com'
  AND (user_id IS NULL OR user_id != 'user_id_correcto_de_clerk');
*/

-- ============================================================================
-- PASO 4: Verificar todos los admins activos
-- ============================================================================

SELECT 
  id,
  user_id,
  email,
  role_type,
  is_active,
  name,
  created_at
FROM admin_roles
WHERE role_type = 'admin'
  AND is_active = true
ORDER BY created_at DESC;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. Si el user_id es NULL, la función checkAdminAccess() buscará por email
-- 2. Si encuentra por email, actualizará el user_id automáticamente
-- 3. El email debe coincidir exactamente con el de Clerk (case-sensitive en algunos casos)

