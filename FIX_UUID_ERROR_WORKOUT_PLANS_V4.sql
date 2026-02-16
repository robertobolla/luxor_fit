-- Solución Final (V4): CASCADE y Ajuste Completo
-- Este script es la solución definitiva para el error "invalid input syntax for type uuid"
-- y "cannot alter type of a column used by a view".
-- Incluye CASCADE para manejar automáticamente las dependencias (vistas, políticas, etc.)

BEGIN;

-- 1. Eliminar dependencias problemáticas con CASCADE
-- Esto borrará automáticamente user_stats y cualquier política asociada.
DROP VIEW IF EXISTS public.user_stats CASCADE;

-- 2. Limpiar políticas de workout_plans (por si acaso quedaron huérfanas)
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios planes" ON public.workout_plans;

-- 3. Modificar columna user_id a TEXT en workout_plans
-- Usamos USING user_id::text para asegurar la conversión si hay datos
ALTER TABLE public.workout_plans 
ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 4. Modificar columna user_id a TEXT en workout_completions (Prevención)
-- Es muy probable que esta tabla también tenga el mismo problema si se usa con Clerk
ALTER TABLE public.workout_completions 
ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 5. Reconstruir índices
DROP INDEX IF EXISTS idx_workout_plans_user_id;
CREATE INDEX idx_workout_plans_user_id ON public.workout_plans(user_id);

DROP INDEX IF EXISTS idx_workout_completions_user_id;
CREATE INDEX idx_workout_completions_user_id ON public.workout_completions(user_id);

-- 6. Restaurar Políticas RLS para workout_plans

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propios planes"
  ON public.workout_plans FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Usuarios pueden crear sus propios planes"
  ON public.workout_plans FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propios planes"
  ON public.workout_plans FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propios planes"
  ON public.workout_plans FOR DELETE
  USING (auth.uid()::text = user_id);

-- 7. Restaurar Vista user_stats
CREATE OR REPLACE VIEW public.user_stats AS
WITH all_users AS (
  SELECT 
    user_id,
    created_at,
    age,
    fitness_level
  FROM public.user_profiles
  UNION
  SELECT 
    user_id,
    created_at,
    NULL::integer as age,
    NULL::text as fitness_level
  FROM public.admin_roles
  WHERE is_active = true
)
SELECT 
  COUNT(DISTINCT au.user_id) as total_users,
  COUNT(DISTINCT CASE WHEN au.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN au.user_id END) as new_users_7d,
  COUNT(DISTINCT CASE WHEN au.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN au.user_id END) as new_users_30d,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.user_id END) as active_subscriptions,
  COUNT(DISTINCT CASE WHEN wp.is_active = true THEN wp.user_id END) as users_with_workout_plans,
  AVG(au.age) as avg_age,
  COUNT(DISTINCT CASE WHEN au.fitness_level = 'beginner' THEN au.user_id END) as beginners,
  COUNT(DISTINCT CASE WHEN au.fitness_level = 'intermediate' THEN au.user_id END) as intermediate,
  COUNT(DISTINCT CASE WHEN au.fitness_level = 'advanced' THEN au.user_id END) as advanced
FROM all_users au
LEFT JOIN public.subscriptions s ON au.user_id = s.user_id
LEFT JOIN public.workout_plans wp ON au.user_id = wp.user_id AND wp.is_active = true;

COMMENT ON VIEW public.user_stats IS 'Estadísticas de usuarios incluyendo user_profiles y admin_roles (admins, socios, empresarios)';

COMMIT;
