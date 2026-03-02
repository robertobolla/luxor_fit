-- Allow user_id to be NULL for template nutrition plans
ALTER TABLE public.nutrition_plans ALTER COLUMN user_id DROP NOT NULL;
