-- =============================================================
-- Migration: Diet Templates, Nutritionist Notes, & Student RPCs
-- =============================================================

-- 1. Add template columns to nutrition_plans
ALTER TABLE public.nutrition_plans
  ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS empresario_id text;

-- 2. Add message column to shared_nutrition_plans
ALTER TABLE public.shared_nutrition_plans
  ADD COLUMN IF NOT EXISTS message text;

-- 3. Add nutritionist notes to gym_members
ALTER TABLE public.gym_members
  ADD COLUMN IF NOT EXISTS nutritionist_notes text;

-- =============================================================
-- RLS: nutrition_plans — allow empresarios to manage templates
-- =============================================================

-- Empresarios can SELECT their own templates
CREATE POLICY "empresarios_select_own_templates"
  ON public.nutrition_plans FOR SELECT
  USING (
    empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  );

-- Empresarios can INSERT templates
CREATE POLICY "empresarios_insert_templates"
  ON public.nutrition_plans FOR INSERT
  WITH CHECK (
    is_template = true
    AND empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  );

-- Empresarios can UPDATE their own templates
CREATE POLICY "empresarios_update_own_templates"
  ON public.nutrition_plans FOR UPDATE
  USING (
    is_template = true
    AND empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  );

-- Empresarios can DELETE their own templates
CREATE POLICY "empresarios_delete_own_templates"
  ON public.nutrition_plans FOR DELETE
  USING (
    is_template = true
    AND empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  );

-- =============================================================
-- RLS: shared_nutrition_plans — allow empresarios to assign
-- =============================================================

CREATE POLICY "empresarios_insert_assignments"
  ON public.shared_nutrition_plans FOR INSERT
  WITH CHECK (
    sender_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  );

CREATE POLICY "empresarios_select_own_assignments"
  ON public.shared_nutrition_plans FOR SELECT
  USING (
    sender_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
    OR receiver_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  );

CREATE POLICY "receivers_update_assignment_status"
  ON public.shared_nutrition_plans FOR UPDATE
  USING (
    receiver_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  );

-- =============================================================
-- RLS: gym_members — allow empresarios to update notes
-- =============================================================

CREATE POLICY "empresarios_update_member_notes"
  ON public.gym_members FOR UPDATE
  USING (
    empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  )
  WITH CHECK (
    empresario_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
  );

-- =============================================================
-- RPC: get_student_metrics (SECURITY DEFINER)
-- Returns body metrics for a student, only if caller is their empresario
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_student_metrics(
  p_student_id text,
  p_limit integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id text;
  v_is_owner boolean;
  v_result jsonb;
BEGIN
  v_caller_id := current_setting('request.jwt.claims', true)::json ->> 'sub';

  -- Verify ownership
  SELECT EXISTS (
    SELECT 1 FROM gym_members
    WHERE user_id = p_student_id
      AND empresario_id = v_caller_id
      AND is_active = true
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Get body_metrics (weight, body_fat, muscle)
  SELECT jsonb_build_object(
    'success', true,
    'metrics', COALESCE((
      SELECT jsonb_agg(row_to_json(m) ORDER BY m.date DESC)
      FROM (
        SELECT date, weight_kg, body_fat_percentage, muscle_percentage
        FROM body_metrics
        WHERE user_id = p_student_id
        ORDER BY date DESC
        LIMIT p_limit
      ) m
    ), '[]'::jsonb),
    'measurements', COALESCE((
      SELECT jsonb_agg(row_to_json(bm) ORDER BY bm.measured_at DESC)
      FROM (
        SELECT measured_at, weight_kg, body_fat_percentage, muscle_percentage,
               chest_cm, waist_cm, hips_cm, arms_cm, thighs_cm
        FROM body_measurements
        WHERE user_id = p_student_id
        ORDER BY measured_at DESC
        LIMIT p_limit
      ) bm
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =============================================================
-- RPC: get_student_nutrition_plan (SECURITY DEFINER)
-- Returns the active nutrition plan for a student
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_student_nutrition_plan(
  p_student_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id text;
  v_is_owner boolean;
  v_plan_record record;
  v_result jsonb;
BEGIN
  v_caller_id := current_setting('request.jwt.claims', true)::json ->> 'sub';

  -- Verify ownership
  SELECT EXISTS (
    SELECT 1 FROM gym_members
    WHERE user_id = p_student_id
      AND empresario_id = v_caller_id
      AND is_active = true
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Get active plan
  SELECT id, plan_name, description, is_active, created_at, nutrition_goal
  INTO v_plan_record
  FROM nutrition_plans
  WHERE user_id = p_student_id AND is_active = true
  LIMIT 1;

  IF v_plan_record IS NULL THEN
    RETURN jsonb_build_object('success', true, 'plan', null);
  END IF;

  -- Build plan with weeks -> days -> meals -> foods
  SELECT jsonb_build_object(
    'success', true,
    'plan', jsonb_build_object(
      'id', v_plan_record.id,
      'plan_name', v_plan_record.plan_name,
      'description', v_plan_record.description,
      'nutrition_goal', v_plan_record.nutrition_goal,
      'created_at', v_plan_record.created_at,
      'weeks', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'week_number', w.week_number,
            'days', COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object(
                  'day_number', d.day_number,
                  'day_name', d.day_name,
                  'target_calories', d.target_calories,
                  'target_protein', d.target_protein,
                  'target_carbs', d.target_carbs,
                  'target_fat', d.target_fat,
                  'meals', COALESCE((
                    SELECT jsonb_agg(
                      jsonb_build_object(
                        'meal_name', ml.meal_name,
                        'meal_order', ml.meal_order,
                        'foods', COALESCE((
                          SELECT jsonb_agg(
                            jsonb_build_object(
                              'food_name', f.name_es,
                              'quantity', mf.quantity,
                              'quantity_unit', mf.quantity_unit,
                              'calories', mf.calculated_calories,
                              'protein', mf.calculated_protein,
                              'carbs', mf.calculated_carbs,
                              'fat', mf.calculated_fat
                            ) ORDER BY mf.created_at
                          )
                          FROM nutrition_plan_meal_foods mf
                          JOIN foods f ON f.id = mf.food_id
                          WHERE mf.meal_id = ml.id
                        ), '[]'::jsonb)
                      ) ORDER BY ml.meal_order
                    )
                    FROM nutrition_plan_meals ml
                    WHERE ml.day_id = d.id
                  ), '[]'::jsonb)
                ) ORDER BY d.day_number
              )
              FROM nutrition_plan_days d
              WHERE d.week_id = w.id
            ), '[]'::jsonb)
          ) ORDER BY w.week_number
        )
        FROM nutrition_plan_weeks w
        WHERE w.plan_id = v_plan_record.id
      ), '[]'::jsonb)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_student_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_nutrition_plan TO authenticated;
