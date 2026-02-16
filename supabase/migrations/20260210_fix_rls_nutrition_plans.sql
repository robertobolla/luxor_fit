-- Fix RLS for Nutrition Plans (Script 5 - Hotfix)
-- This table was missed in previous scripts, leading to RLS violations.

-- 1. Nutrition Plans
-- Remove any potential old/conflicting policies
DROP POLICY IF EXISTS "Users can create their own nutrition plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Users can update their own nutrition plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Users can delete their own nutrition plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Users can read their own nutrition plans" ON public.nutrition_plans;

-- Create correct policies
CREATE POLICY "Users can create their own nutrition plans" ON public.nutrition_plans FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own nutrition plans" ON public.nutrition_plans FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own nutrition plans" ON public.nutrition_plans FOR DELETE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can read their own nutrition plans" ON public.nutrition_plans FOR SELECT USING (auth.uid()::text = user_id);
