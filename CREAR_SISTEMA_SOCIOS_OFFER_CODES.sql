-- ============================================================================
-- SISTEMA DE SOCIOS Y TRACKING DE OFFER CODES
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Tabla de Socios (Partners)
-- Cada socio (gym, influencer, etc.) tiene su registro aquí
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Información del socio
  name TEXT NOT NULL,                           -- "Gym Fitness Plus"
  contact_email TEXT,                           -- Email de contacto
  contact_phone TEXT,                           -- Teléfono
  business_type TEXT,                           -- 'gym', 'influencer', 'trainer', 'other'
  
  -- Código de referencia (para identificar en App Store Connect)
  reference_code TEXT UNIQUE NOT NULL,          -- "GYM_FITNESS_PLUS" - usado en App Store Connect
  
  -- Comisiones y términos
  commission_percentage DECIMAL(5,2) DEFAULT 0, -- % de comisión por cada venta
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Campañas de Códigos de Oferta
-- Cada vez que generas códigos en App Store Connect para un socio
CREATE TABLE IF NOT EXISTS partner_offer_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  
  -- Identificador de App Store Connect
  offer_reference_name TEXT NOT NULL,           -- Nombre en App Store Connect "Socio_GymXYZ_Enero2026"
  
  -- Detalles de la oferta
  offer_type TEXT NOT NULL,                     -- 'free_trial', 'pay_up_front', 'pay_as_you_go'
  discount_description TEXT,                    -- "3 meses gratis" o "50% primer año"
  
  -- Cantidad de códigos
  codes_generated INTEGER NOT NULL DEFAULT 0,   -- Códigos generados en esta campaña
  codes_redeemed INTEGER NOT NULL DEFAULT 0,    -- Códigos usados (actualizado via webhook)
  
  -- Vigencia
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,                      -- NULL = sin fecha de expiración
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Redenciones de Códigos
-- Cada vez que un usuario usa un código, se registra aquí
CREATE TABLE IF NOT EXISTS offer_code_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Usuario que redimió
  user_id TEXT NOT NULL,                        -- Clerk user ID
  
  -- Relación con socio/campaña
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES partner_offer_campaigns(id) ON DELETE SET NULL,
  
  -- Datos de RevenueCat
  offer_code TEXT,                              -- Código específico usado (si disponible)
  offer_reference_name TEXT,                    -- Referencia de la oferta
  transaction_id TEXT,                          -- ID de transacción de Apple
  product_id TEXT,                              -- Producto comprado
  
  -- Valor
  price_paid DECIMAL(10,2),                     -- Precio pagado (puede ser 0 si es trial)
  currency TEXT DEFAULT 'USD',
  
  -- Timestamps
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Estadísticas Mensuales por Socio (para reportes rápidos)
CREATE TABLE IF NOT EXISTS partner_monthly_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  
  -- Período
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  
  -- Métricas
  codes_redeemed INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  commission_earned DECIMAL(10,2) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Único por socio/mes
  UNIQUE(partner_id, year, month)
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_partners_reference_code ON partners(reference_code);
CREATE INDEX IF NOT EXISTS idx_partner_campaigns_partner ON partner_offer_campaigns(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_campaigns_reference ON partner_offer_campaigns(offer_reference_name);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON offer_code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_partner ON offer_code_redemptions(partner_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_date ON offer_code_redemptions(redeemed_at);
CREATE INDEX IF NOT EXISTS idx_monthly_stats_partner ON partner_monthly_stats(partner_id, year, month);

-- ============================================================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================================================

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_offer_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_code_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_monthly_stats ENABLE ROW LEVEL SECURITY;

-- Política: Los administradores pueden ver todo (usando service_role key)
-- Para la app, solo lectura de datos públicos de socios activos

-- Partners: Lectura pública de socios activos
CREATE POLICY "Partners are viewable by everyone" ON partners
  FOR SELECT USING (is_active = true);

-- Partners: Solo admins pueden modificar (via service_role)
CREATE POLICY "Partners are editable by service role" ON partners
  FOR ALL USING (auth.role() = 'service_role');

-- Campaigns: Lectura pública de campañas activas  
CREATE POLICY "Campaigns are viewable by everyone" ON partner_offer_campaigns
  FOR SELECT USING (is_active = true);

-- Campaigns: Solo admins pueden modificar
CREATE POLICY "Campaigns are editable by service role" ON partner_offer_campaigns
  FOR ALL USING (auth.role() = 'service_role');

-- Redemptions: Solo service role puede insertar/ver
CREATE POLICY "Redemptions managed by service role" ON offer_code_redemptions
  FOR ALL USING (auth.role() = 'service_role');

-- Stats: Solo service role
CREATE POLICY "Stats managed by service role" ON partner_monthly_stats
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

-- Función para incrementar contador de redenciones
CREATE OR REPLACE FUNCTION increment_redemption_count(
  p_campaign_id UUID,
  p_partner_id UUID
)
RETURNS void AS $$
BEGIN
  -- Incrementar en campaña
  UPDATE partner_offer_campaigns 
  SET codes_redeemed = codes_redeemed + 1,
      updated_at = NOW()
  WHERE id = p_campaign_id;
  
  -- Incrementar/crear stats mensuales
  INSERT INTO partner_monthly_stats (partner_id, year, month, codes_redeemed)
  VALUES (p_partner_id, EXTRACT(YEAR FROM NOW()), EXTRACT(MONTH FROM NOW()), 1)
  ON CONFLICT (partner_id, year, month) 
  DO UPDATE SET 
    codes_redeemed = partner_monthly_stats.codes_redeemed + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de un socio
CREATE OR REPLACE FUNCTION get_partner_stats(p_partner_id UUID)
RETURNS TABLE (
  total_codes_generated BIGINT,
  total_codes_redeemed BIGINT,
  conversion_rate DECIMAL,
  total_revenue DECIMAL,
  active_campaigns BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(poc.codes_generated), 0)::BIGINT as total_codes_generated,
    COALESCE(SUM(poc.codes_redeemed), 0)::BIGINT as total_codes_redeemed,
    CASE 
      WHEN COALESCE(SUM(poc.codes_generated), 0) > 0 
      THEN ROUND((COALESCE(SUM(poc.codes_redeemed), 0)::DECIMAL / SUM(poc.codes_generated)::DECIMAL) * 100, 2)
      ELSE 0 
    END as conversion_rate,
    COALESCE((SELECT SUM(price_paid) FROM offer_code_redemptions WHERE partner_id = p_partner_id), 0) as total_revenue,
    (SELECT COUNT(*) FROM partner_offer_campaigns WHERE partner_id = p_partner_id AND is_active = true)::BIGINT as active_campaigns
  FROM partner_offer_campaigns poc
  WHERE poc.partner_id = p_partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DATOS DE EJEMPLO (Opcional - comentar si no quieres datos de prueba)
-- ============================================================================

-- Insertar un socio de ejemplo
-- INSERT INTO partners (name, contact_email, business_type, reference_code, commission_percentage)
-- VALUES ('Gym Fitness Plus', 'contacto@gymfitnessplus.com', 'gym', 'GYM_FITNESS_PLUS', 10);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que las tablas se crearon correctamente
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('partners', 'partner_offer_campaigns', 'offer_code_redemptions', 'partner_monthly_stats');
