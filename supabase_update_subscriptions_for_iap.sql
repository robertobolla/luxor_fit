-- ============================================================================
-- ACTUALIZAR TABLA SUBSCRIPTIONS PARA IN-APP PURCHASE (RevenueCat)
-- ============================================================================
-- Este script agrega campos para soportar tanto Stripe como In-App Purchase

-- 1. Agregar nuevos campos para RevenueCat/IAP
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS revenuecat_customer_id TEXT,
ADD COLUMN IF NOT EXISTS product_identifier TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT CHECK (platform IN ('stripe', 'ios', 'android', 'web'));

-- 2. Crear índice para búsqueda por RevenueCat customer ID
CREATE INDEX IF NOT EXISTS idx_subscriptions_revenuecat_customer_id 
ON public.subscriptions(revenuecat_customer_id) 
WHERE revenuecat_customer_id IS NOT NULL;

-- 3. Actualizar la vista v_user_subscription para incluir información de plataforma
CREATE OR REPLACE VIEW public.v_user_subscription AS
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
  -- Determinar si está activo
  GREATEST(
    -- Suscripción activa (Stripe o IAP)
    CASE WHEN s.status IN ('active', 'past_due') THEN 1 ELSE 0 END,
    -- En período de prueba
    CASE WHEN NOW() BETWEEN COALESCE(s.trial_start, NOW() - INTERVAL '1 day') 
                         AND COALESCE(s.trial_end, NOW() - INTERVAL '1 day') THEN 1 ELSE 0 END,
    -- Miembro de gimnasio activo
    CASE WHEN EXISTS (
      SELECT 1 FROM gym_members gm 
      WHERE gm.user_id = s.user_id 
        AND gm.is_active = true
        AND (gm.subscription_expires_at IS NULL OR gm.subscription_expires_at > NOW())
    ) THEN 1 ELSE 0 END
  ) = 1 AS is_active,
  -- Es miembro de gimnasio
  EXISTS (
    SELECT 1 FROM gym_members gm 
    WHERE gm.user_id = s.user_id 
      AND gm.is_active = true
      AND (gm.subscription_expires_at IS NULL OR gm.subscription_expires_at > NOW())
  ) AS is_gym_member,
  -- Tipo de suscripción
  CASE 
    WHEN s.platform = 'ios' THEN 'App Store'
    WHEN s.platform = 'android' THEN 'Google Play'
    WHEN s.platform = 'stripe' THEN 'Stripe'
    ELSE 'Desconocido'
  END AS subscription_source
FROM public.subscriptions s;

-- 4. Función para sincronizar desde RevenueCat webhook
CREATE OR REPLACE FUNCTION sync_revenuecat_subscription(
  p_user_id TEXT,
  p_revenuecat_customer_id TEXT,
  p_product_identifier TEXT,
  p_status TEXT,
  p_expiration_date TIMESTAMPTZ,
  p_platform TEXT DEFAULT 'ios'
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.subscriptions (
    user_id,
    revenuecat_customer_id,
    product_identifier,
    status,
    current_period_end,
    platform,
    updated_at
  ) VALUES (
    p_user_id,
    p_revenuecat_customer_id,
    p_product_identifier,
    p_status,
    p_expiration_date,
    p_platform,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    revenuecat_customer_id = EXCLUDED.revenuecat_customer_id,
    product_identifier = EXCLUDED.product_identifier,
    status = EXCLUDED.status,
    current_period_end = EXCLUDED.current_period_end,
    platform = EXCLUDED.platform,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 5. Marcar suscripciones Stripe existentes
UPDATE public.subscriptions
SET platform = 'stripe'
WHERE stripe_subscription_id IS NOT NULL 
  AND platform IS NULL;

-- 6. Comentarios para documentación
COMMENT ON COLUMN public.subscriptions.revenuecat_customer_id IS 'ID del cliente en RevenueCat (para iOS/Android IAP)';
COMMENT ON COLUMN public.subscriptions.product_identifier IS 'ID del producto de suscripción (ej: luxor_fitness_monthly)';
COMMENT ON COLUMN public.subscriptions.platform IS 'Plataforma de pago: stripe, ios, android, web';

-- 7. Grant permisos actualizados
GRANT SELECT ON public.v_user_subscription TO authenticated;
GRANT SELECT ON public.v_user_subscription TO anon;

-- Verificación
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions'
  AND table_schema = 'public'
ORDER BY ordinal_position;




