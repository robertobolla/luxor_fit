-- Update get_empresario_users function to accept TEXT for p_empresario_id
-- This is necessary because some empresario IDs are not valid UUIDs (e.g. temp IDs)
-- Also keeping the LEFT JOIN fix from previous migration

-- Drop BOTH versions of the function to avoid "cannot change return type" error
DROP FUNCTION IF EXISTS get_empresario_users(UUID);
DROP FUNCTION IF EXISTS get_empresario_users(TEXT);

CREATE OR REPLACE FUNCTION get_empresario_users(p_empresario_id TEXT)
RETURNS TABLE (
  user_id UUID,
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
    gm.user_id, 
    COALESCE(up.email, 'Sin email registrado') as email, 
    COALESCE(up.name, 'Usuario Pendiente') as name,
    up.username, 
    up.age,
    up.fitness_level,
    up.gender,
    gm.joined_at,
    gm.is_active,
    CASE 
      WHEN s.status = 'active' OR s.status = 'trialing' THEN true 
      ELSE false 
    END as has_subscription,
    s.status as subscription_status,
    CASE 
      WHEN wp.id IS NOT NULL THEN true 
      ELSE false 
    END as has_workout_plan,
    s.current_period_end as subscription_expires_at,
    gm.notes
  FROM 
    gym_members gm
  LEFT JOIN 
    user_profiles up ON gm.user_id = up.user_id
  LEFT JOIN 
    subscriptions s ON gm.user_id = s.user_id 
  LEFT JOIN 
    (SELECT DISTINCT ON (user_id) user_id, id FROM workout_plans ORDER BY user_id, created_at DESC) wp ON gm.user_id = wp.user_id
  WHERE 
    -- Cast p_empresario_id or gm.empresario_id to text to ensure comparison works
    gm.empresario_id::text = p_empresario_id
  ORDER BY 
    gm.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
