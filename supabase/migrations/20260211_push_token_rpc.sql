-- 20260211_push_token_rpc.sql
-- Function to save push tokens securely, bypassing RLS issues.

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
BEGIN
    v_user_id := (auth.jwt() ->> 'sub');
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
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
