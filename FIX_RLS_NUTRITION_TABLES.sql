-- ============================================================================
-- FIX RLS - Políticas más permisivas para tablas de nutrición
-- La app usa Clerk, no Supabase Auth, así que auth.uid() no funciona
-- ============================================================================

-- Eliminar políticas existentes de nutrition_plan_weeks
DROP POLICY IF EXISTS "Users can view their own plan weeks" ON nutrition_plan_weeks;
DROP POLICY IF EXISTS "Users can insert their own plan weeks" ON nutrition_plan_weeks;
DROP POLICY IF EXISTS "Users can update their own plan weeks" ON nutrition_plan_weeks;
DROP POLICY IF EXISTS "Users can delete their own plan weeks" ON nutrition_plan_weeks;

-- Crear políticas permisivas para nutrition_plan_weeks
CREATE POLICY "Allow all operations on plan weeks" ON nutrition_plan_weeks
  FOR ALL USING (true) WITH CHECK (true);

-- Eliminar políticas existentes de nutrition_plan_days
DROP POLICY IF EXISTS "Users can view their own plan days" ON nutrition_plan_days;
DROP POLICY IF EXISTS "Users can insert their own plan days" ON nutrition_plan_days;
DROP POLICY IF EXISTS "Users can update their own plan days" ON nutrition_plan_days;
DROP POLICY IF EXISTS "Users can delete their own plan days" ON nutrition_plan_days;

-- Crear políticas permisivas para nutrition_plan_days
CREATE POLICY "Allow all operations on plan days" ON nutrition_plan_days
  FOR ALL USING (true) WITH CHECK (true);

-- Eliminar políticas existentes de nutrition_plan_meals
DROP POLICY IF EXISTS "Users can view their own plan meals" ON nutrition_plan_meals;
DROP POLICY IF EXISTS "Users can insert their own plan meals" ON nutrition_plan_meals;
DROP POLICY IF EXISTS "Users can update their own plan meals" ON nutrition_plan_meals;
DROP POLICY IF EXISTS "Users can delete their own plan meals" ON nutrition_plan_meals;

-- Crear políticas permisivas para nutrition_plan_meals
CREATE POLICY "Allow all operations on plan meals" ON nutrition_plan_meals
  FOR ALL USING (true) WITH CHECK (true);

-- Eliminar políticas existentes de nutrition_plan_meal_foods
DROP POLICY IF EXISTS "Users can view their own meal foods" ON nutrition_plan_meal_foods;
DROP POLICY IF EXISTS "Users can insert their own meal foods" ON nutrition_plan_meal_foods;
DROP POLICY IF EXISTS "Users can update their own meal foods" ON nutrition_plan_meal_foods;
DROP POLICY IF EXISTS "Users can delete their own meal foods" ON nutrition_plan_meal_foods;

-- Crear políticas permisivas para nutrition_plan_meal_foods
CREATE POLICY "Allow all operations on meal foods" ON nutrition_plan_meal_foods
  FOR ALL USING (true) WITH CHECK (true);

-- Verificar que RLS está habilitado pero con políticas permisivas
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename LIKE 'nutrition_plan%';
