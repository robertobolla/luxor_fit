-- CORRECCIÓN DE TYPO EN EL ID DE USUARIO
-- El ID en base de datos tiene un '1' (uno) donde debería tener una 'i' (latina).
-- Base de datos: user_34Ap3n1PCKLyVxhIN7f1gQVdKBo
-- Real (Clerk):  user_34Ap3niPCKLyVxhIN7f1gQVdKBo

DO $$
DECLARE
    -- EL ID QUE PUSIMOS POR ERROR (CON EL 1)
    v_wrong_id TEXT := 'user_34Ap3n1PCKLyVxhIN7f1gQVdKBo'; -- n1
    
    -- EL ID CORRECTO QUE TE SALE EN PANTALLA (CON LA i)
    v_correct_id TEXT := 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'; -- ni
BEGIN

    RAISE NOTICE 'Corrigiendo ID de % a %', v_wrong_id, v_correct_id;

    -- 1. admin_roles (La tabla principal)
    UPDATE admin_roles 
    SET user_id = v_correct_id 
    WHERE user_id = v_wrong_id;
    
    -- 2. Corregir referencias en otras tablas (por si acaso)
    UPDATE admin_roles SET referred_by = v_correct_id WHERE referred_by = v_wrong_id;
    UPDATE gym_members SET empresario_id = v_correct_id WHERE empresario_id = v_wrong_id;
    UPDATE gym_members SET user_id = v_correct_id WHERE user_id = v_wrong_id;
    UPDATE partner_payments SET partner_id = v_correct_id WHERE partner_id = v_wrong_id;
    UPDATE discount_code_usage SET partner_id = v_correct_id WHERE partner_id = v_wrong_id;
    UPDATE discount_code_usage SET user_id = v_correct_id WHERE user_id = v_wrong_id;
    UPDATE payment_history SET user_id = v_correct_id WHERE user_id = v_wrong_id;
    UPDATE user_profiles SET user_id = v_correct_id WHERE user_id = v_wrong_id;
    UPDATE subscriptions SET user_id = v_correct_id WHERE user_id = v_wrong_id;
    UPDATE offer_code_redemptions SET user_id = v_correct_id WHERE user_id = v_wrong_id;

    RAISE NOTICE 'Corrección completada. Ahora el ID coincide con el de Clerk.';

END $$;
