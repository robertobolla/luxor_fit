-- ============================================================================
-- SCRIPT PARA BORRAR TODOS LOS DATOS DE UN USUARIO
-- ============================================================================
-- IMPORTANTE: Reemplaza 'TU_USER_ID_AQUI' con tu ID de usuario de Clerk
-- ============================================================================

-- 1. BORRAR FOTOS DE PROGRESO
DELETE FROM public.progress_photos 
WHERE user_id = 'TU_USER_ID_AQUI';

-- 2. BORRAR PLANES DE ENTRENAMIENTO
DELETE FROM public.workout_plans 
WHERE user_id = 'TU_USER_ID_AQUI';

-- 3. BORRAR COMPLETACIONES DE ENTRENAMIENTO
DELETE FROM public.workout_completions 
WHERE user_id = 'TU_USER_ID_AQUI';

-- 4. BORRAR REGISTRO DE COMIDAS
DELETE FROM public.meal_logs 
WHERE user_id = 'TU_USER_ID_AQUI';

-- 5. BORRAR PLANES DE COMIDA
DELETE FROM public.meal_plans 
WHERE user_id = 'TU_USER_ID_AQUI';

-- 6. BORRAR OBJETIVOS NUTRICIONALES
DELETE FROM public.nutrition_targets 
WHERE user_id = 'TU_USER_ID_AQUI';

-- 7. BORRAR PERFIL NUTRICIONAL
DELETE FROM public.nutrition_profiles 
WHERE user_id = 'TU_USER_ID_AQUI';

-- 8. BORRAR REGISTRO DE HIDRATACIÓN
DELETE FROM public.hydration_logs 
WHERE user_id = 'TU_USER_ID_AQUI';

-- 9. BORRAR MÉTRICAS CORPORALES
DELETE FROM public.body_metrics 
WHERE user_id = 'TU_USER_ID_AQUI';

-- 10. BORRAR PROGRESO DE LECCIONES
DELETE FROM public.lesson_progress 
WHERE user_id = 'TU_USER_ID_AQUI';

-- 11. BORRAR PERFIL DE USUARIO (ÚLTIMO)
DELETE FROM public.user_profiles 
WHERE user_id = 'TU_USER_ID_AQUI';

-- ============================================================================
-- VERIFICAR QUE TODO SE BORRÓ
-- ============================================================================

SELECT 'progress_photos' as tabla, COUNT(*) as registros FROM public.progress_photos WHERE user_id = 'TU_USER_ID_AQUI'
UNION ALL
SELECT 'workout_plans', COUNT(*) FROM public.workout_plans WHERE user_id = 'TU_USER_ID_AQUI'
UNION ALL
SELECT 'workout_completions', COUNT(*) FROM public.workout_completions WHERE user_id = 'TU_USER_ID_AQUI'
UNION ALL
SELECT 'meal_logs', COUNT(*) FROM public.meal_logs WHERE user_id = 'TU_USER_ID_AQUI'
UNION ALL
SELECT 'meal_plans', COUNT(*) FROM public.meal_plans WHERE user_id = 'TU_USER_ID_AQUI'
UNION ALL
SELECT 'nutrition_targets', COUNT(*) FROM public.nutrition_targets WHERE user_id = 'TU_USER_ID_AQUI'
UNION ALL
SELECT 'nutrition_profiles', COUNT(*) FROM public.nutrition_profiles WHERE user_id = 'TU_USER_ID_AQUI'
UNION ALL
SELECT 'hydration_logs', COUNT(*) FROM public.hydration_logs WHERE user_id = 'TU_USER_ID_AQUI'
UNION ALL
SELECT 'body_metrics', COUNT(*) FROM public.body_metrics WHERE user_id = 'TU_USER_ID_AQUI'
UNION ALL
SELECT 'lesson_progress', COUNT(*) FROM public.lesson_progress WHERE user_id = 'TU_USER_ID_AQUI'
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM public.user_profiles WHERE user_id = 'TU_USER_ID_AQUI';

-- ============================================================================
-- ALTERNATIVA: BORRAR TODO DE TODAS LAS TABLAS (NUCLEAR)
-- ============================================================================
-- ⚠️ CUIDADO: Esto borra TODOS los usuarios, no solo el tuyo
-- Descomenta las siguientes líneas SOLO si quieres borrar TODO:

-- TRUNCATE TABLE public.progress_photos CASCADE;
-- TRUNCATE TABLE public.workout_completions CASCADE;
-- TRUNCATE TABLE public.meal_logs CASCADE;
-- TRUNCATE TABLE public.hydration_logs CASCADE;
-- TRUNCATE TABLE public.body_metrics CASCADE;
-- TRUNCATE TABLE public.lesson_progress CASCADE;
-- TRUNCATE TABLE public.nutrition_targets CASCADE;
-- TRUNCATE TABLE public.meal_plans CASCADE;
-- TRUNCATE TABLE public.nutrition_profiles CASCADE;
-- TRUNCATE TABLE public.workout_plans CASCADE;
-- TRUNCATE TABLE public.user_profiles CASCADE;




