-- 1. Redefine is_admin() to be safe for Clerk user IDs (text)
-- This avoids calling auth.uid() which crashes when sub is not a UUID.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    AND role_type = 'admin' 
    AND is_active = true
  );
$$;

-- 2. Nuke and recreate admin_roles policies with the same safe check
DROP POLICY IF EXISTS "Admins can view all roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Users view own admin role" ON public.admin_roles;
DROP POLICY IF EXISTS "Empresario view own admin role" ON public.admin_roles;
DROP POLICY IF EXISTS "Users manage own admin role" ON public.admin_roles;

-- Admins: Global Access
CREATE POLICY "Admins can view all roles" ON public.admin_roles FOR SELECT USING ( public.is_admin() );
CREATE POLICY "Admins can insert roles" ON public.admin_roles FOR INSERT WITH CHECK ( public.is_admin() );
CREATE POLICY "Admins can update roles" ON public.admin_roles FOR UPDATE USING ( public.is_admin() );
CREATE POLICY "Admins can delete roles" ON public.admin_roles FOR DELETE USING ( public.is_admin() );

-- Regular Users: Self Access only (Safe check)
CREATE POLICY "Users view own admin role" 
ON public.admin_roles FOR SELECT 
USING ( user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub') );

CREATE POLICY "Empresario view own admin role" 
ON public.admin_roles FOR SELECT 
USING ( 
  user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub') 
  AND role_type = 'empresario' 
);
