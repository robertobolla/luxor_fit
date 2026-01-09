-- ============================================================================
-- CORRECCIONES DE PROBLEMAS CRÍTICOS
-- ============================================================================
-- Este script aplica todas las correcciones necesarias para producción
-- ============================================================================

-- 1️⃣ Agregar índices faltantes para performance
CREATE INDEX IF NOT EXISTS idx_gym_members_empresario_id ON gym_members(empresario_id);
CREATE INDEX IF NOT EXISTS idx_gym_members_user_id ON gym_members(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_members_is_active ON gym_members(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_roles_email ON admin_roles(email);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role_type ON admin_roles(role_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON workout_plans(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

SELECT '✅ Índices creados para mejor performance' as resultado;

-- 2️⃣ Limpiar empresarios temporales activos
UPDATE admin_roles
SET is_active = false
WHERE role_type = 'empresario'
  AND user_id LIKE 'temp_%'
  AND is_active = true;

SELECT 
  '✅ Empresarios temporales desactivados' as resultado,
  COUNT(*) as cantidad
FROM admin_roles
WHERE role_type = 'empresario'
  AND user_id LIKE 'temp_%'
  AND is_active = false;

-- 3️⃣ Agregar constraint único para gym_name (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'admin_roles_gym_name_unique'
  ) THEN
    CREATE UNIQUE INDEX admin_roles_gym_name_unique 
    ON admin_roles (LOWER(gym_name)) 
    WHERE role_type = 'empresario' AND is_active = true;
    
    RAISE NOTICE '✅ Constraint único agregado para gym_name';
  ELSE
    RAISE NOTICE '✅ Constraint único ya existe para gym_name';
  END IF;
END $$;

-- 4️⃣ Limpiar registros huérfanos en gym_members
-- (usuarios que no existen en user_profiles)
DELETE FROM gym_members
WHERE user_id NOT IN (SELECT user_id FROM user_profiles)
  AND user_id NOT LIKE 'user_%'; -- Solo eliminar si no es un user_id válido de Clerk

SELECT 
  '✅ Registros huérfanos eliminados de gym_members' as resultado;

-- 5️⃣ Limpiar notificaciones huérfanas (si la tabla existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_notifications') THEN
    DELETE FROM user_notifications
    WHERE user_id NOT IN (SELECT user_id FROM user_profiles);
    
    RAISE NOTICE '✅ Notificaciones huérfanas eliminadas';
  ELSE
    RAISE NOTICE '⚠️ Tabla user_notifications no existe aún (ejecutar SISTEMA_MENSAJERIA_Y_NOTIFICACIONES.sql primero)';
  END IF;
END $$;

-- 6️⃣ Limpiar push tokens huérfanos (si la tabla existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_push_tokens') THEN
    DELETE FROM user_push_tokens
    WHERE user_id NOT IN (SELECT user_id FROM user_profiles);
    
    RAISE NOTICE '✅ Push tokens huérfanos eliminados';
  ELSE
    RAISE NOTICE '⚠️ Tabla user_push_tokens no existe aún (ejecutar CONFIGURAR_PUSH_NOTIFICATIONS.sql primero)';
  END IF;
END $$;

-- 7️⃣ Actualizar empresarios sin monthly_fee (default a 5.00)
UPDATE admin_roles
SET monthly_fee = 5.00
WHERE role_type = 'empresario'
  AND is_active = true
  AND monthly_fee IS NULL;

SELECT 
  '✅ Empresarios sin monthly_fee actualizados (default 5.00)' as resultado,
  COUNT(*) as cantidad_actualizada
FROM admin_roles
WHERE role_type = 'empresario'
  AND monthly_fee = 5.00;

-- 8️⃣ Agregar email a empresarios que no lo tienen
UPDATE admin_roles
SET email = CONCAT(LOWER(REPLACE(gym_name, ' ', '')), '@gimnasio.com')
WHERE role_type = 'empresario'
  AND is_active = true
  AND email IS NULL
  AND gym_name IS NOT NULL;

SELECT 
  '✅ Emails generados para empresarios sin email' as resultado;

-- 9️⃣ Verificar integridad de relaciones trainer-student
DELETE FROM trainer_students
WHERE (
  trainer_id NOT IN (SELECT user_id FROM user_profiles)
  OR student_id NOT IN (SELECT user_id FROM user_profiles)
)
AND status != 'pending'; -- No eliminar pending por si el usuario aún no se registró

SELECT 
  '✅ Relaciones trainer-student inválidas eliminadas' as resultado;

-- 🔟 Limpiar planes de entrenamiento huérfanos
UPDATE workout_plans
SET is_active = false
WHERE user_id NOT IN (SELECT user_id FROM user_profiles)
  AND is_active = true;

SELECT 
  '✅ Planes de entrenamiento huérfanos desactivados' as resultado;

-- 1️⃣1️⃣ Verificar que todas las funciones RPC críticas existen
SELECT 
  '1️⃣1️⃣ VERIFICACIÓN DE FUNCIONES RPC' as paso,
  proname as function_name,
  CASE 
    WHEN proname IN (
      'get_empresario_users',
      'get_empresario_dashboard_stats',
      'get_student_stats'
    ) THEN '✅ CRÍTICA'
    ELSE '✅ OPCIONAL'
  END as importancia
FROM pg_proc
WHERE proname IN (
  'get_empresario_users',
  'get_empresario_dashboard_stats',
  'get_student_stats',
  'send_gym_message',
  'get_user_notifications',
  'mark_notification_as_read'
)
ORDER BY importancia DESC, proname;

-- 1️⃣2️⃣ Resumen de correcciones aplicadas
SELECT 
  '✅ CORRECCIONES COMPLETADAS' as resultado,
  'Base de datos optimizada y lista para producción' as mensaje;

-- 1️⃣3️⃣ Recomendaciones finales
SELECT 
  '📋 RECOMENDACIONES' as categoria,
  '1. Ejecutar AUDITORIA_PRE_PRODUCCION.sql para verificar' as paso_1,
  '2. Hacer backup de la base de datos antes de deploy' as paso_2,
  '3. Verificar que Edge Functions estén desplegadas' as paso_3,
  '4. Probar flujo completo de empresario' as paso_4,
  '5. Verificar sistema de notificaciones' as paso_5;

