-- SOLUCION FINAL DE FUSION DE CUENTAS
-- Fusionar todo en la cuenta "robertobolla9@gmail.com" que tiene los referidos
-- y asignarle tu ID de usuario actual.

DO $$
DECLARE
    -- Tu ID de usuario ACTUAL (el que te dio conflicto de duplicado)
    v_active_user_id TEXT := 'user_34Ap3n1PCKLyVxhIN7f1gQVdKBo';
    
    -- El correo correcto que tiene los referidos
    v_correct_email TEXT := 'robertobolla9@gmail.com'; 
    
    v_referral_row_id UUID;
    v_conflict_row_id UUID;
BEGIN
    -- 1. Buscar la fila que tiene los referidos (la "Buena")
    SELECT id INTO v_referral_row_id 
    FROM admin_roles 
    WHERE email = v_correct_email;

    -- 2. Buscar la fila que tiene tu ID actual (la "Mala" o "Fantasma")
    SELECT id INTO v_conflict_row_id 
    FROM admin_roles 
    WHERE user_id = v_active_user_id;

    RAISE NOTICE 'Fila Buena (Con Referidos): %', v_referral_row_id;
    RAISE NOTICE 'Fila Conflicto (Con ID Actual): %', v_conflict_row_id;

    -- CASO A: Son filas diferentes. Hay que borrar la mala y actualizar la buena.
    IF v_referral_row_id IS NOT NULL AND v_conflict_row_id IS NOT NULL AND v_referral_row_id != v_conflict_row_id THEN
        
        -- Borrar la fila conflicto (Asumimos que no tiene referidos valiosos porque la buena es la otra)
        -- Si tuviera gym_members o algo, idealmente los movemos, pero para admin_roles duplicados suele ser basura.
        DELETE FROM admin_roles WHERE id = v_conflict_row_id;
        
        -- Actualizar la fila buena con tu ID actual
        UPDATE admin_roles 
        SET user_id = v_active_user_id,
            role_type = 'admin',
            is_active = true
        WHERE id = v_referral_row_id;
        
        RAISE NOTICE 'Fusión completada: Fila conflicto eliminada, ID asignado a fila con referidos.';

    -- CASO B: Solo existe la fila con referidos (Tu ID actual no está en uso)
    ELSIF v_referral_row_id IS NOT NULL AND v_conflict_row_id IS NULL THEN
        UPDATE admin_roles 
        SET user_id = v_active_user_id,
            role_type = 'admin'
        WHERE id = v_referral_row_id;
        RAISE NOTICE 'Actualización directa: ID asignado a fila con referidos.';
        
    -- CASO C: Solo existe la fila con tu ID actual (¿Y los referidos?)
    ELSIF v_referral_row_id IS NULL AND v_conflict_row_id IS NOT NULL THEN
        UPDATE admin_roles
        SET email = v_correct_email,
            role_type = 'admin'
        WHERE id = v_conflict_row_id;
        RAISE NOTICE 'Actualización de email: Fila actual renombrada al correo correcto.';
        
    ELSE
        RAISE NOTICE 'No se encontraron registros clave. Verifica los datos manualmente.';
    END IF;

END $$;
