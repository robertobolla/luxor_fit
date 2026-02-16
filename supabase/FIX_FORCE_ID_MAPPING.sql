-- SOLUCION FINAL DE MAPEO FORZADO
-- Garantiza que el ID de usuario 'user_34Ap...' apunte EXCLUSIVAMENTE a la fila con los 30 referidos.

DO $$
DECLARE
    -- El UUID que SABEMOS que tiene los referidos (sacado de tu captura 'f9ace427...')
    v_good_uuid UUID := 'f9ace427-7445-4924-8d2c-52a2a3502a65';
    
    -- Tu ID de usuario Clerk correcto
    v_correct_user_id TEXT := 'user_34Ap3n1PCKLyVxhIN7f1gQVdKBo';
BEGIN

    -- 1. "Apartar" cualquier fila que esté usurpando tu ID (que no sea la buena)
    UPDATE admin_roles 
    SET user_id = 'conflict_' || substr(md5(random()::text), 1, 6),
        email = 'conflict_' || email
    WHERE user_id = v_correct_user_id 
    AND id != v_good_uuid;

    -- 2. Asegurar que la fila buena tenga TU ID correcto y esté activa
    UPDATE admin_roles
    SET user_id = v_correct_user_id,
        email = 'robertobolla9@gmail.com', -- Asegurar email correcto
        role_type = 'admin',
        is_active = true
    WHERE id = v_good_uuid;

    RAISE NOTICE 'Mapeo forzado completado. El ID % ahora apunta exclusivamente a UUID %', v_correct_user_id, v_good_uuid;

END $$;

-- 3. Re-garantizar permisos (Por si acaso)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
