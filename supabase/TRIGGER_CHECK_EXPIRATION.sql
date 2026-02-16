-- ============================================================================
-- SISTEMA DE VENCIMIENTO PARA EMPRESARIOS (CON PERIODO DE GRACIA)
-- ============================================================================

-- 1. Agregar columna de vencimiento a admin_roles
ALTER TABLE admin_roles 
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN admin_roles.subscription_expires_at IS 'Fecha de vencimiento de la suscripción del empresario. Si pasa esta fecha (+7 días de gracia), se corta el servicio a todos sus usuarios.';

-- 2. Actualizar función is_gym_member para respetar el vencimiento + gracia
CREATE OR REPLACE FUNCTION is_gym_member(check_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_active_member BOOLEAN;
BEGIN
  -- Verificar si es miembro activo Y su gimnasio está al día (con 7 días de gracia)
  SELECT EXISTS (
    SELECT 1 
    FROM gym_members gm
    JOIN admin_roles ar ON gm.empresario_id = ar.user_id
    WHERE gm.user_id = check_user_id 
      AND gm.is_active = true
      AND (
          ar.subscription_expires_at IS NULL 
          OR 
          NOW() <= (ar.subscription_expires_at + INTERVAL '7 days')
      )
  ) INTO v_is_active_member;
  
  RETURN v_is_active_member;
END;
$$ LANGUAGE plpgsql;

-- 3. Actualizar la vista v_user_subscription para reflejar el estado real
-- IMPORTANTE: Primero eliminamos vistas dependientes para evitar errores de tipo "cannot drop columns from view"

DROP VIEW IF EXISTS empresario_stats;
DROP VIEW IF EXISTS v_user_subscription;

CREATE OR REPLACE VIEW public.v_user_subscription AS
  SELECT
    s.user_id,
    s.status,
    s.trial_start,
    s.trial_end,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    -- Prioridad: 
    -- 1. Suscripción personal activa
    -- 2. Periodo de prueba
    -- 3. Membresía de gimnasio (SOLO SI EL GIMNASIO ESTÁ AL DÍA + GRACIA)
    GREATEST(
      CASE WHEN s.status IN ('active','past_due') THEN 1 ELSE 0 END,
      CASE WHEN NOW() BETWEEN COALESCE(s.trial_start, NOW() - INTERVAL '1 day') AND COALESCE(s.trial_end, NOW() - INTERVAL '1 day') THEN 1 ELSE 0 END,
      CASE WHEN is_gym_member(s.user_id) THEN 1 ELSE 0 END
    ) = 1 as is_active,
    
    -- Indicar si es miembro de gimnasio (independientemente del estado del gimnasio, para mostrar info correcta en UI)
    EXISTS (SELECT 1 FROM gym_members gm WHERE gm.user_id = s.user_id AND gm.is_active = true) as is_gym_member
  FROM public.subscriptions s;

-- 4. Restaurar vista empresario_stats (requiere v_user_subscription)
CREATE OR REPLACE VIEW empresario_stats AS
SELECT 
  ar.user_id as empresario_id,
  ar.email as empresario_email,
  ar.name as empresario_name,
  ar.gym_name,
  ar.monthly_fee,
  ar.max_users,
  COUNT(DISTINCT gm.user_id) as total_members,
  COUNT(DISTINCT CASE WHEN gm.is_active = true THEN gm.user_id END) as active_members,
  COUNT(DISTINCT CASE WHEN gm.joined_at >= CURRENT_DATE - INTERVAL '30 days' THEN gm.user_id END) as new_members_30d,
  COUNT(DISTINCT CASE WHEN vs.is_active = true THEN gm.user_id END) as members_with_active_subscription
FROM admin_roles ar
LEFT JOIN gym_members gm ON ar.user_id = gm.empresario_id
LEFT JOIN v_user_subscription vs ON gm.user_id = vs.user_id
WHERE ar.role_type = 'empresario' AND ar.is_active = true
GROUP BY ar.user_id, ar.email, ar.name, ar.gym_name, ar.monthly_fee, ar.max_users;

-- 5. Función de utilidad para ver el estado de vencimiento (para el dashboard)
CREATE OR REPLACE FUNCTION get_empresario_expiration_status(p_empresario_id TEXT)
RETURNS TABLE (
    expires_at TIMESTAMPTZ,
    days_until_expiration INTEGER,
    days_overdue INTEGER,
    is_service_active BOOLEAN, -- True si está dentro del periodo pagado O periodo de gracia
    in_grace_period BOOLEAN    -- True si ya venció pero está en los 7 días de gracia
) AS $$
DECLARE
    v_expires_at TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    SELECT subscription_expires_at INTO v_expires_at
    FROM admin_roles
    WHERE user_id = p_empresario_id;

    RETURN QUERY
    SELECT 
        v_expires_at,
        EXTRACT(DAY FROM (v_expires_at - v_now))::INTEGER as days_until_expiration,
        CASE WHEN v_now > v_expires_at THEN EXTRACT(DAY FROM (v_now - v_expires_at))::INTEGER ELSE 0 END as days_overdue,
        (v_expires_at IS NULL OR v_now <= (v_expires_at + INTERVAL '7 days')) as is_service_active,
        (v_now > v_expires_at AND v_now <= (v_expires_at + INTERVAL '7 days')) as in_grace_period;
END;
$$ LANGUAGE plpgsql;
