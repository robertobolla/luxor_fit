-- ============================================================================
-- ACTUALIZAR EMPRESARIO_ID DE LUCAS AL USER_ID LOCAL CORRECTO
-- ============================================================================

-- Ver estado actual de Lucas
SELECT 
  'ESTADO ACTUAL DE LUCAS' as paso,
  user_id,
  empresario_id as empresario_actual,
  is_active
FROM gym_members
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

-- Actualizar el empresario_id al user_id local correcto
UPDATE gym_members
SET empresario_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

-- Ver estado después de actualizar
SELECT 
  'ESTADO ACTUALIZADO DE LUCAS' as paso,
  user_id,
  empresario_id as empresario_nuevo,
  is_active
FROM gym_members
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

-- Probar la función get_empresario_users con el user_id local
SELECT 
  'PRUEBA FINAL' as paso,
  *
FROM get_empresario_users('user_34Ap3niPCKLyVxhIN7f1gQVdKBo');


