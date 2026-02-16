-- SOLUCIÓN "IMPLACABLE" (RELENTLESS FIX)
-- El error anterior indicó que las POLÍTICAS RLS estaban bloqueando el cambio.
-- Este script elimina explícitamente TODAS las políticas, vistas y funciones antes de alterar la tabla.

BEGIN;

-- 1. Eliminar la vista user_stats (CASCADE para limpiar dependencias de vista)
DROP VIEW IF EXISTS public.user_stats CASCADE;

-- 2. Eliminar funciones dependientes
DROP FUNCTION IF EXISTS public.get_empresario_users(UUID);
DROP FUNCTION IF EXISTS public.get_empresario_users_v2(TEXT);
DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

-- 3. ELIMINAR POLÍTICAS RLS DE WORKOUT_PLANS (CRÍTICO: Esto fue lo que falló antes)
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Users can view their own workout plans" ON public.workout_plans;

-- 4. Eliminar Políticas RLS de workout_completions (Prevención)
DROP POLICY IF EXISTS workout_completions_select_policy ON public.workout_completions;
DROP POLICY IF EXISTS workout_completions_insert_policy ON public.workout_completions;
DROP POLICY IF EXISTS workout_completions_update_policy ON public.workout_completions;
DROP POLICY IF EXISTS workout_completions_delete_policy ON public.workout_completions;

-- 5. CAMBIO DE TIPO DE COLUMNA
ALTER TABLE public.workout_plans 
ALTER COLUMN user_id TYPE TEXT USING user_id::text;

ALTER TABLE public.workout_completions 
ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 6. Reconstruir índices
DROP INDEX IF EXISTS idx_workout_plans_user_id;
CREATE INDEX idx_workout_plans_user_id ON public.workout_plans(user_id);

DROP INDEX IF EXISTS idx_workout_completions_user_id;
CREATE INDEX idx_workout_completions_user_id ON public.workout_completions(user_id);

-- 7. Restaurar Políticas RLS
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

-- 8. Restaurar Políticas RLS de workout_completions
ALTER TABLE public.workout_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY workout_completions_select_policy ON public.workout_completions FOR SELECT USING (true);
CREATE POLICY workout_completions_insert_policy ON public.workout_completions FOR INSERT WITH CHECK (true);
CREATE POLICY workout_completions_update_policy ON public.workout_completions FOR UPDATE USING (true);
CREATE POLICY workout_completions_delete_policy ON public.workout_completions FOR DELETE USING (true);

-- 9. Restaurar Vista user_stats
CREATE OR REPLACE VIEW public.user_stats AS
WITH all_users AS (
  SELECT user_id, created_at, age, fitness_level FROM public.user_profiles
  UNION
  SELECT user_id, created_at, NULL::integer, NULL::text FROM public.admin_roles WHERE is_active = true
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

-- 10. Restaurar Funciones
CREATE OR REPLACE FUNCTION get_empresario_users_v2(p_empresario_id TEXT)
RETURNS TABLE (
  r_user_id TEXT, 
  email TEXT,
  name TEXT,
  username TEXT, 
  age INTEGER,
  fitness_level TEXT,
  gender TEXT,
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN,
  has_subscription BOOLEAN,
  subscription_status TEXT,
  has_workout_plan BOOLEAN,
  subscription_expires_at TIMESTAMPTZ,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gm.user_id::text, 
    COALESCE(up.email, gm.email, 'Sin email'), 
    COALESCE(up.name, 'Usuario Pendiente'),
    up.username, up.age, up.fitness_level, up.gender, gm.joined_at, gm.is_active,
    CASE WHEN s.status = 'active' OR s.status = 'trialing' OR (gm.subscription_expires_at IS NOT NULL AND gm.subscription_expires_at > NOW()) THEN true ELSE false END,
    COALESCE(s.status, CASE WHEN gm.subscription_expires_at > NOW() THEN 'active' ELSE 'inactive' END),
    CASE WHEN wp.id IS NOT NULL THEN true ELSE false END,
    COALESCE(s.current_period_end, gm.subscription_expires_at), gm.notes
  FROM gym_members gm
  LEFT JOIN user_profiles up ON gm.user_id = up.user_id
  LEFT JOIN subscriptions s ON gm.user_id = s.user_id 
  LEFT JOIN (SELECT DISTINCT ON (wp_inner.user_id) wp_inner.user_id, wp_inner.id FROM workout_plans wp_inner ORDER BY wp_inner.user_id, wp_inner.created_at DESC) wp ON gm.user_id = wp.user_id
  WHERE gm.empresario_id::text = p_empresario_id
  ORDER BY gm.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
