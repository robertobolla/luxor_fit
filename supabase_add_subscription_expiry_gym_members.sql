-- Agregar campo de fecha de expiración de suscripción para miembros de gimnasio
ALTER TABLE gym_members
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Crear índice para búsquedas por fecha de expiración
CREATE INDEX IF NOT EXISTS idx_gym_members_subscription_expires_at ON gym_members(subscription_expires_at) WHERE subscription_expires_at IS NOT NULL;

-- Actualizar la vista v_user_subscription para verificar fecha de expiración
CREATE OR REPLACE VIEW public.v_user_subscription AS
  SELECT
    s.user_id,
    s.status,
    s.trial_start,
    s.trial_end,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    -- Incluir acceso gratuito si pertenece a un gimnasio activo Y no ha expirado
    GREATEST(
      CASE WHEN s.status IN ('active','past_due') THEN 1 ELSE 0 END,
      CASE WHEN NOW() BETWEEN COALESCE(s.trial_start, NOW() - INTERVAL '1 day') AND COALESCE(s.trial_end, NOW() - INTERVAL '1 day') THEN 1 ELSE 0 END,
      CASE WHEN EXISTS (
        SELECT 1 
        FROM gym_members gm 
        WHERE gm.user_id = s.user_id 
          AND gm.is_active = true
          AND (gm.subscription_expires_at IS NULL OR gm.subscription_expires_at > NOW())
      ) THEN 1 ELSE 0 END
    ) = 1 as is_active,
    -- Indicar si es miembro de gimnasio
    EXISTS (
      SELECT 1 
      FROM gym_members gm 
      WHERE gm.user_id = s.user_id 
        AND gm.is_active = true
        AND (gm.subscription_expires_at IS NULL OR gm.subscription_expires_at > NOW())
    ) as is_gym_member
  FROM public.subscriptions s;

COMMENT ON COLUMN gym_members.subscription_expires_at IS 'Fecha de expiración de la suscripción gratuita del gimnasio. NULL = sin expiración.';

