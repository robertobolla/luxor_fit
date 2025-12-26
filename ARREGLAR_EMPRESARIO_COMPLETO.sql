-- ============================================================================
-- ARREGLAR EMPRESARIO Y ASOCIAR LUCAS
-- ============================================================================

-- 1. Ver registros actuales de Roberto
SELECT 
  'REGISTROS ACTUALES DE ROBERTO' as estado,
  id,
  user_id,
  email,
  role_type,
  is_active
FROM admin_roles
WHERE email = 'robertobolla@gmail.com';

-- 2. Insertar rol de empresario para el user_id de la URL
INSERT INTO admin_roles (
  user_id,
  email,
  role_type,
  name,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'user_34uyPy06eQ0wvcE3t1Z44DfmuSdX',
  'robertobolla@gmail.com',
  'empresario',
  'Roberto Bolla',
  true,
  NOW(),
  NOW()
);

-- 3. Ver registros después de insertar
SELECT 
  'REGISTROS DESPUES DE INSERTAR' as estado,
  id,
  user_id,
  email,
  role_type,
  is_active
FROM admin_roles
WHERE email = 'robertobolla@gmail.com';

-- 4. Ahora sí, asociar a Lucas con tu gimnasio
DELETE FROM gym_members
WHERE empresario_id = 'user_34uyPy06eQ0wvcE3t1Z44DfmuSdX'
  AND user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';

INSERT INTO gym_members (
  empresario_id,
  user_id,
  is_active,
  joined_at,
  created_at
)
VALUES (
  'user_34uyPy06eQ0wvcE3t1Z44DfmuSdX',
  'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg',
  true,
  NOW(),
  NOW()
);

-- 5. Verificar que se insertó correctamente
SELECT 
  'LUCAS EN GYM_MEMBERS' as verificacion,
  *
FROM gym_members
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';

-- 6. Probar la función RPC
SELECT 
  'PRUEBA FINAL' as estado,
  get_student_stats(
    'user_34uyPy06eQ0wvcE3t1Z44DfmuSdX',
    'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg',
    (CURRENT_DATE - 30)::DATE,
    CURRENT_DATE
  ) as resultado;

