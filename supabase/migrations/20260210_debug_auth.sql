-- Debug function to check auth state
CREATE OR REPLACE FUNCTION public.debug_get_auth_uid()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.uid()::text;
$$;

GRANT EXECUTE ON FUNCTION public.debug_get_auth_uid() TO public;
GRANT EXECUTE ON FUNCTION public.debug_get_auth_uid() TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_get_auth_uid() TO anon;
