-- ============================================================================
-- VISTAS Y FUNCIONES PARA RASTREAR USUARIOS ACTIVOS Y CALCULAR PAGOS
-- ============================================================================

-- Vista: Usuarios activos por código de socio (para calcular pagos)
CREATE OR REPLACE VIEW partner_active_users AS
SELECT 
  ar.user_id AS partner_user_id,
  ar.name AS partner_name,
  ar.email AS partner_email,
  ar.discount_code,
  dcu.user_id AS referred_user_id,
  up.name AS referred_user_name,
  up.email AS referred_user_email,
  sub.status AS subscription_status,
  sub.current_period_end AS subscription_end_date,
  CASE 
    WHEN sub.status IN ('active', 'trialing') THEN true
    ELSE false
  END AS is_active,
  dcu.created_at AS code_used_at,
  sub.created_at AS subscription_created_at
FROM admin_roles ar
INNER JOIN discount_code_usage dcu ON dcu.partner_id = ar.user_id
INNER JOIN user_profiles up ON up.user_id = dcu.user_id
LEFT JOIN subscriptions sub ON sub.user_id = dcu.user_id
WHERE ar.role_type = 'socio' 
  AND ar.discount_code IS NOT NULL
  AND ar.is_active = true;

-- Función: Obtener estadísticas de usuarios activos por socio (para pagos)
CREATE OR REPLACE FUNCTION get_partner_active_users_stats(partner_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_referrals', COUNT(*),
    'active_users', COUNT(*) FILTER (WHERE is_active = true),
    'inactive_users', COUNT(*) FILTER (WHERE is_active = false),
    'active_subscriptions', COUNT(DISTINCT referred_user_id) FILTER (WHERE is_active = true),
    'new_users_30d', COUNT(*) FILTER (WHERE code_used_at >= NOW() - INTERVAL '30 days'),
    'new_active_30d', COUNT(*) FILTER (WHERE is_active = true AND code_used_at >= NOW() - INTERVAL '30 days')
  ) INTO stats
  FROM partner_active_users
  WHERE partner_user_id = partner_user_id;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Función: Lista de usuarios activos por socio
CREATE OR REPLACE FUNCTION get_partner_active_users_list(partner_user_id TEXT)
RETURNS TABLE (
  referred_user_id TEXT,
  referred_user_name TEXT,
  referred_user_email TEXT,
  subscription_status TEXT,
  subscription_end_date TIMESTAMPTZ,
  is_active BOOLEAN,
  code_used_at TIMESTAMPTZ,
  days_active INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pau.referred_user_id,
    pau.referred_user_name,
    pau.referred_user_email,
    pau.subscription_status,
    pau.subscription_end_date,
    pau.is_active,
    pau.code_used_at,
    CASE 
      WHEN pau.subscription_created_at IS NOT NULL THEN 
        EXTRACT(DAY FROM (NOW() - pau.subscription_created_at))::INTEGER
      ELSE 0
    END AS days_active
  FROM partner_active_users pau
  WHERE pau.partner_user_id = partner_user_id
    AND pau.is_active = true
  ORDER BY pau.code_used_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permisos
GRANT SELECT ON partner_active_users TO authenticated;
GRANT SELECT ON partner_active_users TO anon;
GRANT EXECUTE ON FUNCTION get_partner_active_users_stats(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_active_users_stats(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_partner_active_users_list(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_active_users_list(TEXT) TO anon;

COMMENT ON VIEW partner_active_users IS 'Vista de usuarios activos por código de socio para calcular pagos';
COMMENT ON FUNCTION get_partner_active_users_stats IS 'Obtiene estadísticas de usuarios activos por socio (para calcular pagos)';
COMMENT ON FUNCTION get_partner_active_users_list IS 'Lista usuarios activos por socio (para ver detalles y calcular pagos)';

