-- Agregar columnas de nivel de actividad y peso a nutrition_profiles
-- Esto permite sobrescribir los valores del onboarding para cálculos de nutrición

ALTER TABLE nutrition_profiles
ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'moderate',
ADD COLUMN IF NOT EXISTS current_weight_kg NUMERIC;

COMMENT ON COLUMN nutrition_profiles.activity_level IS 'Nivel de actividad: sedentary, light, moderate, high';
COMMENT ON COLUMN nutrition_profiles.current_weight_kg IS 'Peso actual en kg (sobrescribe el del perfil general si se establece)';

