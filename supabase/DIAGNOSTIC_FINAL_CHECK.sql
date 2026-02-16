-- DIAGNOSTICO FINAL RAPIDO
-- ¿Sigue existiendo el duplicado?

SELECT 
    id, 
    email, 
    user_id, 
    role_type, 
    is_active,
    (SELECT count(*) FROM offer_code_redemptions WHERE partner_id = admin_roles.id) as referidos
FROM 
    admin_roles 
WHERE 
    email LIKE 'robertobolla%';
