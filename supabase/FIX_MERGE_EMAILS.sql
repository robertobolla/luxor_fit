-- FUSION FINAL DE CUENTAS DUPLICADAS POR EMAIL
-- Problema detectado: Tienes dos usuarios con el MISMO user_id (lo cual es raro) pero diferente email.
-- Tu login actual (robertobolla9) apunta al que no tiene referidos.
-- Vamos a mover todo del "sin 9" al "con 9".

DO $$
DECLARE
    -- IDs de las filas encontradas en tu captura
    v_good_row_id UUID; -- robertobolla@gmail.com (Tiene los referidos)
    v_target_row_id UUID; -- robertobolla9@gmail.com (Tu login actual)
    
BEGIN
    -- 1. Capturar los IDs exactos buscando por email
    SELECT id INTO v_good_row_id FROM admin_roles WHERE email = 'robertobolla@gmail.com' LIMIT 1;
    SELECT id INTO v_target_row_id FROM admin_roles WHERE email = 'robertobolla9@gmail.com' LIMIT 1;

    RAISE NOTICE 'Fusionando % (Bueno) hacia % (Destino)', v_good_row_id, v_target_row_id;
    
    IF v_good_row_id IS NOT NULL AND v_target_row_id IS NOT NULL THEN
    
        -- 2. Mover Referidos (offer_code_redemptions usa UUID)
        UPDATE offer_code_redemptions 
        SET partner_id = v_target_row_id 
        WHERE partner_id = v_good_row_id;
        
        -- 3. Mover/Actualizar datos de Admin Roles
        -- Pasamos el código de descuento y el rol de Admin al usuario "9"
        UPDATE admin_roles
        SET 
            role_type = 'admin',
            discount_code = (SELECT discount_code FROM admin_roles WHERE id = v_good_row_id),
            commission_per_subscription = 3.00,
            commission_per_subscription_2nd_level = 1.00
        WHERE id = v_target_row_id;
        
        -- 4. Limpiar el usuario viejo para evitar confusiones futuras
        -- Le quitamos el código y el rol admin
        UPDATE admin_roles
        SET role_type = 'socio', discount_code = NULL
        WHERE id = v_good_row_id;
        
        -- Si no tiene otras dependencias críticas, lo borramos (Opcional, pero recomendado)
        DELETE FROM admin_roles WHERE id = v_good_row_id;
        
        RAISE NOTICE 'Fusión completada. Ahora robertobolla9 tiene los referidos.';
        
    ELSE
        RAISE NOTICE 'No se encontraron las dos filas esperadas. Verifica los emails.';
    END IF;

END $$;
