-- Allow empresarios to update their own config (like gym_routines_enabled)
-- This assumes they already have a record in admin_roles.
-- We use the safe JWT 'sub' check to match Clerk user IDs.

DROP POLICY IF EXISTS "Users update own admin role" ON public.admin_roles;

CREATE POLICY "Users update own admin role" 
ON public.admin_roles FOR UPDATE
USING ( user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub') )
WITH CHECK ( user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub') );

-- Verify that the owner can also SELECT but we already have "Users view own admin role"
-- from fix_clerk_auth_safe.sql.
