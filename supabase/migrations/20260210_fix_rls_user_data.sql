-- Fix "RLS Policy Always True" for User Data Tables (Corrected for Data Types)
-- This script clamps down on permissions for tables that should be private to the user.
-- It replaces the "true" condition with "auth.uid()::text = user_id".
-- The cast ::text is necessary because user_id is stored as text in these tables.

-- 1. Body Measurements
DROP POLICY IF EXISTS "Users can insert measurements" ON public.body_measurements;
CREATE POLICY "Users can insert measurements" ON public.body_measurements FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update measurements" ON public.body_measurements;
CREATE POLICY "Users can update measurements" ON public.body_measurements FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete measurements" ON public.body_measurements;
CREATE POLICY "Users can delete measurements" ON public.body_measurements FOR DELETE USING (auth.uid()::text = user_id);

-- 2. Body Metrics
DROP POLICY IF EXISTS "Users can create their own body metrics." ON public.body_metrics;
CREATE POLICY "Users can create their own body metrics." ON public.body_metrics FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own body metrics." ON public.body_metrics;
CREATE POLICY "Users can update their own body metrics." ON public.body_metrics FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete their own body metrics." ON public.body_metrics;
CREATE POLICY "Users can delete their own body metrics." ON public.body_metrics FOR DELETE USING (auth.uid()::text = user_id);

-- 3. Exercises (Activity Logs)
DROP POLICY IF EXISTS "Allow insert exercises" ON public.exercises;
CREATE POLICY "Allow insert exercises" ON public.exercises FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Allow update exercises" ON public.exercises;
CREATE POLICY "Allow update exercises" ON public.exercises FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Allow delete exercises" ON public.exercises;
CREATE POLICY "Allow delete exercises" ON public.exercises FOR DELETE USING (auth.uid()::text = user_id);

-- 4. Exercise Sets
DROP POLICY IF EXISTS "Users can insert exercise sets" ON public.exercise_sets;
CREATE POLICY "Users can insert exercise sets" ON public.exercise_sets FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update exercise sets" ON public.exercise_sets;
CREATE POLICY "Users can update exercise sets" ON public.exercise_sets FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete exercise sets" ON public.exercise_sets;
CREATE POLICY "Users can delete exercise sets" ON public.exercise_sets FOR DELETE USING (auth.uid()::text = user_id);

-- 5. Hydration Logs
DROP POLICY IF EXISTS "Users can create their own hydration logs." ON public.hydration_logs;
CREATE POLICY "Users can create their own hydration logs." ON public.hydration_logs FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own hydration logs." ON public.hydration_logs;
CREATE POLICY "Users can update their own hydration logs." ON public.hydration_logs FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete their own hydration logs." ON public.hydration_logs;
CREATE POLICY "Users can delete their own hydration logs." ON public.hydration_logs FOR DELETE USING (auth.uid()::text = user_id);

-- 6. Meal Logs
DROP POLICY IF EXISTS "Users can create their own meal logs." ON public.meal_logs;
CREATE POLICY "Users can create their own meal logs." ON public.meal_logs FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own meal logs." ON public.meal_logs;
CREATE POLICY "Users can update their own meal logs." ON public.meal_logs FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete their own meal logs." ON public.meal_logs;
CREATE POLICY "Users can delete their own meal logs." ON public.meal_logs FOR DELETE USING (auth.uid()::text = user_id);

-- 7. Nutrition Plans
DROP POLICY IF EXISTS "Users can insert own plans" ON public.nutrition_plans;
CREATE POLICY "Users can insert own plans" ON public.nutrition_plans FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own plans" ON public.nutrition_plans;
CREATE POLICY "Users can update own plans" ON public.nutrition_plans FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own plans" ON public.nutrition_plans;
CREATE POLICY "Users can delete own plans" ON public.nutrition_plans FOR DELETE USING (auth.uid()::text = user_id);
