-- ============================================================================
-- AGREGAR CAMPOS PARA CÓDIGOS PROMOCIONALES EN SUBSCRIPTIONS
-- ============================================================================
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Agregar columnas para tracking de códigos promocionales
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS promo_code_used TEXT,
ADD COLUMN IF NOT EXISTS is_promo_subscription BOOLEAN DEFAULT false;

-- 2. Crear índice para búsquedas por código promocional
CREATE INDEX IF NOT EXISTS idx_subscriptions_promo_code 
ON subscriptions(promo_code_used) 
WHERE promo_code_used IS NOT NULL;

-- 3. Crear índice para suscripciones promocionales
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_promo 
ON subscriptions(is_promo_subscription) 
WHERE is_promo_subscription = true;

-- 4. Actualizar la vista v_user_subscription para incluir suscripciones promocionales
DROP VIEW IF EXISTS public.v_user_subscription CASCADE;

CREATE VIEW public.v_user_subscription AS
SELECT
  s.user_id,
  s.status,
  s.trial_start,
  s.trial_end,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  s.platform,
  s.product_identifier,
  s.promo_code_used,
  s.is_promo_subscription,
  -- Incluir acceso gratuito si pertenece a un gimnasio activo
  GREATEST(
    CASE WHEN s.status IN ('active','past_due') THEN 1 ELSE 0 END,
    CASE WHEN NOW() BETWEEN COALESCE(s.trial_start, NOW() - INTERVAL '1 day') AND COALESCE(s.trial_end, NOW() - INTERVAL '1 day') THEN 1 ELSE 0 END,
    -- Suscripción promocional activa (verificar fecha de expiración)
    CASE WHEN s.is_promo_subscription = true AND s.status = 'active' AND s.current_period_end > NOW() THEN 1 ELSE 0 END
  ) = 1 AS has_active_subscription,
  -- Verificar si es miembro de gimnasio con acceso
  EXISTS (
    SELECT 1 FROM gym_members gm
    JOIN admin_roles ar ON gm.empresario_id = ar.user_id
    WHERE gm.user_id = s.user_id
      AND gm.is_active = true
      AND ar.is_active = true
      AND ar.role_type = 'empresario'
      AND (gm.subscription_expires_at IS NULL OR gm.subscription_expires_at > NOW())
  ) AS is_gym_member,
  -- Resultado final de is_active
  GREATEST(
    CASE WHEN s.status IN ('active','past_due') THEN 1 ELSE 0 END,
    CASE WHEN NOW() BETWEEN COALESCE(s.trial_start, NOW() - INTERVAL '1 day') AND COALESCE(s.trial_end, NOW() - INTERVAL '1 day') THEN 1 ELSE 0 END,
    CASE WHEN s.is_promo_subscription = true AND s.status = 'active' AND s.current_period_end > NOW() THEN 1 ELSE 0 END,
    CASE WHEN EXISTS (
      SELECT 1 FROM gym_members gm
      JOIN admin_roles ar ON gm.empresario_id = ar.user_id
      WHERE gm.user_id = s.user_id
        AND gm.is_active = true
        AND ar.is_active = true
        AND ar.role_type = 'empresario'
        AND (gm.subscription_expires_at IS NULL OR gm.subscription_expires_at > NOW())
    ) THEN 1 ELSE 0 END
  ) = 1 AS is_active
FROM public.subscriptions s;

-- 5. Grant permisos para la vista
GRANT SELECT ON public.v_user_subscription TO authenticated;
GRANT SELECT ON public.v_user_subscription TO anon;

-- 6. Comentarios
COMMENT ON COLUMN subscriptions.promo_code_used IS 'Código promocional usado para obtener esta suscripción';
COMMENT ON COLUMN subscriptions.is_promo_subscription IS 'Si true, esta suscripción fue otorgada por un código promocional gratuito';

-- 7. Verificar que la tabla discount_code_usage existe (del script anterior)
-- Si no existe, ejecutar también supabase_partner_discount_system.sql

SELECT 'Script ejecutado correctamente. Vista v_user_subscription actualizada con soporte para códigos promocionales.' AS resultado;
