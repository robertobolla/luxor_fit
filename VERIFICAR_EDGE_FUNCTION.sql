-- ============================================
-- Script de Verificación: Edge Function create-gym-user
-- ============================================

-- 1. Ver TODOS los usuarios del gimnasio y su estado
-- Reemplaza 'TU_EMPRESARIO_ID' con tu ID real
SELECT 
  email,
  name,
  user_id,
  subscription_expires_at,
  created_at,
  CASE 
    WHEN user_id IS NULL OR user_id = '' THEN '❌ NO PUEDE INICIAR SESIÓN'
    WHEN subscription_expires_at IS NULL THEN '⚠️ SIN FECHA DE EXPIRACIÓN'
    WHEN subscription_expires_at < NOW() THEN '⏰ SUSCRIPCIÓN EXPIRADA'
    ELSE '✅ TODO OK - PUEDE INICIAR SESIÓN'
  END as estado
FROM gym_members
WHERE empresario_id = 'TU_EMPRESARIO_ID'
ORDER BY created_at DESC;

-- ============================================

-- 2. Contar usuarios problemáticos
SELECT 
  COUNT(*) as total_usuarios_sin_user_id,
  'Estos usuarios NO PUEDEN iniciar sesión' as problema
FROM gym_members
WHERE empresario_id = 'TU_EMPRESARIO_ID'
  AND (user_id IS NULL OR user_id = '');

-- ============================================

-- 3. Ver específicamente los usuarios problemáticos
SELECT 
  email,
  name,
  created_at,
  'Necesita ser recreado con Edge Function' as accion_requerida
FROM gym_members
WHERE empresario_id = 'TU_EMPRESARIO_ID'
  AND (user_id IS NULL OR user_id = '')
ORDER BY created_at DESC;

-- ============================================

-- 4. ARREGLO RÁPIDO para usuarios específicos
-- Descomenta y ejecuta SOLO después de crear el usuario en Clerk Dashboard

/*
-- Paso 1: Eliminar registro sin user_id
DELETE FROM gym_members 
WHERE email = 'celu8145@gmail.com'  -- Cambia por el email
  AND (user_id IS NULL OR user_id = '');

-- Paso 2: Vuelve al dashboard y usa "Crear Nuevo Usuario"
-- con el mismo email. Ahora SÍ debería funcionar.
*/

-- ============================================

-- 5. Verificar si hay usuarios con el mismo email duplicados
SELECT 
  email,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) > 1 THEN '⚠️ DUPLICADO - Revisar'
    ELSE '✅ OK'
  END as estado
FROM gym_members
WHERE empresario_id = 'TU_EMPRESARIO_ID'
GROUP BY email
HAVING COUNT(*) > 1;

-- ============================================

-- 6. Ver últimos 10 usuarios creados
SELECT 
  email,
  name,
  user_id,
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI') as fecha_creacion,
  CASE 
    WHEN user_id IS NULL OR user_id = '' THEN '❌ Falta configurar Edge Function'
    ELSE '✅ Creado correctamente'
  END as estado
FROM gym_members
WHERE empresario_id = 'TU_EMPRESARIO_ID'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- INSTRUCCIONES:
-- 
-- Si ves usuarios con "❌ NO PUEDE INICIAR SESIÓN":
-- 1. Ve a CONFIGURAR_EDGE_FUNCTION_CREATE_GYM_USER.md
-- 2. Sigue los pasos para desplegar la Edge Function
-- 3. Elimina los registros problemáticos (query del paso 4)
-- 4. Vuelve a crearlos desde el dashboard
-- 
-- Si la Edge Function YA está configurada:
-- - Nuevos usuarios deberían tener user_id automáticamente
-- - Si sigue fallando, revisa los logs en Supabase Edge Functions
-- ============================================

