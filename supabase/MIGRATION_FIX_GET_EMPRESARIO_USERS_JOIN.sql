-- Update get_empresario_users function to use LEFT JOIN on user_profiles
-- This ensures users who haven't completed their profile yet still show up in the list
CREATE OR REPLACE FUNCTION get_empresario_users(p_empresario_id UUID)
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
    gm.user_id, -- Select user_id from gym_members, as up might be null
    COALESCE(up.email, 'Sin email registrado') as email, -- Fallback if profile doesn't exist (though usually createGymUser sets email in auth)
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
    subscriptions s ON gm.user_id = s.user_id -- Join on gm.user_id just in case
  LEFT JOIN 
    (SELECT DISTINCT ON (user_id) user_id, id FROM workout_plans ORDER BY user_id, created_at DESC) wp ON gm.user_id = wp.user_id
  WHERE 
    gm.empresario_id = p_empresario_id
  ORDER BY 
    gm.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
