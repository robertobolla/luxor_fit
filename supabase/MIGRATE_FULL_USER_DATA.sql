-- MIGRACIÓN COMPLETA DE USUARIO
-- El usuario tiene referidos que dependen de él (admin_roles.referred_by), y también es miembro de gimnasio, etc.
-- Hay que mover TODO lo que apunte al ID viejo hacia el ID nuevo.

DO $$
DECLARE
    -- ID NUEVO (Clerk actual)
    v_new_user_id TEXT := 'user_34Ap3n1PCKLyVxhIN7f1gQVdKBo';
    
    -- ID VIEJO (El que tiene la data, sacado del error: user_34uvPy06sO0wcE3tfZ44DTmuSdX)
    v_old_user_id TEXT := 'user_34uvPy06sO0wcE3tfZ44DTmuSdX';
    
    v_main_row_id UUID;
    v_ghost_row_id UUID;
BEGIN
    -- 1. Identificar filas en admin_roles
    SELECT id INTO v_main_row_id FROM admin_roles WHERE user_id = v_old_user_id;
    SELECT id INTO v_ghost_row_id FROM admin_roles WHERE user_id = v_new_user_id;

    RAISE NOTICE 'Migrando de % a %', v_old_user_id, v_new_user_id;

    -- 2. Si existe una fila "fantasma" con el ID nuevo (y no es la misma que la vieja), borrarla para liberar el ID
    IF v_ghost_row_id IS NOT NULL AND (v_main_row_id IS NULL OR v_ghost_row_id != v_main_row_id) THEN
        DELETE FROM admin_roles WHERE id = v_ghost_row_id;
        RAISE NOTICE 'Fila fantasma eliminada.';
    END IF;

    -- 3. Actualizar Referencias (Foreign Keys)
    -- Mover a todos los partners que fueron referidos por el usuario viejo
    UPDATE admin_roles 
    SET referred_by = v_new_user_id 
    WHERE referred_by = v_old_user_id;

    -- Mover membresías de gimnasio (Si es dueño de gym)
    UPDATE gym_members 
    SET empresario_id = v_new_user_id 
    WHERE empresario_id = v_old_user_id;
    
    -- Mover membresías (Si es un usuario fitness)
    UPDATE gym_members
    SET user_id = v_new_user_id
    WHERE user_id = v_old_user_id;

    -- Mover pagos de partners
    UPDATE partner_payments
    SET partner_id = v_new_user_id
    WHERE partner_id = v_old_user_id;

    -- Mover uso de códigos
    UPDATE discount_code_usage
    SET partner_id = v_new_user_id
    WHERE partner_id = v_old_user_id;
    
    UPDATE discount_code_usage
    SET user_id = v_new_user_id
    WHERE user_id = v_old_user_id;

    -- Mover historial de pagos
    UPDATE payment_history
    SET user_id = v_new_user_id
    WHERE user_id = v_old_user_id;

    -- Mover perfiles de usuario
    UPDATE user_profiles
    SET user_id = v_new_user_id
    WHERE user_id = v_old_user_id;
    
    -- Mover suscripciones
    UPDATE subscriptions
    SET user_id = v_new_user_id
    WHERE user_id = v_old_user_id;
    
    -- Mover redenciones (si aplica, aunque partner_id suele ser UUID)
    -- offer_code_redemptions usa user_id para el que redime
    UPDATE offer_code_redemptions
    SET user_id = v_new_user_id
    WHERE user_id = v_old_user_id;

    -- 4. FINALMENTE: Actualizar el registro principal de admin_roles
    UPDATE admin_roles
    SET user_id = v_new_user_id,
        role_type = 'admin',
        is_active = true
    WHERE user_id = v_old_user_id;

    RAISE NOTICE 'Migración completada con éxito.';
END $$;
