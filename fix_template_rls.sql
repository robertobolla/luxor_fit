-- =============================================================
-- Fix RLS: Allow empresarios to manage their own nutrition plan templates
-- =============================================================

-- Allow empresarios to INSERT templates (where empresario_id matches their JWT sub)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'empresarios_insert_templates' AND tablename = 'nutrition_plans') THEN
    CREATE POLICY "empresarios_insert_templates"
      ON public.nutrition_plans FOR INSERT
      WITH CHECK (
        is_template = true
        AND empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
      );
  END IF;
END $$;

-- Allow empresarios to UPDATE their own templates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'empresarios_update_templates' AND tablename = 'nutrition_plans') THEN
    CREATE POLICY "empresarios_update_templates"
      ON public.nutrition_plans FOR UPDATE
      USING (
        is_template = true
        AND empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
      )
      WITH CHECK (
        is_template = true
        AND empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
      );
  END IF;
END $$;

-- Allow empresarios to DELETE their own templates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'empresarios_delete_templates' AND tablename = 'nutrition_plans') THEN
    CREATE POLICY "empresarios_delete_templates"
      ON public.nutrition_plans FOR DELETE
      USING (
        is_template = true
        AND empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
      );
  END IF;
END $$;

-- Allow empresarios to SELECT their own templates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'empresarios_select_templates' AND tablename = 'nutrition_plans') THEN
    CREATE POLICY "empresarios_select_templates"
      ON public.nutrition_plans FOR SELECT
      USING (
        is_template = true
        AND empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
      );
  END IF;
END $$;
