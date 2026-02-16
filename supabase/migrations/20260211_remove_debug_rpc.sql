-- 20260211_remove_debug_rpc.sql
-- Remove debug function if it exists to clean up
DROP FUNCTION IF EXISTS public.save_user_push_token_debug(text, text);
