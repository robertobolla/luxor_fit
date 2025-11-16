-- ============================================================================
-- CREAR ADMIN PARA pablochavez1192@gmail.com
-- ============================================================================
-- Ejecuta este script en Supabase Dashboard > SQL Editor

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
WHERE email = 'pablochavez1192@gmail.com';

-- PASO 2: Crear o actualizar el registro
-- NOTA: La tabla requiere user_id (NOT NULL), pero podemos usar un placeholder temporal
-- La función checkAdminAccess() buscará por email si no encuentra por user_id

-- Opción A: Si ya existe un registro con ese email, actualizarlo
UPDATE admin_roles
SET 
  role_type = 'admin',
  is_active = true,
  name = COALESCE(name, 'Pablo Chavez'),
  updated_at = NOW()
WHERE email = 'pablochavez1192@gmail.com';

-- Opción B: Si NO existe, crear con user_id temporal (se actualizará automáticamente cuando el usuario inicie sesión)
-- IMPORTANTE: Usa un user_id único temporal, la función checkAdminAccess() lo actualizará cuando el usuario inicie sesión
INSERT INTO admin_roles (user_id, email, role_type, is_active, name)
SELECT 
  'temp_' || gen_random_uuid()::text, -- user_id temporal único
  'pablochavez1192@gmail.com',
  'admin',
  true,
  'Pablo Chavez'
WHERE NOT EXISTS (
  SELECT 1 FROM admin_roles WHERE email = 'pablochavez1192@gmail.com'
);

-- Opción B: Si NO tiene constraint UNIQUE, usar este (verificar primero)
/*
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_roles WHERE email = 'pablochavez1192@gmail.com') THEN
    INSERT INTO admin_roles (email, role_type, is_active, name)
    VALUES (
      'pablochavez1192@gmail.com',
      'admin',
      true,
      'Pablo Chavez'
    );
  ELSE
    UPDATE admin_roles
    SET 
      role_type = 'admin',
      is_active = true,
      name = COALESCE(name, 'Pablo Chavez'),
      updated_at = NOW()
    WHERE email = 'pablochavez1192@gmail.com';
  END IF;
END $$;
*/

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
WHERE email = 'pablochavez1192@gmail.com';

-- PASO 4: Si necesitas actualizar el user_id después (cuando el usuario inicie sesión)
-- Reemplaza 'user_id_de_clerk' con el user_id real de Clerk
/*
UPDATE admin_roles
SET 
  user_id = 'user_id_de_clerk',
  updated_at = NOW()
WHERE email = 'pablochavez1192@gmail.com';
*/

