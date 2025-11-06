-- ============================================================================
-- SCRIPT PARA ACTUALIZAR user_id EN admin_roles BASADO EN EMAIL
-- ============================================================================
-- Este script ayuda a solucionar el problema cuando un admin no puede acceder
-- porque su user_id en admin_roles no coincide con su user_id real de Clerk
--
-- INSTRUCCIONES:
-- 1. Reemplaza 'EMAIL_DEL_ADMIN@ejemplo.com' con el email real del admin
-- 2. Reemplaza 'user_NUEVO_ID_DE_CLERK' con el user_id real del usuario en Clerk
-- 3. Ejecuta el script en Supabase SQL Editor
-- ============================================================================

-- Opción 1: Actualizar si ya existe un registro con ese email
UPDATE admin_roles
SET 
  user_id = 'user_NUEVO_ID_DE_CLERK',  -- Reemplaza con el user_id real de Clerk
  updated_at = NOW()
WHERE 
  email = 'EMAIL_DEL_ADMIN@ejemplo.com'  -- Reemplaza con el email real
  AND is_active = true;

-- Verificar que se actualizó correctamente
SELECT 
  id,
  user_id,
  email,
  role_type,
  name,
  is_active,
  updated_at
FROM admin_roles
WHERE email = 'EMAIL_DEL_ADMIN@ejemplo.com';

-- ============================================================================
-- OPCIÓN 2: Si no existe el registro, crearlo con el email y user_id correctos
-- ============================================================================
-- Descomenta las siguientes líneas si necesitas crear el registro desde cero:

/*
INSERT INTO admin_roles (
  user_id,
  email,
  role_type,
  name,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'user_NUEVO_ID_DE_CLERK',           -- Reemplaza con el user_id real de Clerk
  'EMAIL_DEL_ADMIN@ejemplo.com',      -- Reemplaza con el email real
  'admin',                             -- o 'socio' según corresponda
  'Nombre del Admin',                  -- Nombre del administrador
  true,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET
  email = EXCLUDED.email,
  role_type = EXCLUDED.role_type,
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
*/

-- ============================================================================
-- OPCIÓN 3: Buscar todos los admins y verificar sus user_ids
-- ============================================================================
-- Ejecuta esto para ver todos los admins y sus user_ids actuales:

SELECT 
  id,
  user_id,
  email,
  role_type,
  name,
  is_active,
  created_at,
  updated_at
FROM admin_roles
WHERE is_active = true
ORDER BY created_at DESC;

