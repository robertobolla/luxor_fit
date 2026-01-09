-- ============================================================================
-- ACTUALIZAR EMPRESARIO_ID DE LUCAS AL USER_ID LOCAL
-- ============================================================================

-- 1. Ver estado actual
SELECT 
  'ESTADO ACTUAL' as info,
  id,
  empresario_id,
  user_id,
  is_active
FROM gym_members
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';

-- 2. Actualizar el empresario_id al user_id local de Clerk
UPDATE gym_members
SET empresario_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';

-- 3. Ver estado después de actualizar
SELECT 
  'ESTADO ACTUALIZADO' as info,
  id,
  empresario_id,
  user_id,
  is_active
FROM gym_members
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';

-- 4. Verificar que Roberto tiene el rol de empresario con este user_id
SELECT 
  'VERIFICAR ROL DE EMPRESARIO' as info,
  user_id,
  email,
  role_type,
  is_active
FROM admin_roles
WHERE user_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
  AND role_type = 'empresario';

-- 5. Si no existe, insertar el rol de empresario para el user_id local
INSERT INTO admin_roles (
  user_id,
  email,
  role_type,
  name,
  is_active,
  created_at,
  updated_at
)
SELECT 
  'user_34Ap3niPCKLyVxhIN7f1gQVdKBo',
  'robertobolla@gmail.com',
  'empresario',
  'Roberto Bolla',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM admin_roles
  WHERE user_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
    AND role_type = 'empresario'
);

-- 6. Verificar que ahora sí existe el rol
SELECT 
  'ROL DESPUES DE INSERT' as info,
  user_id,
  email,
  role_type,
  is_active
FROM admin_roles
WHERE user_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo';

