-- ============================================================================
-- DIAGNÓSTICO: Por qué se ven usuarios diferentes en Hockey
-- ============================================================================

-- 1. Ver todos los empresarios llamados "Jose Casas" o con gimnasio "Hockey"
SELECT 
  '1️⃣ EMPRESARIOS HOCKEY/JOSE CASAS' as paso,
  user_id as empresario_id,
  email,
  name,
  gym_name,
  is_active
FROM admin_roles
WHERE role_type = 'empresario'
  AND (LOWER(name) LIKE '%jose%' OR LOWER(gym_name) LIKE '%hockey%')
ORDER BY created_at DESC;

-- 2. Ver TODOS los usuarios en gym_members y a qué empresario pertenecen
SELECT 
  '2️⃣ TODOS LOS USUARIOS EN GYM_MEMBERS' as paso,
  gm.user_id,
  up.name as usuario_nombre,
  up.email as usuario_email,
  gm.empresario_id,
  ar.gym_name as gimnasio,
  ar.name as empresario_nombre,
  gm.is_active
FROM gym_members gm
LEFT JOIN user_profiles up ON up.user_id = gm.user_id
LEFT JOIN admin_roles ar ON ar.user_id = gm.empresario_id AND ar.role_type = 'empresario'
ORDER BY ar.gym_name, up.name;

-- 3. Buscar específicamente a Lucas
SELECT 
  '3️⃣ LUCAS EN GYM_MEMBERS' as paso,
  gm.user_id,
  up.name,
  up.email,
  gm.empresario_id,
  ar.gym_name as gimnasio,
  ar.name as nombre_empresario,
  gm.is_active
FROM gym_members gm
LEFT JOIN user_profiles up ON up.user_id = gm.user_id
LEFT JOIN admin_roles ar ON ar.user_id = gm.empresario_id AND ar.role_type = 'empresario'
WHERE LOWER(up.name) LIKE '%lucas%';

-- 4. Buscar a "Usuario Test 1"
SELECT 
  '4️⃣ USUARIO TEST 1 EN GYM_MEMBERS' as paso,
  gm.user_id,
  up.name,
  up.email,
  gm.empresario_id,
  ar.gym_name as gimnasio,
  ar.name as nombre_empresario,
  gm.is_active
FROM gym_members gm
LEFT JOIN user_profiles up ON up.user_id = gm.user_id
LEFT JOIN admin_roles ar ON ar.user_id = gm.empresario_id AND ar.role_type = 'empresario'
WHERE LOWER(up.name) LIKE '%test%';

-- 5. Probar la función get_empresario_users con CADA empresario de Hockey
-- Primero, obtener el empresario_id de Hockey
DO $$
DECLARE
  v_empresario_id TEXT;
  v_gym_name TEXT;
BEGIN
  FOR v_empresario_id, v_gym_name IN 
    SELECT user_id, gym_name 
    FROM admin_roles 
    WHERE role_type = 'empresario' 
      AND (LOWER(name) LIKE '%jose%' OR LOWER(gym_name) LIKE '%hockey%')
  LOOP
    RAISE NOTICE '5️⃣ PROBANDO FUNCION get_empresario_users para: % (%)', v_gym_name, v_empresario_id;
    
    PERFORM * FROM get_empresario_users(v_empresario_id);
  END LOOP;
END $$;

-- 6. Ver los resultados de la función para cada empresario
SELECT 
  '6️⃣ USUARIOS DESDE FUNCIÓN (Hockey)' as paso,
  ar.gym_name,
  ar.user_id as empresario_id,
  (SELECT COUNT(*) FROM get_empresario_users(ar.user_id)) as cantidad_usuarios
FROM admin_roles ar
WHERE ar.role_type = 'empresario'
  AND (LOWER(ar.name) LIKE '%jose%' OR LOWER(ar.gym_name) LIKE '%hockey%');

-- 7. Ver la vista empresario_stats para Hockey
SELECT 
  '7️⃣ STATS DE HOCKEY' as paso,
  *
FROM empresario_stats
WHERE LOWER(gym_name) LIKE '%hockey%' OR LOWER(empresario_name) LIKE '%jose%';

-- 8. Ver si hay múltiples empresarios con el mismo gimnasio
SELECT 
  '8️⃣ EMPRESARIOS DUPLICADOS?' as paso,
  gym_name,
  COUNT(*) as cantidad,
  STRING_AGG(user_id, ', ') as empresario_ids
FROM admin_roles
WHERE role_type = 'empresario'
  AND is_active = true
GROUP BY gym_name
HAVING COUNT(*) > 1;

