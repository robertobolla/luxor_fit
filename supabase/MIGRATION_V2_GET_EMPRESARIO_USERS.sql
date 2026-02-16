-- Create a NEW function V2 to avoid conflicts with the existing one
-- This function accepts TEXT for p_empresario_id (supporting temp_ IDs)
-- And uses LEFT JOIN to include users with incomplete profiles
-- AND returns user_id as TEXT because they are Clerk IDs (not UUIDs)
-- AND uses fully qualified names for the subquery to avoid ambiguity with output user_id variable
-- AND coalesces subscription_expires_at to include manual expiration from gym_members

DROP FUNCTION IF EXISTS get_empresario_users_v2(TEXT);

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
    -- Cast explicitely to text for comparison to handle both UUID and TEXT columns
    gm.empresario_id::text = p_empresario_id
  ORDER BY 
    gm.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
