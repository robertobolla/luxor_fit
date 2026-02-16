-- Fix "RLS Policy Always True" for Remaining User Data & Nested Tables (Script 3)
-- This enforces "auth.uid() = user_id" for direct ownership tables
-- And uses EXISTS clauses for nested tables (Nutrition Plans hierarchy).

-- ==============================================================================
-- SECTION A: Tables with direct 'user_id'
-- ==============================================================================

-- 1. Health Data Daily
DROP POLICY IF EXISTS "Users can insert health data" ON public.health_data_daily;
CREATE POLICY "Users can insert health data" ON public.health_data_daily FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can update health data" ON public.health_data_daily;
CREATE POLICY "Users can update health data" ON public.health_data_daily FOR UPDATE USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can delete health data" ON public.health_data_daily;
CREATE POLICY "Users can delete health data" ON public.health_data_daily FOR DELETE USING (auth.uid()::text = user_id);

-- 2. Lesson Progress
DROP POLICY IF EXISTS "Users can create their own lesson progress." ON public.lesson_progress;
CREATE POLICY "Users can create their own lesson progress." ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can update their own lesson progress." ON public.lesson_progress;
CREATE POLICY "Users can update their own lesson progress." ON public.lesson_progress FOR UPDATE USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can delete their own lesson progress." ON public.lesson_progress;
CREATE POLICY "Users can delete their own lesson progress." ON public.lesson_progress FOR DELETE USING (auth.uid()::text = user_id);

-- 3. Nutrition Profiles
DROP POLICY IF EXISTS "Users can create their own nutrition profile." ON public.nutrition_profiles;
CREATE POLICY "Users can create their own nutrition profile." ON public.nutrition_profiles FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can update their own nutrition profile." ON public.nutrition_profiles;
CREATE POLICY "Users can update their own nutrition profile." ON public.nutrition_profiles FOR UPDATE USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can delete their own nutrition profile." ON public.nutrition_profiles;
CREATE POLICY "Users can delete their own nutrition profile." ON public.nutrition_profiles FOR DELETE USING (auth.uid()::text = user_id);

-- 4. Nutrition Targets
DROP POLICY IF EXISTS "Users can create their own nutrition targets." ON public.nutrition_targets;
CREATE POLICY "Users can create their own nutrition targets." ON public.nutrition_targets FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can update their own nutrition targets." ON public.nutrition_targets;
CREATE POLICY "Users can update their own nutrition targets." ON public.nutrition_targets FOR UPDATE USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can delete their own nutrition targets." ON public.nutrition_targets;
CREATE POLICY "Users can delete their own nutrition targets." ON public.nutrition_targets FOR DELETE USING (auth.uid()::text = user_id);

-- 5. Personal Records
DROP POLICY IF EXISTS "personal_records_insert_policy" ON public.personal_records;
CREATE POLICY "personal_records_insert_policy" ON public.personal_records FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "personal_records_update_policy" ON public.personal_records;
CREATE POLICY "personal_records_update_policy" ON public.personal_records FOR UPDATE USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "personal_records_delete_policy" ON public.personal_records;
CREATE POLICY "personal_records_delete_policy" ON public.personal_records FOR DELETE USING (auth.uid()::text = user_id);

-- 6. Progress Photos
DROP POLICY IF EXISTS "Allow all inserts" ON public.progress_photos;
CREATE POLICY "Allow all inserts" ON public.progress_photos FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Allow all updates" ON public.progress_photos;
CREATE POLICY "Allow all updates" ON public.progress_photos FOR UPDATE USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Allow all deletes" ON public.progress_photos;
CREATE POLICY "Allow all deletes" ON public.progress_photos FOR DELETE USING (auth.uid()::text = user_id);

-- 7. Subscriptions
DROP POLICY IF EXISTS "subscriptions_insert_self" ON public.subscriptions;
CREATE POLICY "subscriptions_insert_self" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "subscriptions_update_self" ON public.subscriptions;
CREATE POLICY "subscriptions_update_self" ON public.subscriptions FOR UPDATE USING (auth.uid()::text = user_id);

-- 8. Typing Indicators
DROP POLICY IF EXISTS "Users can update their own typing indicators" ON public.typing_indicators;
CREATE POLICY "Users can update their own typing indicators" ON public.typing_indicators FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Users can update typing indicators" ON public.typing_indicators;
CREATE POLICY "Users can update typing indicators" ON public.typing_indicators FOR UPDATE USING (auth.uid()::text = user_id);

-- 9. User Profiles
DROP POLICY IF EXISTS "Usuarios pueden crear su propio perfil" ON public.user_profiles;
CREATE POLICY "Usuarios pueden crear su propio perfil" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.user_profiles;
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON public.user_profiles FOR UPDATE USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Usuarios pueden eliminar su propio perfil" ON public.user_profiles;
CREATE POLICY "Usuarios pueden eliminar su propio perfil" ON public.user_profiles FOR DELETE USING (auth.uid()::text = user_id);

-- 10. User Push Tokens
DROP POLICY IF EXISTS "Enable all access for public" ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can manage their own push tokens" ON public.user_push_tokens; 
-- Creating a unified policy for CRUD on push tokens
CREATE POLICY "Users can insert their own push tokens" ON public.user_push_tokens FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own push tokens" ON public.user_push_tokens FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own push tokens" ON public.user_push_tokens FOR DELETE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can select their own push tokens" ON public.user_push_tokens FOR SELECT USING (auth.uid()::text = user_id);


-- 11. Workout Completions
DROP POLICY IF EXISTS "workout_completions_insert_policy" ON public.workout_completions;
CREATE POLICY "workout_completions_insert_policy" ON public.workout_completions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "workout_completions_update_policy" ON public.workout_completions;
CREATE POLICY "workout_completions_update_policy" ON public.workout_completions FOR UPDATE USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "workout_completions_delete_policy" ON public.workout_completions;
CREATE POLICY "workout_completions_delete_policy" ON public.workout_completions FOR DELETE USING (auth.uid()::text = user_id);

-- 12. Workout Plans (Direct)
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios planes" ON public.workout_plans;
CREATE POLICY "Usuarios pueden crear sus propios planes" ON public.workout_plans FOR INSERT WITH CHECK (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios planes" ON public.workout_plans;
CREATE POLICY "Usuarios pueden actualizar sus propios planes" ON public.workout_plans FOR UPDATE USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus propios planes" ON public.workout_plans;
CREATE POLICY "Usuarios pueden eliminar sus propios planes" ON public.workout_plans FOR DELETE USING (auth.uid()::text = user_id);


-- ==============================================================================
-- SECTION B: Nested Nutrition Tables (Hierarchy)
-- ==============================================================================
-- These tables don't have user_id, but link back to nutrition_plans which does.

-- 13. Nutrition Plan Weeks
DROP POLICY IF EXISTS "Allow all operations on plan weeks" ON public.nutrition_plan_weeks;
CREATE POLICY "Manage own plan weeks" ON public.nutrition_plan_weeks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.nutrition_plans np 
        WHERE np.id = nutrition_plan_weeks.plan_id 
        AND np.user_id = auth.uid()::text
    )
);

-- 14. Nutrition Plan Days
DROP POLICY IF EXISTS "Allow all operations on plan days" ON public.nutrition_plan_days;
CREATE POLICY "Manage own plan days" ON public.nutrition_plan_days FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.nutrition_plan_weeks npw
        JOIN public.nutrition_plans np ON np.id = npw.plan_id
        WHERE npw.id = nutrition_plan_days.week_id
        AND np.user_id = auth.uid()::text
    )
);

-- 15. Nutrition Plan Meals
DROP POLICY IF EXISTS "Allow all operations on plan meals" ON public.nutrition_plan_meals;
CREATE POLICY "Manage own plan meals" ON public.nutrition_plan_meals FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.nutrition_plan_days npd
        JOIN public.nutrition_plan_weeks npw ON npw.id = npd.week_id
        JOIN public.nutrition_plans np ON np.id = npw.plan_id
        WHERE npd.id = nutrition_plan_meals.day_id
        AND np.user_id = auth.uid()::text
    )
);

-- 16. Nutrition Plan Meal Foods
DROP POLICY IF EXISTS "Allow all operations on meal foods" ON public.nutrition_plan_meal_foods;
CREATE POLICY "Manage own meal foods" ON public.nutrition_plan_meal_foods FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.nutrition_plan_meals npm
        JOIN public.nutrition_plan_days npd ON npd.id = npm.day_id
        JOIN public.nutrition_plan_weeks npw ON npw.id = npd.week_id
        JOIN public.nutrition_plans np ON np.id = npw.plan_id
        WHERE npm.id = nutrition_plan_meal_foods.meal_id
        AND np.user_id = auth.uid()::text
    )
);
