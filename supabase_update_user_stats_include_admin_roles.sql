-- Actualizar vista user_stats para incluir usuarios de admin_roles
-- Esto hace que el total de usuarios coincida con lo que se muestra en la pestaña Usuarios

CREATE OR REPLACE VIEW user_stats AS
WITH all_users AS (
  -- Usuarios de user_profiles
  SELECT 
    user_id,
    created_at,
    age,
    fitness_level
  FROM user_profiles
  
  UNION
  
  -- Usuarios de admin_roles (admins, socios, empresarios)
  SELECT 
    user_id,
    created_at,
    NULL as age,
    NULL as fitness_level
  FROM admin_roles
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
LEFT JOIN subscriptions s ON au.user_id = s.user_id
LEFT JOIN workout_plans wp ON au.user_id = wp.user_id AND wp.is_active = true;

COMMENT ON VIEW user_stats IS 'Estadísticas de usuarios incluyendo user_profiles y admin_roles (admins, socios, empresarios)';

