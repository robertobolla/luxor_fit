-- 20260228_fix_admin_roles_rls.sql
-- Fix to allow admins to see all admin_roles and empresario_stats without infinite RLS recursion

-- 1. Create a SECURITY DEFINER function to securely check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = coalesce(current_setting('request.jwt.claim.sub', true), auth.uid()::text) 
    AND role_type = 'admin' 
    AND is_active = true
  );
$$;

-- 2. Drop the old policy that restricts everything to the user's own auth token
DROP POLICY IF EXISTS "Users manage own admin role" ON public.admin_roles;

-- 3. Re-create granular policies for admin_roles
CREATE POLICY "Admins can view all roles" 
ON public.admin_roles FOR SELECT 
USING ( public.is_admin() );

CREATE POLICY "Admins can insert roles" 
ON public.admin_roles FOR INSERT 
WITH CHECK ( public.is_admin() );

CREATE POLICY "Admins can update roles" 
ON public.admin_roles FOR UPDATE 
USING ( public.is_admin() );

CREATE POLICY "Admins can delete roles" 
ON public.admin_roles FOR DELETE 
USING ( public.is_admin() );

-- 4. Add a policy so non-admins can view their OWN role (needed for login/checkAdminRole)
CREATE POLICY "Users view own admin role" 
ON public.admin_roles FOR SELECT 
USING ( user_id = coalesce(current_setting('request.jwt.claim.sub', true), auth.uid()::text) );

-- 5. Empresarios need to view their own stats
CREATE POLICY "Empresario view own admin role" 
ON public.admin_roles FOR SELECT 
USING ( user_id = coalesce(current_setting('request.jwt.claim.sub', true), auth.uid()::text) AND role_type = 'empresario' );
