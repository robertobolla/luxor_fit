-- ============================================================================
-- AGREGAR A LUCAS COMO MIEMBRO DEL GIMNASIO
-- ============================================================================

-- Verificar que Lucas NO está en gym_members
SELECT 
  'ANTES - Lucas en gym_members' as paso,
  COUNT(*) as cantidad
FROM gym_members
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

-- Insertar a Lucas en gym_members
INSERT INTO gym_members (
  user_id,
  empresario_id,
  is_active,
  joined_at,
  created_at
)
VALUES (
  'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg',  -- Lucas
  'user_34Ap3niPCKLyVxhIN7f1gQVdKBo',  -- Tu user_id (empresario/admin)
  true,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET
  empresario_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo',
  is_active = true,
  updated_at = NOW();

-- Verificar que Lucas AHORA SÍ está en gym_members
SELECT 
  'DESPUÉS - Lucas en gym_members' as paso,
  user_id,
  empresario_id,
  is_active,
  joined_at
FROM gym_members
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

-- Verificar que ahora aparece en la función
SELECT 
  'Lucas en la lista de Mis Usuarios' as paso,
  user_id,
  name,
  email,
  is_active,
  joined_at
FROM get_empresario_users('user_34Ap3niPCKLyVxhIN7f1gQVdKBo')
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

-- Ver TODOS los usuarios que devuelve la función
SELECT 
  'TODOS LOS USUARIOS' as paso,
  user_id,
  name,
  email,
  is_active,
  joined_at
FROM get_empresario_users('user_34Ap3niPCKLyVxhIN7f1gQVdKBo')
ORDER BY joined_at DESC;

