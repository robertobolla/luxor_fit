-- DIAGNOSTICO DE DATOS
-- Ejecutar esto para ver qué está pasando internamente

-- 1. Ver datos del usuario en admin_roles
SELECT id, user_id, email, role_type, discount_code 
FROM admin_roles 
WHERE email = 'robertobolla@gmail.com';

-- 2. Ver si existen redenciones (referidos) vinculados a este UUID de partner
WITH partner_info AS (
    SELECT id FROM admin_roles WHERE email = 'robertobolla@gmail.com' LIMIT 1
)
SELECT count(*) as total_redemptions_raw
FROM offer_code_redemptions 
WHERE partner_id = (SELECT id FROM partner_info);

-- 3. Ver qué devuelve la VISTA (simulando que somos la API)
-- Nota: Esto no simula RLS perfectamente si lo corres como superadmin, 
-- pero nos dice si la lógica de la vista funciona.
WITH user_info AS (
    SELECT user_id FROM admin_roles WHERE email = 'robertobolla@gmail.com' LIMIT 1
)
SELECT * 
FROM partner_referrals 
WHERE partner_user_id = (SELECT user_id FROM user_info);

-- 4. Probar el RPC directamente
WITH user_info AS (
    SELECT user_id FROM admin_roles WHERE email = 'robertobolla@gmail.com' LIMIT 1
)
SELECT get_partner_referral_stats((SELECT user_id FROM user_info));
