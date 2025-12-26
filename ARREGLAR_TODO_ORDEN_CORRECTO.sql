-- ============================================================================
-- ARREGLAR TODO EN EL ORDEN CORRECTO
-- ============================================================================

-- PASO 1: Verificar roles actuales de Roberto
SELECT 
  'PASO 1: ROLES ACTUALES' as info,
  user_id,
  email,
  role_type,
  is_active
FROM admin_roles
WHERE email = 'robertobolla@gmail.com'
ORDER BY role_type;

-- PASO 2: Insertar rol de empresario para el user_id local si no existe
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

-- PASO 3: Verificar que se insertó el rol
SELECT 
  'PASO 3: ROLES DESPUES DE INSERT' as info,
  user_id,
  email,
  role_type,
  is_active
FROM admin_roles
WHERE email = 'robertobolla@gmail.com'
ORDER BY role_type;

-- PASO 4: Ver estado actual de Lucas en gym_members
SELECT 
  'PASO 4: LUCAS ANTES' as info,
  id,
  empresario_id as empresario_id_actual,
  user_id,
  is_active
FROM gym_members
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';

-- PASO 5: Actualizar el empresario_id de Lucas al user_id local
UPDATE gym_members
SET empresario_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';

-- PASO 6: Ver estado después de actualizar
SELECT 
  'PASO 6: LUCAS DESPUES' as info,
  id,
  empresario_id as empresario_id_nuevo,
  user_id,
  is_active
FROM gym_members
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';

-- PASO 7: Probar la función RPC con el user_id local
SELECT 
  'PASO 7: PRUEBA RPC' as info,
  get_student_stats(
    'user_34Ap3niPCKLyVxhIN7f1gQVdKBo',  -- Tu user_id local
    'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg',  -- Lucas
    (CURRENT_DATE - 30)::DATE,
    CURRENT_DATE
  ) as resultado;


