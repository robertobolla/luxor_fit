-- Actualizar vista empresario_stats para incluir annual_fee
CREATE OR REPLACE VIEW empresario_stats AS
SELECT 
  ar.user_id as empresario_id,
  ar.email as empresario_email,
  ar.name as empresario_name,
  ar.gym_name,
  ar.monthly_fee,
  ar.annual_fee,
  ar.max_users,
  COUNT(DISTINCT gm.user_id) as total_members,
  COUNT(DISTINCT CASE WHEN gm.is_active = true THEN gm.user_id END) as active_members,
  COUNT(DISTINCT CASE WHEN gm.joined_at >= NOW() - INTERVAL '30 days' THEN gm.user_id END) as new_members_30d,
  COUNT(DISTINCT CASE WHEN vs.is_active = true THEN gm.user_id END) as members_with_active_subscription
FROM admin_roles ar
LEFT JOIN gym_members gm ON ar.user_id = gm.empresario_id
LEFT JOIN v_user_subscription vs ON gm.user_id = vs.user_id
WHERE ar.role_type = 'empresario'
GROUP BY ar.user_id, ar.email, ar.name, ar.gym_name, ar.monthly_fee, ar.annual_fee, ar.max_users;

COMMENT ON VIEW empresario_stats IS 'Estadísticas agregadas de empresarios y sus miembros, incluyendo tarifas mensual y anual';

