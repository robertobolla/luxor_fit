-- Supabase Security: Master Hotfix (Script 7)
-- Fixes RLS for Nutrition Plans & User Push Tokens completely.
-- IDEMPOTENT: Safe to run multiple times.

-- ==============================================================================
-- 1. NUTRITION PLANS (CRITICAL FIX)
-- ==============================================================================

-- Drop ALL known past policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create their own nutrition plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Users can update their own nutrition plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Users can delete their own nutrition plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Users can read their own nutrition plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "nutrition_plans_insert" ON public.nutrition_plans;
DROP POLICY IF EXISTS "nutrition_plans_select" ON public.nutrition_plans;
DROP POLICY IF EXISTS "nutrition_plans_update" ON public.nutrition_plans;
DROP POLICY IF EXISTS "nutrition_plans_delete" ON public.nutrition_plans;

-- Create robust policies
CREATE POLICY "nutrition_plans_insert" ON public.nutrition_plans FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "nutrition_plans_select" ON public.nutrition_plans FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "nutrition_plans_update" ON public.nutrition_plans FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "nutrition_plans_delete" ON public.nutrition_plans FOR DELETE USING (auth.uid()::text = user_id);

-- Check nested tables too (Just in case Script 3 failed or wasn't run)
-- Weeks
DROP POLICY IF EXISTS "Manage own plan weeks" ON public.nutrition_plan_weeks;
CREATE POLICY "Manage own plan weeks" ON public.nutrition_plan_weeks FOR ALL USING (
    EXISTS (SELECT 1 FROM public.nutrition_plans np WHERE np.id = nutrition_plan_weeks.plan_id AND np.user_id = auth.uid()::text)
);
-- Days
DROP POLICY IF EXISTS "Manage own plan days" ON public.nutrition_plan_days;
CREATE POLICY "Manage own plan days" ON public.nutrition_plan_days FOR ALL USING (
    EXISTS (SELECT 1 FROM public.nutrition_plan_weeks npw JOIN public.nutrition_plans np ON np.id = npw.plan_id WHERE npw.id = nutrition_plan_days.week_id AND np.user_id = auth.uid()::text)
);
-- Meals
DROP POLICY IF EXISTS "Manage own plan meals" ON public.nutrition_plan_meals;
CREATE POLICY "Manage own plan meals" ON public.nutrition_plan_meals FOR ALL USING (
    EXISTS (SELECT 1 FROM public.nutrition_plan_days npd JOIN public.nutrition_plan_weeks npw ON npw.id = npd.week_id JOIN public.nutrition_plans np ON np.id = npw.plan_id WHERE npd.id = nutrition_plan_meals.day_id AND np.user_id = auth.uid()::text)
);
-- Foods
DROP POLICY IF EXISTS "Manage own meal foods" ON public.nutrition_plan_meal_foods;
CREATE POLICY "Manage own meal foods" ON public.nutrition_plan_meal_foods FOR ALL USING (
    EXISTS (SELECT 1 FROM public.nutrition_plan_meals npm JOIN public.nutrition_plan_days npd ON npd.id = npm.day_id JOIN public.nutrition_plan_weeks npw ON npw.id = npd.week_id JOIN public.nutrition_plans np ON np.id = npw.plan_id WHERE npm.id = nutrition_plan_meal_foods.meal_id AND np.user_id = auth.uid()::text)
);


-- ==============================================================================
-- 2. USER PUSH TOKENS (FIX CONFLICT)
-- ==============================================================================

-- Drop ALL known conflicting policies
DROP POLICY IF EXISTS "Enable all access for public" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can manage their own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can insert their own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can update their own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can delete their own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can select their own push tokens" ON public.user_push_tokens;
-- Drop the NEW names from Script 6 too
DROP POLICY IF EXISTS "Users can insert own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can update own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can delete own push tokens" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can select own push tokens" ON public.user_push_tokens;

-- Create single unified policies
CREATE POLICY "push_tokens_insert" ON public.user_push_tokens FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "push_tokens_select" ON public.user_push_tokens FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "push_tokens_update" ON public.user_push_tokens FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "push_tokens_delete" ON public.user_push_tokens FOR DELETE USING (auth.uid()::text = user_id);

GRANT ALL ON public.nutrition_plans TO authenticated;
GRANT ALL ON public.nutrition_plan_weeks TO authenticated;
GRANT ALL ON public.nutrition_plan_days TO authenticated;
GRANT ALL ON public.nutrition_plan_meals TO authenticated;
GRANT ALL ON public.nutrition_plan_meal_foods TO authenticated;
GRANT ALL ON public.user_push_tokens TO authenticated;
