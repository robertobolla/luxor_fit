-- ============================================================================
-- AGREGAR COLUMNAS PARA RENOVACIÓN SEMANAL DE PLANES IA
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- Columna para guardar cuándo se activó el plan
ALTER TABLE nutrition_plans 
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- Columna para saber qué semana está activa actualmente (1, 2, 3...)
ALTER TABLE nutrition_plans 
ADD COLUMN IF NOT EXISTS current_week_number INTEGER DEFAULT 1;

-- Columna para guardar el peso inicial cuando se activó el plan
ALTER TABLE nutrition_plans 
ADD COLUMN IF NOT EXISTS initial_weight_kg DECIMAL(5,2);

-- Columna para guardar la grasa corporal inicial (opcional)
ALTER TABLE nutrition_plans 
ADD COLUMN IF NOT EXISTS initial_body_fat DECIMAL(4,1);

-- Columna para guardar la masa muscular inicial (opcional)
ALTER TABLE nutrition_plans 
ADD COLUMN IF NOT EXISTS initial_muscle_mass DECIMAL(4,1);

-- Columna para saber si el modal de renovación fue completado esta semana
-- Se resetea a false cuando empieza una nueva semana
ALTER TABLE nutrition_plans 
ADD COLUMN IF NOT EXISTS renewal_completed BOOLEAN DEFAULT FALSE;

-- Columna para guardar la fecha del último chequeo de renovación
ALTER TABLE nutrition_plans 
ADD COLUMN IF NOT EXISTS last_renewal_date DATE;

-- Columna para guardar el objetivo nutricional del plan
ALTER TABLE nutrition_plans 
ADD COLUMN IF NOT EXISTS nutrition_goal TEXT CHECK (nutrition_goal IN ('lose_fat', 'maintain', 'gain_muscle'));

-- Verificar las columnas agregadas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'nutrition_plans'
ORDER BY ordinal_position;
