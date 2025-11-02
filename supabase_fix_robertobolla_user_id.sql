-- ============================================================================
-- CORREGIR user_id de robertobolla9@gmail.com
-- ============================================================================
-- El user_id en admin_roles tiene "s00" pero Clerk usa "sO0" (O mayúscula)

-- Primero, verificar qué registros existen
SELECT 
  id,
  user_id,
  email,
  role_type,
  is_active
FROM admin_roles
WHERE 
  user_id IN ('user_34uvPy06sO0wcE3tfZ44DTmuSdX', 'user_34uvPy06s00wcE3tfZ44DTmuSdX')
  OR email = 'robertobolla9@gmail.com'
ORDER BY created_at DESC;

-- Paso 1: Si existe un registro con el user_id correcto (sO0), actualizarlo
UPDATE admin_roles
SET 
  email = 'robertobolla9@gmail.com',
  role_type = 'admin',
  is_active = true,
  updated_at = NOW()
WHERE user_id = 'user_34uvPy06sO0wcE3tfZ44DTmuSdX';

-- Paso 2: Si existe un registro con el user_id incorrecto (s00), eliminarlo
-- (solo si no es el mismo que el del paso 1)
DELETE FROM admin_roles
WHERE user_id = 'user_34uvPy06s00wcE3tfZ44DTmuSdX'
  AND user_id != 'user_34uvPy06sO0wcE3tfZ44DTmuSdX';

-- Paso 3: Si NO existe ningún registro con el user_id correcto, crear uno nuevo
INSERT INTO admin_roles (user_id, email, role_type, name, is_active, created_at, updated_at)
SELECT 
  'user_34uvPy06sO0wcE3tfZ44DTmuSdX',
  'robertobolla9@gmail.com',
  'admin',
  'Roberto Bolla',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM admin_roles WHERE user_id = 'user_34uvPy06sO0wcE3tfZ44DTmuSdX'
);

-- Verificar el resultado final
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
WHERE email = 'robertobolla9@gmail.com'
   OR user_id = 'user_34uvPy06sO0wcE3tfZ44DTmuSdX'
ORDER BY updated_at DESC;
