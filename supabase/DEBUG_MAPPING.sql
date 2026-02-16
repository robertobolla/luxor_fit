-- INVESTIGACION EXTENSIVA
-- Vamos a ver exactamente qué filas existen y dónde están los referidos

SELECT 
    id as "UUID (Partner ID)", 
    user_id as "Clerk User ID", 
    email, 
    role_type,
    discount_code,
    (SELECT count(*) FROM offer_code_redemptions WHERE partner_id = admin_roles.id) as "Redenciones (Referidos)",
    (SELECT count(*) FROM discount_code_usage WHERE partner_id = admin_roles.user_id) as "Usos Codigo (User ID)",
    (SELECT count(*) FROM gym_members WHERE empresario_id = admin_roles.user_id) as "Gym Members (User ID)"
FROM 
    admin_roles 
WHERE 
    email = 'robertobolla@gmail.com' 
    OR user_id = 'user_34Ap3n1PCKLyVxhIN7f1gQVdKBo';
