-- ============================================================================
-- SISTEMA DE COMISIONES Y PAGOS PARA SOCIOS
-- ============================================================================

-- 1. Agregar campo de comisión por suscripción activa a admin_roles
ALTER TABLE admin_roles
ADD COLUMN IF NOT EXISTS commission_per_subscription NUMERIC(10, 2) DEFAULT 0 CHECK (commission_per_subscription >= 0),
ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'fixed' CHECK (commission_type IN ('fixed', 'percentage')),
ADD COLUMN IF NOT EXISTS total_earnings NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- 2. Tabla para tracking de pagos/comisiones
CREATE TABLE IF NOT EXISTS partner_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES admin_roles(user_id) ON DELETE CASCADE,
  partner_name TEXT,
  partner_email TEXT,
  
  -- Información del pago
  period_start_date TIMESTAMPTZ NOT NULL,
  period_end_date TIMESTAMPTZ NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'USD',
  
  -- Detalles del cálculo
  active_subscriptions_count INTEGER NOT NULL DEFAULT 0,
  commission_per_subscription NUMERIC(10, 2) NOT NULL,
  commission_type TEXT DEFAULT 'fixed',
  
  -- Estado del pago
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  payment_method TEXT, -- 'bank_transfer', 'paypal', 'stripe', etc.
  payment_reference TEXT, -- Número de referencia o transacción
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT -- ID del admin que creó el pago
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_partner_payments_partner_id ON partner_payments(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_payments_status ON partner_payments(status);
CREATE INDEX IF NOT EXISTS idx_partner_payments_payment_date ON partner_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_partner_payments_period ON partner_payments(period_start_date, period_end_date);

-- 3. RLS para partner_payments
ALTER TABLE partner_payments ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede leer (verificación en el cliente)
CREATE POLICY "Anyone can read partner payments"
  ON partner_payments
  FOR SELECT
  USING (true);

-- Política: Cualquiera puede insertar (solo desde el dashboard autenticado)
CREATE POLICY "Anyone can insert partner payments"
  ON partner_payments
  FOR INSERT
  WITH CHECK (true);

-- Política: Cualquiera puede actualizar (solo desde el dashboard autenticado)
CREATE POLICY "Anyone can update partner payments"
  ON partner_payments
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Política: Cualquiera puede eliminar (solo desde el dashboard autenticado)
CREATE POLICY "Anyone can delete partner payments"
  ON partner_payments
  FOR DELETE
  USING (true);

-- 4. Función para calcular ganancias acumuladas de un socio
CREATE OR REPLACE FUNCTION calculate_partner_earnings(partner_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  commission NUMERIC;
  active_count INTEGER;
BEGIN
  -- Obtener comisión configurada
  SELECT commission_per_subscription INTO commission
  FROM admin_roles
  WHERE user_id = partner_user_id AND role_type = 'socio';
  
  -- Contar suscripciones activas (usando subconsulta directa si partner_active_users no existe)
  SELECT COUNT(DISTINCT dcu.user_id) INTO active_count
  FROM discount_code_usage dcu
  INNER JOIN subscriptions sub ON sub.user_id = dcu.user_id
  WHERE dcu.partner_id = partner_user_id
    AND sub.status IN ('active', 'trialing');
  
  -- Calcular ganancias acumuladas (pendientes + pagadas)
  SELECT jsonb_build_object(
    'commission_per_subscription', COALESCE(commission, 0),
    'active_subscriptions', active_count,
    'total_earnings_pending', active_count * COALESCE(commission, 0),
    'total_earnings_paid', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
    'total_earnings_pending_payments', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0),
    'next_payment_amount', active_count * COALESCE(commission, 0) - COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)
  ) INTO stats
  FROM partner_payments
  WHERE partner_id = partner_user_id;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para obtener historial de pagos de un socio
CREATE OR REPLACE FUNCTION get_partner_payment_history(partner_user_id TEXT, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  period_start_date TIMESTAMPTZ,
  period_end_date TIMESTAMPTZ,
  payment_date TIMESTAMPTZ,
  amount NUMERIC,
  status TEXT,
  active_subscriptions_count INTEGER,
  commission_per_subscription NUMERIC,
  payment_reference TEXT,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id,
    pp.period_start_date,
    pp.period_end_date,
    pp.payment_date,
    pp.amount,
    pp.status,
    pp.active_subscriptions_count,
    pp.commission_per_subscription,
    pp.payment_reference,
    pp.notes
  FROM partner_payments pp
  WHERE pp.partner_id = partner_user_id
  ORDER BY pp.payment_date DESC, pp.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Nota importante: Ejecutar primero supabase_partner_tracking_payments.sql para crear partner_active_users
-- Si esa vista no existe, las funciones usarán subconsultas directas como alternativa

-- 6. Vista para resumen de pagos por socio
-- NOTA: Esta vista requiere que partner_active_users exista (de supabase_partner_tracking_payments.sql)
-- Si la vista no existe, usaremos una subconsulta alternativa
CREATE OR REPLACE VIEW partner_payments_summary AS
SELECT 
  ar.user_id AS partner_user_id,
  ar.name AS partner_name,
  ar.email AS partner_email,
  ar.discount_code,
  ar.commission_per_subscription,
  ar.commission_type,
  ar.total_earnings,
  ar.last_payment_date,
  COALESCE(
    (SELECT COUNT(DISTINCT dcu.user_id) 
     FROM discount_code_usage dcu
     INNER JOIN subscriptions sub ON sub.user_id = dcu.user_id
     WHERE dcu.partner_id = ar.user_id 
       AND sub.status IN ('active', 'trialing')),
    0
  ) AS active_subscriptions,
  COALESCE(
    (SELECT COUNT(DISTINCT dcu.user_id)
     FROM discount_code_usage dcu
     WHERE dcu.partner_id = ar.user_id),
    0
  ) AS total_referrals,
  COALESCE(SUM(pp.amount) FILTER (WHERE pp.status = 'paid'), 0) AS total_paid,
  COALESCE(SUM(pp.amount) FILTER (WHERE pp.status = 'pending'), 0) AS pending_payments,
  COUNT(pp.id) FILTER (WHERE pp.status = 'paid') AS payments_count
FROM admin_roles ar
LEFT JOIN partner_payments pp ON pp.partner_id = ar.user_id
WHERE ar.role_type = 'socio' AND ar.is_active = true
GROUP BY ar.user_id, ar.name, ar.email, ar.discount_code, ar.commission_per_subscription, 
         ar.commission_type, ar.total_earnings, ar.last_payment_date;

-- Grant permisos
GRANT SELECT ON partner_payments_summary TO authenticated;
GRANT SELECT ON partner_payments_summary TO anon;
GRANT EXECUTE ON FUNCTION calculate_partner_earnings(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_partner_earnings(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_partner_payment_history(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_payment_history(TEXT, INTEGER) TO anon;

-- 7. Trigger para actualizar total_earnings cuando se marca un pago como "paid"
CREATE OR REPLACE FUNCTION update_partner_total_earnings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE admin_roles
    SET 
      total_earnings = total_earnings + NEW.amount,
      last_payment_date = NEW.payment_date,
      updated_at = NOW()
    WHERE user_id = NEW.partner_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_partner_total_earnings
AFTER UPDATE OF status ON partner_payments
FOR EACH ROW
WHEN (NEW.status = 'paid' AND OLD.status != 'paid')
EXECUTE FUNCTION update_partner_total_earnings();

-- Comentarios
COMMENT ON COLUMN admin_roles.commission_per_subscription IS 'Comisión fija por cada suscripción activa (ej: $5.00)';
COMMENT ON COLUMN admin_roles.commission_type IS 'Tipo de comisión: fixed (monto fijo) o percentage (porcentaje)';
COMMENT ON COLUMN admin_roles.total_earnings IS 'Total de ganancias acumuladas (actualizado automáticamente)';
COMMENT ON TABLE partner_payments IS 'Registro de pagos realizados a socios';
COMMENT ON FUNCTION calculate_partner_earnings IS 'Calcula ganancias actuales y pendientes de un socio';

