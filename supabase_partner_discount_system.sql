-- ============================================================================
-- SISTEMA DE CÓDIGOS DE DESCUENTO PARA SOCIOS
-- ============================================================================

-- 1. Agregar campos a admin_roles para códigos de descuento
ALTER TABLE admin_roles
ADD COLUMN IF NOT EXISTS discount_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS discount_description TEXT,
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS free_access BOOLEAN DEFAULT true, -- Los socios siempre tienen acceso gratuito
ADD COLUMN IF NOT EXISTS referral_stats JSONB DEFAULT '{}'::jsonb;

-- Actualizar todos los socios existentes para tener acceso gratuito
UPDATE admin_roles 
SET free_access = true 
WHERE role_type = 'socio' AND free_access = false;

-- Índice para búsqueda rápida por código
CREATE INDEX IF NOT EXISTS idx_admin_roles_discount_code ON admin_roles(discount_code) WHERE discount_code IS NOT NULL;

-- 2. Tabla para tracking de usuarios que usaron códigos
CREATE TABLE IF NOT EXISTS discount_code_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- ID del usuario en Clerk
  discount_code TEXT NOT NULL, -- Código usado
  partner_id TEXT REFERENCES admin_roles(user_id) ON DELETE SET NULL, -- ID del socio dueño del código
  stripe_session_id TEXT, -- ID de sesión de Stripe (si aplica)
  subscription_id TEXT REFERENCES subscriptions(user_id) ON DELETE SET NULL, -- ID de suscripción creada
  discount_amount NUMERIC(10, 2), -- Monto descontado (si aplica)
  is_free_access BOOLEAN DEFAULT false, -- Si fue acceso gratuito
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices
  CONSTRAINT fk_discount_code_usage_user FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_discount_code_usage_user_id ON discount_code_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_discount_code_usage_code ON discount_code_usage(discount_code);
CREATE INDEX IF NOT EXISTS idx_discount_code_usage_partner_id ON discount_code_usage(partner_id);

-- 3. RLS para discount_code_usage
ALTER TABLE discount_code_usage ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede leer (verificación en el cliente)
CREATE POLICY "Anyone can read discount code usage"
  ON discount_code_usage
  FOR SELECT
  USING (true);

-- Política: Cualquiera puede insertar (solo desde el webhook/checkout autenticado)
CREATE POLICY "Anyone can insert discount code usage"
  ON discount_code_usage
  FOR INSERT
  WITH CHECK (true);

-- 4. Vista para socios ver sus referidos
CREATE OR REPLACE VIEW partner_referrals AS
SELECT 
  ar.user_id AS partner_user_id,
  ar.name AS partner_name,
  ar.email AS partner_email,
  ar.discount_code,
  dcu.id AS usage_id,
  dcu.user_id AS referred_user_id,
  up.name AS referred_user_name,
  up.email AS referred_user_email,
  dcu.is_free_access,
  dcu.discount_amount,
  dcu.created_at AS used_at,
  sub.status AS subscription_status,
  sub.created_at AS subscription_created_at
FROM admin_roles ar
LEFT JOIN discount_code_usage dcu ON dcu.partner_id = ar.user_id
LEFT JOIN user_profiles up ON up.user_id = dcu.user_id
LEFT JOIN subscriptions sub ON sub.user_id = dcu.user_id
WHERE ar.role_type = 'socio' AND ar.discount_code IS NOT NULL;

-- Grant permisos para la vista
GRANT SELECT ON partner_referrals TO authenticated;
GRANT SELECT ON partner_referrals TO anon;

-- 5. Función para obtener estadísticas de referidos por socio
CREATE OR REPLACE FUNCTION get_partner_referral_stats(partner_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_referrals', COUNT(*),
    'free_access_referrals', COUNT(*) FILTER (WHERE is_free_access = true),
    'paid_referrals', COUNT(*) FILTER (WHERE is_free_access = false),
    'active_subscriptions', COUNT(DISTINCT sub.user_id) FILTER (WHERE sub.status IN ('active', 'trialing')),
    'total_revenue', COALESCE(SUM(discount_amount), 0)
  ) INTO stats
  FROM discount_code_usage dcu
  LEFT JOIN subscriptions sub ON sub.user_id = dcu.user_id
  WHERE dcu.partner_id = partner_user_id;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para actualizar estadísticas en admin_roles cuando se usa un código
CREATE OR REPLACE FUNCTION update_partner_referral_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.partner_id IS NOT NULL THEN
    UPDATE admin_roles
    SET referral_stats = get_partner_referral_stats(NEW.partner_id),
        updated_at = NOW()
    WHERE user_id = NEW.partner_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_partner_stats
AFTER INSERT ON discount_code_usage
FOR EACH ROW
EXECUTE FUNCTION update_partner_referral_stats();

-- Comentarios
COMMENT ON COLUMN admin_roles.discount_code IS 'Código de descuento personalizable para socios';
COMMENT ON COLUMN admin_roles.free_access IS 'Si true, el socio tiene acceso gratuito a la app';
COMMENT ON COLUMN discount_code_usage.partner_id IS 'ID del socio dueño del código usado';
COMMENT ON COLUMN discount_code_usage.is_free_access IS 'Si true, este usuario obtuvo acceso gratuito (código de socio)';

