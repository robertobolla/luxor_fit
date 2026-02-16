-- 20260211_fix_nested_rls.sql
-- ARREGLO DE TABLAS ANIDADAS (Weeks, Days, Meals, Foods)
-- El script anterior arregló el "Padre" (Nutrition Plans), pero los "Hijos" seguían usando auth.uid().

-- 1. Weeks
DROP POLICY IF EXISTS "Manage own plan weeks" ON public.nutrition_plan_weeks;
CREATE POLICY "Manage own plan weeks" ON public.nutrition_plan_weeks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.nutrition_plans np 
        WHERE np.id = nutrition_plan_weeks.plan_id 
        AND np.user_id = (auth.jwt() ->> 'sub')
    )
);

-- 2. Days
DROP POLICY IF EXISTS "Manage own plan days" ON public.nutrition_plan_days;
CREATE POLICY "Manage own plan days" ON public.nutrition_plan_days FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.nutrition_plan_weeks npw 
        JOIN public.nutrition_plans np ON np.id = npw.plan_id 
        WHERE npw.id = nutrition_plan_days.week_id 
        AND np.user_id = (auth.jwt() ->> 'sub')
    )
);

-- 3. Meals
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

-- 4. Foods
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

-- Permisos extra por si acaso
GRANT ALL ON public.nutrition_plan_weeks TO authenticated;
GRANT ALL ON public.nutrition_plan_days TO authenticated;
GRANT ALL ON public.nutrition_plan_meals TO authenticated;
GRANT ALL ON public.nutrition_plan_meal_foods TO authenticated;
