-- SOLUCION DEFINITIVA DE DUPLICADOS
-- Tienes DOS filas con el mismo user_id. La base de datos se confunde y a veces toma la vacía.
-- Vamos a borrar la fila que NO tiene referidos (f220...) y asegurarnos que todo apunte a la buena (f9ac...)

DO $$
DECLARE
    -- IDs sacados de tu captura de pantalla
    v_bad_uuid UUID := 'f2209988-a621-4cb5-b0aa-b86fdb248082'; -- robertobolla@gmail.com (0 Referidos)
    v_good_uuid UUID := 'f9ace427-7445-4924-8d2c-52a2a3502a65'; -- robertobolla9@gmail.com (30 Referidos, Admin)
BEGIN

    RAISE NOTICE 'Limpiando duplicado. Moviendo hijos de % a %', v_bad_uuid, v_good_uuid;

    -- 1. Mover "Referidos" (otros partners que fueron invitados por este usuario)
    -- Si la fila mala era "padre" de alguien, ahora el padre es la fila buena.
    UPDATE admin_roles 
    SET referred_by = (SELECT user_id FROM admin_roles WHERE id = v_good_uuid)
    WHERE referred_by = (SELECT user_id FROM admin_roles WHERE id = v_bad_uuid)
    AND id != v_good_uuid; -- Evitar auto-referencia si fuera el caso

    -- 2. Mover offer_code_redemptions (Aunque dijimos que tenía 0, por si acaso)
    UPDATE offer_code_redemptions SET partner_id = v_good_uuid WHERE partner_id = v_bad_uuid;

    -- 3. Mover pagos
    UPDATE partner_payments SET partner_id = (SELECT user_id FROM admin_roles WHERE id = v_good_uuid) 
    WHERE partner_id = (SELECT user_id FROM admin_roles WHERE id = v_bad_uuid);

    -- 4. Borrar la fila mala
    -- Como ya movimos las dependencias, esto debería funcionar.
    DELETE FROM admin_roles WHERE id = v_bad_uuid;

    RAISE NOTICE 'Limpieza completada. Ahora solo existe un único registro para tu usuario.';

END $$;
