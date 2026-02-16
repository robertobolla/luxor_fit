-- Solución Final (V5): Limpieza Total de Dependencias
-- Este script elimina funciones y vistas que podrían estar bloqueando el cambio de tipo de columna.

BEGIN;

-- 1. Eliminar Vistas Dependientes
DROP VIEW IF EXISTS public.user_stats CASCADE;

-- 2. Eliminar Funciones Dependientes (por si acaso Postgres las trackea)
DROP FUNCTION IF EXISTS public.get_empresario_users(UUID);
DROP FUNCTION IF EXISTS public.get_empresario_users_v2(TEXT);
DROP FUNCTION IF EXISTS public.get_admin_dashboard_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

-- 3. Eliminar Políticas RLS de workout_plans
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios planes" ON public.workout_plans;
DROP POLICY IF EXISTS "Users can view their own workout plans" ON public.workout_plans;

-- 4. Modificar columna user_id a TEXT en workout_plans
-- Usamos USING user_id::text para asegurar la conversión
ALTER TABLE public.workout_plans 
ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 5. Modificar columna user_id a TEXT en workout_completions
ALTER TABLE public.workout_completions 
ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 6. Reconstruir índices
DROP INDEX IF EXISTS idx_workout_plans_user_id;
CREATE INDEX idx_workout_plans_user_id ON public.workout_plans(user_id);

DROP INDEX IF EXISTS idx_workout_completions_user_id;
CREATE INDEX idx_workout_completions_user_id ON public.workout_completions(user_id);

-- 7. Restaurar Políticas RLS para workout_plans
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

-- 8. Restaurar Vista user_stats
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

-- 9. Restaurar Funciones (Simplificadas si es necesario, pero restauramos las definiciones originales)

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
    gm.user_id::text AS r_user_id, 
    COALESCE(up.email, gm.email, 'Sin email') as email, 
    COALESCE(up.name, 'Usuario Pendiente') as name,
    up.username, 
    up.age,
    up.fitness_level,
    up.gender,
    gm.joined_at,
    gm.is_active,
    CASE 
      WHEN s.status = 'active' OR s.status = 'trialing' OR (gm.subscription_expires_at IS NOT NULL AND gm.subscription_expires_at > NOW()) THEN true 
      ELSE false 
    END as has_subscription,
    COALESCE(s.status, CASE WHEN gm.subscription_expires_at > NOW() THEN 'active' ELSE 'inactive' END) as subscription_status,
    CASE 
      WHEN wp.id IS NOT NULL THEN true 
      ELSE false 
    END as has_workout_plan,
    COALESCE(s.current_period_end, gm.subscription_expires_at) as subscription_expires_at,
    gm.notes
  FROM 
    gym_members gm
  LEFT JOIN 
    user_profiles up ON gm.user_id = up.user_id
  LEFT JOIN 
    subscriptions s ON gm.user_id = s.user_id 
  LEFT JOIN 
    (SELECT DISTINCT ON (wp_inner.user_id) wp_inner.user_id, wp_inner.id 
     FROM workout_plans wp_inner 
     ORDER BY wp_inner.user_id, wp_inner.created_at DESC) wp ON gm.user_id = wp.user_id
  WHERE 
    gm.empresario_id::text = p_empresario_id
  ORDER BY 
    gm.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
