-- ============================================================================
-- SCRIPT PARA BORRAR TODOS LOS DATOS DE TODAS LAS TABLAS
-- ============================================================================
-- ⚠️ ADVERTENCIA: Esto borra TODOS los usuarios y TODA la información
-- ============================================================================

-- Desactivar temporalmente las políticas de seguridad para permitir borrado
SET session_replication_role = replica;

-- Borrar fotos del Storage
DELETE FROM storage.objects WHERE bucket_id = 'progress-photos';

-- Borrar todas las tablas en orden (de hijas a padres)
TRUNCATE TABLE public.lesson_progress RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.body_metrics RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.hydration_logs RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.meal_logs RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.nutrition_targets RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.meal_plans RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.nutrition_profiles RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.workout_completions RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.progress_photos RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.workout_plans RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.user_profiles RESTART IDENTITY CASCADE;

-- Reactivar las políticas de seguridad
SET session_replication_role = DEFAULT;

-- ============================================================================
-- VERIFICAR QUE TODO SE BORRÓ
-- ============================================================================

SELECT 
  'progress_photos' as tabla, 
  COUNT(*) as total_registros 
FROM public.progress_photos
UNION ALL
SELECT 'workout_plans', COUNT(*) FROM public.workout_plans
UNION ALL
SELECT 'workout_completions', COUNT(*) FROM public.workout_completions
UNION ALL
SELECT 'meal_logs', COUNT(*) FROM public.meal_logs
UNION ALL
SELECT 'meal_plans', COUNT(*) FROM public.meal_plans
UNION ALL
SELECT 'nutrition_targets', COUNT(*) FROM public.nutrition_targets
UNION ALL
SELECT 'nutrition_profiles', COUNT(*) FROM public.nutrition_profiles
UNION ALL
SELECT 'hydration_logs', COUNT(*) FROM public.hydration_logs
UNION ALL
SELECT 'body_metrics', COUNT(*) FROM public.body_metrics
UNION ALL
SELECT 'lesson_progress', COUNT(*) FROM public.lesson_progress
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM public.user_profiles
UNION ALL
SELECT 'storage.objects (progress-photos)', COUNT(*) FROM storage.objects WHERE bucket_id = 'progress-photos';

-- ============================================================================
-- Resultado esperado: Todas las tablas deben mostrar 0 registros
-- ============================================================================



