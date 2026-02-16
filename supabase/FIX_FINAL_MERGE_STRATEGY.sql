-- ESTRATEGIA DE COPIA Y FUSIÓN (COPY-MERGE)
-- Para evitar el bloqueo de Foreign Keys, en lugar de intentar cambiar el ID de la fila vieja,
-- vamos a mover todos sus "hijos" (referidos, pagos, etc.) a la fila NUEVA (Ghost) y luego borrar la vieja.

DO $$
DECLARE
    v_new_user_id TEXT := 'user_34Ap3n1PCKLyVxhIN7f1gQVdKBo'; -- Tu ID Actual
    v_old_user_id TEXT := 'user_34uvPy06sO0wcE3tfZ44DTmuSdX'; -- ID Viejo con los datos
    
    v_main_uuid UUID;  -- UUID del usuario viejo
    v_ghost_uuid UUID; -- UUID del usuario nuevo
    
    v_main_code TEXT;
    v_main_name TEXT;
BEGIN
    -- 1. Obtener UUIDs e Info
    SELECT id, discount_code, name INTO v_main_uuid, v_main_code, v_main_name 
    FROM admin_roles WHERE user_id = v_old_user_id;

    SELECT id INTO v_ghost_uuid 
    FROM admin_roles WHERE user_id = v_new_user_id;

    -- Si no existe el usuario "nuevo", lo creamos temporarlmente para poder migrarle las cosas
    IF v_ghost_uuid IS NULL THEN
        INSERT INTO admin_roles (user_id, email, role_type)
        VALUES (v_new_user_id, 'temp_migration@fitmind.com', 'socio')
        RETURNING id INTO v_ghost_uuid;
        RAISE NOTICE 'Usuario destino creado temporalmente: %', v_ghost_uuid;
    END IF;

    RAISE NOTICE 'Migrando de % (UUID: %) a % (UUID: %)', v_old_user_id, v_main_uuid, v_new_user_id, v_ghost_uuid;

    -- 2. Mover hijos que dependen del User ID (TEXTO)
    -- Al existir ya el usuario destino (Ghost), esto NO debería fallar por FK.
    
    UPDATE admin_roles SET referred_by = v_new_user_id WHERE referred_by = v_old_user_id;
    UPDATE gym_members SET empresario_id = v_new_user_id WHERE empresario_id = v_old_user_id;
    UPDATE partner_payments SET partner_id = v_new_user_id WHERE partner_id = v_old_user_id;
    UPDATE discount_code_usage SET partner_id = v_new_user_id WHERE partner_id = v_old_user_id;
    
    -- 3. Mover hijos que dependen del UUID (Foreign Key a admin_roles.id)
    UPDATE offer_code_redemptions SET partner_id = v_ghost_uuid WHERE partner_id = v_main_uuid;
    
    -- 4. Copiar atributos importantes y limpiar el viejo
    -- Liberamos el código de descuento del viejo para que no dé error de duplicado
    UPDATE admin_roles SET discount_code = NULL WHERE id = v_main_uuid;
    
    -- Actualizamos el nuevo con todos los poderes
    UPDATE admin_roles 
    SET 
        email = 'robertobolla9@gmail.com', -- Correo definitivo
        discount_code = v_main_code,
        role_type = 'admin',
        is_active = true,
        name = COALESCE(v_main_name, 'Roberto Bolla'),
        commission_per_subscription = 3.00,
        commission_per_subscription_2nd_level = 1.00
    WHERE id = v_ghost_uuid;

    -- 5. Borrar el usuario viejo (Ya no debería tener hijos)
    DELETE FROM admin_roles WHERE id = v_main_uuid;

    RAISE NOTICE 'Fusión completada exitosamente.';

END $$;
