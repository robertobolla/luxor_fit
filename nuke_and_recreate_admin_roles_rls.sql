-- 1. DROP ALL existing policies on admin_roles to ensure no rogue UUID comparisons remain
DROP POLICY IF EXISTS "Admins can view all roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Users view own admin role" ON public.admin_roles;
DROP POLICY IF EXISTS "Empresario view own admin role" ON public.admin_roles;
DROP POLICY IF EXISTS "Users manage own admin role" ON public.admin_roles;
DROP POLICY IF EXISTS "Allow all operations for Clerk" ON public.admin_roles;
DROP POLICY IF EXISTS "Anyone can delete admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Anyone can insert admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Anyone can update admin roles" ON public.admin_roles;

-- 2. RECREATE the 4 necessary policies with explicit ::text casts

-- Admins
CREATE POLICY "Admins can view all roles" ON public.admin_roles FOR SELECT USING ( public.is_admin() );
CREATE POLICY "Admins can insert roles" ON public.admin_roles FOR INSERT WITH CHECK ( public.is_admin() );
CREATE POLICY "Admins can update roles" ON public.admin_roles FOR UPDATE USING ( public.is_admin() );
CREATE POLICY "Admins can delete roles" ON public.admin_roles FOR DELETE USING ( public.is_admin() );

-- Regular users viewing their own roles (essential for login)
CREATE POLICY "Users view own admin role" 
ON public.admin_roles FOR SELECT 
-- VITAL: user_id::text cast prevents "invalid input syntax for type uuid"
USING ( user_id::text = coalesce(current_setting('request.jwt.claim.sub', true), auth.uid()::text) );
