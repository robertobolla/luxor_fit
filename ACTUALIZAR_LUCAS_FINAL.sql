-- ============================================================================
-- ACTUALIZAR LUCAS - SCRIPT FINAL CORRECTO
-- ============================================================================

-- 1. Actualizar el empresario_id de Lucas (con el user_id CORRECTO)
UPDATE gym_members
SET empresario_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

-- 2. Verificar que se actualizó
SELECT 
  'LUCAS ACTUALIZADO' as info,
  user_id,
  empresario_id,
  is_active
FROM gym_members
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

-- 3. Insertar o actualizar datos básicos de Lucas en user_profiles (si no existen)
INSERT INTO user_profiles (user_id, name, email, created_at)
VALUES (
  'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg',
  'Lucas',
  'lucas@gmail.com',
  NOW()
)
ON CONFLICT (user_id) DO UPDATE
SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email;

-- 4. Verificar user_profiles
SELECT 
  'LUCAS EN USER_PROFILES' as info,
  user_id,
  name,
  email
FROM user_profiles
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

-- 5. Probar la función get_empresario_users
SELECT 
  '🎉 PRUEBA FINAL' as info,
  *
FROM get_empresario_users('user_34Ap3niPCKLyVxhIN7f1gQVdKBo');


