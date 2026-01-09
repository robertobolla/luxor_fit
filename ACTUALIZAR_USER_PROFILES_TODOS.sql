-- ============================================================================
-- ACTUALIZAR USER_PROFILES PARA TODOS LOS USUARIOS
-- ============================================================================

-- Ver los 3 usuarios de gym_members
SELECT 
  'USUARIOS EN GYM_MEMBERS' as info,
  user_id,
  is_active,
  joined_at
FROM gym_members
ORDER BY joined_at DESC
LIMIT 10;

-- Ver si tienen datos en user_profiles
SELECT 
  'USER_PROFILES ACTUALES' as info,
  gm.user_id,
  up.name,
  up.email
FROM gym_members gm
LEFT JOIN user_profiles up ON up.user_id = gm.user_id
ORDER BY gm.joined_at DESC
LIMIT 10;

-- Insertar datos básicos para los usuarios que no tienen
INSERT INTO user_profiles (user_id, name, email, created_at)
VALUES
  ('user_36jQu8UX4OQ8pxqrVkoJQR4fZrg', 'Lucas', 'lucas@gmail.com', NOW()),
  ('user_35XPvY9lQhqT4rqbTcKlrN8TmUG', 'Usuario Test 1', 'test1@gmail.com', NOW()),
  ('user_34udLUEndtzCQem89QJg9Mp2Mtp', 'Usuario Test 2', 'test2@gmail.com', NOW())
ON CONFLICT (user_id) DO UPDATE
SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email;

-- Verificar que se actualizaron
SELECT 
  'USER_PROFILES ACTUALIZADOS' as info,
  gm.user_id,
  up.name,
  up.email,
  gm.joined_at
FROM gym_members gm
LEFT JOIN user_profiles up ON up.user_id = gm.user_id
ORDER BY gm.joined_at DESC
LIMIT 10;

-- Probar la función de nuevo
SELECT 
  '🎉 USUARIOS CON DATOS' as info,
  *
FROM get_empresario_users('user_34Ap3niPCKLyVxhIN7f1gQVdKBo')
ORDER BY joined_at DESC;

