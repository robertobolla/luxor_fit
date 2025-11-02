-- Tabla para mantener historial de pagos y suscripciones canceladas/eliminadas
-- Esto preserva el registro contable incluso cuando se elimina una suscripción

CREATE TABLE IF NOT EXISTS payment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Información del usuario
  user_id TEXT NOT NULL,
  user_email TEXT,
  user_name TEXT,
  
  -- Información de la suscripción original
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  
  -- Información del pago
  monthly_amount NUMERIC(10, 2) NOT NULL,
  total_paid NUMERIC(10, 2), -- Total pagado acumulado
  currency TEXT DEFAULT 'USD',
  
  -- Fechas importantes
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  last_payment_date TIMESTAMPTZ,
  canceled_date TIMESTAMPTZ DEFAULT NOW(), -- Cuando se canceló/eliminó
  
  -- Estado
  status TEXT NOT NULL CHECK (status IN ('canceled', 'deleted', 'expired', 'refunded')),
  cancel_reason TEXT, -- Razón de cancelación (opcional)
  canceled_by TEXT, -- ID del usuario/admin que canceló
  
  -- Metadata
  subscription_data JSONB, -- Datos completos de la suscripción al momento de cancelación
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_canceled_date ON payment_history(canceled_date);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_subscription_id ON payment_history(stripe_subscription_id);

-- Comentarios
COMMENT ON TABLE payment_history IS 'Historial de pagos y suscripciones canceladas/eliminadas para mantener registro contable';
COMMENT ON COLUMN payment_history.subscription_data IS 'Datos completos de la suscripción al momento de cancelación (JSON)';

