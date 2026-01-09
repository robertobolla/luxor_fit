-- ============================================================================
-- ASOCIAR LUCAS AL GIMNASIO DE ROBERTO
-- ============================================================================

-- 1. Verificar si Lucas ya está en gym_members
SELECT 
  'ESTADO ACTUAL' as verificacion,
  *
FROM gym_members
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';

-- 2. Eliminar entrada existente si existe (para evitar duplicados)
DELETE FROM gym_members
WHERE empresario_id = 'user_34uyPy06eQ0wvcE3t1Z44DfmuSdX'
  AND user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';

-- 3. Insertar a Lucas en gym_members asociado a Roberto
INSERT INTO gym_members (
  empresario_id,
  user_id,
  is_active,
  joined_at,
  created_at
)
VALUES (
  'user_34uyPy06eQ0wvcE3t1Z44DfmuSdX',  -- Tu user_id (Roberto)
  'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg',  -- Lucas
  true,
  NOW(),
  NOW()
);

-- 4. Verificar que se insertó correctamente
SELECT 
  'DESPUES DE INSERTAR' as verificacion,
  *
FROM gym_members
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';

-- 5. Probar de nuevo la función RPC
SELECT 
  'PRUEBA FINAL CON GYM_MEMBERS' as estado,
  get_student_stats(
    'user_34uyPy06eQ0wvcE3t1Z44DfmuSdX',
    'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg',
    (CURRENT_DATE - 30)::DATE,
    CURRENT_DATE
  ) as resultado;

