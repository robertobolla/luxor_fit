-- ============================================================================
-- SOLUCION COMPLETA: Agregar rol de empresario y actualizar Lucas
-- ============================================================================

-- PASO 1: Insertar rol de empresario para tu user_id local (si no existe)
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

-- PASO 2: Verificar que tienes ambos roles (admin y empresario)
SELECT 
  'TUS ROLES' as info,
  user_id,
  role_type,
  is_active
FROM admin_roles
WHERE user_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
ORDER BY role_type;

-- PASO 3: Actualizar el empresario_id de Lucas
UPDATE gym_members
SET empresario_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

-- PASO 4: Verificar que Lucas se actualizó
SELECT 
  'LUCAS ACTUALIZADO' as info,
  user_id,
  empresario_id,
  is_active
FROM gym_members
WHERE user_id = 'user_36jQu8UX4OQ8pxqrVkoJQR4fZrg';

-- PASO 5: Probar la función
SELECT 
  '🎉 RESULTADO FINAL' as info,
  user_id,
  name,
  email,
  is_active,
  joined_at
FROM get_empresario_users('user_34Ap3niPCKLyVxhIN7f1gQVdKBo');


