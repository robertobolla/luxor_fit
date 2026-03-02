-- Agregar llaves foráneas faltantes para que Supabase/PostgREST pueda realizar los JOINS jerárquicos de los planes de nutrición.

DO $$
BEGIN
    -- 1. nutrition_plan_weeks -> nutrition_plans
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_nutrition_plan_weeks_plan') THEN
        ALTER TABLE public.nutrition_plan_weeks
            ADD CONSTRAINT fk_nutrition_plan_weeks_plan
            FOREIGN KEY (plan_id)
            REFERENCES public.nutrition_plans(id)
            ON DELETE CASCADE;
    END IF;

    -- 2. nutrition_plan_days -> nutrition_plan_weeks
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_nutrition_plan_days_week') THEN
        ALTER TABLE public.nutrition_plan_days
            ADD CONSTRAINT fk_nutrition_plan_days_week
            FOREIGN KEY (week_id)
            REFERENCES public.nutrition_plan_weeks(id)
            ON DELETE CASCADE;
    END IF;

    -- 3. nutrition_plan_meals -> nutrition_plan_days
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_nutrition_plan_meals_day') THEN
        ALTER TABLE public.nutrition_plan_meals
            ADD CONSTRAINT fk_nutrition_plan_meals_day
            FOREIGN KEY (day_id)
            REFERENCES public.nutrition_plan_days(id)
            ON DELETE CASCADE;
    END IF;

    -- 4. nutrition_plan_meal_foods -> nutrition_plan_meals
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_nutrition_plan_meal_foods_meal') THEN
        ALTER TABLE public.nutrition_plan_meal_foods
            ADD CONSTRAINT fk_nutrition_plan_meal_foods_meal
            FOREIGN KEY (meal_id)
            REFERENCES public.nutrition_plan_meals(id)
            ON DELETE CASCADE;
    END IF;

    -- 5. nutrition_plan_meal_foods -> foods
    -- Asumiendo que existe public.foods(id). En caso de no existir, fallará aquí, pero debería existir según el uso.
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_nutrition_plan_meal_foods_food') THEN
        ALTER TABLE public.nutrition_plan_meal_foods
            ADD CONSTRAINT fk_nutrition_plan_meal_foods_food
            FOREIGN KEY (food_id)
            REFERENCES public.foods(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- Recargar cache del schema para PostgREST (Supabase)
NOTIFY pgrst, 'reload schema';
