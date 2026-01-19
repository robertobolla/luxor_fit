-- =====================================================
-- CONFIGURACIÓN PARA WEBHOOK DE REVENUECAT
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Actualizar tabla offer_code_redemptions con campos adicionales
ALTER TABLE offer_code_redemptions 
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS product_id TEXT,
ADD COLUMN IF NOT EXISTS price_paid NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS revenuecat_event_id TEXT;

-- 2. Crear tabla para guardar eventos del webhook (para debugging)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL DEFAULT 'revenuecat',
  event_type TEXT NOT NULL,
  payload JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_webhook_events_source_type ON webhook_events(source, event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- RLS para webhook_events (solo service_role puede escribir)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Política para que admins puedan leer
DROP POLICY IF EXISTS "Admins can read webhook events" ON webhook_events;
CREATE POLICY "Admins can read webhook events" ON webhook_events
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE admin_roles.user_id = auth.uid()::text 
    AND admin_roles.role_type = 'admin'
  ));

-- 3. Función RPC para incrementar contadores de redención
CREATE OR REPLACE FUNCTION increment_redemption_count(
  p_campaign_id UUID,
  p_partner_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Incrementar contador en la campaña
  UPDATE partner_offer_campaigns
  SET 
    codes_redeemed = COALESCE(codes_redeemed, 0) + 1,
    updated_at = NOW()
  WHERE id = p_campaign_id;
  
  -- Actualizar timestamp del partner
  UPDATE partners
  SET updated_at = NOW()
  WHERE id = p_partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Agregar campos a partner_offer_campaigns si no existen
ALTER TABLE partner_offer_campaigns
ADD COLUMN IF NOT EXISTS codes_redeemed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_codes_generated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS offer_type TEXT,
ADD COLUMN IF NOT EXISTS offer_duration TEXT,
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 5. Agregar campo is_active a partners si no existe
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 6. Vista actualizada para resumen de socios
CREATE OR REPLACE VIEW v_partner_stats AS
SELECT 
  p.id AS partner_id,
  p.name AS partner_name,
  p.reference_code,
  p.business_type,
  p.is_active,
  COUNT(DISTINCT poc.id) AS total_campaigns,
  SUM(COALESCE(poc.total_codes_generated, 0)) AS total_codes_generated,
  SUM(COALESCE(poc.codes_redeemed, 0)) AS total_codes_redeemed,
  COUNT(DISTINCT ocr.id) AS total_redemptions
FROM partners p
LEFT JOIN partner_offer_campaigns poc ON p.id = poc.partner_id
LEFT JOIN offer_code_redemptions ocr ON p.id = ocr.partner_id
GROUP BY p.id, p.name, p.reference_code, p.business_type, p.is_active
ORDER BY total_codes_redeemed DESC;

-- 7. Vista para redenciones recientes
CREATE OR REPLACE VIEW v_recent_redemptions AS
SELECT 
  ocr.id,
  ocr.redeemed_at,
  ocr.offer_code,
  ocr.offer_reference_name,
  ocr.product_id,
  ocr.price_paid,
  ocr.currency,
  p.name AS partner_name,
  poc.offer_type
FROM offer_code_redemptions ocr
LEFT JOIN partners p ON ocr.partner_id = p.id
LEFT JOIN partner_offer_campaigns poc ON ocr.campaign_id = poc.id
ORDER BY ocr.redeemed_at DESC
LIMIT 100;

-- =====================================================
-- ¡LISTO! Ahora sigue los pasos para desplegar la Edge Function
-- =====================================================
