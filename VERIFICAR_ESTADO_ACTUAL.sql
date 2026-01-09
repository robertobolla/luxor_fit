-- ============================================================================
-- VERIFICACIÓN DE ESTADO ACTUAL - ¿Qué falta hacer?
-- ============================================================================

-- 1️⃣ VERIFICAR EMPRESARIOS HOCKEY
SELECT 
  '1️⃣ ESTADO DE HOCKEY' as verificacion,
  user_id,
  email,
  name,
  role_type,
  gym_name,
  monthly_fee,
  is_active,
  CASE 
    WHEN user_id LIKE 'temp_%' THEN '⚠️ TEMPORAL'
    WHEN user_id LIKE 'user_%' THEN '✅ REAL'
    ELSE '❓ OTRO'
  END as tipo
FROM admin_roles
WHERE (LOWER(gym_name) LIKE '%hockey%' OR LOWER(email) LIKE '%hockey%')
ORDER BY is_active DESC, tipo;

-- 2️⃣ VERIFICAR USUARIOS DE HOCKEY
SELECT 
  '2️⃣ USUARIOS DEL EMPRESARIO REAL' as verificacion,
  COUNT(*) as cantidad_usuarios,
  STRING_AGG(up.name, ', ') as nombres
FROM gym_members gm
LEFT JOIN user_profiles up ON up.user_id = gm.user_id
WHERE gm.empresario_id = 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo';

-- 3️⃣ VERIFICAR SI EXISTE CONSTRAINT ÚNICO PARA GYM_NAME
SELECT 
  '3️⃣ CONSTRAINT ÚNICO GYM_NAME' as verificacion,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE indexname = 'admin_roles_gym_name_unique'
    ) THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE - Ejecutar CONSOLIDAR_HOCKEY_EMPRESARIO_FIX.sql'
  END as estado;

-- 4️⃣ VERIFICAR TABLA user_notifications
SELECT 
  '4️⃣ TABLA user_notifications' as verificacion,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables WHERE tablename = 'user_notifications'
    ) THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE - Ejecutar SISTEMA_MENSAJERIA_Y_NOTIFICACIONES.sql'
  END as estado;

-- 5️⃣ VERIFICAR TABLA user_push_tokens
SELECT 
  '5️⃣ TABLA user_push_tokens' as verificacion,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables WHERE tablename = 'user_push_tokens'
    ) THEN '✅ EXISTE'
    ELSE '❌ NO EXISTE - Ejecutar CONFIGURAR_PUSH_NOTIFICATIONS.sql'
  END as estado;

-- 6️⃣ VERIFICAR EXTENSIÓN HTTP
SELECT 
  '6️⃣ EXTENSIÓN HTTP' as verificacion,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'http'
    ) THEN '✅ HABILITADA'
    ELSE '❌ NO HABILITADA - Ejecutar: CREATE EXTENSION IF NOT EXISTS http;'
  END as estado;

-- 7️⃣ VERIFICAR FUNCIONES RPC CRÍTICAS
SELECT 
  '7️⃣ FUNCIONES RPC' as verificacion,
  proname as funcion,
  CASE 
    WHEN proname IN (
      'get_empresario_users',
      'get_empresario_dashboard_stats',
      'get_student_stats'
    ) THEN '✅ CRÍTICA'
    ELSE '✅ OPCIONAL'
  END as importancia,
  '✅ EXISTE' as estado
FROM pg_proc
WHERE proname IN (
  'get_empresario_users',
  'get_empresario_dashboard_stats',
  'get_student_stats',
  'send_gym_message',
  'get_user_notifications',
  'mark_notification_as_read',
  'mark_all_notifications_as_read'
)
ORDER BY importancia DESC, proname;

-- 8️⃣ VERIFICAR FUNCIONES RPC FALTANTES
SELECT 
  '8️⃣ FUNCIONES FALTANTES' as verificacion,
  function_name,
  script_necesario
FROM (
  VALUES 
    ('send_gym_message', 'SISTEMA_MENSAJERIA_Y_NOTIFICACIONES.sql'),
    ('get_user_notifications', 'SISTEMA_MENSAJERIA_Y_NOTIFICACIONES.sql'),
    ('mark_notification_as_read', 'SISTEMA_MENSAJERIA_Y_NOTIFICACIONES.sql'),
    ('get_empresario_dashboard_stats', 'FUNCIONES_DASHBOARD_EMPRESARIO.sql')
) AS expected(function_name, script_necesario)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = expected.function_name
);

-- 9️⃣ VERIFICAR ÍNDICES IMPORTANTES
SELECT 
  '9️⃣ ÍNDICES' as verificacion,
  indexname,
  tablename,
  '✅ EXISTE' as estado
FROM pg_indexes
WHERE indexname IN (
  'idx_gym_members_empresario_id',
  'idx_gym_members_user_id',
  'idx_admin_roles_email',
  'idx_user_profiles_email',
  'admin_roles_gym_name_unique'
)
ORDER BY tablename, indexname;

-- 🔟 VERIFICAR ÍNDICES FALTANTES
SELECT 
  '🔟 ÍNDICES FALTANTES' as verificacion,
  index_name,
  'CORREGIR_PROBLEMAS_CRITICOS.sql' as script_necesario
FROM (
  VALUES 
    ('idx_gym_members_empresario_id'),
    ('idx_gym_members_user_id'),
    ('idx_admin_roles_email'),
    ('idx_user_profiles_email')
) AS expected(index_name)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_indexes WHERE indexname = expected.index_name
);

-- 1️⃣1️⃣ VERIFICAR EMPRESARIOS TEMPORALES ACTIVOS
SELECT 
  '1️⃣1️⃣ EMPRESARIOS TEMPORALES ACTIVOS' as verificacion,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ TODOS DESACTIVADOS'
    ELSE '⚠️ HAY TEMPORALES ACTIVOS - Ejecutar CORREGIR_PROBLEMAS_CRITICOS.sql'
  END as estado
FROM admin_roles
WHERE role_type = 'empresario'
  AND user_id LIKE 'temp_%'
  AND is_active = true;

-- 1️⃣2️⃣ VERIFICAR GIMNASIOS DUPLICADOS
SELECT 
  '1️⃣2️⃣ GIMNASIOS DUPLICADOS' as verificacion,
  gym_name,
  COUNT(*) as cantidad,
  STRING_AGG(user_id, ', ') as empresarios
FROM admin_roles
WHERE role_type = 'empresario'
  AND is_active = true
  AND gym_name IS NOT NULL
GROUP BY gym_name
HAVING COUNT(*) > 1;

-- 1️⃣3️⃣ RESUMEN EJECUTIVO
WITH estado AS (
  SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_notifications') 
      THEN 1 ELSE 0 END as notificaciones,
    CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_push_tokens') 
      THEN 1 ELSE 0 END as push_tokens,
    CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http') 
      THEN 1 ELSE 0 END as http_ext,
    CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'admin_roles_gym_name_unique') 
      THEN 1 ELSE 0 END as gym_unique,
    CASE WHEN EXISTS (SELECT 1 FROM admin_roles WHERE user_id LIKE 'temp_%' AND is_active = true) 
      THEN 0 ELSE 1 END as temp_inactivos
)
SELECT 
  '📊 RESUMEN EJECUTIVO' as titulo,
  CASE WHEN notificaciones = 1 THEN '✅' ELSE '❌' END || ' Sistema de Notificaciones' as check_1,
  CASE WHEN push_tokens = 1 THEN '✅' ELSE '❌' END || ' Push Tokens' as check_2,
  CASE WHEN http_ext = 1 THEN '✅' ELSE '❌' END || ' Extensión HTTP' as check_3,
  CASE WHEN gym_unique = 1 THEN '✅' ELSE '❌' END || ' Gimnasios únicos' as check_4,
  CASE WHEN temp_inactivos = 1 THEN '✅' ELSE '⚠️' END || ' Temporales desactivados' as check_5,
  CASE 
    WHEN (notificaciones + push_tokens + http_ext + gym_unique + temp_inactivos) = 5 
    THEN '🎉 TODO LISTO PARA PRODUCCIÓN'
    ELSE '⚠️ FALTAN CONFIGURACIONES'
  END as estado_final
FROM estado;

-- 1️⃣4️⃣ SCRIPTS QUE FALTAN EJECUTAR
SELECT 
  '📋 SCRIPTS PENDIENTES' as categoria,
  '1. ' || CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_notifications') 
    THEN '✅ SISTEMA_MENSAJERIA_Y_NOTIFICACIONES.sql'
    ELSE '❌ SISTEMA_MENSAJERIA_Y_NOTIFICACIONES.sql - PENDIENTE'
  END as paso_1,
  '2. ' || CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_push_tokens') 
    THEN '✅ CONFIGURAR_PUSH_NOTIFICATIONS.sql'
    ELSE '❌ CONFIGURAR_PUSH_NOTIFICATIONS.sql - PENDIENTE'
  END as paso_2,
  '3. ' || CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http') 
    THEN '✅ CREATE EXTENSION http'
    ELSE '❌ CREATE EXTENSION IF NOT EXISTS http; - PENDIENTE'
  END as paso_3,
  '4. ' || CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'admin_roles_gym_name_unique') 
    THEN '✅ CONSOLIDAR_HOCKEY_EMPRESARIO_FIX.sql'
    ELSE '❌ CONSOLIDAR_HOCKEY_EMPRESARIO_FIX.sql - PENDIENTE'
  END as paso_4,
  '5. ' || CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_gym_members_empresario_id') 
    THEN '✅ CORREGIR_PROBLEMAS_CRITICOS.sql'
    ELSE '❌ CORREGIR_PROBLEMAS_CRITICOS.sql - PENDIENTE'
  END as paso_5;

