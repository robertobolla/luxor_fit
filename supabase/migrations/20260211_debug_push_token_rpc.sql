-- 20260211_debug_push_token_rpc.sql
-- Redefine save_user_push_token to debug auth context

CREATE OR REPLACE FUNCTION public.save_user_push_token(
    p_push_token text,
    p_platform text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id text;
    v_jwt jsonb;
BEGIN
    v_jwt := auth.jwt();
    v_user_id := (v_jwt ->> 'sub');
    
    -- DEBUG: Raise exception with JWT details if user_id is null
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated. JWT: %, Current User: %', v_jwt, auth.uid();
    END IF;

    INSERT INTO public.user_push_tokens (user_id, push_token, platform, updated_at)
    VALUES (v_user_id, p_push_token, p_platform, now())
    ON CONFLICT (user_id) DO UPDATE
    SET push_token = EXCLUDED.push_token,
        platform = EXCLUDED.platform,
        updated_at = EXCLUDED.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_user_push_token TO authenticated;
