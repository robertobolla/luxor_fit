-- Script para eliminar columnas obsoletas y migrar datos
-- Ejecutar en Supabase SQL Editor

-- =====================================================
-- ELIMINAR ACTIVITY_TYPES
-- =====================================================

-- 1. Eliminar columna activity_types de user_profiles
ALTER TABLE user_profiles DROP COLUMN IF EXISTS activity_types;

-- 2. Eliminar columna activity_types de exercise_videos
ALTER TABLE exercise_videos DROP COLUMN IF EXISTS activity_types;

-- =====================================================
-- ELIMINAR KEY_POINTS
-- =====================================================

-- 3. Eliminar columna key_points de exercise_videos
ALTER TABLE exercise_videos DROP COLUMN IF EXISTS key_points;

-- =====================================================
-- MIGRAR MÚSCULOS DE INGLÉS A ESPAÑOL
-- =====================================================

-- 4. Función para NORMALIZAR nombres de músculos a INGLÉS (para compatibilidad con la app)
CREATE OR REPLACE FUNCTION normalize_muscle_names(muscle_array text[])
RETURNS text[] AS $$
DECLARE
  result text[] := '{}';
  muscle text;
  mapped_muscle text;
BEGIN
  IF muscle_array IS NULL THEN
    RETURN NULL;
  END IF;
  
  FOREACH muscle IN ARRAY muscle_array
  LOOP
    -- Mapear español a inglés (normalizado)
    mapped_muscle := CASE lower(muscle)
      -- Español a Inglés
      WHEN 'espalda' THEN 'back'
      WHEN 'pecho' THEN 'chest'
      WHEN 'hombros' THEN 'shoulders'
      WHEN 'bíceps' THEN 'biceps'
      WHEN 'biceps' THEN 'biceps'
      WHEN 'tríceps' THEN 'triceps'
      WHEN 'triceps' THEN 'triceps'
      WHEN 'antebrazos' THEN 'forearms'
      WHEN 'trapecio' THEN 'trapezius'
      WHEN 'cuádriceps' THEN 'quadriceps'
      WHEN 'cuadriceps' THEN 'quadriceps'
      WHEN 'isquiotibiales' THEN 'hamstrings'
      WHEN 'glúteos' THEN 'glutes'
      WHEN 'gluteos' THEN 'glutes'
      WHEN 'pantorrillas' THEN 'calves'
      WHEN 'gemelos' THEN 'calves'
      WHEN 'abdominales' THEN 'abs'
      WHEN 'oblicuos' THEN 'obliques'
      WHEN 'lumbares' THEN 'lowerBack'
      WHEN 'cuerpo_completo' THEN 'fullBody'
      -- Mantener inglés normalizado
      WHEN 'back' THEN 'back'
      WHEN 'chest' THEN 'chest'
      WHEN 'shoulders' THEN 'shoulders'
      WHEN 'biceps' THEN 'biceps'
      WHEN 'triceps' THEN 'triceps'
      WHEN 'forearms' THEN 'forearms'
      WHEN 'trapezius' THEN 'trapezius'
      WHEN 'traps' THEN 'trapezius'
      WHEN 'quadriceps' THEN 'quadriceps'
      WHEN 'quads' THEN 'quadriceps'
      WHEN 'hamstrings' THEN 'hamstrings'
      WHEN 'glutes' THEN 'glutes'
      WHEN 'calves' THEN 'calves'
      WHEN 'abs' THEN 'abs'
      WHEN 'core' THEN 'abs'
      WHEN 'obliques' THEN 'obliques'
      WHEN 'lowerback' THEN 'lowerBack'
      WHEN 'lower_back' THEN 'lowerBack'
      WHEN 'fullbody' THEN 'fullBody'
      WHEN 'full_body' THEN 'fullBody'
      WHEN 'lats' THEN 'back'
      ELSE muscle -- Mantener si no hay mapeo
    END;
    
    -- Solo agregar si no está duplicado
    IF NOT mapped_muscle = ANY(result) THEN
      result := array_append(result, mapped_muscle);
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Aplicar normalización a todos los ejercicios
UPDATE exercise_videos
SET muscles = normalize_muscle_names(muscles)
WHERE muscles IS NOT NULL;

-- 6. Verificar resultados
SELECT canonical_name, muscles 
FROM exercise_videos 
WHERE muscles IS NOT NULL 
LIMIT 20;

-- 7. Limpiar función temporal
DROP FUNCTION IF EXISTS normalize_muscle_names(text[]);

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- 8. Verificar que las columnas fueron eliminadas
SELECT 
  column_name,
  table_name 
FROM information_schema.columns 
WHERE column_name IN ('activity_types', 'key_points')
  AND table_schema = 'public';

-- Si el resultado está vacío, las columnas fueron eliminadas correctamente
