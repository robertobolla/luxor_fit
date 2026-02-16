-- 20260211_fix_clerk_recipies.sql
-- FIX CRÍTICO: auth.uid() falla con IDs de Clerk porque no son UUIDs.
-- Solución: Usar (auth.jwt() ->> 'sub') en lugar de auth.uid()

-- 1. Arreglar función de Debug
CREATE OR REPLACE FUNCTION public.debug_get_auth_uid()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- auth.uid() falla si sub no es UUID. Usamos el claim directo.
  SELECT (auth.jwt() ->> 'sub');
$$;

GRANT EXECUTE ON FUNCTION public.debug_get_auth_uid() TO public;
GRANT EXECUTE ON FUNCTION public.debug_get_auth_uid() TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_get_auth_uid() TO anon;


-- 2. ARREGLAR NUTRITION PLANS
DROP POLICY IF EXISTS "nutrition_plans_insert" ON public.nutrition_plans;
DROP POLICY IF EXISTS "nutrition_plans_select" ON public.nutrition_plans;
DROP POLICY IF EXISTS "nutrition_plans_update" ON public.nutrition_plans;
DROP POLICY IF EXISTS "nutrition_plans_delete" ON public.nutrition_plans;

CREATE POLICY "nutrition_plans_insert" ON public.nutrition_plans FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "nutrition_plans_select" ON public.nutrition_plans FOR SELECT USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "nutrition_plans_update" ON public.nutrition_plans FOR UPDATE USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "nutrition_plans_delete" ON public.nutrition_plans FOR DELETE USING ((auth.jwt() ->> 'sub') = user_id);

-- Arreglar tablas anidadas (nutrition_plan_weeks, days, etc) usando el padre
DROP POLICY IF EXISTS "Manage own plan weeks" ON public.nutrition_plan_weeks;
CREATE POLICY "Manage own plan weeks" ON public.nutrition_plan_weeks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.nutrition_plans np 
        WHERE np.id = nutrition_plan_weeks.plan_id 
        AND np.user_id = (auth.jwt() ->> 'sub')
    )
);

DROP POLICY IF EXISTS "Manage own plan days" ON public.nutrition_plan_days;
CREATE POLICY "Manage own plan days" ON public.nutrition_plan_days FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.nutrition_plan_weeks npw 
        JOIN public.nutrition_plans np ON np.id = npw.plan_id 
        WHERE npw.id = nutrition_plan_days.week_id 
        AND np.user_id = (auth.jwt() ->> 'sub')
    )
);

DROP POLICY IF EXISTS "Manage own plan meals" ON public.nutrition_plan_meals;
CREATE POLICY "Manage own plan meals" ON public.nutrition_plan_meals FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.nutrition_plan_days npd 
        JOIN public.nutrition_plan_weeks npw ON npw.id = npd.week_id 
        JOIN public.nutrition_plans np ON np.id = npw.plan_id 
        WHERE npd.id = nutrition_plan_meals.day_id 
        AND np.user_id = (auth.jwt() ->> 'sub')
    )
);

DROP POLICY IF EXISTS "Manage own meal foods" ON public.nutrition_plan_meal_foods;
CREATE POLICY "Manage own meal foods" ON public.nutrition_plan_meal_foods FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.nutrition_plan_meals npm 
        JOIN public.nutrition_plan_days npd ON npd.id = npm.day_id 
        JOIN public.nutrition_plan_weeks npw ON npw.id = npd.week_id 
        JOIN public.nutrition_plans np ON np.id = npw.plan_id 
        WHERE npm.id = nutrition_plan_meal_foods.meal_id 
        AND np.user_id = (auth.jwt() ->> 'sub')
    )
);


-- 3. ARREGLAR USER PUSH TOKENS
DROP POLICY IF EXISTS "push_tokens_insert" ON public.user_push_tokens;
DROP POLICY IF EXISTS "push_tokens_select" ON public.user_push_tokens;
DROP POLICY IF EXISTS "push_tokens_update" ON public.user_push_tokens;
DROP POLICY IF EXISTS "push_tokens_delete" ON public.user_push_tokens;

CREATE POLICY "push_tokens_insert" ON public.user_push_tokens FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "push_tokens_select" ON public.user_push_tokens FOR SELECT USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "push_tokens_update" ON public.user_push_tokens FOR UPDATE USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "push_tokens_delete" ON public.user_push_tokens FOR DELETE USING ((auth.jwt() ->> 'sub') = user_id);

GRANT ALL ON public.nutrition_plans TO authenticated;
GRANT ALL ON public.user_push_tokens TO authenticated;
