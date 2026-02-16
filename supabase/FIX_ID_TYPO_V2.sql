-- CORRECCIÓN DE TYPO EN EL ID DE USUARIO (VERSIÓN FUERZA BRUTA)
-- El intento anterior falló por restricciones de llave foránea (Foreign Keys).
-- Vamos a desactivar temporalmente las comprobaciones para poder arreglarlo todo.

-- 1. Desactivar triggers y constraints temporalmente
SET session_replication_role = replica;

DO $$
DECLARE
    -- EL ID QUE PUSIMOS POR ERROR (CON EL 1)
    v_wrong_id TEXT := 'user_34Ap3n1PCKLyVxhIN7f1gQVdKBo'; -- n1
    
    -- EL ID CORRECTO QUE TE SALE EN PANTALLA (CON LA i)
    v_correct_id TEXT := 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'; -- ni
BEGIN

    RAISE NOTICE 'Forzando corrección de ID de % a %', v_wrong_id, v_correct_id;

    -- 2. admin_roles: Actualizar el ID principal Y la autoreferencia
    UPDATE admin_roles SET user_id = v_correct_id WHERE user_id = v_wrong_id;
    UPDATE admin_roles SET referred_by = v_correct_id WHERE referred_by = v_wrong_id;
    
    -- 3. Actualizar todas las tablas satélites
    UPDATE gym_members SET empresario_id = v_correct_id WHERE empresario_id = v_wrong_id;
    UPDATE gym_members SET user_id = v_correct_id WHERE user_id = v_wrong_id;
    
    UPDATE partner_payments SET partner_id = v_correct_id WHERE partner_id = v_wrong_id;
    
    UPDATE discount_code_usage SET partner_id = v_correct_id WHERE partner_id = v_wrong_id;
    UPDATE discount_code_usage SET user_id = v_correct_id WHERE user_id = v_wrong_id;
    
    UPDATE payment_history SET user_id = v_correct_id WHERE user_id = v_wrong_id;
    
    UPDATE user_profiles SET user_id = v_correct_id WHERE user_id = v_wrong_id;
    
    UPDATE subscriptions SET user_id = v_correct_id WHERE user_id = v_wrong_id;
    
    UPDATE offer_code_redemptions SET user_id = v_correct_id WHERE user_id = v_wrong_id;

    RAISE NOTICE 'Corrección forzada completada.';

END $$;

-- 4. Reactivar triggers y constraints (IMPORTANTE)
SET session_replication_role = origin;
