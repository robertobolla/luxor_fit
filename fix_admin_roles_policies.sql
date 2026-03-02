-- Fix the remaining RLS policies that compare user_id to auth.uid()
-- The column `user_id` is a UUID, and comparing it to Clerk's `user_xxxx` strings causes "invalid input syntax for type uuid"

DROP POLICY IF EXISTS "Users view own admin role" ON public.admin_roles;
CREATE POLICY "Users view own admin role" 
ON public.admin_roles FOR SELECT 
-- Castear a ::text evita el error de tipo UUID
USING ( user_id::text = coalesce(current_setting('request.jwt.claim.sub', true), auth.uid()::text) );

DROP POLICY IF EXISTS "Empresario view own admin role" ON public.admin_roles;
CREATE POLICY "Empresario view own admin role" 
ON public.admin_roles FOR SELECT 
-- Castear a ::text evita el error de tipo UUID
USING ( user_id::text = coalesce(current_setting('request.jwt.claim.sub', true), auth.uid()::text) AND role_type = 'empresario' );
