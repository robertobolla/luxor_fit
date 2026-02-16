-- DIAGNOSTICO PROFUNDO
-- 1. Ver qué usuarios existen con el email (¿Se borró el duplicado o no?)
SELECT 
    id, user_id, email, is_active, role_type 
FROM admin_roles 
WHERE email LIKE 'robertobolla%';

-- 2. Ver a quién apuntan las redenciones
SELECT 
    partner_id, count(*) 
FROM offer_code_redemptions 
WHERE partner_id IN (
    SELECT id FROM admin_roles WHERE email LIKE 'robertobolla%'
)
GROUP BY partner_id;

-- 3. Ver si hay redenciones "huérfanas" (Apuntando a un ID que ya no existe)
-- Esto pasaría si borré el usuario pero no migré las redenciones
SELECT count(*) as huerfanas 
FROM offer_code_redemptions 
WHERE partner_id NOT IN (SELECT id FROM admin_roles);
