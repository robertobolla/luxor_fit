-- Script para clasificar ejercicios correctamente
-- Asigna UN solo músculo principal y UNA zona muscular por ejercicio
-- Ejecutar en Supabase SQL Editor

-- =====================================================
-- FUNCIÓN PARA CLASIFICAR EJERCICIOS
-- =====================================================

CREATE OR REPLACE FUNCTION classify_exercise(exercise_name text)
RETURNS TABLE(main_muscle text, muscle_zone text) AS $$
DECLARE
  name_lower text := lower(exercise_name);
BEGIN
  -- =====================================================
  -- PECHO (chest)
  -- =====================================================
  IF name_lower LIKE '%press banca%' OR name_lower LIKE '%bench press%' OR name_lower LIKE '%press plano%' THEN
    RETURN QUERY SELECT 'chest'::text, 'mid_chest'::text;
  ELSIF name_lower LIKE '%press inclinado%' OR name_lower LIKE '%incline press%' OR name_lower LIKE '%pecho inclinado%' THEN
    RETURN QUERY SELECT 'chest'::text, 'upper_chest'::text;
  ELSIF name_lower LIKE '%press declinado%' OR name_lower LIKE '%decline%' THEN
    RETURN QUERY SELECT 'chest'::text, 'lower_chest'::text;
  ELSIF name_lower LIKE '%aperturas%' OR name_lower LIKE '%fly%' OR name_lower LIKE '%flye%' OR name_lower LIKE '%pec deck%' THEN
    RETURN QUERY SELECT 'chest'::text, 'mid_chest'::text;
  ELSIF name_lower LIKE '%flexiones%' OR name_lower LIKE '%push up%' OR name_lower LIKE '%pushup%' OR name_lower LIKE '%lagartijas%' THEN
    RETURN QUERY SELECT 'chest'::text, 'mid_chest'::text;
  ELSIF name_lower LIKE '%fondos%' AND (name_lower LIKE '%pecho%' OR name_lower NOT LIKE '%triceps%') THEN
    RETURN QUERY SELECT 'chest'::text, 'lower_chest'::text;
  ELSIF name_lower LIKE '%crossover%' OR name_lower LIKE '%cable cruce%' OR name_lower LIKE '%cruce de poleas%' THEN
    RETURN QUERY SELECT 'chest'::text, 'mid_chest'::text;
  ELSIF name_lower LIKE '%pullover%' AND name_lower LIKE '%pecho%' THEN
    RETURN QUERY SELECT 'chest'::text, 'lower_chest'::text;
    
  -- =====================================================
  -- ESPALDA (back)
  -- =====================================================
  ELSIF name_lower LIKE '%dominadas%' OR name_lower LIKE '%pull up%' OR name_lower LIKE '%pullup%' OR name_lower LIKE '%chin up%' THEN
    RETURN QUERY SELECT 'back'::text, 'lats'::text;
  ELSIF name_lower LIKE '%jalon%' OR name_lower LIKE '%lat pulldown%' OR name_lower LIKE '%pulldown%' THEN
    RETURN QUERY SELECT 'back'::text, 'lats'::text;
  ELSIF name_lower LIKE '%remo%' OR name_lower LIKE '%row%' THEN
    IF name_lower LIKE '%alto%' OR name_lower LIKE '%upper%' OR name_lower LIKE '%face pull%' THEN
      RETURN QUERY SELECT 'back'::text, 'upper_back'::text;
    ELSIF name_lower LIKE '%bajo%' OR name_lower LIKE '%lower%' THEN
      RETURN QUERY SELECT 'back'::text, 'lower_back'::text;
    ELSE
      RETURN QUERY SELECT 'back'::text, 'mid_back'::text;
    END IF;
  ELSIF name_lower LIKE '%peso muerto%' OR name_lower LIKE '%deadlift%' THEN
    IF name_lower LIKE '%rumano%' OR name_lower LIKE '%romanian%' OR name_lower LIKE '%piernas rígidas%' OR name_lower LIKE '%stiff%' THEN
      RETURN QUERY SELECT 'hamstrings'::text, 'hamstrings_mid'::text;
    ELSE
      RETURN QUERY SELECT 'back'::text, 'lower_back'::text;
    END IF;
  ELSIF name_lower LIKE '%pullover%' AND name_lower NOT LIKE '%pecho%' THEN
    RETURN QUERY SELECT 'back'::text, 'lats'::text;
  ELSIF name_lower LIKE '%hiperextension%' OR name_lower LIKE '%hyperextension%' OR name_lower LIKE '%buenos dias%' OR name_lower LIKE '%good morning%' THEN
    RETURN QUERY SELECT 'back'::text, 'lower_back'::text;
  ELSIF name_lower LIKE '%face pull%' THEN
    RETURN QUERY SELECT 'back'::text, 'upper_back'::text;
    
  -- =====================================================
  -- HOMBROS (shoulders)
  -- =====================================================
  ELSIF name_lower LIKE '%press militar%' OR name_lower LIKE '%overhead press%' OR name_lower LIKE '%press hombro%' OR name_lower LIKE '%shoulder press%' THEN
    RETURN QUERY SELECT 'shoulders'::text, 'front_delts'::text;
  ELSIF name_lower LIKE '%elevacion%lateral%' OR name_lower LIKE '%lateral raise%' OR name_lower LIKE '%vuelos laterales%' THEN
    RETURN QUERY SELECT 'shoulders'::text, 'side_delts'::text;
  ELSIF name_lower LIKE '%elevacion%frontal%' OR name_lower LIKE '%front raise%' OR name_lower LIKE '%vuelos frontales%' THEN
    RETURN QUERY SELECT 'shoulders'::text, 'front_delts'::text;
  ELSIF name_lower LIKE '%pajaro%' OR name_lower LIKE '%reverse fly%' OR name_lower LIKE '%rear delt%' OR name_lower LIKE '%posterior%' THEN
    RETURN QUERY SELECT 'shoulders'::text, 'rear_delts'::text;
  ELSIF name_lower LIKE '%arnold%' THEN
    RETURN QUERY SELECT 'shoulders'::text, 'front_delts'::text;
  ELSIF name_lower LIKE '%encogimiento%' OR name_lower LIKE '%shrug%' THEN
    RETURN QUERY SELECT 'trapezius'::text, NULL::text;
    
  -- =====================================================
  -- BÍCEPS (biceps)
  -- =====================================================
  ELSIF name_lower LIKE '%curl%bicep%' OR name_lower LIKE '%curl de bicep%' OR name_lower LIKE '%bicep curl%' THEN
    RETURN QUERY SELECT 'biceps'::text, 'biceps_long_head'::text;
  ELSIF name_lower LIKE '%curl martillo%' OR name_lower LIKE '%hammer curl%' THEN
    RETURN QUERY SELECT 'biceps'::text, 'brachialis'::text;
  ELSIF name_lower LIKE '%curl concentrado%' OR name_lower LIKE '%concentration curl%' THEN
    RETURN QUERY SELECT 'biceps'::text, 'biceps_short_head'::text;
  ELSIF name_lower LIKE '%curl predicador%' OR name_lower LIKE '%preacher curl%' OR name_lower LIKE '%curl scott%' THEN
    RETURN QUERY SELECT 'biceps'::text, 'biceps_short_head'::text;
  ELSIF name_lower LIKE '%curl inclinado%' OR name_lower LIKE '%incline curl%' THEN
    RETURN QUERY SELECT 'biceps'::text, 'biceps_long_head'::text;
  ELSIF name_lower LIKE '%curl%' AND name_lower NOT LIKE '%leg%' AND name_lower NOT LIKE '%pierna%' AND name_lower NOT LIKE '%femoral%' THEN
    RETURN QUERY SELECT 'biceps'::text, 'biceps_long_head'::text;
    
  -- =====================================================
  -- TRÍCEPS (triceps)
  -- =====================================================
  ELSIF name_lower LIKE '%extension%tricep%' OR name_lower LIKE '%tricep extension%' OR name_lower LIKE '%extension de tricep%' THEN
    RETURN QUERY SELECT 'triceps'::text, 'triceps_long'::text;
  ELSIF name_lower LIKE '%press frances%' OR name_lower LIKE '%skull crusher%' OR name_lower LIKE '%french press%' THEN
    RETURN QUERY SELECT 'triceps'::text, 'triceps_long'::text;
  ELSIF name_lower LIKE '%pushdown%' OR name_lower LIKE '%push down%' OR name_lower LIKE '%jalon tricep%' THEN
    RETURN QUERY SELECT 'triceps'::text, 'triceps_lateral'::text;
  ELSIF name_lower LIKE '%patada%tricep%' OR name_lower LIKE '%kickback%' THEN
    RETURN QUERY SELECT 'triceps'::text, 'triceps_long'::text;
  ELSIF name_lower LIKE '%fondos%tricep%' OR name_lower LIKE '%tricep dip%' OR name_lower LIKE '%dips%' THEN
    RETURN QUERY SELECT 'triceps'::text, 'triceps_lateral'::text;
  ELSIF name_lower LIKE '%press cerrado%' OR name_lower LIKE '%close grip%' THEN
    RETURN QUERY SELECT 'triceps'::text, 'triceps_medial'::text;
    
  -- =====================================================
  -- CUÁDRICEPS (quadriceps)
  -- =====================================================
  ELSIF name_lower LIKE '%sentadilla%' OR name_lower LIKE '%squat%' THEN
    IF name_lower LIKE '%frontal%' OR name_lower LIKE '%front%' THEN
      RETURN QUERY SELECT 'quadriceps'::text, 'quad_front'::text;
    ELSIF name_lower LIKE '%sumo%' OR name_lower LIKE '%abierta%' THEN
      RETURN QUERY SELECT 'quadriceps'::text, 'quad_medial'::text;
    ELSE
      RETURN QUERY SELECT 'quadriceps'::text, 'quad_front'::text;
    END IF;
  ELSIF name_lower LIKE '%prensa%' OR name_lower LIKE '%leg press%' THEN
    RETURN QUERY SELECT 'quadriceps'::text, 'quad_front'::text;
  ELSIF name_lower LIKE '%extension%pierna%' OR name_lower LIKE '%leg extension%' OR name_lower LIKE '%extension de pierna%' THEN
    RETURN QUERY SELECT 'quadriceps'::text, 'quad_front'::text;
  ELSIF name_lower LIKE '%zancada%' OR name_lower LIKE '%lunge%' OR name_lower LIKE '%estocada%' THEN
    RETURN QUERY SELECT 'quadriceps'::text, 'quad_front'::text;
  ELSIF name_lower LIKE '%step up%' OR name_lower LIKE '%subida a banco%' THEN
    RETURN QUERY SELECT 'quadriceps'::text, 'quad_front'::text;
  ELSIF name_lower LIKE '%hack%' THEN
    RETURN QUERY SELECT 'quadriceps'::text, 'quad_lateral'::text;
  ELSIF name_lower LIKE '%sissy%' THEN
    RETURN QUERY SELECT 'quadriceps'::text, 'quad_front'::text;
    
  -- =====================================================
  -- ISQUIOTIBIALES (hamstrings)
  -- =====================================================
  ELSIF name_lower LIKE '%curl%pierna%' OR name_lower LIKE '%leg curl%' OR name_lower LIKE '%curl femoral%' OR name_lower LIKE '%curl de pierna%' THEN
    RETURN QUERY SELECT 'hamstrings'::text, 'hamstrings_mid'::text;
  ELSIF name_lower LIKE '%femoral%' THEN
    RETURN QUERY SELECT 'hamstrings'::text, 'hamstrings_mid'::text;
  ELSIF name_lower LIKE '%nordic%' OR name_lower LIKE '%nordico%' THEN
    RETURN QUERY SELECT 'hamstrings'::text, 'hamstrings_lower'::text;
    
  -- =====================================================
  -- GLÚTEOS (glutes)
  -- =====================================================
  ELSIF name_lower LIKE '%hip thrust%' OR name_lower LIKE '%puente%' OR name_lower LIKE '%bridge%' THEN
    RETURN QUERY SELECT 'glutes'::text, 'glutes_mid'::text;
  ELSIF name_lower LIKE '%patada%gluteo%' OR name_lower LIKE '%kickback%gluteo%' OR name_lower LIKE '%gluteo%patada%' THEN
    RETURN QUERY SELECT 'glutes'::text, 'glutes_upper'::text;
  ELSIF name_lower LIKE '%abduccion%' OR name_lower LIKE '%abduction%' OR name_lower LIKE '%clamshell%' THEN
    RETURN QUERY SELECT 'glutes'::text, 'glutes_mid'::text;
  ELSIF name_lower LIKE '%gluteo%' OR name_lower LIKE '%glute%' THEN
    RETURN QUERY SELECT 'glutes'::text, 'glutes_mid'::text;
    
  -- =====================================================
  -- PANTORRILLAS (calves)
  -- =====================================================
  ELSIF name_lower LIKE '%pantorrilla%' OR name_lower LIKE '%calf%' OR name_lower LIKE '%gemelo%' THEN
    IF name_lower LIKE '%sentado%' OR name_lower LIKE '%seated%' THEN
      RETURN QUERY SELECT 'calves'::text, 'soleus'::text;
    ELSE
      RETURN QUERY SELECT 'calves'::text, 'gastrocnemius'::text;
    END IF;
    
  -- =====================================================
  -- ABDOMINALES (abs)
  -- =====================================================
  ELSIF name_lower LIKE '%crunch%' OR name_lower LIKE '%abdominal%' OR name_lower LIKE '%sit up%' OR name_lower LIKE '%situp%' THEN
    IF name_lower LIKE '%inferior%' OR name_lower LIKE '%lower%' OR name_lower LIKE '%inverso%' OR name_lower LIKE '%reverse%' THEN
      RETURN QUERY SELECT 'abs'::text, 'lower_abs'::text;
    ELSE
      RETURN QUERY SELECT 'abs'::text, 'upper_abs'::text;
    END IF;
  ELSIF name_lower LIKE '%plancha%' OR name_lower LIKE '%plank%' THEN
    RETURN QUERY SELECT 'abs'::text, 'transverse'::text;
  ELSIF name_lower LIKE '%rueda%ab%' OR name_lower LIKE '%ab wheel%' OR name_lower LIKE '%rollout%' THEN
    RETURN QUERY SELECT 'abs'::text, 'upper_abs'::text;
  ELSIF name_lower LIKE '%elevacion%pierna%' OR name_lower LIKE '%leg raise%' OR name_lower LIKE '%hanging%' THEN
    RETURN QUERY SELECT 'abs'::text, 'lower_abs'::text;
  ELSIF name_lower LIKE '%v-up%' OR name_lower LIKE '%v up%' THEN
    RETURN QUERY SELECT 'abs'::text, 'upper_abs'::text;
    
  -- =====================================================
  -- OBLICUOS (obliques)
  -- =====================================================
  ELSIF name_lower LIKE '%oblicuo%' OR name_lower LIKE '%oblique%' OR name_lower LIKE '%russian twist%' OR name_lower LIKE '%giro ruso%' THEN
    RETURN QUERY SELECT 'obliques'::text, 'external_obliques'::text;
  ELSIF name_lower LIKE '%lado%' OR name_lower LIKE '%side%' OR name_lower LIKE '%lateral%' AND name_lower LIKE '%abdominal%' THEN
    RETURN QUERY SELECT 'obliques'::text, 'external_obliques'::text;
  ELSIF name_lower LIKE '%woodchop%' OR name_lower LIKE '%leñador%' THEN
    RETURN QUERY SELECT 'obliques'::text, 'external_obliques'::text;
    
  -- =====================================================
  -- ANTEBRAZOS (forearms)
  -- =====================================================
  ELSIF name_lower LIKE '%antebrazo%' OR name_lower LIKE '%forearm%' OR name_lower LIKE '%wrist curl%' OR name_lower LIKE '%muñeca%' THEN
    RETURN QUERY SELECT 'forearms'::text, NULL::text;
  ELSIF name_lower LIKE '%agarre%' OR name_lower LIKE '%grip%' THEN
    RETURN QUERY SELECT 'forearms'::text, NULL::text;
    
  -- =====================================================
  -- TRAPECIO (trapezius)
  -- =====================================================
  ELSIF name_lower LIKE '%trapecio%' OR name_lower LIKE '%trap%' THEN
    RETURN QUERY SELECT 'trapezius'::text, NULL::text;
    
  -- =====================================================
  -- CUERPO COMPLETO (fullBody) - ejercicios compuestos
  -- =====================================================
  ELSIF name_lower LIKE '%burpee%' OR name_lower LIKE '%clean%' OR name_lower LIKE '%snatch%' OR name_lower LIKE '%thruster%' THEN
    RETURN QUERY SELECT 'fullBody'::text, NULL::text;
  ELSIF name_lower LIKE '%turkish%' OR name_lower LIKE '%turco%' THEN
    RETURN QUERY SELECT 'fullBody'::text, NULL::text;
    
  -- =====================================================
  -- LUMBARES (lowerBack)
  -- =====================================================
  ELSIF name_lower LIKE '%lumbar%' OR name_lower LIKE '%lower back%' OR name_lower LIKE '%espalda baja%' THEN
    RETURN QUERY SELECT 'lowerBack'::text, NULL::text;
    
  -- =====================================================
  -- DEFAULT: Si no se encuentra, devolver NULL
  -- =====================================================
  ELSE
    RETURN QUERY SELECT NULL::text, NULL::text;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- APLICAR CLASIFICACIÓN A TODOS LOS EJERCICIOS
-- =====================================================

-- Actualizar ejercicios con la clasificación correcta
UPDATE exercise_videos
SET 
  muscles = ARRAY[(SELECT main_muscle FROM classify_exercise(canonical_name))],
  muscle_zones = CASE 
    WHEN (SELECT muscle_zone FROM classify_exercise(canonical_name)) IS NOT NULL 
    THEN ARRAY[(SELECT muscle_zone FROM classify_exercise(canonical_name))]
    ELSE NULL
  END
WHERE (SELECT main_muscle FROM classify_exercise(canonical_name)) IS NOT NULL;

-- =====================================================
-- VERIFICAR RESULTADOS
-- =====================================================

-- Ver ejercicios clasificados
SELECT 
  canonical_name, 
  muscles, 
  muscle_zones
FROM exercise_videos 
WHERE muscles IS NOT NULL 
ORDER BY muscles[1], canonical_name
LIMIT 50;

-- Ver ejercicios NO clasificados (para revisar manualmente)
SELECT 
  canonical_name
FROM exercise_videos 
WHERE muscles IS NULL OR muscles = '{}'
ORDER BY canonical_name;

-- =====================================================
-- LIMPIAR
-- =====================================================
-- DROP FUNCTION IF EXISTS classify_exercise(text);
