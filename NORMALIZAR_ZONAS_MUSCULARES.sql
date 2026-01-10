-- Script para normalizar zonas musculares a inglés y asignar UNA zona por ejercicio
-- Ejecutar en Supabase SQL Editor DESPUÉS de CLASIFICAR_EJERCICIOS.sql

-- =====================================================
-- PASO 1: FUNCIÓN PARA NORMALIZAR ZONAS A INGLÉS
-- =====================================================

CREATE OR REPLACE FUNCTION normalize_muscle_zone(zone_array text[])
RETURNS text[] AS $$
DECLARE
  result text[] := '{}';
  zone text;
  mapped_zone text;
BEGIN
  IF zone_array IS NULL THEN
    RETURN NULL;
  END IF;
  
  FOREACH zone IN ARRAY zone_array
  LOOP
    mapped_zone := CASE lower(zone)
      -- Español a Inglés
      WHEN 'pecho_superior' THEN 'upper_chest'
      WHEN 'pecho_medio' THEN 'mid_chest'
      WHEN 'pecho_inferior' THEN 'lower_chest'
      WHEN 'espalda_superior' THEN 'upper_back'
      WHEN 'espalda_media' THEN 'mid_back'
      WHEN 'espalda_inferior' THEN 'lower_back'
      WHEN 'espalda_baja' THEN 'lower_back'
      WHEN 'hombros_frontales' THEN 'front_delts'
      WHEN 'hombros_medios' THEN 'side_delts'
      WHEN 'hombros_posteriores' THEN 'rear_delts'
      WHEN 'biceps_cabeza_larga' THEN 'biceps_long_head'
      WHEN 'biceps_cabeza_corta' THEN 'biceps_short_head'
      WHEN 'braquial' THEN 'brachialis'
      WHEN 'triceps_cabeza_lateral' THEN 'triceps_lateral'
      WHEN 'triceps_cabeza_medial' THEN 'triceps_medial'
      WHEN 'triceps_cabeza_larga' THEN 'triceps_long'
      WHEN 'cuadriceps_frontal' THEN 'quad_front'
      WHEN 'cuadriceps_lateral' THEN 'quad_lateral'
      WHEN 'cuadriceps_medial' THEN 'quad_medial'
      WHEN 'cuadriceps_intermedio' THEN 'quad_front'
      WHEN 'isquiotibiales_superior' THEN 'hamstrings_upper'
      WHEN 'isquiotibiales_medio' THEN 'hamstrings_mid'
      WHEN 'isquiotibiales_inferior' THEN 'hamstrings_lower'
      WHEN 'gluteos_superior' THEN 'glutes_upper'
      WHEN 'gluteos_medio' THEN 'glutes_mid'
      WHEN 'gluteos_inferior' THEN 'glutes_lower'
      WHEN 'gemelos' THEN 'gastrocnemius'
      WHEN 'soleo' THEN 'soleus'
      WHEN 'abdominales_superiores' THEN 'upper_abs'
      WHEN 'abdominales_inferiores' THEN 'lower_abs'
      WHEN 'transverso' THEN 'transverse'
      WHEN 'oblicuos_externos' THEN 'external_obliques'
      WHEN 'oblicuos_internos' THEN 'internal_obliques'
      WHEN 'romboides' THEN 'rhomboids'
      WHEN 'trapecio_superior' THEN 'upper_back'
      WHEN 'trapecio_medio' THEN 'mid_back'
      -- Mantener si ya está en inglés
      ELSE zone
    END;
    
    IF NOT mapped_zone = ANY(result) THEN
      result := array_append(result, mapped_zone);
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASO 2: NORMALIZAR ZONAS EXISTENTES A INGLÉS
-- =====================================================

UPDATE exercise_videos
SET muscle_zones = normalize_muscle_zone(muscle_zones)
WHERE muscle_zones IS NOT NULL;

-- =====================================================
-- PASO 3: FUNCIÓN PARA ASIGNAR ZONA SEGÚN MÚSCULO Y NOMBRE
-- =====================================================

CREATE OR REPLACE FUNCTION assign_muscle_zone(exercise_name text, main_muscle text)
RETURNS text AS $$
DECLARE
  name_lower text := lower(exercise_name);
BEGIN
  -- Si no hay músculo principal, no asignar zona
  IF main_muscle IS NULL THEN
    RETURN NULL;
  END IF;

  -- =====================================================
  -- PECHO (chest)
  -- =====================================================
  IF main_muscle = 'chest' THEN
    IF name_lower LIKE '%inclinad%' OR name_lower LIKE '%incline%' OR name_lower LIKE '%superior%' THEN
      RETURN 'upper_chest';
    ELSIF name_lower LIKE '%declinad%' OR name_lower LIKE '%decline%' OR name_lower LIKE '%inferior%' THEN
      RETURN 'lower_chest';
    ELSE
      RETURN 'mid_chest';
    END IF;

  -- =====================================================
  -- ESPALDA (back)
  -- =====================================================
  ELSIF main_muscle = 'back' THEN
    IF name_lower LIKE '%dominad%' OR name_lower LIKE '%pull%up%' OR name_lower LIKE '%jalon%' OR name_lower LIKE '%pulldown%' THEN
      RETURN 'lats';
    ELSIF name_lower LIKE '%remo%' OR name_lower LIKE '%row%' THEN
      RETURN 'mid_back';
    ELSIF name_lower LIKE '%hiperext%' OR name_lower LIKE '%hyperext%' OR name_lower LIKE '%buenos dias%' OR name_lower LIKE '%good morning%' OR name_lower LIKE '%lumbar%' THEN
      RETURN 'lower_back';
    ELSIF name_lower LIKE '%face pull%' OR name_lower LIKE '%trapecio%' OR name_lower LIKE '%encogimiento%' OR name_lower LIKE '%shrug%' THEN
      RETURN 'upper_back';
    ELSE
      RETURN 'lats';
    END IF;

  -- =====================================================
  -- HOMBROS (shoulders)
  -- =====================================================
  ELSIF main_muscle = 'shoulders' THEN
    IF name_lower LIKE '%lateral%' OR name_lower LIKE '%side%' THEN
      RETURN 'side_delts';
    ELSIF name_lower LIKE '%posterior%' OR name_lower LIKE '%rear%' OR name_lower LIKE '%pajaro%' OR name_lower LIKE '%reverse%' THEN
      RETURN 'rear_delts';
    ELSE
      RETURN 'front_delts';
    END IF;

  -- =====================================================
  -- BÍCEPS (biceps)
  -- =====================================================
  ELSIF main_muscle = 'biceps' THEN
    IF name_lower LIKE '%martillo%' OR name_lower LIKE '%hammer%' THEN
      RETURN 'brachialis';
    ELSIF name_lower LIKE '%concentrad%' OR name_lower LIKE '%predicador%' OR name_lower LIKE '%preacher%' OR name_lower LIKE '%scott%' THEN
      RETURN 'biceps_short_head';
    ELSE
      RETURN 'biceps_long_head';
    END IF;

  -- =====================================================
  -- TRÍCEPS (triceps)
  -- =====================================================
  ELSIF main_muscle = 'triceps' THEN
    IF name_lower LIKE '%pushdown%' OR name_lower LIKE '%jalon%' OR name_lower LIKE '%fondos%' OR name_lower LIKE '%dips%' THEN
      RETURN 'triceps_lateral';
    ELSIF name_lower LIKE '%cerrado%' OR name_lower LIKE '%close%' THEN
      RETURN 'triceps_medial';
    ELSE
      RETURN 'triceps_long';
    END IF;

  -- =====================================================
  -- CUÁDRICEPS (quadriceps)
  -- =====================================================
  ELSIF main_muscle = 'quadriceps' THEN
    IF name_lower LIKE '%sumo%' OR name_lower LIKE '%aductor%' OR name_lower LIKE '%abierta%' THEN
      RETURN 'quad_medial';
    ELSIF name_lower LIKE '%hack%' OR name_lower LIKE '%lateral%' THEN
      RETURN 'quad_lateral';
    ELSE
      RETURN 'quad_front';
    END IF;

  -- =====================================================
  -- ISQUIOTIBIALES (hamstrings)
  -- =====================================================
  ELSIF main_muscle = 'hamstrings' THEN
    IF name_lower LIKE '%nordic%' OR name_lower LIKE '%nordico%' THEN
      RETURN 'hamstrings_lower';
    ELSE
      RETURN 'hamstrings_mid';
    END IF;

  -- =====================================================
  -- GLÚTEOS (glutes)
  -- =====================================================
  ELSIF main_muscle = 'glutes' THEN
    IF name_lower LIKE '%abduccion%' OR name_lower LIKE '%abduction%' OR name_lower LIKE '%lateral%' THEN
      RETURN 'glutes_upper';
    ELSE
      RETURN 'glutes_mid';
    END IF;

  -- =====================================================
  -- PANTORRILLAS (calves)
  -- =====================================================
  ELSIF main_muscle = 'calves' THEN
    IF name_lower LIKE '%sentado%' OR name_lower LIKE '%seated%' THEN
      RETURN 'soleus';
    ELSE
      RETURN 'gastrocnemius';
    END IF;

  -- =====================================================
  -- ABDOMINALES (abs)
  -- =====================================================
  ELSIF main_muscle = 'abs' THEN
    IF name_lower LIKE '%inferior%' OR name_lower LIKE '%lower%' OR name_lower LIKE '%inverso%' OR name_lower LIKE '%reverse%' OR name_lower LIKE '%pierna%' OR name_lower LIKE '%leg raise%' THEN
      RETURN 'lower_abs';
    ELSIF name_lower LIKE '%plancha%' OR name_lower LIKE '%plank%' THEN
      RETURN 'transverse';
    ELSE
      RETURN 'upper_abs';
    END IF;

  -- =====================================================
  -- OBLICUOS (obliques)
  -- =====================================================
  ELSIF main_muscle = 'obliques' THEN
    RETURN 'external_obliques';

  -- =====================================================
  -- TRAPECIO (trapezius)
  -- =====================================================
  ELSIF main_muscle = 'trapezius' THEN
    RETURN NULL; -- No tiene zonas específicas

  -- =====================================================
  -- ANTEBRAZOS (forearms)
  -- =====================================================
  ELSIF main_muscle = 'forearms' THEN
    RETURN NULL; -- No tiene zonas específicas

  -- =====================================================
  -- CUERPO COMPLETO (fullBody)
  -- =====================================================
  ELSIF main_muscle = 'fullBody' THEN
    RETURN NULL; -- No tiene zonas específicas

  -- =====================================================
  -- LUMBARES (lowerBack)
  -- =====================================================
  ELSIF main_muscle = 'lowerBack' THEN
    RETURN NULL; -- Es la zona en sí misma

  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASO 4: ASIGNAR ZONA MUSCULAR CORRECTA A CADA EJERCICIO
-- =====================================================

UPDATE exercise_videos
SET muscle_zones = CASE 
  WHEN assign_muscle_zone(canonical_name, muscles[1]) IS NOT NULL 
  THEN ARRAY[assign_muscle_zone(canonical_name, muscles[1])]
  ELSE NULL
END
WHERE muscles IS NOT NULL AND array_length(muscles, 1) > 0;

-- =====================================================
-- PASO 5: VERIFICAR RESULTADOS
-- =====================================================

SELECT 
  canonical_name, 
  muscles[1] as muscle, 
  muscle_zones[1] as zone
FROM exercise_videos 
WHERE muscles IS NOT NULL
ORDER BY muscles[1], canonical_name
LIMIT 50;

-- Ver ejercicios sin zona asignada (normal para algunos músculos)
SELECT canonical_name, muscles[1] as muscle
FROM exercise_videos 
WHERE muscles IS NOT NULL 
  AND (muscle_zones IS NULL OR array_length(muscle_zones, 1) = 0)
ORDER BY muscles[1], canonical_name;

-- =====================================================
-- LIMPIAR FUNCIONES
-- =====================================================
-- DROP FUNCTION IF EXISTS normalize_muscle_zone(text[]);
-- DROP FUNCTION IF EXISTS assign_muscle_zone(text, text);
