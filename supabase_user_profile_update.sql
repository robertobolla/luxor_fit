-- Script para actualizar la tabla user_profiles con nuevos campos para el onboarding mejorado
-- Ejecutar este script en el SQL Editor de Supabase

-- Agregar nuevos campos a la tabla user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS session_duration INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS activity_types TEXT[] DEFAULT '{}';

-- Actualizar el comentario de la tabla
COMMENT ON COLUMN user_profiles.session_duration IS 'Duración preferida de sesión de entrenamiento en minutos';
COMMENT ON COLUMN user_profiles.activity_types IS 'Tipos de actividad preferida del usuario (cardio, strength, sports, yoga, hiit, mixed)';

-- Actualizar registros existentes con valores por defecto si es necesario
UPDATE user_profiles 
SET session_duration = 30 
WHERE session_duration IS NULL;

UPDATE user_profiles 
SET activity_types = ARRAY['mixed']::TEXT[]
WHERE activity_types IS NULL OR activity_types = '{}';

