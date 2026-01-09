-- ============================================================================
-- AUDITORÍA PRE-PRODUCCIÓN - DETECCIÓN DE INCONSISTENCIAS
-- ============================================================================
-- Este script revisa toda la base de datos para encontrar:
-- - Datos inconsistentes
-- - Registros huérfanos
-- - Configuraciones incorrectas
-- - Problemas de integridad
-- ============================================================================

-- 1️⃣ USUARIOS SIN PERFIL COMPLETO
SELECT 
  '1️⃣ USUARIOS SIN PERFIL EN user_profiles' as problema,
  ar.user_id,
  ar.email,
  ar.name,
  ar.role_type
FROM admin_roles ar
LEFT JOIN user_profiles up ON up.user_id = ar.user_id
WHERE up.user_id IS NULL
  AND ar.is_active = true;

-- 2️⃣ MIEMBROS DE GIMNASIO SIN EMPRESARIO VÁLIDO
SELECT 
  '2️⃣ GYM MEMBERS SIN EMPRESARIO VÁLIDO' as problema,
  gm.user_id,
  gm.empresario_id,
  gm.is_active
FROM gym_members gm
LEFT JOIN admin_roles ar ON ar.user_id = gm.empresario_id AND ar.role_type = 'empresario'
WHERE ar.user_id IS NULL
  AND gm.is_active = true;

-- 3️⃣ EMPRESARIOS SIN GYM_NAME O MONTHLY_FEE
SELECT 
  '3️⃣ EMPRESARIOS SIN CONFIGURACIÓN COMPLETA' as problema,
  user_id,
  email,
  name,
  gym_name,
  monthly_fee,
  is_active
FROM admin_roles
WHERE role_type = 'empresario'
  AND is_active = true
  AND (gym_name IS NULL OR monthly_fee IS NULL);

-- 4️⃣ EMPRESARIOS TEMPORALES ACTIVOS (deben estar inactivos)
SELECT 
  '4️⃣ EMPRESARIOS TEMPORALES ACTIVOS' as problema,
  user_id,
  email,
  gym_name,
  is_active
FROM admin_roles
WHERE role_type = 'empresario'
  AND user_id LIKE 'temp_%'
  AND is_active = true;

-- 5️⃣ GIMNASIOS DUPLICADOS (mismo nombre, ambos activos)
SELECT 
  '5️⃣ GIMNASIOS CON NOMBRES DUPLICADOS' as problema,
  gym_name,
  COUNT(*) as cantidad,
  STRING_AGG(user_id, ', ') as empresario_ids
FROM admin_roles
WHERE role_type = 'empresario'
  AND is_active = true
  AND gym_name IS NOT NULL
GROUP BY gym_name
HAVING COUNT(*) > 1;

-- 6️⃣ USUARIOS EN GYM_MEMBERS SIN DATOS EN user_profiles
SELECT 
  '6️⃣ GYM MEMBERS SIN DATOS EN user_profiles' as problema,
  gm.user_id,
  gm.empresario_id,
  ar.gym_name,
  gm.is_active
FROM gym_members gm
LEFT JOIN user_profiles up ON up.user_id = gm.user_id
LEFT JOIN admin_roles ar ON ar.user_id = gm.empresario_id
WHERE up.user_id IS NULL
  AND gm.is_active = true
ORDER BY ar.gym_name;

-- 7️⃣ PLANES DE ENTRENAMIENTO HUÉRFANOS (usuario no existe)
SELECT 
  '7️⃣ PLANES DE ENTRENAMIENTO HUÉRFANOS' as problema,
  wp.id as plan_id,
  wp.user_id,
  wp.is_active,
  wp.created_at
FROM workout_plans wp
LEFT JOIN user_profiles up ON up.user_id = wp.user_id
WHERE up.user_id IS NULL
  AND wp.is_active = true;

-- 8️⃣ RELACIONES ENTRENADOR-ALUMNO HUÉRFANAS
SELECT 
  '8️⃣ RELACIONES ENTRENADOR-ALUMNO INVÁLIDAS' as problema,
  ts.trainer_id,
  ts.student_id,
  ts.status
FROM trainer_students ts
LEFT JOIN user_profiles trainer ON trainer.user_id = ts.trainer_id
LEFT JOIN user_profiles student ON student.user_id = ts.student_id
WHERE (trainer.user_id IS NULL OR student.user_id IS NULL)
  AND ts.status = 'accepted';

-- 9️⃣ SUSCRIPCIONES SIN USUARIO
SELECT 
  '9️⃣ SUSCRIPCIONES HUÉRFANAS' as problema,
  s.user_id,
  s.status,
  s.stripe_subscription_id
FROM subscriptions s
LEFT JOIN user_profiles up ON up.user_id = s.user_id
WHERE up.user_id IS NULL;

-- 🔟 NOTIFICACIONES SIN USUARIO DESTINATARIO
SELECT 
  '🔟 NOTIFICACIONES HUÉRFANAS' as problema,
  COUNT(*) as cantidad
FROM user_notifications un
LEFT JOIN user_profiles up ON up.user_id = un.user_id
WHERE up.user_id IS NULL;

-- 1️⃣1️⃣ MENSAJES DE GIMNASIO SIN EMPRESARIO VÁLIDO
SELECT 
  '1️⃣1️⃣ MENSAJES SIN EMPRESARIO VÁLIDO' as problema,
  COUNT(*) as cantidad
FROM gym_messages gm
LEFT JOIN admin_roles ar ON ar.user_id = gm.empresario_id AND ar.role_type = 'empresario'
WHERE ar.user_id IS NULL;

-- 1️⃣2️⃣ PUSH TOKENS SIN USUARIO
SELECT 
  '1️⃣2️⃣ PUSH TOKENS HUÉRFANOS' as problema,
  COUNT(*) as cantidad
FROM user_push_tokens upt
LEFT JOIN user_profiles up ON up.user_id = upt.user_id
WHERE up.user_id IS NULL;

-- 1️⃣3️⃣ VERIFICAR INTEGRIDAD DE VISTAS
SELECT 
  '1️⃣3️⃣ VERIFICAR VISTA empresario_stats' as verificacion,
  COUNT(*) as registros_totales,
  COUNT(CASE WHEN total_members > 0 THEN 1 END) as con_miembros,
  COUNT(CASE WHEN total_members = 0 THEN 1 END) as sin_miembros
FROM empresario_stats;

-- 1️⃣4️⃣ VERIFICAR VISTA v_user_subscription
SELECT 
  '1️⃣4️⃣ VERIFICAR VISTA v_user_subscription' as verificacion,
  COUNT(*) as registros_totales,
  COUNT(CASE WHEN has_active_subscription = true THEN 1 END) as con_subscripcion,
  COUNT(CASE WHEN is_active_gym_member = true THEN 1 END) as miembros_gym
FROM v_user_subscription;

-- 1️⃣5️⃣ USUARIOS CON ROLES MÚLTIPLES (problema de diseño)
SELECT 
  '1️⃣5️⃣ USUARIOS CON MÚLTIPLES ROLES' as problema,
  user_id,
  COUNT(*) as cantidad_roles,
  STRING_AGG(role_type, ', ') as roles
FROM admin_roles
WHERE is_active = true
GROUP BY user_id
HAVING COUNT(*) > 1;

-- 1️⃣6️⃣ VERIFICAR FUNCIONES RPC CRÍTICAS
SELECT 
  '1️⃣6️⃣ FUNCIONES RPC DISPONIBLES' as verificacion,
  proname as function_name,
  pronargs as num_args
FROM pg_proc
WHERE proname IN (
  'get_empresario_users',
  'get_empresario_dashboard_stats',
  'get_student_stats',
  'send_gym_message',
  'get_user_notifications'
)
ORDER BY proname;

-- 1️⃣7️⃣ EMPRESARIOS SIN USUARIOS (posible problema)
SELECT 
  '1️⃣7️⃣ EMPRESARIOS SIN USUARIOS ASIGNADOS' as advertencia,
  ar.user_id,
  ar.email,
  ar.gym_name,
  ar.is_active
FROM admin_roles ar
LEFT JOIN gym_members gm ON gm.empresario_id = ar.user_id
WHERE ar.role_type = 'empresario'
  AND ar.is_active = true
  AND gm.user_id IS NULL;

-- 1️⃣8️⃣ VERIFICAR CONSTRAINTS ÚNICOS
SELECT 
  '1️⃣8️⃣ CONSTRAINTS ÚNICOS' as verificacion,
  conname as constraint_name,
  conrelid::regclass as table_name
FROM pg_constraint
WHERE conname IN (
  'admin_roles_user_id_key',
  'admin_roles_gym_name_unique',
  'user_push_tokens_user_id_key'
)
ORDER BY table_name, constraint_name;

-- 1️⃣9️⃣ EJERCICIOS DUPLICADOS (mismo nombre)
SELECT 
  '1️⃣9️⃣ EJERCICIOS CON NOMBRES DUPLICADOS' as problema,
  name,
  COUNT(*) as cantidad
FROM exercises
GROUP BY name
HAVING COUNT(*) > 1;

-- 2️⃣0️⃣ RESUMEN GENERAL
SELECT 
  '2️⃣0️⃣ RESUMEN GENERAL' as resumen,
  (SELECT COUNT(*) FROM user_profiles) as total_usuarios,
  (SELECT COUNT(*) FROM admin_roles WHERE is_active = true) as total_roles_activos,
  (SELECT COUNT(*) FROM admin_roles WHERE role_type = 'empresario' AND is_active = true) as empresarios_activos,
  (SELECT COUNT(*) FROM gym_members WHERE is_active = true) as miembros_gym_activos,
  (SELECT COUNT(*) FROM workout_plans WHERE is_active = true) as planes_activos,
  (SELECT COUNT(*) FROM trainer_students WHERE status = 'accepted') as relaciones_entrenador_activas;

