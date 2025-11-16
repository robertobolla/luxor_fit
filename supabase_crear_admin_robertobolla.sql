-- ============================================================================
-- SCRIPT: Crear/Actualizar Admin para robertobolla9@gmail.com
-- ============================================================================
-- Este script crea o actualiza un rol de administrador para el email
-- robertobolla9@gmail.com
--
-- IMPORTANTE: La función checkAdminAccess() buscará por email si no encuentra
-- por user_id, y actualizará automáticamente el user_id cuando el usuario
-- inicie sesión.
-- ============================================================================

-- PASO 1: Verificar si el registro ya existe
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

-- PASO 2: Crear o actualizar el registro
-- NOTA: La tabla requiere user_id (NOT NULL), pero podemos usar un placeholder temporal
-- La función checkAdminAccess() buscará por email si no encuentra por user_id

-- Opción A: Si ya existe un registro con ese email, actualizarlo
UPDATE admin_roles
SET
  role_type = 'admin',
  is_active = true,
  name = COALESCE(name, 'Roberto Bolla'),
  updated_at = NOW()
WHERE email = 'robertobolla9@gmail.com';

-- Opción B: Si NO existe, crear con user_id temporal (se actualizará automáticamente cuando el usuario inicie sesión)
-- IMPORTANTE: Usa un user_id único temporal, la función checkAdminAccess() lo actualizará cuando el usuario inicie sesión
INSERT INTO admin_roles (user_id, email, role_type, is_active, name)
SELECT
  'temp_' || gen_random_uuid()::text, -- user_id temporal único
  'robertobolla9@gmail.com',
  'admin',
  true,
  'Roberto Bolla'
WHERE NOT EXISTS (
  SELECT 1 FROM admin_roles WHERE email = 'robertobolla9@gmail.com'
);

-- PASO 2.5: Asegurar que el registro existe (por si acaso)
-- Si por alguna razón no se creó, forzar la creación
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_roles WHERE email = 'robertobolla9@gmail.com') THEN
    INSERT INTO admin_roles (user_id, email, role_type, is_active, name)
    VALUES (
      'temp_' || gen_random_uuid()::text,
      'robertobolla9@gmail.com',
      'admin',
      true,
      'Roberto Bolla'
    );
  END IF;
END $$;

-- PASO 3: Verificar que se creó correctamente
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
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. El user_id temporal se actualizará automáticamente cuando el usuario
--    inicie sesión (la función checkAdminAccess() lo hace)
-- 2. El usuario tendrá acceso de admin inmediatamente después de ejecutar
--    este script
-- 3. No necesita tener una cuenta creada previamente en la app
-- 4. Cuando inicie sesión, se detectará automáticamente como admin
-- ============================================================================

