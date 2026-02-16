-- DIAGNOSTICO DE CORREOS
-- Vamos a ver si el problema es que los referidos están en el correo SIN el número 9
-- y tu usuario actual tiene el 9.

SELECT 
    id as "UUID",
    email,
    user_id,
    role_type,
    discount_code,
    (SELECT count(*) FROM offer_code_redemptions WHERE partner_id = admin_roles.id) as "Referidos (Redenciones)",
    (SELECT count(*) FROM discount_code_usage WHERE partner_id = admin_roles.user_id) as "Usos Codigo",
    (SELECT count(*) FROM gym_members WHERE empresario_id = admin_roles.user_id) as "Miembros Gym"
FROM 
    admin_roles 
WHERE 
    email IN ('robertobolla@gmail.com', 'robertobolla9@gmail.com')
    OR user_id = 'user_34Ap3n1PCKLyVxhIN7f1gQVdKBo';
