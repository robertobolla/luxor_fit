-- Solución Definitiva (V3): Manejo de dependencias de VISTAS y POLÍTICAS
-- Este script maneja el error "cannot alter type of a column used by a view or rule"

BEGIN;

-- 1. Eliminar la vista dependiente (user_stats)
DROP VIEW IF EXISTS public.user_stats;

-- 2. Eliminar políticas existentes que dependen de user_id
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Users can view their own workout plans" ON public.workout_plans;

-- 3. Eliminar índice dependiente
DROP INDEX IF EXISTS idx_workout_plans_user_id;

-- 4. Alterar la columna user_id a TEXT
ALTER TABLE public.workout_plans 
ALTER COLUMN user_id TYPE TEXT;

-- 5. Recrear el índice
CREATE INDEX idx_workout_plans_user_id ON public.workout_plans(user_id);

-- 6. Recrear las políticas de seguridad (RLS) corregidas para TEXT

-- SELECT: Ver propios planes
CREATE POLICY "Usuarios pueden ver sus propios planes"
  ON public.workout_plans
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- INSERT: Crear propios planes
CREATE POLICY "Usuarios pueden crear sus propios planes"
  ON public.workout_plans
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- UPDATE: Actualizar propios planes
CREATE POLICY "Usuarios pueden actualizar sus propios planes"
  ON public.workout_plans
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- DELETE: Eliminar propios planes
CREATE POLICY "Usuarios pueden eliminar sus propios planes"
  ON public.workout_plans
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- 7. Asegurar que RLS está habilitado
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

-- 8. Recrear la vista user_stats (Definición recuperada del codebase)
CREATE VIEW public.user_stats AS
WITH all_users AS (
  -- Usuarios de user_profiles
  SELECT 
    user_id,
    created_at,
    age,
    fitness_level
  FROM public.user_profiles
  
  UNION
  
  -- Usuarios de admin_roles (admins, socios, empresarios)
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
