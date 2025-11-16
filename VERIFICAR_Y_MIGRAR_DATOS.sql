-- ============================================================================
-- VERIFICAR Y MIGRAR DATOS DE DESARROLLO A PRODUCCIÓN
-- ============================================================================
-- Este script te ayuda a verificar si tienes datos en desarrollo
-- y migrarlos a producción usando tu email
-- ============================================================================

-- PASO 1: Ver todos los usuarios con tu email
-- Reemplaza 'robertobolla9@gmail.com' con tu email real
SELECT 
  user_id,
  email,
  name,
  created_at,
  CASE 
    WHEN user_id LIKE 'user_%' AND user_id NOT LIKE 'temp_%' THEN 'Posible producción'
    WHEN user_id LIKE 'temp_%' THEN 'Temporal'
    ELSE 'Otro formato'
  END as tipo_user_id
FROM user_profiles
WHERE email = 'robertobolla9@gmail.com'  -- ⚠️ CAMBIAR A TU EMAIL
ORDER BY created_at DESC;

-- PASO 2: Ver qué datos tienes en cada perfil
-- Esto te mostrará qué perfil tiene más información
SELECT 
  user_id,
  email,
  name,
  age,
  height,
  weight,
  fitness_level,
  created_at,
  updated_at
FROM user_profiles
WHERE email = 'robertobolla9@gmail.com'  -- ⚠️ CAMBIAR A TU EMAIL
ORDER BY created_at DESC;

-- PASO 3: Obtener tu user_id de PRODUCCIÓN
-- Necesitas obtener este valor desde Clerk Dashboard (Live Mode)
-- o desde la app en producción (ver logs)
-- 
-- Una vez que tengas tu user_id de producción, ejecuta el script
-- supabase_migrar_desarrollo_a_produccion.sql

-- ============================================================================
-- NOTA: Si ves múltiples registros con tu email, significa que tienes
-- datos en desarrollo y en producción. Necesitas migrar los datos del
-- user_id de desarrollo al user_id de producción.
-- ============================================================================

