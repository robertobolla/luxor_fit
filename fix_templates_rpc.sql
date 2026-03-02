-- =============================================================
-- FIX: Create SECURITY DEFINER RPCs for template management
-- These bypass RLS entirely, with manual auth checks
-- =============================================================

-- 1. Make user_id nullable
ALTER TABLE public.nutrition_plans ALTER COLUMN user_id DROP NOT NULL;

-- 2. RPC: Save (insert or update) a diet template
CREATE OR REPLACE FUNCTION save_diet_template(
  p_id uuid DEFAULT NULL,
  p_plan_name text DEFAULT '',
  p_description text DEFAULT NULL,
  p_plan_data jsonb DEFAULT '{}',
  p_total_weeks int DEFAULT 1,
  p_category_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text;
  v_result jsonb;
  v_new_id uuid;
BEGIN
  v_user_id := current_setting('request.jwt.claims', true)::json ->> 'sub';
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_id IS NOT NULL THEN
    -- UPDATE existing template
    UPDATE nutrition_plans SET
      plan_name = p_plan_name,
      description = p_description,
      plan_data = p_plan_data,
      total_weeks = p_total_weeks,
      category_id = p_category_id
    WHERE id = p_id AND empresario_id = v_user_id AND is_template = true;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Template not found or not yours');
    END IF;
    RETURN jsonb_build_object('success', true, 'id', p_id);
  ELSE
    -- INSERT new template
    INSERT INTO nutrition_plans (plan_name, description, plan_type, is_template, is_active, empresario_id, plan_data, total_weeks, category_id)
    VALUES (p_plan_name, p_description, 'custom', true, false, v_user_id, p_plan_data, p_total_weeks, p_category_id)
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'id', v_new_id);
  END IF;
END;
$$;

-- 3. RPC: Delete a diet template
CREATE OR REPLACE FUNCTION delete_diet_template(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text;
BEGIN
  v_user_id := current_setting('request.jwt.claims', true)::json ->> 'sub';
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  DELETE FROM nutrition_plans
  WHERE id = p_id AND empresario_id = v_user_id AND is_template = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template not found or not yours');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. RPC: Duplicate a diet template
CREATE OR REPLACE FUNCTION duplicate_diet_template(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text;
  v_new_id uuid;
  v_template nutrition_plans%ROWTYPE;
BEGIN
  v_user_id := current_setting('request.jwt.claims', true)::json ->> 'sub';
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_template FROM nutrition_plans
  WHERE id = p_id AND empresario_id = v_user_id AND is_template = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template not found');
  END IF;

  INSERT INTO nutrition_plans (plan_name, description, plan_type, is_template, is_active, empresario_id, plan_data, total_weeks, category_id)
  VALUES (v_template.plan_name || ' (Copia)', v_template.description, 'custom', true, false, v_user_id, v_template.plan_data, v_template.total_weeks, v_template.category_id)
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('success', true, 'id', v_new_id);
END;
$$;

-- 4. RPC: List diet templates for the current empresario
CREATE OR REPLACE FUNCTION list_diet_templates()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text;
  v_result jsonb;
BEGIN
  v_user_id := current_setting('request.jwt.claims', true)::json ->> 'sub';
  IF v_user_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM nutrition_plans t
  WHERE t.empresario_id = v_user_id AND t.is_template = true;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION save_diet_template TO authenticated;
GRANT EXECUTE ON FUNCTION delete_diet_template TO authenticated;
GRANT EXECUTE ON FUNCTION duplicate_diet_template TO authenticated;
GRANT EXECUTE ON FUNCTION list_diet_templates TO authenticated;

-- Clean up broken records
DELETE FROM nutrition_plans WHERE is_template = true AND empresario_id IS NULL;
