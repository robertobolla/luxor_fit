
-- ============================================================================
-- FUNCIÓN DE DEPURACIÓN DE AUTH
-- ============================================================================

CREATE OR REPLACE FUNCTION get_auth_debug_info()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sub text;
    v_claims jsonb;
    v_role text;
    v_is_admin boolean;
    v_user_id_from_func text;
BEGIN
    -- Obtener valores crudos
    v_sub := current_setting('request.jwt.claim.sub', true);
    v_claims := current_setting('request.jwt.claims', true)::jsonb;
    v_role := current_setting('role', true);
    
    -- Probar nuestras funciones
    v_user_id_from_func := auth_user_id();
    v_is_admin := is_admin();

    RETURN json_build_object(
        'jwt_sub_setting', v_sub,
        'jwt_claims', v_claims,
        'postgres_role', v_role,
        'func_auth_user_id', v_user_id_from_func,
        'func_is_admin', v_is_admin
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_auth_debug_info() TO authenticated;
GRANT EXECUTE ON FUNCTION get_auth_debug_info() TO anon; -- Permitir anon para debug extremo
