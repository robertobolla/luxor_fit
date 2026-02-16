-- 20260211_create_plan_rpc.sql
-- Function to create a complete nutrition plan atomically
-- This avoids RLS race conditions or complexity with nested inserts from the client.

CREATE OR REPLACE FUNCTION public.create_complete_nutrition_plan(
    p_plan_name text,
    p_description text,
    p_is_active boolean,
    p_weeks jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (bypass RLS for the internal steps)
SET search_path = public
AS $$
DECLARE
    v_user_id text;
    v_plan_id uuid;
    v_week_record jsonb;
    v_day_record jsonb;
    v_week_id uuid;
    v_day_id uuid;
BEGIN
    -- 1. Get User ID from Token
    v_user_id := (auth.jwt() ->> 'sub');
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Deactivate other plans if this one is active
    IF p_is_active THEN
        UPDATE public.nutrition_plans
        SET is_active = false
        WHERE user_id = v_user_id;
    END IF;

    -- 3. Insert Parent Plan
    INSERT INTO public.nutrition_plans (
        user_id,
        plan_name,
        description,
        is_active,
        is_ai_generated,
        total_weeks
    ) VALUES (
        v_user_id,
        p_plan_name,
        p_description,
        p_is_active,
        false,
        jsonb_array_length(p_weeks)
    )
    RETURNING id INTO v_plan_id;

    -- 4. Loop through Weeks
    FOR v_week_record IN SELECT * FROM jsonb_array_elements(p_weeks)
    LOOP
        INSERT INTO public.nutrition_plan_weeks (
            plan_id,
            week_number
        ) VALUES (
            v_plan_id,
            (v_week_record->>'weekNumber')::int
        )
        RETURNING id INTO v_week_id;

        -- 5. Loop through Days
        FOR v_day_record IN SELECT * FROM jsonb_array_elements(v_week_record->'days')
        LOOP
            INSERT INTO public.nutrition_plan_days (
                week_id,
                day_number,
                day_name,
                target_calories,
                target_protein,
                target_carbs,
                target_fat
            ) VALUES (
                v_week_id,
                (v_day_record->>'dayNumber')::int,
                v_day_record->>'dayName',
                (v_day_record->>'targetCalories')::int,
                (v_day_record->>'targetProtein')::int,
                (v_day_record->>'targetCarbs')::int,
                (v_day_record->>'targetFat')::int
            );
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'plan_id', v_plan_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_complete_nutrition_plan TO authenticated;
