-- ============================================================================
-- CONSOLIDAR EMPRESARIO HOCKEY
-- ============================================================================
-- Problema: Hay dos empresarios para Hockey:
-- 1. temp_1763253584736_hockey_gmail_com (temporal) -> tiene a Usuario Test 1
-- 2. user_34Ap3niPCKLyVxhIN7f1gQVdKBo (real Jose Casas) -> tiene a Lucas
-- ============================================================================

-- PASO 1: Verificar el empresario real de Jose Casas
SELECT 
  '1️⃣ VERIFICAR JOSE CASAS' as paso,
  user_id,
  email,
  name,
  role_type,
  gym_name,
  is_active
FROM admin_roles
WHERE user_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo';

-- PASO 2: Si Jose Casas NO es empresario, agregarlo
DO $$
DECLARE
  v_jose_user_id TEXT := 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo';
  v_es_empresario BOOLEAN;
BEGIN
  -- Verificar si ya es empresario
  SELECT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = v_jose_user_id 
      AND role_type = 'empresario'
  ) INTO v_es_empresario;
  
  IF NOT v_es_empresario THEN
    -- Crear rol de empresario para Jose Casas
    INSERT INTO admin_roles (
      user_id,
      email,
      name,
      role_type,
      gym_name,
      monthly_fee,
      is_active
    )
    SELECT 
      v_jose_user_id,
      'hockey@gmail.com',
      'Jose Casas',
      'empresario',
      'Hockey',
      4.00,
      true
    WHERE NOT EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE user_id = v_jose_user_id 
        AND role_type = 'empresario'
    );
    
    RAISE NOTICE '✅ Rol de empresario creado para Jose Casas';
  ELSE
    RAISE NOTICE '✅ Jose Casas ya es empresario';
  END IF;
END $$;

-- PASO 3: Migrar "Usuario Test 1" del empresario temporal al real
UPDATE gym_members
SET empresario_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'
WHERE empresario_id = 'temp_1763253584736_hockey_gmail_com'
  AND user_id = 'user_35XPvY9lQNqTArqbTcKtH8TaWdC';

-- PASO 4: Verificar que ambos usuarios están ahora con el empresario real
SELECT 
  '4️⃣ USUARIOS DE JOSE CASAS (user_34Ap...)' as paso,
  gm.user_id,
  up.name,
  up.email,
  gm.empresario_id
FROM gym_members gm
LEFT JOIN user_profiles up ON up.user_id = gm.user_id
WHERE gm.empresario_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo';

-- PASO 5: Verificar que el empresario temporal ya no tiene usuarios
SELECT 
  '5️⃣ USUARIOS DEL EMPRESARIO TEMPORAL (temp_)' as paso,
  COUNT(*) as cantidad_usuarios
FROM gym_members
WHERE empresario_id = 'temp_1763253584736_hockey_gmail_com';

-- PASO 6: Desactivar el empresario temporal
UPDATE admin_roles
SET is_active = false
WHERE user_id = 'temp_1763253584736_hockey_gmail_com'
  AND role_type = 'empresario';

-- PASO 7: Verificar el resultado final
SELECT 
  '7️⃣ EMPRESARIOS HOCKEY ACTIVOS' as paso,
  user_id,
  email,
  name,
  gym_name,
  is_active,
  CASE 
    WHEN user_id LIKE 'temp_%' THEN '⚠️ TEMPORAL'
    WHEN user_id LIKE 'user_%' THEN '✅ REAL'
    ELSE '❓ OTRO'
  END as tipo
FROM admin_roles
WHERE role_type = 'empresario'
  AND (LOWER(gym_name) LIKE '%hockey%' OR email = 'hockey@gmail.com')
ORDER BY is_active DESC, user_id;

-- PASO 8: Ver la vista empresario_stats actualizada
SELECT 
  '8️⃣ STATS DE HOCKEY' as paso,
  empresario_id,
  gym_name,
  empresario_email,
  total_members,
  active_members
FROM empresario_stats
WHERE LOWER(gym_name) LIKE '%hockey%';

-- PASO 9: Probar la función get_empresario_users con el empresario real
SELECT 
  '9️⃣ FUNCIÓN get_empresario_users (Jose Casas REAL)' as paso,
  *
FROM get_empresario_users('user_34Ap3niPCKLyVxhIN7f1gQVdKBo');

-- Mensaje final
SELECT 
  '✅ CONSOLIDACIÓN COMPLETADA' as resultado,
  'Todos los usuarios de Hockey ahora están bajo el empresario real de Jose Casas' as descripcion;

