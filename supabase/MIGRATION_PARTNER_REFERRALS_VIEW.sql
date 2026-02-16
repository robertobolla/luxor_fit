-- FIX FINAL V3: Casting EXPLÍCITO para TODAS las comparaciones de ID (UUID vs TEXT)
-- Resuelve el error 42883: operator does not exist: uuid = text
-- Convertimos todo a ::text para garantizar compatibilidad, sin importar si la columna es UUID o TEXT.

-- 1. Crear tabla si no existe
CREATE TABLE IF NOT EXISTS offer_code_redemptions (
    usage_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES admin_roles(id) ON DELETE SET NULL, 
    offer_code TEXT, 
    offer_reference_name TEXT, 
    transaction_id TEXT, 
    product_id TEXT, 
    price_paid NUMERIC(10, 2), 
    currency TEXT DEFAULT 'USD',
    is_free_access BOOLEAN DEFAULT FALSE, 
    campaign_id UUID, 
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Asegurar columnas faltantes de forma segura 
DO $$
BEGIN
    -- usage_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_code_redemptions' AND column_name = 'usage_id') THEN
        ALTER TABLE offer_code_redemptions ADD COLUMN usage_id UUID DEFAULT gen_random_uuid();
    END IF;

    -- user_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_code_redemptions' AND column_name = 'user_id') THEN
        ALTER TABLE offer_code_redemptions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- partner_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_code_redemptions' AND column_name = 'partner_id') THEN
        ALTER TABLE offer_code_redemptions ADD COLUMN partner_id UUID REFERENCES admin_roles(id) ON DELETE SET NULL;
    END IF;

    -- price_paid
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_code_redemptions' AND column_name = 'price_paid') THEN
        ALTER TABLE offer_code_redemptions ADD COLUMN price_paid NUMERIC(10, 2);
    END IF;

    -- used_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_code_redemptions' AND column_name = 'used_at') THEN
        ALTER TABLE offer_code_redemptions ADD COLUMN used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- is_free_access
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_code_redemptions' AND column_name = 'is_free_access') THEN
        ALTER TABLE offer_code_redemptions ADD COLUMN is_free_access BOOLEAN DEFAULT FALSE;
    END IF;

    -- Otras columnas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_code_redemptions' AND column_name = 'offer_code') THEN
        ALTER TABLE offer_code_redemptions ADD COLUMN offer_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_code_redemptions' AND column_name = 'offer_reference_name') THEN
        ALTER TABLE offer_code_redemptions ADD COLUMN offer_reference_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_code_redemptions' AND column_name = 'transaction_id') THEN
        ALTER TABLE offer_code_redemptions ADD COLUMN transaction_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_code_redemptions' AND column_name = 'product_id') THEN
        ALTER TABLE offer_code_redemptions ADD COLUMN product_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_code_redemptions' AND column_name = 'currency') THEN
        ALTER TABLE offer_code_redemptions ADD COLUMN currency TEXT DEFAULT 'USD';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_code_redemptions' AND column_name = 'campaign_id') THEN
        ALTER TABLE offer_code_redemptions ADD COLUMN campaign_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offer_code_redemptions' AND column_name = 'created_at') THEN
        ALTER TABLE offer_code_redemptions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. Crear índices
CREATE INDEX IF NOT EXISTS idx_offer_code_redemptions_partner_id ON offer_code_redemptions(partner_id);
CREATE INDEX IF NOT EXISTS idx_offer_code_redemptions_user_id ON offer_code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_offer_code_redemptions_offer_code ON offer_code_redemptions(offer_code);

-- 4. Recrear la vista partner_referrals
DROP VIEW IF EXISTS partner_referrals;

CREATE OR REPLACE VIEW partner_referrals AS
SELECT 
    ocr.usage_id,
    ar.user_id as partner_user_id, -- CORRECCIÓN: Usar el user_id (Clerk ID) para que coincida con el frontend
    ocr.user_id as referred_user_id,
    up.name as referred_user_name,
    up.email as referred_user_email,
    ocr.is_free_access,
    ocr.price_paid as discount_amount, 
    ocr.used_at,
    CASE 
        WHEN s.status = 'active' OR s.status = 'trialing' THEN 'active'
        WHEN s.status IS NULL THEN 'inactive'
        ELSE s.status 
    END as subscription_status,
    s.created_at as subscription_created_at
FROM 
    offer_code_redemptions ocr
INNER JOIN
    admin_roles ar ON ocr.partner_id = ar.id -- Unimos con admin_roles para obtener el user_id correcto
LEFT JOIN 
    user_profiles up ON ocr.user_id = up.user_id
LEFT JOIN 
    subscriptions s ON ocr.user_id = s.user_id;

-- 5. Permisos (RLS) con CASTING EXPLÍCITO TOTAL
ALTER TABLE offer_code_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all redemptions" ON offer_code_redemptions;
CREATE POLICY "Admins can view all redemptions" ON offer_code_redemptions
    FOR SELECT
    USING (
        auth.uid()::text IN (
            SELECT user_id::text FROM admin_roles WHERE role_type = 'admin' OR role_type = 'superadmin' OR role_type = 'entrenador'
        )
    );

DROP POLICY IF EXISTS "Partners can view their own redemptions" ON offer_code_redemptions;
CREATE POLICY "Partners can view their own redemptions" ON offer_code_redemptions
    FOR SELECT
    USING (
        -- Convertimos TODO a TEXT para comparar
        partner_id::text = (SELECT id::text FROM admin_roles WHERE user_id::text = auth.uid()::text LIMIT 1) 
        OR 
        partner_id::text = auth.uid()::text 
    );
