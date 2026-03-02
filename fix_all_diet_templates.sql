-- =============================================================
-- FIX: Comprehensive fix for diet templates
-- Resolves UUID cast errors and allows template CRUD
-- =============================================================

-- 1. Make user_id nullable (templates don't have a user)
ALTER TABLE public.nutrition_plans ALTER COLUMN user_id DROP NOT NULL;

-- 2. Delete broken template records (created with Clerk ID in user_id UUID column)
DELETE FROM public.nutrition_plans WHERE is_template = true AND user_id IS NOT NULL AND user_id::text LIKE 'user_%';

-- 3. Drop existing template-specific policies if they exist
DROP POLICY IF EXISTS "empresarios_insert_templates" ON public.nutrition_plans;
DROP POLICY IF EXISTS "empresarios_update_templates" ON public.nutrition_plans;
DROP POLICY IF EXISTS "empresarios_delete_templates" ON public.nutrition_plans;
DROP POLICY IF EXISTS "empresarios_select_templates" ON public.nutrition_plans;

-- 4. Create safe template policies using empresario_id (text, not uuid)
CREATE POLICY "empresarios_select_templates"
  ON public.nutrition_plans FOR SELECT
  USING (
    is_template = true
    AND empresario_id IS NOT NULL
    AND empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  );

CREATE POLICY "empresarios_insert_templates"
  ON public.nutrition_plans FOR INSERT
  WITH CHECK (
    is_template = true
    AND empresario_id IS NOT NULL
    AND empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  );

CREATE POLICY "empresarios_update_templates"
  ON public.nutrition_plans FOR UPDATE
  USING (
    is_template = true
    AND empresario_id IS NOT NULL
    AND empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  )
  WITH CHECK (
    is_template = true
    AND empresario_id IS NOT NULL
    AND empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  );

CREATE POLICY "empresarios_delete_templates"
  ON public.nutrition_plans FOR DELETE
  USING (
    is_template = true
    AND empresario_id IS NOT NULL
    AND empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  );
