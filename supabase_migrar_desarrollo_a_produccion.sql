-- ============================================================================
-- SCRIPT: Migrar Datos de Desarrollo a Producción
-- ============================================================================
-- Este script migra los datos de usuarios de desarrollo (pk_test_) 
-- a usuarios de producción (pk_live_) usando el email como identificador común
--
-- IMPORTANTE: 
-- 1. Haz un backup de tu base de datos antes de ejecutar
-- 2. Verifica que los user_id de producción son correctos
-- 3. Ejecuta primero las queries de verificación
-- ============================================================================

-- ============================================================================
-- PASO 1: VERIFICACIÓN - Ver qué usuarios necesitan migración
-- ============================================================================
-- Ejecuta esto primero para ver qué usuarios tienen datos en desarrollo

SELECT 
  up.user_id as user_id_desarrollo,
  up.email,
  up.name,
  up.created_at as fecha_creacion,
  'Necesita user_id de producción' as accion_requerida
FROM user_profiles up
WHERE up.email IS NOT NULL
ORDER BY up.created_at DESC;

-- ============================================================================
-- PASO 2: MIGRACIÓN INDIVIDUAL - Para un usuario específico
-- ============================================================================
-- Reemplaza estos valores:
-- - 'TU_EMAIL_AQUI' con el email del usuario
-- - 'USER_ID_PRODUCCION_AQUI' con el user_id de producción (de Clerk Live Mode)

-- ⚠️ CAMBIAR ESTOS VALORES ANTES DE EJECUTAR:
-- ============================================
-- EMAIL_DEL_USUARIO: El email del usuario a migrar
-- USER_ID_PRODUCCION: El user_id de producción (obtenido de Clerk Dashboard - Live Mode)

-- Ejemplo:
-- EMAIL_DEL_USUARIO = 'roberto@ejemplo.com'
-- USER_ID_PRODUCCION = 'user_2abc123xyz456'

-- ============================================================================
-- PASO 3: ACTUALIZAR user_profiles
-- ============================================================================

-- Primero, verifica qué registro se va a actualizar:
SELECT 
  id,
  user_id as user_id_actual,
  email,
  name,
  created_at
FROM user_profiles
WHERE email = 'TU_EMAIL_AQUI';  -- ⚠️ CAMBIAR

-- Actualizar el user_id en user_profiles
UPDATE user_profiles
SET 
  user_id = 'USER_ID_PRODUCCION_AQUI',  -- ⚠️ CAMBIAR
  updated_at = NOW()
WHERE email = 'TU_EMAIL_AQUI'  -- ⚠️ CAMBIAR
  AND user_id != 'USER_ID_PRODUCCION_AQUI';  -- Solo actualizar si es diferente

-- ============================================================================
-- PASO 4: MIGRAR TABLAS RELACIONADAS
-- ============================================================================

-- Obtener el user_id de desarrollo (antes de actualizarlo)
-- Guarda este valor para usarlo en las siguientes queries
-- (O ejecuta las queries antes de actualizar user_profiles)

-- Variable temporal (en PostgreSQL puedes usar DO block)
DO $$
DECLARE
  old_user_id TEXT;
  new_user_id TEXT := 'USER_ID_PRODUCCION_AQUI';  -- ⚠️ CAMBIAR
  user_email TEXT := 'TU_EMAIL_AQUI';  -- ⚠️ CAMBIAR
BEGIN
  -- Obtener el user_id de desarrollo
  SELECT user_id INTO old_user_id
  FROM user_profiles
  WHERE email = user_email
  LIMIT 1;
  
  -- Si no encontramos el user_id de desarrollo, significa que ya fue migrado
  IF old_user_id IS NULL OR old_user_id = new_user_id THEN
    RAISE NOTICE 'Usuario ya migrado o no encontrado';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Migrando datos de % a %', old_user_id, new_user_id;
  
  -- Actualizar nutrition_profiles
  UPDATE nutrition_profiles
  SET user_id = new_user_id
  WHERE user_id = old_user_id;
  
  -- Actualizar nutrition_targets
  UPDATE nutrition_targets
  SET user_id = new_user_id
  WHERE user_id = old_user_id;
  
  -- Actualizar meal_plans
  UPDATE meal_plans
  SET user_id = new_user_id
  WHERE user_id = old_user_id;
  
  -- Actualizar meal_logs
  UPDATE meal_logs
  SET user_id = new_user_id
  WHERE user_id = old_user_id;
  
  -- Actualizar progress_photos
  UPDATE progress_photos
  SET user_id = new_user_id
  WHERE user_id = old_user_id;
  
  -- Actualizar workout_completions
  UPDATE workout_completions
  SET user_id = new_user_id
  WHERE user_id = old_user_id;
  
  -- Actualizar admin_roles
  UPDATE admin_roles
  SET user_id = new_user_id
  WHERE user_id = old_user_id;
  
  -- Actualizar gym_members
  UPDATE gym_members
  SET user_id = new_user_id
  WHERE user_id = old_user_id;
  
  -- Actualizar user_profiles (ya lo hicimos arriba, pero por si acaso)
  UPDATE user_profiles
  SET user_id = new_user_id, updated_at = NOW()
  WHERE user_id = old_user_id;
  
  RAISE NOTICE '✅ Migración completada';
END $$;

-- ============================================================================
-- ALTERNATIVA: Si no puedes usar DO block, ejecuta estas queries manualmente
-- ============================================================================
-- Primero obtén el user_id de desarrollo ejecutando:
-- SELECT user_id FROM user_profiles WHERE email = 'TU_EMAIL_AQUI';
-- Luego reemplaza 'USER_ID_DESARROLLO_AQUI' con ese valor

-- Actualizar nutrition_profiles
UPDATE nutrition_profiles
SET user_id = 'USER_ID_PRODUCCION_AQUI'  -- ⚠️ CAMBIAR
WHERE user_id = 'USER_ID_DESARROLLO_AQUI';  -- ⚠️ CAMBIAR

-- Actualizar nutrition_targets
UPDATE nutrition_targets
SET user_id = 'USER_ID_PRODUCCION_AQUI'  -- ⚠️ CAMBIAR
WHERE user_id = 'USER_ID_DESARROLLO_AQUI';  -- ⚠️ CAMBIAR

-- Actualizar meal_plans
UPDATE meal_plans
SET user_id = 'USER_ID_PRODUCCION_AQUI'  -- ⚠️ CAMBIAR
WHERE user_id = 'USER_ID_DESARROLLO_AQUI';  -- ⚠️ CAMBIAR

-- Actualizar meal_logs
UPDATE meal_logs
SET user_id = 'USER_ID_PRODUCCION_AQUI'  -- ⚠️ CAMBIAR
WHERE user_id = 'USER_ID_DESARROLLO_AQUI';  -- ⚠️ CAMBIAR

-- Actualizar progress_photos
UPDATE progress_photos
SET user_id = 'USER_ID_PRODUCCION_AQUI'  -- ⚠️ CAMBIAR
WHERE user_id = 'USER_ID_DESARROLLO_AQUI';  -- ⚠️ CAMBIAR

-- Actualizar workout_completions
UPDATE workout_completions
SET user_id = 'USER_ID_PRODUCCION_AQUI'  -- ⚠️ CAMBIAR
WHERE user_id = 'USER_ID_DESARROLLO_AQUI';  -- ⚠️ CAMBIAR

-- Actualizar admin_roles
UPDATE admin_roles
SET user_id = 'USER_ID_PRODUCCION_AQUI'  -- ⚠️ CAMBIAR
WHERE user_id = 'USER_ID_DESARROLLO_AQUI';  -- ⚠️ CAMBIAR

-- Actualizar gym_members
UPDATE gym_members
SET user_id = 'USER_ID_PRODUCCION_AQUI'  -- ⚠️ CAMBIAR
WHERE user_id = 'USER_ID_DESARROLLO_AQUI';  -- ⚠️ CAMBIAR

-- ============================================================================
-- PASO 5: VERIFICACIÓN - Confirmar que la migración fue exitosa
-- ============================================================================

-- Verificar que el usuario tiene datos con el nuevo user_id
SELECT 
  'user_profiles' as tabla,
  COUNT(*) as registros
FROM user_profiles
WHERE user_id = 'USER_ID_PRODUCCION_AQUI'  -- ⚠️ CAMBIAR
UNION ALL
SELECT 
  'nutrition_profiles' as tabla,
  COUNT(*) as registros
FROM nutrition_profiles
WHERE user_id = 'USER_ID_PRODUCCION_AQUI'  -- ⚠️ CAMBIAR
UNION ALL
SELECT 
  'workout_completions' as tabla,
  COUNT(*) as registros
FROM workout_completions
WHERE user_id = 'USER_ID_PRODUCCION_AQUI';  -- ⚠️ CAMBIAR

-- Verificar que no quedan datos con el user_id de desarrollo
SELECT 
  'user_profiles' as tabla,
  COUNT(*) as registros_restantes
FROM user_profiles
WHERE user_id = 'USER_ID_DESARROLLO_AQUI'  -- ⚠️ CAMBIAR
UNION ALL
SELECT 
  'nutrition_profiles' as tabla,
  COUNT(*) as registros_restantes
FROM nutrition_profiles
WHERE user_id = 'USER_ID_DESARROLLO_AQUI'  -- ⚠️ CAMBIAR
UNION ALL
SELECT 
  'workout_completions' as tabla,
  COUNT(*) as registros_restantes
FROM workout_completions
WHERE user_id = 'USER_ID_DESARROLLO_AQUI';  -- ⚠️ CAMBIAR

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Ejecuta el PASO 1 primero para ver qué usuarios necesitan migración
-- 2. Para cada usuario, obtén su user_id de producción desde Clerk Dashboard
-- 3. Reemplaza 'TU_EMAIL_AQUI' y 'USER_ID_PRODUCCION_AQUI' en el script
-- 4. Ejecuta el PASO 3 (DO block) o la alternativa manual
-- 5. Verifica con el PASO 5 que todo se migró correctamente
-- 6. Una vez confirmado, puedes eliminar los registros de desarrollo si quieres
-- ============================================================================

