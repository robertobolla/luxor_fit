-- =============================================================
-- Migration: Diet Template Categories
-- =============================================================

CREATE TABLE IF NOT EXISTS public.diet_template_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresario_id text NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.diet_template_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresarios_manage_own_categories"
  ON public.diet_template_categories FOR ALL
  USING (empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub'))
  WITH CHECK (empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub'));

-- Add category_id to nutrition_plans for templates
ALTER TABLE public.nutrition_plans
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.diet_template_categories(id) ON DELETE SET NULL;

GRANT ALL ON public.diet_template_categories TO authenticated;
