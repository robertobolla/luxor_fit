-- ============================================================================
-- AGREGAR COLUMNAS FALTANTES A NUTRITION_PLANS
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- Agregar columnas faltantes a nutrition_plans
ALTER TABLE nutrition_plans 
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;

ALTER TABLE nutrition_plans 
ADD COLUMN IF NOT EXISTS total_weeks INTEGER DEFAULT 1;

ALTER TABLE nutrition_plans 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE nutrition_plans 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

ALTER TABLE nutrition_plans 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Verificar la estructura de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'nutrition_plans'
ORDER BY ordinal_position;
