-- DIAGNOSTICO POST-FUSION
-- Vamos a ver cómo quedó la base después del intento de fusión.

SELECT 
    id as "UUID",
    email,
    user_id,
    role_type,
    discount_code,
    (SELECT count(*) FROM offer_code_redemptions WHERE partner_id = admin_roles.id) as "Referidos",
    (SELECT count(*) FROM discount_code_usage WHERE partner_id = admin_roles.user_id) as "Usos Codigo"
FROM 
    admin_roles 
WHERE 
    email IN ('robertobolla@gmail.com', 'robertobolla9@gmail.com')
    OR user_id = 'user_34Ap3n1PCKLyVxhIN7f1gQVdKBo';
