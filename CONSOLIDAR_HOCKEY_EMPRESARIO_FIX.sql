-- ============================================================================
-- CONSOLIDAR EMPRESARIO HOCKEY - CORREGIDO
-- ============================================================================
-- Problema: Hay dos empresarios para Hockey:
-- 1. temp_1763253584736_hockey_gmail_com (temporal) -> tiene a Usuario Test 1
-- 2. user_34Ap3niPCKLyVxhIN7f1gQVdKBo (real Jose Casas) -> tiene a Lucas
-- ============================================================================

-- PASO 1: Ver qué rol tiene Jose Casas actualmente
SELECT 
  '1️⃣ ROL ACTUAL DE JOSE CASAS' as paso,
  user_id,
  email,
  name,
  role_type,
  gym_name,
  monthly_fee,
  is_active
FROM admin_roles
WHERE user_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo';

-- PASO 2: Actualizar el rol existente de Jose Casas para agregar datos de empresario
DO $$
DECLARE
  v_jose_user_id TEXT := 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo';
  v_current_role TEXT;
BEGIN
  -- Obtener el rol actual
  SELECT role_type INTO v_current_role
  FROM admin_roles
  WHERE user_id = v_jose_user_id;
  
  IF v_current_role IS NULL THEN
    -- No existe, crear nuevo
    INSERT INTO admin_roles (
      user_id,
      email,
      name,
      role_type,
      gym_name,
      monthly_fee,
      is_active
    ) VALUES (
      v_jose_user_id,
      'hockey@gmail.com',
      'Jose Casas',
      'empresario',
      'Hockey',
      4.00,
      true
    );
    RAISE NOTICE '✅ Rol de empresario creado para Jose Casas';
    
  ELSIF v_current_role = 'admin' THEN
    -- Es admin, cambiar a empresario
    UPDATE admin_roles
    SET 
      role_type = 'empresario',
      gym_name = 'Hockey',
      monthly_fee = 4.00,
      email = COALESCE(email, 'hockey@gmail.com'),
      name = COALESCE(name, 'Jose Casas')
    WHERE user_id = v_jose_user_id;
    
    RAISE NOTICE '✅ Jose Casas cambiado de ADMIN a EMPRESARIO';
    RAISE NOTICE '✅ Datos de gimnasio Hockey configurados';
    
  ELSE
    -- Tiene otro rol, convertir a empresario
    UPDATE admin_roles
    SET 
      role_type = 'empresario',
      gym_name = 'Hockey',
      monthly_fee = 4.00,
      email = COALESCE(email, 'hockey@gmail.com'),
      name = COALESCE(name, 'Jose Casas')
    WHERE user_id = v_jose_user_id;
    
    RAISE NOTICE '✅ Rol de Jose Casas cambiado a empresario';
  END IF;
END $$;

-- PASO 3: Migrar "Usuario Test 1" del empresario temporal al real
UPDATE gym_members
SET empresario_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
WHERE empresario_id = 'temp_1763253584736_hockey_gmail_com'
  AND user_id = 'user_35XPvY9lQNqTArqbTcKtH8TaWdC';

SELECT 
  '3️⃣ USUARIO TEST 1 MIGRADO' as paso,
  '✅ Usuario Test 1 ahora está bajo Jose Casas' as resultado;

-- PASO 4: Verificar que ambos usuarios están ahora con el empresario real
SELECT 
  '4️⃣ USUARIOS DE JOSE CASAS (user_34Ap...)' as paso,
  gm.user_id,
  up.name,
  up.email,
  gm.empresario_id,
  gm.is_active
FROM gym_members gm
LEFT JOIN user_profiles up ON up.user_id = gm.user_id
WHERE gm.empresario_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
ORDER BY up.name;

-- PASO 5: Verificar que el empresario temporal ya no tiene usuarios
SELECT 
  '5️⃣ USUARIOS DEL EMPRESARIO TEMPORAL (temp_)' as paso,
  COUNT(*) as cantidad_usuarios
FROM gym_members
WHERE empresario_id = 'temp_1763253584736_hockey_gmail_com';

-- PASO 6: Renombrar y desactivar el empresario temporal
UPDATE admin_roles
SET 
  gym_name = 'Hockey 2',
  is_active = false
WHERE user_id = 'temp_1763253584736_hockey_gmail_com'
  AND role_type = 'empresario';

SELECT 
  '6️⃣ EMPRESARIO TEMPORAL RENOMBRADO Y DESACTIVADO' as paso,
  '✅ Renombrado a "Hockey 2" y desactivado' as resultado;

-- PASO 7: Verificar el resultado final - rol de Jose Casas
SELECT 
  '7️⃣ ROL FINAL DE JOSE CASAS' as paso,
  user_id,
  email,
  name,
  role_type,
  gym_name,
  monthly_fee,
  is_active
FROM admin_roles
WHERE user_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo';

-- PASO 8: Ver todos los empresarios Hockey activos
SELECT 
  '8️⃣ EMPRESARIOS HOCKEY ACTIVOS' as paso,
  user_id,
  email,
  name,
  gym_name,
  role_type,
  is_active,
  CASE 
    WHEN user_id LIKE 'temp_%' THEN '⚠️ TEMPORAL'
    WHEN user_id LIKE 'user_%' THEN '✅ REAL'
    ELSE '❓ OTRO'
  END as tipo
FROM admin_roles
WHERE (LOWER(gym_name) LIKE '%hockey%' OR LOWER(email) LIKE '%hockey%')
ORDER BY is_active DESC, user_id;

-- PASO 9: Probar la función get_empresario_users con el empresario real
SELECT 
  '9️⃣ FUNCIÓN get_empresario_users (Jose Casas REAL)' as paso,
  *
FROM get_empresario_users('user_34Ap3niPCKLyVxhIN7f1gQVdKBo');

-- PASO 10: Agregar constraint único para gym_name
-- Esto previene gimnasios duplicados en el futuro
DO $$
BEGIN
  -- Verificar si el constraint ya existe
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'admin_roles_gym_name_unique'
  ) THEN
    RAISE NOTICE '✅ Constraint único ya existe para gym_name';
  ELSE
    -- Agregar constraint único para gym_name donde role_type = 'empresario'
    -- Usar índice único parcial en lugar de constraint de tabla
    CREATE UNIQUE INDEX admin_roles_gym_name_unique 
    ON admin_roles (LOWER(gym_name)) 
    WHERE role_type = 'empresario' AND is_active = true;
    
    RAISE NOTICE '✅ Constraint único agregado para gym_name';
  END IF;
END $$;

SELECT 
  '🔒 CONSTRAINT ÚNICO AGREGADO' as paso,
  'Los nombres de gimnasios activos ahora son únicos' as resultado;

-- Mensaje final
SELECT 
  '✅ CONSOLIDACIÓN COMPLETADA' as resultado,
  'Jose Casas ahora es EMPRESARIO de Hockey' as nota,
  'Ambos usuarios (Lucas y Usuario Test 1) están bajo su gestión' as explicacion,
  'El empresario temporal fue renombrado a "Hockey 2" y desactivado' as extra;

