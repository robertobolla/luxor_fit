-- Función para obtener usuarios con información completa de suscripción, referidos y pagos
-- Esta función reemplazará la consulta simple en getUsers

CREATE OR REPLACE FUNCTION get_users_with_subscription_info(
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  name TEXT,
  email TEXT,
  age INTEGER,
  height NUMERIC,
  weight NUMERIC,
  fitness_level TEXT,
  goals TEXT[],
  activity_types TEXT[],
  available_days INTEGER,
  session_duration INTEGER,
  equipment TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Información de suscripción
  subscription_status TEXT,
  subscription_current_period_end TIMESTAMPTZ,
  subscription_is_active BOOLEAN,
  subscription_trial_end TIMESTAMPTZ,
  -- Información de código de referido
  referral_code TEXT,
  referral_partner_name TEXT,
  -- Información de pago mensual (si tiene suscripción activa)
  monthly_payment NUMERIC(10, 2),
  -- Información de gimnasio
  is_gym_member BOOLEAN,
  gym_name TEXT
) AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_limit;
  
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    up.name,
    up.email,
    up.age,
    up.height,
    up.weight,
    up.fitness_level,
    up.goals,
    up.activity_types,
    up.available_days,
    up.session_duration,
    up.equipment,
    up.created_at,
    up.updated_at,
    -- Información de suscripción
    s.status as subscription_status,
    s.current_period_end as subscription_current_period_end,
    COALESCE(vs.is_active, false) as subscription_is_active,
    s.trial_end as subscription_trial_end,
    -- Información de código de referido
    dcu.discount_code as referral_code,
    ar.name as referral_partner_name,
    -- Pago mensual: Por ahora usar valores por defecto según el tipo
    -- $12.99 para mensual, $8.92 (107/12) para anual, o 0 si es gratis
    CASE 
      WHEN vs.is_gym_member = true THEN 0.00
      WHEN s.status IN ('active', 'trialing', 'past_due') THEN 
        CASE 
          -- Esto necesitaría venir de Stripe, por ahora usar valores por defecto
          WHEN s.stripe_subscription_id IS NOT NULL THEN 12.99
          ELSE 0.00
        END
      ELSE 0.00
    END as monthly_payment,
    -- Información de gimnasio
    COALESCE(vs.is_gym_member, false) as is_gym_member,
    gym_ar.gym_name
  FROM user_profiles up
  LEFT JOIN subscriptions s ON up.user_id = s.user_id
  LEFT JOIN v_user_subscription vs ON up.user_id = vs.user_id
  LEFT JOIN discount_code_usage dcu ON up.user_id = dcu.user_id
  LEFT JOIN admin_roles ar ON dcu.partner_id = ar.user_id AND ar.role_type = 'socio'
  LEFT JOIN gym_members gm ON up.user_id = gm.user_id AND gm.is_active = true
  LEFT JOIN admin_roles gym_ar ON gm.empresario_id = gym_ar.user_id AND gym_ar.role_type = 'empresario'
  ORDER BY up.created_at DESC
  LIMIT p_limit OFFSET v_offset;
END;
$$ LANGUAGE plpgsql;

