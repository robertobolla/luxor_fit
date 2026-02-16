-- ============================================================================
-- DATA DE PRUEBA PARA COMISIONES MULTI-NIVEL (IDS VALIDAS UUID)
-- ============================================================================

-- Variables de UUIDs fijos para los Partners para poder referenciarlos
-- Partner A: 'a0000000-0000-0000-0000-00000000000a'
-- Partner B: 'b0000000-0000-0000-0000-00000000000b'
-- Partner C: 'c0000000-0000-0000-0000-00000000000c'

-- 1. Limpiar datos de prueba anteriores (CRÍTICO: Para evitar error de unique constraint en discount_code)
DELETE FROM admin_roles WHERE discount_code IN ('CODE_A', 'CODE_B', 'CODE_C');
-- También limpiar los usuarios de prueba generados anteriormente para no acumular basura
DELETE FROM user_profiles WHERE email LIKE 'user_lvl_%@test.com';

-- 2. Insertar Partners (usando UUIDs explícitos)
INSERT INTO admin_roles (user_id, id, email, role_type, name, is_active, discount_code, commission_per_subscription, referred_by)
VALUES 
-- Socio A (Tope)
('a0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'partner_A@test.com', 'socio', 'Socio A (Abuelo)', true, 'CODE_A', 3.00, NULL),
-- Socio B (Hijo de A)
('b0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000b', 'partner_B@test.com', 'socio', 'Socio B (Padre)', true, 'CODE_B', 3.00, 'a0000000-0000-0000-0000-00000000000a'),
-- Socio C (Hijo de B)
('c0000000-0000-0000-0000-00000000000c', 'c0000000-0000-0000-0000-00000000000c', 'partner_C@test.com', 'socio', 'Socio C (Hijo)', true, 'CODE_C', 3.00, 'b0000000-0000-0000-0000-00000000000b')
ON CONFLICT (user_id) DO UPDATE SET 
    referred_by = EXCLUDED.referred_by,
    commission_per_subscription = EXCLUDED.commission_per_subscription,
    discount_code = EXCLUDED.discount_code;

-- 2. Generación Masiva de Usuarios y Suscripciones
DO $$
DECLARE
  i INTEGER;
  new_user_id UUID;
  new_email TEXT;
  partner_a_id UUID := 'a0000000-0000-0000-0000-00000000000a';
  partner_b_id UUID := 'b0000000-0000-0000-0000-00000000000b';
BEGIN
  -- A. Crear 20 usuarios directos de Socio A (Nivel 1 para A)
  FOR i IN 1..20 LOOP
    new_user_id := uuid_generate_v4(); -- O gen_random_uuid() dependiendo de la versión de PG
    -- Si uuid_generate_v4 no existe, usar gen_random_uuid()
    -- new_user_id := gen_random_uuid(); 
    
    new_email := 'user_lvl1_' || i || '_' || floor(random() * 1000) || '@test.com';

    -- Insertar perfil
    INSERT INTO user_profiles (user_id, email, name) 
    VALUES (new_user_id::text, new_email, 'User Directo A - ' || i)
    ON CONFLICT (user_id) DO NOTHING;

    -- 1. System A: discount_code_usage (Comisiones)
    INSERT INTO discount_code_usage (user_id, partner_id, discount_code) 
    VALUES (new_user_id::text, partner_a_id::text, 'CODE_A')
    ON CONFLICT DO NOTHING;

    -- 2. System B: offer_code_redemptions (Listado de Referidos)
    INSERT INTO offer_code_redemptions (user_id, partner_id, offer_code, price_paid, currency, is_free_access)
    VALUES (new_user_id, partner_a_id, 'CODE_A', 9.99, 'USD', false)
    ON CONFLICT DO NOTHING;

    -- 3. Suscripción Activa
    INSERT INTO subscriptions (user_id, status, current_period_end) 
    VALUES (new_user_id::text, 'active', NOW() + INTERVAL '1 month')
    ON CONFLICT (user_id) DO UPDATE SET status = 'active';
  END LOOP;

  -- B. Crear 30 usuarios directos de Socio B (Nivel 1 para B, Nivel 2 para A)
  FOR i IN 1..30 LOOP
    new_user_id := gen_random_uuid();
    new_email := 'user_lvl2_' || i || '_' || floor(random() * 1000) || '@test.com';

    -- Insertar perfil
    INSERT INTO user_profiles (user_id, email, name) 
    VALUES (new_user_id::text, new_email, 'User Indirecto A (Via B) - ' || i)
    ON CONFLICT (user_id) DO NOTHING;

    -- 1. System A: discount_code_usage
    INSERT INTO discount_code_usage (user_id, partner_id, discount_code) 
    VALUES (new_user_id::text, partner_b_id::text, 'CODE_B')
    ON CONFLICT DO NOTHING;

    -- 2. System B: offer_code_redemptions
    INSERT INTO offer_code_redemptions (user_id, partner_id, offer_code, price_paid, currency, is_free_access)
    VALUES (new_user_id, partner_b_id, 'CODE_B', 9.99, 'USD', false)
    ON CONFLICT DO NOTHING;

    -- 3. Suscripción Activa
    INSERT INTO subscriptions (user_id, status, current_period_end) 
    VALUES (new_user_id::text, 'active', NOW() + INTERVAL '1 month')
    ON CONFLICT (user_id) DO UPDATE SET status = 'active';
  END LOOP;
END $$;


-- 4. Verificar resultados esperados:
-- Socio A: 
--    - Nivel 1 (Directos): 1 (User 1) -> $3.00
--    - Nivel 2 (Indirectos): 1 (User 2, vía B) -> $1.00
--    - Total: $4.00

-- Socio B:
--    - Nivel 1 (Directos): 1 (User 2) -> $3.00
--    - Nivel 2 (Indirectos): 1 (User 3, vía C) -> $1.00
--    - Total: $4.00

-- Socio C:
--    - Nivel 1 (Directos): 1 (User 3) -> $3.00
--    - Nivel 2 (Indirectos): 0
--    - Total: $3.00
