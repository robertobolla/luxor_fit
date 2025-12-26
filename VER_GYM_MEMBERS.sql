-- ============================================================================
-- VER TODOS LOS MIEMBROS DE GIMNASIO
-- ============================================================================

-- Ver todos los miembros de gym_members
SELECT 
  'TODOS LOS GYM_MEMBERS' as tabla,
  *
FROM gym_members
ORDER BY created_at DESC;

-- Ver si Lucas está ahí
SELECT 
  'LUCAS EN GYM_MEMBERS' as busqueda,
  *
FROM gym_members
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';

-- Ver con qué empresario_id está asociado Lucas
SELECT 
  'EMPRESARIO DE LUCAS' as info,
  gm.empresario_id,
  ar.email as empresario_email,
  ar.role_type,
  ar.name as empresario_name
FROM gym_members gm
LEFT JOIN admin_roles ar ON ar.user_id = gm.empresario_id
WHERE gm.user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';


