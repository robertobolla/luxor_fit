-- ============================================================================
-- DIAGNOSTICO: Por qué no se ven las estadísticas de Lucas
-- ============================================================================

-- 1. Verificar datos insertados
SELECT 
  '📊 DATOS INSERTADOS' as verificacion,
  (SELECT COUNT(*) FROM workout_completions WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg') as entrenamientos,
  (SELECT COUNT(*) FROM workout_plans WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg' AND is_active = true) as plan_activo,
  (SELECT COUNT(*) FROM body_metrics WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg') as metricas,
  (SELECT COUNT(*) FROM nutrition_targets WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg') as nutricion,
  (SELECT COUNT(*) FROM health_data_daily WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg') as pasos;

-- 2. Ver qué user_id eres TÚ (Roberto)
SELECT 
  '👤 TU USER_ID' as tipo,
  user_id,
  email,
  role_type
FROM admin_roles
WHERE email = 'robertobolla@gmail.com';

-- 3. Probar la función con el user_id correcto de Roberto
SELECT 
  '🧪 PRUEBA 1: Con user_34Ap3niPCKLyVxhIN7f1gQVdKBo' as test,
  get_student_stats(
    'user_34Ap3niPCKLyVxhIN7f1gQVdKBo',
    'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg',
    CURRENT_DATE - 30,
    CURRENT_DATE
  ) as resultado;

-- 4. Probar con el otro user_id de Roberto que aparece en la URL
SELECT 
  '🧪 PRUEBA 2: Con user_34uyPy06eQ0wvcE3t1Z44DfmuSdX' as test,
  get_student_stats(
    'user_34uyPy06eQ0wvcE3t1Z44DfmuSdX',
    'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg',
    CURRENT_DATE - 30,
    CURRENT_DATE
  ) as resultado;

-- 5. Ver plan activo detallado
SELECT 
  '📋 PLAN ACTIVO DE LUCAS' as tipo,
  id,
  plan_name,
  description,
  is_active,
  plan_data,
  created_at
FROM workout_plans
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg'
ORDER BY created_at DESC
LIMIT 3;

-- 6. Ver entrenamientos recientes
SELECT 
  '✅ ENTRENAMIENTOS DE LUCAS' as tipo,
  COUNT(*) as total,
  MIN(completed_at) as primer_entrenamiento,
  MAX(completed_at) as ultimo_entrenamiento
FROM workout_completions
WHERE user_id = 'user_36jCuBUX4OQ8pxqrVkoJQR4fZrg';


