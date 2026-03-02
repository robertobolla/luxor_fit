CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_roles 
    -- IMPORTANTE: castear user_id a text aquí previene el error "invalid input syntax for type uuid" 
    -- cuando auth.uid() contiene un string de Clerk como 'user_xxxx'
    WHERE user_id::text = coalesce(current_setting('request.jwt.claim.sub', true), auth.uid()::text) 
    AND role_type = 'admin' 
    AND is_active = true
  );
$$;
