-- ============================================================================
-- CREAR TODAS LAS TABLAS DE NUTRICIÓN
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Tabla de semanas del plan
CREATE TABLE IF NOT EXISTS nutrition_plan_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de días del plan
CREATE TABLE IF NOT EXISTS nutrition_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES nutrition_plan_weeks(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL DEFAULT 1,
  day_name TEXT,
  target_calories INTEGER DEFAULT 2000,
  target_protein INTEGER DEFAULT 150,
  target_carbs INTEGER DEFAULT 200,
  target_fat INTEGER DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de comidas del día
CREATE TABLE IF NOT EXISTS nutrition_plan_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID NOT NULL REFERENCES nutrition_plan_days(id) ON DELETE CASCADE,
  meal_order INTEGER NOT NULL DEFAULT 1,
  meal_name TEXT DEFAULT 'Comida',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de alimentos en cada comida
CREATE TABLE IF NOT EXISTS nutrition_plan_meal_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES nutrition_plan_meals(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 100,
  quantity_unit TEXT DEFAULT 'grams',
  calculated_calories INTEGER DEFAULT 0,
  calculated_protein DECIMAL(10,2) DEFAULT 0,
  calculated_carbs DECIMAL(10,2) DEFAULT 0,
  calculated_fat DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_nutrition_plan_weeks_plan_id ON nutrition_plan_weeks(plan_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plan_days_week_id ON nutrition_plan_days(week_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plan_meals_day_id ON nutrition_plan_meals(day_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plan_meal_foods_meal_id ON nutrition_plan_meal_foods(meal_id);

-- RLS para nutrition_plan_weeks
ALTER TABLE nutrition_plan_weeks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own plan weeks" ON nutrition_plan_weeks;
DROP POLICY IF EXISTS "Users can insert their own plan weeks" ON nutrition_plan_weeks;
DROP POLICY IF EXISTS "Users can update their own plan weeks" ON nutrition_plan_weeks;
DROP POLICY IF EXISTS "Users can delete their own plan weeks" ON nutrition_plan_weeks;

CREATE POLICY "Users can view their own plan weeks" ON nutrition_plan_weeks
  FOR SELECT USING (
    plan_id IN (SELECT id FROM nutrition_plans WHERE user_id = auth.uid()::text)
  );

CREATE POLICY "Users can insert their own plan weeks" ON nutrition_plan_weeks
  FOR INSERT WITH CHECK (
    plan_id IN (SELECT id FROM nutrition_plans WHERE user_id = auth.uid()::text)
  );

CREATE POLICY "Users can update their own plan weeks" ON nutrition_plan_weeks
  FOR UPDATE USING (
    plan_id IN (SELECT id FROM nutrition_plans WHERE user_id = auth.uid()::text)
  );

CREATE POLICY "Users can delete their own plan weeks" ON nutrition_plan_weeks
  FOR DELETE USING (
    plan_id IN (SELECT id FROM nutrition_plans WHERE user_id = auth.uid()::text)
  );

-- RLS para nutrition_plan_days
ALTER TABLE nutrition_plan_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own plan days" ON nutrition_plan_days;
DROP POLICY IF EXISTS "Users can insert their own plan days" ON nutrition_plan_days;
DROP POLICY IF EXISTS "Users can update their own plan days" ON nutrition_plan_days;
DROP POLICY IF EXISTS "Users can delete their own plan days" ON nutrition_plan_days;

CREATE POLICY "Users can view their own plan days" ON nutrition_plan_days
  FOR SELECT USING (
    week_id IN (
      SELECT w.id FROM nutrition_plan_weeks w
      JOIN nutrition_plans p ON w.plan_id = p.id
      WHERE p.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert their own plan days" ON nutrition_plan_days
  FOR INSERT WITH CHECK (
    week_id IN (
      SELECT w.id FROM nutrition_plan_weeks w
      JOIN nutrition_plans p ON w.plan_id = p.id
      WHERE p.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update their own plan days" ON nutrition_plan_days
  FOR UPDATE USING (
    week_id IN (
      SELECT w.id FROM nutrition_plan_weeks w
      JOIN nutrition_plans p ON w.plan_id = p.id
      WHERE p.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete their own plan days" ON nutrition_plan_days
  FOR DELETE USING (
    week_id IN (
      SELECT w.id FROM nutrition_plan_weeks w
      JOIN nutrition_plans p ON w.plan_id = p.id
      WHERE p.user_id = auth.uid()::text
    )
  );

-- RLS para nutrition_plan_meals
ALTER TABLE nutrition_plan_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own plan meals" ON nutrition_plan_meals;
DROP POLICY IF EXISTS "Users can insert their own plan meals" ON nutrition_plan_meals;
DROP POLICY IF EXISTS "Users can update their own plan meals" ON nutrition_plan_meals;
DROP POLICY IF EXISTS "Users can delete their own plan meals" ON nutrition_plan_meals;

CREATE POLICY "Users can view their own plan meals" ON nutrition_plan_meals
  FOR SELECT USING (
    day_id IN (
      SELECT d.id FROM nutrition_plan_days d
      JOIN nutrition_plan_weeks w ON d.week_id = w.id
      JOIN nutrition_plans p ON w.plan_id = p.id
      WHERE p.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert their own plan meals" ON nutrition_plan_meals
  FOR INSERT WITH CHECK (
    day_id IN (
      SELECT d.id FROM nutrition_plan_days d
      JOIN nutrition_plan_weeks w ON d.week_id = w.id
      JOIN nutrition_plans p ON w.plan_id = p.id
      WHERE p.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update their own plan meals" ON nutrition_plan_meals
  FOR UPDATE USING (
    day_id IN (
      SELECT d.id FROM nutrition_plan_days d
      JOIN nutrition_plan_weeks w ON d.week_id = w.id
      JOIN nutrition_plans p ON w.plan_id = p.id
      WHERE p.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete their own plan meals" ON nutrition_plan_meals
  FOR DELETE USING (
    day_id IN (
      SELECT d.id FROM nutrition_plan_days d
      JOIN nutrition_plan_weeks w ON d.week_id = w.id
      JOIN nutrition_plans p ON w.plan_id = p.id
      WHERE p.user_id = auth.uid()::text
    )
  );

-- RLS para nutrition_plan_meal_foods
ALTER TABLE nutrition_plan_meal_foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own meal foods" ON nutrition_plan_meal_foods;
DROP POLICY IF EXISTS "Users can insert their own meal foods" ON nutrition_plan_meal_foods;
DROP POLICY IF EXISTS "Users can update their own meal foods" ON nutrition_plan_meal_foods;
DROP POLICY IF EXISTS "Users can delete their own meal foods" ON nutrition_plan_meal_foods;

CREATE POLICY "Users can view their own meal foods" ON nutrition_plan_meal_foods
  FOR SELECT USING (
    meal_id IN (
      SELECT m.id FROM nutrition_plan_meals m
      JOIN nutrition_plan_days d ON m.day_id = d.id
      JOIN nutrition_plan_weeks w ON d.week_id = w.id
      JOIN nutrition_plans p ON w.plan_id = p.id
      WHERE p.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert their own meal foods" ON nutrition_plan_meal_foods
  FOR INSERT WITH CHECK (
    meal_id IN (
      SELECT m.id FROM nutrition_plan_meals m
      JOIN nutrition_plan_days d ON m.day_id = d.id
      JOIN nutrition_plan_weeks w ON d.week_id = w.id
      JOIN nutrition_plans p ON w.plan_id = p.id
      WHERE p.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update their own meal foods" ON nutrition_plan_meal_foods
  FOR UPDATE USING (
    meal_id IN (
      SELECT m.id FROM nutrition_plan_meals m
      JOIN nutrition_plan_days d ON m.day_id = d.id
      JOIN nutrition_plan_weeks w ON d.week_id = w.id
      JOIN nutrition_plans p ON w.plan_id = p.id
      WHERE p.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete their own meal foods" ON nutrition_plan_meal_foods
  FOR DELETE USING (
    meal_id IN (
      SELECT m.id FROM nutrition_plan_meals m
      JOIN nutrition_plan_days d ON m.day_id = d.id
      JOIN nutrition_plan_weeks w ON d.week_id = w.id
      JOIN nutrition_plans p ON w.plan_id = p.id
      WHERE p.user_id = auth.uid()::text
    )
  );

-- Verificar tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'nutrition_plan%'
ORDER BY table_name;
