-- 1. Add empresario_id column to foods table
ALTER TABLE public.foods 
ADD COLUMN IF NOT EXISTS empresario_id text;

-- 2. Drop existing policies to recreate them with the new logic
DROP POLICY IF EXISTS "Foods are viewable by everyone" ON public.foods;
DROP POLICY IF EXISTS "Admins can manage all foods" ON public.foods;

-- 3. Policy: SELECT - Allow global foods + organization specific foods
-- Users can see foods where empresario_id is NULL (global) 
-- OR where it matches the empresario_id they belong to (via gym_members)
-- OR if they are the empresario themselves.
CREATE POLICY "Foods are viewable by authorized users" 
ON public.foods FOR SELECT
USING (
  empresario_id IS NULL 
  OR 
  empresario_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  OR
  EXISTS (
    SELECT 1 FROM public.gym_members gm
    WHERE gm.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    AND gm.empresario_id = public.foods.empresario_id
    AND gm.is_active = true
  )
);

-- 4. Policy: ALL - Allow empresarios to manage their own foods
CREATE POLICY "Empresarios manage own foods" 
ON public.foods FOR ALL
USING ( empresario_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub') )
WITH CHECK ( empresario_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub') );

-- 5. Policy: ALL - Allow admins to manage all foods
-- We need a way to identify an admin. Using is_admin() function from fix_clerk_auth_safe.sql
CREATE POLICY "Admins manage everything" 
ON public.foods FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    AND role_type = 'admin'
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    AND role_type = 'admin'
    AND is_active = true
  )
);
