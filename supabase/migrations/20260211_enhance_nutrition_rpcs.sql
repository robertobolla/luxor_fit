-- Function: save_nutrition_profile
-- Safely upserts a user's nutrition profile bypassing RLS
CREATE OR REPLACE FUNCTION public.save_nutrition_profile(
    p_meals_per_day int DEFAULT null,
    p_fasting_window text DEFAULT null,
    p_custom_prompts text[] DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id text;
BEGIN
    v_user_id := (auth.jwt() ->> 'sub');
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- Upsert profile
    -- For INSERT: Use provided value or default (3 for meals)
    -- For UPDATE: Use provided value (EXCLUDED) or keep existing (nutrition_profiles) if NULL provided
    INSERT INTO public.nutrition_profiles (
        user_id, meals_per_day, fasting_window, custom_prompts, updated_at
    )
    VALUES (
        v_user_id, 
        COALESCE(p_meals_per_day, 3), 
        p_fasting_window, 
        COALESCE(p_custom_prompts, ARRAY[]::text[]), 
        now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
        meals_per_day = COALESCE(EXCLUDED.meals_per_day, nutrition_profiles.meals_per_day),
        fasting_window = COALESCE(EXCLUDED.fasting_window, nutrition_profiles.fasting_window),
        custom_prompts = COALESCE(EXCLUDED.custom_prompts, nutrition_profiles.custom_prompts),
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_nutrition_profile TO authenticated;

-- Function: create_complete_nutrition_plan
-- DROPPING first to change signature if needed, though replace works if signature matches.
-- This version supports deep nesting: Weeks -> Days -> Meals -> Foods
CREATE OR REPLACE FUNCTION public.create_complete_nutrition_plan(
    p_plan_name text,
    p_description text,
    p_is_active boolean,
    p_is_ai_generated boolean,
    p_weeks jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id text;
    v_plan_id uuid;
    v_week_record jsonb;
    v_day_record jsonb;
    v_meal_record jsonb;
    v_food_record jsonb;
    v_week_id uuid;
    v_day_id uuid;
    v_meal_id uuid;
BEGIN
    -- 1. Get User ID
    v_user_id := (auth.jwt() ->> 'sub');
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

    -- 2. Deactivate other plans if active
    IF p_is_active THEN
        UPDATE public.nutrition_plans SET is_active = false WHERE user_id = v_user_id;
    END IF;

    -- 3. Insert Plan
    INSERT INTO public.nutrition_plans (
        user_id, plan_name, description, is_active, is_ai_generated, total_weeks
    ) VALUES (
        v_user_id, p_plan_name, p_description, p_is_active, p_is_ai_generated, jsonb_array_length(p_weeks)
    )
    RETURNING id INTO v_plan_id;

    -- 4. Process Weeks
    FOR v_week_record IN SELECT * FROM jsonb_array_elements(p_weeks) LOOP
        INSERT INTO public.nutrition_plan_weeks (plan_id, week_number)
        VALUES (v_plan_id, (v_week_record->>'weekNumber')::int)
        RETURNING id INTO v_week_id;

        -- 5. Process Days
        FOR v_day_record IN SELECT * FROM jsonb_array_elements(v_week_record->'days') LOOP
            INSERT INTO public.nutrition_plan_days (
                week_id, day_number, day_name, target_calories, target_protein, target_carbs, target_fat
            ) VALUES (
                v_week_id,
                (v_day_record->>'dayNumber')::int,
                v_day_record->>'dayName',
                (v_day_record->>'targetCalories')::int,
                (v_day_record->>'targetProtein')::int,
                (v_day_record->>'targetCarbs')::int,
                (v_day_record->>'targetFat')::int
            )
            RETURNING id INTO v_day_id;

            -- 6. Process Meals (Optional)
            IF v_day_record ? 'meals' THEN
                FOR v_meal_record IN SELECT * FROM jsonb_array_elements(v_day_record->'meals') LOOP
                    INSERT INTO public.nutrition_plan_meals (
                        day_id, meal_order, meal_name
                    ) VALUES (
                        v_day_id,
                        (v_meal_record->>'mealOrder')::int,
                        v_meal_record->>'mealName'
                    )
                    RETURNING id INTO v_meal_id;

                    -- 7. Process Foods (Optional)
                    IF v_meal_record ? 'foods' THEN
                        FOR v_food_record IN SELECT * FROM jsonb_array_elements(v_meal_record->'foods') LOOP
                            INSERT INTO public.nutrition_plan_meal_foods (
                                meal_id, food_id, quantity, quantity_unit, 
                                calculated_calories, calculated_protein, calculated_carbs, calculated_fat
                            ) VALUES (
                                v_meal_id,
                                (v_food_record->>'foodId')::int,
                                (v_food_record->>'quantity')::numeric,
                                v_food_record->>'quantityUnit',
                                (v_food_record->>'calculatedCalories')::int,
                                (v_food_record->>'calculatedProtein')::numeric,
                                (v_food_record->>'calculatedCarbs')::numeric,
                                (v_food_record->>'calculatedFat')::numeric
                            );
                        END LOOP;
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'plan_id', v_plan_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_complete_nutrition_plan TO authenticated;
