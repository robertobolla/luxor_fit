-- Fix RLS for User Push Tokens (Script 6 - Hotfix) v2
-- Added explicit DROPs for the NEW policy names to prevent "already exists" errors.

-- 1. Limpieza de políticas antiguas (Old names)
DROP POLICY IF EXISTS "Enable all access for public" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can manage their own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can insert their own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can update their own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can delete their own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can select their own push tokens" ON public.user_push_tokens;

-- 2. Limpieza de políticas NUEVAS (para re-run sin errores)
DROP POLICY IF EXISTS "Users can insert own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can update own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can delete own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can select own push tokens" ON public.user_push_tokens;

-- 3. Permisos Completos (CRUD)
-- INSERT
CREATE POLICY "Users can insert own push tokens" ON public.user_push_tokens 
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- UPDATE
CREATE POLICY "Users can update own push tokens" ON public.user_push_tokens 
FOR UPDATE USING (auth.uid()::text = user_id);

-- DELETE
CREATE POLICY "Users can delete own push tokens" ON public.user_push_tokens 
FOR DELETE USING (auth.uid()::text = user_id);

-- SELECT (Crucial para que funcione el UPSERT)
CREATE POLICY "Users can select own push tokens" ON public.user_push_tokens 
FOR SELECT USING (auth.uid()::text = user_id);

-- Grant explícito
GRANT ALL ON public.user_push_tokens TO authenticated;
