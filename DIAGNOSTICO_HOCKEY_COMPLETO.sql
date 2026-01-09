-- ============================================================================
-- DIAGNÓSTICO COMPLETO HOCKEY
-- ============================================================================

-- 1. Ver TODOS los empresarios (incluyendo los temp)
SELECT 
  '1️⃣ TODOS LOS EMPRESARIOS' as paso,
  user_id,
  email,
  name,
  gym_name,
  is_active,
  created_at,
  CASE 
    WHEN user_id LIKE 'temp_%' THEN '⚠️ TEMPORAL'
    WHEN user_id LIKE 'user_%' THEN '✅ REAL (Clerk)'
    ELSE '❓ OTRO'
  END as tipo_id
FROM admin_roles
WHERE role_type = 'empresario'
ORDER BY created_at DESC;

-- 2. Buscar al usuario real "Jose Casas" en admin_roles
SELECT 
  '2️⃣ JOSE CASAS COMO USUARIO' as paso,
  user_id,
  email,
  name,
  role_type,
  is_active
FROM admin_roles
WHERE LOWER(name) LIKE '%jose%' OR LOWER(email) LIKE '%hockey%' OR email = 'hockey@gmail.com'
ORDER BY role_type, created_at;

-- 3. Ver TODOS los usuarios en gym_members para Hockey (temp)
SELECT 
  '3️⃣ USUARIOS DEL HOCKEY TEMPORAL' as paso,
  gm.user_id,
  up.name as nombre,
  up.email,
  gm.empresario_id,
  gm.is_active,
  gm.joined_at
FROM gym_members gm
LEFT JOIN user_profiles up ON up.user_id = gm.user_id
WHERE gm.empresario_id = 'temp_1763253584736_hockey_gmail_com'
ORDER BY gm.joined_at DESC;

-- 4. Ver si hay usuarios asignados a otros empresarios que podrían ser Hockey
SELECT 
  '4️⃣ USUARIOS EN OTROS EMPRESARIOS' as paso,
  gm.user_id,
  up.name as nombre,
  up.email,
  gm.empresario_id,
  ar.gym_name,
  ar.email as empresario_email,
  gm.is_active
FROM gym_members gm
LEFT JOIN user_profiles up ON up.user_id = gm.user_id
LEFT JOIN admin_roles ar ON ar.user_id = gm.empresario_id AND ar.role_type = 'empresario'
WHERE gm.empresario_id != 'temp_1763253584736_hockey_gmail_com'
  OR gm.empresario_id IS NULL
ORDER BY ar.gym_name, up.name;

-- 5. Buscar específicamente a Lucas
SELECT 
  '5️⃣ DONDE ESTÁ LUCAS' as paso,
  gm.user_id as lucas_user_id,
  up.name,
  up.email,
  gm.empresario_id,
  ar.gym_name as gimnasio,
  ar.email as empresario_email,
  ar.name as empresario_nombre,
  CASE 
    WHEN gm.empresario_id LIKE 'temp_%' THEN '⚠️ EMPRESARIO TEMPORAL'
    WHEN gm.empresario_id LIKE 'user_%' THEN '✅ EMPRESARIO REAL'
    ELSE '❓ OTRO'
  END as tipo_empresario
FROM gym_members gm
LEFT JOIN user_profiles up ON up.user_id = gm.user_id
LEFT JOIN admin_roles ar ON ar.user_id = gm.empresario_id AND ar.role_type = 'empresario'
WHERE LOWER(up.name) LIKE '%lucas%';

-- 6. Buscar "Usuario Test 1"
SELECT 
  '6️⃣ DONDE ESTÁ USUARIO TEST 1' as paso,
  gm.user_id,
  up.name,
  up.email,
  gm.empresario_id,
  ar.gym_name as gimnasio,
  ar.email as empresario_email,
  ar.name as empresario_nombre,
  CASE 
    WHEN gm.empresario_id LIKE 'temp_%' THEN '⚠️ EMPRESARIO TEMPORAL'
    WHEN gm.empresario_id LIKE 'user_%' THEN '✅ EMPRESARIO REAL'
    ELSE '❓ OTRO'
  END as tipo_empresario
FROM gym_members gm
LEFT JOIN user_profiles up ON up.user_id = gm.user_id
LEFT JOIN admin_roles ar ON ar.user_id = gm.empresario_id AND ar.role_type = 'empresario'
WHERE LOWER(up.name) LIKE '%test%' OR LOWER(up.name) LIKE '%usuario test%';

-- 7. Ver cuántos usuarios tiene cada empresario según la función
SELECT 
  '7️⃣ CONTEO POR EMPRESARIO (VIA FUNCIÓN)' as paso,
  ar.user_id as empresario_id,
  ar.gym_name,
  ar.email as empresario_email,
  (SELECT COUNT(*) FROM get_empresario_users(ar.user_id)) as usuarios_segun_funcion,
  ar.is_active,
  CASE 
    WHEN ar.user_id LIKE 'temp_%' THEN '⚠️ TEMPORAL'
    WHEN ar.user_id LIKE 'user_%' THEN '✅ REAL'
    ELSE '❓ OTRO'
  END as tipo_id
FROM admin_roles ar
WHERE ar.role_type = 'empresario'
  AND ar.is_active = true
ORDER BY usuarios_segun_funcion DESC;

