-- 20260211_FINAL_FIX_ALL_RLS.sql
-- ESTE SCRIPT ARREGLA TODO DE UNA VEZ (Plan, Semanas, Días, Comidas y Push Tokens)
-- Ejecútalo COMPLETO para asegurar que no falte nada.

-- 1. Arreglar función de Debug
CREATE OR REPLACE FUNCTION public.debug_get_auth_uid() RETURNS text LANGUAGE sql SECURITY DEFINER AS $$
  SELECT (auth.jwt() ->> 'sub');
$$;

-- 2. ARREGLAR NUTRITION PLANS (Padre)
DROP POLICY IF EXISTS "nutrition_plans_insert" ON public.nutrition_plans;
DROP POLICY IF EXISTS "nutrition_plans_select" ON public.nutrition_plans;
DROP POLICY IF EXISTS "nutrition_plans_update" ON public.nutrition_plans;
DROP POLICY IF EXISTS "nutrition_plans_delete" ON public.nutrition_plans;

CREATE POLICY "nutrition_plans_insert" ON public.nutrition_plans FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "nutrition_plans_select" ON public.nutrition_plans FOR SELECT USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "nutrition_plans_update" ON public.nutrition_plans FOR UPDATE USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "nutrition_plans_delete" ON public.nutrition_plans FOR DELETE USING ((auth.jwt() ->> 'sub') = user_id);

-- 3. ARREGLAR TABLAS ANIDADAS (Hijos)
-- Weeks
DROP POLICY IF EXISTS "Manage own plan weeks" ON public.nutrition_plan_weeks;
CREATE POLICY "Manage own plan weeks" ON public.nutrition_plan_weeks FOR ALL USING (
    EXISTS (SELECT 1 FROM public.nutrition_plans np WHERE np.id = nutrition_plan_weeks.plan_id AND np.user_id = (auth.jwt() ->> 'sub'))
);

-- Days
DROP POLICY IF EXISTS "Manage own plan days" ON public.nutrition_plan_days;
CREATE POLICY "Manage own plan days" ON public.nutrition_plan_days FOR ALL USING (
    EXISTS (SELECT 1 FROM public.nutrition_plan_weeks npw JOIN public.nutrition_plans np ON np.id = npw.plan_id WHERE npw.id = nutrition_plan_days.week_id AND np.user_id = (auth.jwt() ->> 'sub'))
);

-- Meals
DROP POLICY IF EXISTS "Manage own plan meals" ON public.nutrition_plan_meals;
CREATE POLICY "Manage own plan meals" ON public.nutrition_plan_meals FOR ALL USING (
    EXISTS (SELECT 1 FROM public.nutrition_plan_days npd JOIN public.nutrition_plan_weeks npw ON npw.id = npd.week_id JOIN public.nutrition_plans np ON np.id = npw.plan_id WHERE npd.id = nutrition_plan_meals.day_id AND np.user_id = (auth.jwt() ->> 'sub'))
);

-- Foods
DROP POLICY IF EXISTS "Manage own meal foods" ON public.nutrition_plan_meal_foods;
CREATE POLICY "Manage own meal foods" ON public.nutrition_plan_meal_foods FOR ALL USING (
    EXISTS (SELECT 1 FROM public.nutrition_plan_meals npm JOIN public.nutrition_plan_days npd ON npd.id = npm.day_id JOIN public.nutrition_plan_weeks npw ON npw.id = npd.week_id JOIN public.nutrition_plans np ON np.id = npw.plan_id WHERE npm.id = nutrition_plan_meal_foods.meal_id AND np.user_id = (auth.jwt() ->> 'sub'))
);


-- 4. ARREGLAR USER PUSH TOKENS
DROP POLICY IF EXISTS "push_tokens_insert" ON public.user_push_tokens;
DROP POLICY IF EXISTS "push_tokens_select" ON public.user_push_tokens;
DROP POLICY IF EXISTS "push_tokens_update" ON public.user_push_tokens;
DROP POLICY IF EXISTS "push_tokens_delete" ON public.user_push_tokens;

CREATE POLICY "push_tokens_insert" ON public.user_push_tokens FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "push_tokens_select" ON public.user_push_tokens FOR SELECT USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "push_tokens_update" ON public.user_push_tokens FOR UPDATE USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "push_tokens_delete" ON public.user_push_tokens FOR DELETE USING ((auth.jwt() ->> 'sub') = user_id);


-- Permisos finales
GRANT ALL ON public.nutrition_plans TO authenticated;
GRANT ALL ON public.nutrition_plan_weeks TO authenticated;
GRANT ALL ON public.nutrition_plan_days TO authenticated;
GRANT ALL ON public.nutrition_plan_meals TO authenticated;
GRANT ALL ON public.nutrition_plan_meal_foods TO authenticated;
GRANT ALL ON public.user_push_tokens TO authenticated;
