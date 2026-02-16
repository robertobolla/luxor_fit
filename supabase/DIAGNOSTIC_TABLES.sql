-- DIAGNOSTICO DE TABLAS
-- Vamos a ver si el problema es que "offer_code_redemptions" (lo que usa la gráfica) está vacío
-- aunque "discount_code_usage" (lo que usa la lista de usuarios) tenga datos.

-- 1. Tu ID y UUID interno
WITH my_partner AS (
    SELECT id, user_id, email, discount_code FROM admin_roles WHERE email = 'robertobolla@gmail.com'
)
SELECT * FROM my_partner;

-- 2. Conteo en discount_code_usage (Debería tener datos si ves usuarios referidos en la lista)
SELECT count(*) as count_usage 
FROM discount_code_usage 
WHERE partner_id = (SELECT user_id FROM admin_roles WHERE email = 'robertobolla@gmail.com');

-- 3. Conteo en offer_code_redemptions (Debería tener datos para que funcione "Mis Referidos")
SELECT count(*) as count_redemptions
FROM offer_code_redemptions 
WHERE partner_id = (SELECT id FROM admin_roles WHERE email = 'robertobolla@gmail.com');

-- 4. Prueba del RPC nuevo
SELECT * FROM get_partner_referral_list((SELECT user_id FROM admin_roles WHERE email = 'robertobolla@gmail.com'));
