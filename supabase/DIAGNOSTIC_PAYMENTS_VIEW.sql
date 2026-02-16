-- DIAGNOSTICO DE VISTA DE PAGOS
-- Verificar si el usuario aparece en la vista partner_payments_summary

DO $$
DECLARE
    v_user_id TEXT := 'user_34Ap3niPCKLyVxhIN7f1gQVdKBo'; -- El ID corregido (con 'i')
    v_count INTEGER;
    v_role_count INTEGER;
    v_raw_stats JSON;
BEGIN
    RAISE NOTICE '--- INICIO DIAGNOSTICO ---';
    
    -- 1. Verificar si existe en admin_roles
    SELECT count(*) INTO v_role_count FROM admin_roles WHERE user_id = v_user_id;
    RAISE NOTICE 'Existe en admin_roles: %', v_role_count;
    
    IF v_role_count > 0 THEN
        DECLARE r RECORD;
        BEGIN
            SELECT * INTO r FROM admin_roles WHERE user_id = v_user_id;
            RAISE NOTICE 'Datos admin_roles: ID=%, Role=%, Active=%, Code=%', r.id, r.role_type, r.is_active, r.discount_code;
        END;
    END IF;

    -- 2. Probar RPC directamente
    BEGIN
        SELECT get_partner_network_stats(v_user_id) INTO v_raw_stats;
        RAISE NOTICE 'RPC get_partner_network_stats Resultado: %', v_raw_stats;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR ejecutando RPC: %', SQLERRM;
    END;

    -- 3. Consultar la vista
    SELECT count(*) INTO v_count FROM partner_payments_summary WHERE partner_user_id = v_user_id;
    RAISE NOTICE 'Filas en partner_payments_summary para este usuario: %', v_count;
    
    IF v_count > 0 THEN
        DECLARE r RECORD;
        BEGIN
            SELECT * INTO r FROM partner_payments_summary WHERE partner_user_id = v_user_id;
            RAISE NOTICE 'Vista OK. Earnings: %, ActiveSubs: %', r.total_earnings, r.active_subscriptions;
        END;
    ELSE
        RAISE NOTICE '>>> ALERTA: El usuario NO aparece en la vista partner_payments_summary <<<';
    END IF;

    RAISE NOTICE '--- FIN DIAGNOSTICO ---';
END $$;
