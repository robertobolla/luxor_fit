-- ============================================================================
-- SCRIPT: Unificar Usuarios Duplicados por Email
-- ============================================================================
-- Este script identifica y ayuda a unificar usuarios que tienen el mismo
-- email pero diferentes user_id (por ejemplo, uno con TikTok y otro con Gmail)
--
-- IMPORTANTE: Revisa los resultados antes de ejecutar las actualizaciones
-- ============================================================================

-- PASO 1: Identificar usuarios duplicados por email
-- Muestra todos los usuarios que comparten el mismo email
SELECT 
  email,
  COUNT(*) as cantidad_usuarios,
  STRING_AGG(user_id::text, ', ') as user_ids,
  STRING_AGG(id::text, ', ') as profile_ids
FROM user_profiles
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY cantidad_usuarios DESC, email;

-- PASO 2: Ver detalles de los usuarios duplicados
-- Reemplaza 'TU_EMAIL_AQUI' con el email que quieres revisar
SELECT 
  id,
  user_id,
  email,
  name,
  created_at,
  updated_at
FROM user_profiles
WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR ESTE EMAIL
ORDER BY created_at ASC;

-- PASO 3: Decidir cuál usuario mantener
-- Generalmente se mantiene el más antiguo (created_at más antiguo)
-- El user_id que quieres mantener será el "user_id_principal"
-- Los otros user_ids serán los que se eliminarán

-- PASO 4: Verificar qué datos tiene cada usuario
-- Revisa qué datos tiene cada perfil para decidir cuál mantener
SELECT 
  'user_id: ' || user_id as identificador,
  name,
  age,
  height,
  weight,
  fitness_level,
  created_at,
  updated_at
FROM user_profiles
WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR ESTE EMAIL
ORDER BY created_at ASC;

-- PASO 5: Unificar datos (OPCIONAL - Solo si quieres combinar datos)
-- Si un perfil tiene datos que el otro no tiene, puedes combinarlos
-- Ejemplo: Si perfil1 tiene name pero perfil2 tiene weight más reciente
UPDATE user_profiles
SET 
  name = COALESCE(name, (SELECT name FROM user_profiles WHERE email = 'TU_EMAIL_AQUI' AND user_id != user_profiles.user_id LIMIT 1)),
  age = COALESCE(age, (SELECT age FROM user_profiles WHERE email = 'TU_EMAIL_AQUI' AND user_id != user_profiles.user_id LIMIT 1)),
  height = COALESCE(height, (SELECT height FROM user_profiles WHERE email = 'TU_EMAIL_AQUI' AND user_id != user_profiles.user_id LIMIT 1)),
  weight = COALESCE(weight, (SELECT weight FROM user_profiles WHERE email = 'TU_EMAIL_AQUI' AND user_id != user_profiles.user_id LIMIT 1)),
  fitness_level = COALESCE(fitness_level, (SELECT fitness_level FROM user_profiles WHERE email = 'TU_EMAIL_AQUI' AND user_id != user_profiles.user_id LIMIT 1)),
  updated_at = NOW()
WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR ESTE EMAIL
  AND user_id = 'USER_ID_PRINCIPAL_AQUI';  -- ⚠️ CAMBIAR AL USER_ID QUE QUIERES MANTENER

-- PASO 6: Actualizar referencias en otras tablas
-- Actualizar nutrition_profiles
UPDATE nutrition_profiles
SET user_id = 'USER_ID_PRINCIPAL_AQUI'  -- ⚠️ CAMBIAR
WHERE user_id IN (
  SELECT user_id FROM user_profiles 
  WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR
    AND user_id != 'USER_ID_PRINCIPAL_AQUI'  -- ⚠️ CAMBIAR
);

-- Actualizar nutrition_targets
UPDATE nutrition_targets
SET user_id = 'USER_ID_PRINCIPAL_AQUI'  -- ⚠️ CAMBIAR
WHERE user_id IN (
  SELECT user_id FROM user_profiles 
  WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR
    AND user_id != 'USER_ID_PRINCIPAL_AQUI'  -- ⚠️ CAMBIAR
);

-- Actualizar meal_plans
UPDATE meal_plans
SET user_id = 'USER_ID_PRINCIPAL_AQUI'  -- ⚠️ CAMBIAR
WHERE user_id IN (
  SELECT user_id FROM user_profiles 
  WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR
    AND user_id != 'USER_ID_PRINCIPAL_AQUI'  -- ⚠️ CAMBIAR
);

-- Actualizar meal_logs
UPDATE meal_logs
SET user_id = 'USER_ID_PRINCIPAL_AQUI'  -- ⚠️ CAMBIAR
WHERE user_id IN (
  SELECT user_id FROM user_profiles 
  WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR
    AND user_id != 'USER_ID_PRINCIPAL_AQUI'  -- ⚠️ CAMBIAR
);

-- Actualizar progress_photos
UPDATE progress_photos
SET user_id = 'USER_ID_PRINCIPAL_AQUI'  -- ⚠️ CAMBIAR
WHERE user_id IN (
  SELECT user_id FROM user_profiles 
  WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR
    AND user_id != 'USER_ID_PRINCIPAL_AQUI'  -- ⚠️ CAMBIAR
);

-- Actualizar workout_completions
UPDATE workout_completions
SET user_id = 'USER_ID_PRINCIPAL_AQUI'  -- ⚠️ CAMBIAR
WHERE user_id IN (
  SELECT user_id FROM user_profiles 
  WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR
    AND user_id != 'USER_ID_PRINCIPAL_AQUI'  -- ⚠️ CAMBIAR
);

-- Actualizar admin_roles (si aplica)
UPDATE admin_roles
SET user_id = 'USER_ID_PRINCIPAL_AQUI'  -- ⚠️ CAMBIAR
WHERE user_id IN (
  SELECT user_id FROM user_profiles 
  WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR
    AND user_id != 'USER_ID_PRINCIPAL_AQUI'  -- ⚠️ CAMBIAR
);

-- Actualizar gym_members (si aplica)
UPDATE gym_members
SET user_id = 'USER_ID_PRINCIPAL_AQUI'  -- ⚠️ CAMBIAR
WHERE user_id IN (
  SELECT user_id FROM user_profiles 
  WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR
    AND user_id != 'USER_ID_PRINCIPAL_AQUI'  -- ⚠️ CAMBIAR
);

-- PASO 7: Eliminar perfiles duplicados
-- ⚠️ SOLO EJECUTAR DESPUÉS DE ACTUALIZAR TODAS LAS REFERENCIAS
DELETE FROM user_profiles
WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR ESTE EMAIL
  AND user_id != 'USER_ID_PRINCIPAL_AQUI';  -- ⚠️ CAMBIAR AL USER_ID QUE QUIERES MANTENER

-- PASO 8: Verificar que quedó un solo usuario
SELECT 
  id,
  user_id,
  email,
  name,
  created_at
FROM user_profiles
WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR ESTE EMAIL
ORDER BY created_at ASC;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Ejecuta los pasos 1-4 primero para identificar los duplicados
-- 2. Decide cuál user_id mantener (generalmente el más antiguo)
-- 3. Reemplaza 'TU_EMAIL_AQUI' con el email real
-- 4. Reemplaza 'USER_ID_PRINCIPAL_AQUI' con el user_id que quieres mantener
-- 5. Ejecuta los pasos 5-7 en orden
-- 6. Verifica con el paso 8 que todo quedó correcto
-- ============================================================================

