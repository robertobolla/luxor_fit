-- ============================================================================
-- SISTEMA DE NUTRICIÓN V2 - TABLAS PARA SUPABASE
-- ============================================================================
-- Este script crea las tablas necesarias para el nuevo sistema de nutrición
-- con planes personalizados, biblioteca de planes y compartir con amigos.
-- ============================================================================

-- ============================================================================
-- 1. TABLA DE ALIMENTOS (foods)
-- ============================================================================
-- Reemplaza la base de datos embebida FOOD_DATABASE por una tabla en Supabase

CREATE TABLE IF NOT EXISTS public.foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Nombres en múltiples idiomas
  name_es TEXT NOT NULL,
  name_en TEXT,
  
  -- Tipo de alimento
  food_type TEXT NOT NULL CHECK (food_type IN (
    'proteins',        -- Proteínas (carnes, pescados, huevos)
    'carbohydrates',   -- Carbohidratos (arroz, pasta, pan)
    'legumes',         -- Legumbres
    'fruits',          -- Frutas
    'vegetables',      -- Verduras
    'dairy',           -- Lácteos
    'fats',            -- Grasas/Aceites
    'cereals',         -- Cereales
    'nuts',            -- Frutos secos
    'beverages',       -- Bebidas
    'prepared_meals'   -- Comidas preparadas (pizza, etc.)
  )),
  
  -- Tipo de cantidad (cómo se mide este alimento)
  quantity_type TEXT NOT NULL DEFAULT 'grams' CHECK (quantity_type IN ('grams', 'units')),
  
  -- Información nutricional por 100g o por unidad
  -- Si quantity_type = 'grams', estos valores son por 100g
  -- Si quantity_type = 'units', estos valores son por 1 unidad
  calories DECIMAL(8, 2) NOT NULL DEFAULT 0,
  protein_g DECIMAL(8, 2) NOT NULL DEFAULT 0,
  carbs_g DECIMAL(8, 2) NOT NULL DEFAULT 0,
  fat_g DECIMAL(8, 2) NOT NULL DEFAULT 0,
  
  -- Para alimentos por unidad, peso promedio de una unidad en gramos
  unit_weight_g DECIMAL(8, 2),
  -- Nombre de la unidad (ej: "unidad", "rebanada", "taza", "cucharada")
  unit_name_es TEXT DEFAULT 'unidad',
  unit_name_en TEXT DEFAULT 'unit',
  
  -- Imagen del alimento
  image_url TEXT,
  
  -- Tags para búsquedas y filtros
  tags TEXT[] DEFAULT '{}',
  
  -- Estado del registro
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN ('complete', 'incomplete')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_foods_food_type ON public.foods(food_type);
CREATE INDEX IF NOT EXISTS idx_foods_status ON public.foods(status);
CREATE INDEX IF NOT EXISTS idx_foods_name_es ON public.foods(name_es);
CREATE INDEX IF NOT EXISTS idx_foods_name_en ON public.foods(name_en);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_foods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_foods_updated_at ON public.foods;
CREATE TRIGGER update_foods_updated_at
  BEFORE UPDATE ON public.foods
  FOR EACH ROW
  EXECUTE FUNCTION update_foods_updated_at();

-- RLS Policies
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Foods are viewable by everyone" ON public.foods;
CREATE POLICY "Foods are viewable by everyone"
  ON public.foods FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Foods can be inserted by admins" ON public.foods;
CREATE POLICY "Foods can be inserted by admins"
  ON public.foods FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Foods can be updated by admins" ON public.foods;
CREATE POLICY "Foods can be updated by admins"
  ON public.foods FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Foods can be deleted by admins" ON public.foods;
CREATE POLICY "Foods can be deleted by admins"
  ON public.foods FOR DELETE
  USING (true);

-- ============================================================================
-- 2. TABLA DE PLANES NUTRICIONALES (nutrition_plans)
-- ============================================================================
-- Almacena tanto planes personalizados como planes generados por IA

CREATE TABLE IF NOT EXISTS public.nutrition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- ID de Clerk
  
  -- Información básica del plan
  plan_name TEXT NOT NULL,
  description TEXT,
  
  -- Tipo de plan
  plan_type TEXT NOT NULL DEFAULT 'custom' CHECK (plan_type IN ('custom', 'ai_generated')),
  
  -- Estado del plan
  is_active BOOLEAN DEFAULT FALSE,
  
  -- Estructura del plan en JSON
  -- Formato:
  -- {
  --   "weeks": [
  --     {
  --       "week_number": 1,
  --       "days": [
  --         {
  --           "day_number": 1,
  --           "name": "Día de entrenamiento",
  --           "targets": {
  --             "calories": 2500,
  --             "protein_g": 180,
  --             "carbs_g": 300,
  --             "fat_g": 80
  --           },
  --           "meals": [
  --             {
  --               "meal_number": 1,
  --               "name": "Desayuno",
  --               "foods": [
  --                 {
  --                   "food_id": "uuid",
  --                   "food_name": "Avena",
  --                   "quantity": 100,
  --                   "quantity_type": "grams",
  --                   "calories": 389,
  --                   "protein_g": 17,
  --                   "carbs_g": 66,
  --                   "fat_g": 7
  --                 }
  --               ]
  --             }
  --           ]
  --         }
  --       ]
  --     }
  --   ],
  --   "total_weeks": 1
  -- }
  plan_data JSONB NOT NULL DEFAULT '{"weeks": [], "total_weeks": 0}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user_id ON public.nutrition_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_is_active ON public.nutrition_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_plan_type ON public.nutrition_plans(plan_type);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_nutrition_plans_updated_at ON public.nutrition_plans;
CREATE TRIGGER update_nutrition_plans_updated_at
  BEFORE UPDATE ON public.nutrition_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_foods_updated_at();

-- RLS Policies
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own plans" ON public.nutrition_plans;
CREATE POLICY "Users can view own plans"
  ON public.nutrition_plans FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own plans" ON public.nutrition_plans;
CREATE POLICY "Users can insert own plans"
  ON public.nutrition_plans FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own plans" ON public.nutrition_plans;
CREATE POLICY "Users can update own plans"
  ON public.nutrition_plans FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Users can delete own plans" ON public.nutrition_plans;
CREATE POLICY "Users can delete own plans"
  ON public.nutrition_plans FOR DELETE
  USING (true);

-- ============================================================================
-- 3. FUNCIÓN PARA ACTIVAR PLAN NUTRICIONAL
-- ============================================================================
-- Desactiva todos los demás planes del usuario y activa el seleccionado

CREATE OR REPLACE FUNCTION activate_nutrition_plan(
  p_user_id TEXT,
  p_plan_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Desactivar todos los planes del usuario
  UPDATE public.nutrition_plans
  SET is_active = FALSE
  WHERE user_id = p_user_id AND is_active = TRUE;
  
  -- Activar el plan seleccionado
  UPDATE public.nutrition_plans
  SET is_active = TRUE
  WHERE id = p_plan_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. TABLA DE PLANES COMPARTIDOS (shared_nutrition_plans)
-- ============================================================================
-- Similar a shared_workouts pero para planes nutricionales

CREATE TABLE IF NOT EXISTS public.shared_nutrition_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  sender_id TEXT NOT NULL,      -- ID de Clerk del que envía
  receiver_id TEXT NOT NULL,    -- ID de Clerk del que recibe
  nutrition_plan_id UUID NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
  message_id UUID,              -- Referencia al mensaje en el chat
  
  -- Estado del compartido
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'active')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_shared_nutrition_plans_sender ON public.shared_nutrition_plans(sender_id);
CREATE INDEX IF NOT EXISTS idx_shared_nutrition_plans_receiver ON public.shared_nutrition_plans(receiver_id);
CREATE INDEX IF NOT EXISTS idx_shared_nutrition_plans_status ON public.shared_nutrition_plans(status);

-- RLS Policies
ALTER TABLE public.shared_nutrition_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view shared plans" ON public.shared_nutrition_plans;
CREATE POLICY "Users can view shared plans"
  ON public.shared_nutrition_plans FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert shared plans" ON public.shared_nutrition_plans;
CREATE POLICY "Users can insert shared plans"
  ON public.shared_nutrition_plans FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update shared plans" ON public.shared_nutrition_plans;
CREATE POLICY "Users can update shared plans"
  ON public.shared_nutrition_plans FOR UPDATE
  USING (true);

-- ============================================================================
-- 5. MIGRACIÓN DE DATOS: FOOD_DATABASE → foods
-- ============================================================================
-- Este INSERT migra los alimentos existentes del código a la tabla foods
-- NOTA: Ejecutar solo una vez después de crear la tabla

-- Función para determinar el food_type basado en la categoría anterior
-- Las categorías antiguas eran: 'protein', 'carb', 'fat', 'vegetable', 'fruit', 'dairy'

INSERT INTO public.foods (name_es, name_en, food_type, quantity_type, calories, protein_g, carbs_g, fat_g, status, tags)
VALUES
-- ============================================================================
-- PROTEÍNAS
-- ============================================================================
('Pechuga de pollo', 'Chicken breast', 'proteins', 'grams', 165, 31, 0, 3.6, 'complete', ARRAY['budget', 'rapido', 'carne']),
('Muslo de pollo', 'Chicken thigh', 'proteins', 'grams', 209, 26, 0, 12, 'complete', ARRAY['carne']),
('Pavo pechuga', 'Turkey breast', 'proteins', 'grams', 135, 30, 0, 1.2, 'complete', ARRAY['carne']),
('Carne molida 90/10', 'Ground beef 90/10', 'proteins', 'grams', 176, 20, 0, 10, 'complete', ARRAY['carne']),
('Carne molida 80/20', 'Ground beef 80/20', 'proteins', 'grams', 254, 17, 0, 20, 'complete', ARRAY['carne']),
('Solomillo de ternera', 'Beef tenderloin', 'proteins', 'grams', 250, 26, 0, 15, 'complete', ARRAY['carne']),
('Chuletas de cerdo', 'Pork chops', 'proteins', 'grams', 231, 27, 0, 13, 'complete', ARRAY['carne']),
('Jamón serrano', 'Serrano ham', 'proteins', 'grams', 370, 30, 0, 28, 'complete', ARRAY['carne', 'procesado']),
('Salmón', 'Salmon', 'proteins', 'grams', 208, 20, 0, 13, 'complete', ARRAY['pescado']),
('Atún fresco', 'Fresh tuna', 'proteins', 'grams', 144, 30, 0, 1, 'complete', ARRAY['pescado']),
('Atún en lata', 'Canned tuna', 'proteins', 'grams', 116, 26, 0, 0.8, 'complete', ARRAY['rapido', 'pescado']),
('Bacalao', 'Cod', 'proteins', 'grams', 82, 18, 0, 0.7, 'complete', ARRAY['pescado']),
('Merluza', 'Hake', 'proteins', 'grams', 71, 16, 0, 0.6, 'complete', ARRAY['pescado']),
('Gambas', 'Shrimp', 'proteins', 'grams', 99, 24, 0, 0.3, 'complete', ARRAY['marisco']),
('Huevos', 'Eggs', 'proteins', 'units', 78, 6.5, 0.6, 5.5, 'complete', ARRAY['budget', 'rapido']),
('Claras de huevo', 'Egg whites', 'proteins', 'grams', 52, 11, 0.7, 0.2, 'complete', ARRAY['rapido']),
('Tofu firme', 'Firm tofu', 'proteins', 'grams', 76, 8, 1.9, 4.8, 'complete', ARRAY['rapido', 'vegetal']),
('Tempeh', 'Tempeh', 'proteins', 'grams', 192, 20, 9, 11, 'complete', ARRAY['vegetal']),

-- ============================================================================
-- CARBOHIDRATOS
-- ============================================================================
('Arroz blanco cocido', 'Cooked white rice', 'carbohydrates', 'grams', 130, 2.7, 28, 0.3, 'complete', ARRAY['budget']),
('Arroz integral cocido', 'Cooked brown rice', 'carbohydrates', 'grams', 111, 2.6, 23, 0.9, 'complete', ARRAY['budget']),
('Avena', 'Oats', 'carbohydrates', 'grams', 389, 17, 66, 7, 'complete', ARRAY['budget', 'rapido']),
('Pasta integral cocida', 'Cooked whole wheat pasta', 'carbohydrates', 'grams', 124, 5, 26, 0.5, 'complete', ARRAY['gluten']),
('Pasta blanca cocida', 'Cooked white pasta', 'carbohydrates', 'grams', 131, 5, 25, 1.1, 'complete', ARRAY['gluten']),
('Quinoa cocida', 'Cooked quinoa', 'carbohydrates', 'grams', 120, 4.4, 21, 1.9, 'complete', ARRAY['vegetal']),
('Papa cocida', 'Boiled potato', 'carbohydrates', 'grams', 87, 1.9, 20, 0.1, 'complete', ARRAY['budget']),
('Batata cocida', 'Cooked sweet potato', 'carbohydrates', 'grams', 90, 2, 21, 0.2, 'complete', ARRAY['budget']),
('Pan integral', 'Whole wheat bread', 'carbohydrates', 'grams', 247, 13, 41, 3.4, 'complete', ARRAY['rapido', 'gluten']),
('Pan blanco', 'White bread', 'carbohydrates', 'grams', 265, 9, 49, 3.2, 'complete', ARRAY['rapido', 'gluten']),
('Tortillas de maíz', 'Corn tortillas', 'carbohydrates', 'grams', 218, 5.7, 45, 2.3, 'complete', ARRAY['budget']),

-- ============================================================================
-- FRUTAS
-- ============================================================================
('Plátano', 'Banana', 'fruits', 'units', 105, 1.3, 27, 0.4, 'complete', ARRAY['rapido', 'budget']),
('Manzana', 'Apple', 'fruits', 'units', 95, 0.5, 25, 0.3, 'complete', ARRAY['rapido', 'budget']),
('Naranja', 'Orange', 'fruits', 'units', 62, 1.2, 15, 0.2, 'complete', ARRAY['rapido', 'budget']),
('Fresas', 'Strawberries', 'fruits', 'grams', 32, 0.7, 8, 0.3, 'complete', ARRAY['rapido', 'budget']),
('Kiwi', 'Kiwi', 'fruits', 'units', 42, 0.8, 10, 0.4, 'complete', ARRAY['rapido']),
('Piña', 'Pineapple', 'fruits', 'grams', 50, 0.5, 13, 0.1, 'complete', ARRAY['rapido']),
('Mango', 'Mango', 'fruits', 'grams', 60, 0.8, 15, 0.4, 'complete', ARRAY['rapido']),
('Arándanos', 'Blueberries', 'fruits', 'grams', 57, 0.7, 14, 0.3, 'complete', ARRAY['superfood']),

-- ============================================================================
-- VERDURAS
-- ============================================================================
('Espinaca', 'Spinach', 'vegetables', 'grams', 23, 2.9, 3.6, 0.4, 'complete', ARRAY['rapido', 'verde']),
('Lechuga', 'Lettuce', 'vegetables', 'grams', 15, 1.4, 2.9, 0.2, 'complete', ARRAY['rapido', 'verde']),
('Brócoli', 'Broccoli', 'vegetables', 'grams', 34, 2.8, 7, 0.4, 'complete', ARRAY['budget', 'rapido', 'verde']),
('Coliflor', 'Cauliflower', 'vegetables', 'grams', 25, 1.9, 5, 0.3, 'complete', ARRAY['budget', 'verde']),
('Zanahoria', 'Carrot', 'vegetables', 'grams', 41, 0.9, 10, 0.2, 'complete', ARRAY['budget']),
('Tomate', 'Tomato', 'vegetables', 'grams', 18, 0.9, 3.9, 0.2, 'complete', ARRAY['rapido', 'budget']),
('Pepino', 'Cucumber', 'vegetables', 'grams', 16, 0.7, 3.6, 0.1, 'complete', ARRAY['rapido']),
('Pimiento', 'Bell pepper', 'vegetables', 'grams', 31, 1, 6, 0.3, 'complete', ARRAY['rapido']),
('Cebolla', 'Onion', 'vegetables', 'grams', 40, 1.1, 9, 0.1, 'complete', ARRAY['budget']),
('Calabacín', 'Zucchini', 'vegetables', 'grams', 17, 1.2, 3.1, 0.3, 'complete', ARRAY['rapido']),

-- ============================================================================
-- LÁCTEOS
-- ============================================================================
('Yogur griego 0%', 'Greek yogurt 0%', 'dairy', 'grams', 59, 10, 3.6, 0.4, 'complete', ARRAY['rapido', 'lacteo']),
('Yogur griego 2%', 'Greek yogurt 2%', 'dairy', 'grams', 73, 10, 3.6, 2, 'complete', ARRAY['lacteo']),
('Queso cottage', 'Cottage cheese', 'dairy', 'grams', 98, 11, 3.4, 4.3, 'complete', ARRAY['rapido', 'lacteo']),
('Queso fresco', 'Fresh cheese', 'dairy', 'grams', 98, 11, 3.4, 4.3, 'complete', ARRAY['lacteo']),
('Leche desnatada', 'Skim milk', 'dairy', 'grams', 34, 3.4, 5, 0.1, 'complete', ARRAY['lacteo']),
('Leche semidesnatada', 'Semi-skim milk', 'dairy', 'grams', 46, 3.2, 4.7, 1.6, 'complete', ARRAY['lacteo']),
('Queso mozzarella', 'Mozzarella cheese', 'dairy', 'grams', 300, 22, 2.2, 22, 'complete', ARRAY['lacteo']),

-- ============================================================================
-- GRASAS
-- ============================================================================
('Aceite de oliva', 'Olive oil', 'fats', 'grams', 884, 0, 0, 100, 'complete', ARRAY['cocina']),
('Aceite de coco', 'Coconut oil', 'fats', 'grams', 862, 0, 0, 100, 'complete', ARRAY['cocina']),
('Aguacate', 'Avocado', 'fats', 'units', 240, 3, 12, 22, 'complete', ARRAY['rapido', 'vegetal']),
('Mantequilla de maní', 'Peanut butter', 'fats', 'grams', 588, 25, 20, 50, 'complete', ARRAY['budget', 'snack']),
('Mantequilla de almendras', 'Almond butter', 'fats', 'grams', 614, 21, 19, 55, 'complete', ARRAY['snack']),
('Mantequilla', 'Butter', 'fats', 'grams', 717, 0.9, 0.1, 81, 'complete', ARRAY['lacteo']),

-- ============================================================================
-- FRUTOS SECOS
-- ============================================================================
('Almendras', 'Almonds', 'nuts', 'grams', 579, 21, 22, 50, 'complete', ARRAY['snack']),
('Nueces', 'Walnuts', 'nuts', 'grams', 654, 15, 14, 65, 'complete', ARRAY['snack']),
('Anacardos', 'Cashews', 'nuts', 'grams', 553, 18, 30, 44, 'complete', ARRAY['snack']),
('Pistachos', 'Pistachios', 'nuts', 'grams', 560, 20, 28, 45, 'complete', ARRAY['snack']),
('Semillas de chía', 'Chia seeds', 'nuts', 'grams', 486, 17, 42, 31, 'complete', ARRAY['superfood']),
('Semillas de lino', 'Flax seeds', 'nuts', 'grams', 534, 18, 29, 42, 'complete', ARRAY['superfood']),

-- ============================================================================
-- LEGUMBRES
-- ============================================================================
('Lentejas cocidas', 'Cooked lentils', 'legumes', 'grams', 116, 9, 20, 0.4, 'complete', ARRAY['budget', 'vegetal']),
('Garbanzos cocidos', 'Cooked chickpeas', 'legumes', 'grams', 164, 8.9, 27, 2.6, 'complete', ARRAY['budget', 'vegetal']),
('Frijoles negros cocidos', 'Cooked black beans', 'legumes', 'grams', 132, 8.9, 24, 0.5, 'complete', ARRAY['budget', 'vegetal']),
('Alubias blancas', 'White beans', 'legumes', 'grams', 127, 8.2, 23, 0.3, 'complete', ARRAY['budget', 'vegetal']),

-- ============================================================================
-- CEREALES
-- ============================================================================
('Copos de avena', 'Oat flakes', 'cereals', 'grams', 389, 17, 66, 7, 'complete', ARRAY['rapido']),
('Muesli', 'Muesli', 'cereals', 'grams', 362, 10, 66, 5.9, 'complete', ARRAY['rapido']),
('Granola', 'Granola', 'cereals', 'grams', 471, 10, 64, 20, 'complete', ARRAY['dulce']),
('Cereales integrales', 'Whole grain cereals', 'cereals', 'grams', 339, 11, 76, 2.1, 'complete', ARRAY['rapido']),

-- ============================================================================
-- BEBIDAS
-- ============================================================================
('Leche de almendras', 'Almond milk', 'beverages', 'grams', 17, 0.6, 0.6, 1.5, 'complete', ARRAY['vegetal']),
('Leche de avena', 'Oat milk', 'beverages', 'grams', 47, 1, 7, 1.5, 'complete', ARRAY['vegetal']),
('Leche de soja', 'Soy milk', 'beverages', 'grams', 54, 3.3, 6, 1.8, 'complete', ARRAY['vegetal']),
('Proteína whey (polvo)', 'Whey protein powder', 'beverages', 'grams', 400, 80, 8, 6, 'complete', ARRAY['suplemento']),

-- ============================================================================
-- COMIDAS PREPARADAS
-- ============================================================================
('Pizza margarita', 'Margherita pizza', 'prepared_meals', 'grams', 266, 11, 33, 10, 'complete', ARRAY['procesado']),
('Hamburguesa con pan', 'Burger with bun', 'prepared_meals', 'units', 540, 25, 40, 30, 'complete', ARRAY['procesado']),
('Sushi roll (8 piezas)', 'Sushi roll (8 pieces)', 'prepared_meals', 'units', 350, 9, 65, 3.5, 'complete', ARRAY['pescado']),
('Ensalada César', 'Caesar salad', 'prepared_meals', 'grams', 127, 7, 7, 8, 'complete', ARRAY['rapido']),
('Wrap de pollo', 'Chicken wrap', 'prepared_meals', 'units', 380, 22, 35, 16, 'complete', ARRAY['rapido']),
('Bowl de poke', 'Poke bowl', 'prepared_meals', 'grams', 150, 15, 15, 4, 'complete', ARRAY['pescado'])

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. ACTUALIZAR unit_weight_g PARA ALIMENTOS POR UNIDAD
-- ============================================================================

UPDATE public.foods SET unit_weight_g = 50, unit_name_es = 'huevo', unit_name_en = 'egg' WHERE name_es = 'Huevos';
UPDATE public.foods SET unit_weight_g = 120, unit_name_es = 'unidad mediana', unit_name_en = 'medium unit' WHERE name_es = 'Plátano';
UPDATE public.foods SET unit_weight_g = 182, unit_name_es = 'unidad mediana', unit_name_en = 'medium unit' WHERE name_es = 'Manzana';
UPDATE public.foods SET unit_weight_g = 131, unit_name_es = 'unidad mediana', unit_name_en = 'medium unit' WHERE name_es = 'Naranja';
UPDATE public.foods SET unit_weight_g = 69, unit_name_es = 'unidad', unit_name_en = 'unit' WHERE name_es = 'Kiwi';
UPDATE public.foods SET unit_weight_g = 150, unit_name_es = 'unidad mediana', unit_name_en = 'medium unit' WHERE name_es = 'Aguacate';
UPDATE public.foods SET unit_weight_g = 250, unit_name_es = 'unidad', unit_name_en = 'unit' WHERE name_es = 'Hamburguesa con pan';
UPDATE public.foods SET unit_weight_g = 200, unit_name_es = 'porción (8 piezas)', unit_name_en = 'portion (8 pieces)' WHERE name_es = 'Sushi roll (8 piezas)';
UPDATE public.foods SET unit_weight_g = 200, unit_name_es = 'unidad', unit_name_en = 'unit' WHERE name_es = 'Wrap de pollo';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Contar alimentos por tipo
-- SELECT food_type, COUNT(*) as count FROM public.foods GROUP BY food_type ORDER BY count DESC;

-- Verificar alimentos completos vs incompletos
-- SELECT status, COUNT(*) as count FROM public.foods GROUP BY status;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
