-- Force RLS enable
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to ensure clean slate
DROP POLICY IF EXISTS "Authenticated access push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can upload their own tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Give me access" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.user_push_tokens;

-- Create the definitive policy allowing PUBLIC access
-- Since the app uses Clerk but Supabase client is anonymously connected,
-- we must allow the 'anon' / 'public' role to insert tokens.
CREATE POLICY "Enable all access for public"
ON public.user_push_tokens
FOR ALL
TO public
USING (true)
WITH CHECK (true);
