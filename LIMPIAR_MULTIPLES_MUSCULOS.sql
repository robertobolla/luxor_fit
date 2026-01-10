-- Script para asegurar que cada ejercicio tenga SOLO UN músculo
-- Ejecutar en Supabase SQL Editor

-- =====================================================
-- PASO 1: VER EJERCICIOS CON MÚLTIPLES MÚSCULOS
-- =====================================================

SELECT canonical_name, muscles, array_length(muscles, 1) as num_muscles
FROM exercise_videos 
WHERE muscles IS NOT NULL AND array_length(muscles, 1) > 1
ORDER BY canonical_name;

-- =====================================================
-- PASO 2: FUNCIÓN PARA DETERMINAR EL MÚSCULO PRINCIPAL
-- =====================================================

CREATE OR REPLACE FUNCTION get_primary_muscle(exercise_name text, current_muscles text[])
RETURNS text AS $$
DECLARE
  name_lower text := lower(exercise_name);
BEGIN
  -- Si solo tiene un músculo, devolverlo
  IF array_length(current_muscles, 1) = 1 THEN
    RETURN current_muscles[1];
  END IF;

  -- =====================================================
  -- REGLAS PARA DETERMINAR MÚSCULO PRINCIPAL
  -- =====================================================

  -- DOMINADAS y variantes → back
  IF name_lower LIKE '%dominad%' OR name_lower LIKE '%pull up%' OR name_lower LIKE '%pullup%' OR name_lower LIKE '%chin up%' THEN
    RETURN 'back';
  END IF;

  -- PRESS BANCA y variantes → chest
  IF name_lower LIKE '%press%banca%' OR name_lower LIKE '%bench press%' OR name_lower LIKE '%press%plano%' OR name_lower LIKE '%press%inclinad%' OR name_lower LIKE '%press%declinad%' THEN
    RETURN 'chest';
  END IF;

  -- APERTURAS → chest
  IF name_lower LIKE '%apertura%' OR name_lower LIKE '%fly%' OR name_lower LIKE '%flye%' OR name_lower LIKE '%cierre%pectoral%' OR name_lower LIKE '%cruce%polea%' OR name_lower LIKE '%crossover%' THEN
    RETURN 'chest';
  END IF;

  -- FLEXIONES → chest
  IF name_lower LIKE '%flexion%' OR name_lower LIKE '%push up%' OR name_lower LIKE '%pushup%' OR name_lower LIKE '%lagartija%' THEN
    RETURN 'chest';
  END IF;

  -- FONDOS → Si menciona tríceps, es tríceps; sino, pecho
  IF name_lower LIKE '%fondo%' OR name_lower LIKE '%dip%' THEN
    IF name_lower LIKE '%tricep%' THEN
      RETURN 'triceps';
    ELSE
      RETURN 'chest';
    END IF;
  END IF;

  -- REMOS → back
  IF name_lower LIKE '%remo%' OR name_lower LIKE '%row%' THEN
    RETURN 'back';
  END IF;

  -- JALONES → back
  IF name_lower LIKE '%jalon%' OR name_lower LIKE '%pulldown%' THEN
    RETURN 'back';
  END IF;

  -- PESO MUERTO RUMANO → hamstrings
  IF name_lower LIKE '%peso muerto%rumano%' OR name_lower LIKE '%rdl%' OR name_lower LIKE '%piernas rígidas%' THEN
    RETURN 'hamstrings';
  END IF;

  -- PESO MUERTO → back (lower back)
  IF name_lower LIKE '%peso muerto%' OR name_lower LIKE '%deadlift%' THEN
    RETURN 'back';
  END IF;

  -- PRESS MILITAR/HOMBRO → shoulders
  IF name_lower LIKE '%press militar%' OR name_lower LIKE '%press%hombro%' OR name_lower LIKE '%shoulder press%' OR name_lower LIKE '%overhead press%' OR name_lower LIKE '%arnold%' THEN
    RETURN 'shoulders';
  END IF;

  -- ELEVACIONES LATERALES/FRONTALES → shoulders
  IF name_lower LIKE '%elevacion%lateral%' OR name_lower LIKE '%elevacion%frontal%' OR name_lower LIKE '%lateral raise%' OR name_lower LIKE '%front raise%' THEN
    RETURN 'shoulders';
  END IF;

  -- CURLS (no femoral) → biceps
  IF (name_lower LIKE '%curl%' AND name_lower NOT LIKE '%femoral%' AND name_lower NOT LIKE '%pierna%' AND name_lower NOT LIKE '%leg curl%') THEN
    RETURN 'biceps';
  END IF;

  -- CURL FEMORAL → hamstrings
  IF name_lower LIKE '%curl%femoral%' OR name_lower LIKE '%leg curl%' THEN
    RETURN 'hamstrings';
  END IF;

  -- EXTENSIONES TRÍCEPS → triceps
  IF name_lower LIKE '%extension%tricep%' OR name_lower LIKE '%tricep%extension%' OR name_lower LIKE '%press frances%' OR name_lower LIKE '%skull crusher%' OR name_lower LIKE '%pushdown%' THEN
    RETURN 'triceps';
  END IF;

  -- SENTADILLAS → quadriceps
  IF name_lower LIKE '%sentadilla%' OR name_lower LIKE '%squat%' THEN
    RETURN 'quadriceps';
  END IF;

  -- PRENSA → quadriceps
  IF name_lower LIKE '%prensa%' OR name_lower LIKE '%leg press%' THEN
    RETURN 'quadriceps';
  END IF;

  -- EXTENSIÓN DE PIERNA → quadriceps
  IF name_lower LIKE '%extension%pierna%' OR name_lower LIKE '%leg extension%' THEN
    RETURN 'quadriceps';
  END IF;

  -- ZANCADAS → quadriceps
  IF name_lower LIKE '%zancada%' OR name_lower LIKE '%lunge%' OR name_lower LIKE '%estocada%' THEN
    RETURN 'quadriceps';
  END IF;

  -- HIP THRUST → glutes
  IF name_lower LIKE '%hip thrust%' OR name_lower LIKE '%puente%gluteo%' OR name_lower LIKE '%glute bridge%' THEN
    RETURN 'glutes';
  END IF;

  -- ABDUCTORES → glutes
  IF name_lower LIKE '%abductor%' OR name_lower LIKE '%abduccion%' OR name_lower LIKE '%abduction%' THEN
    RETURN 'glutes';
  END IF;

  -- ADUCTORES → quadriceps (inner thigh, part of leg work)
  IF name_lower LIKE '%aductor%' OR name_lower LIKE '%aduccion%' OR name_lower LIKE '%adduction%' THEN
    RETURN 'quadriceps';
  END IF;

  -- GEMELOS/PANTORRILLAS → calves
  IF name_lower LIKE '%gemelo%' OR name_lower LIKE '%pantorrilla%' OR name_lower LIKE '%calf%' OR name_lower LIKE '%talon%' THEN
    RETURN 'calves';
  END IF;

  -- ABDOMINALES/CRUNCH → abs
  IF name_lower LIKE '%abdominal%' OR name_lower LIKE '%crunch%' OR name_lower LIKE '%plancha%' OR name_lower LIKE '%plank%' OR name_lower LIKE '%sit up%' OR name_lower LIKE '%situp%' THEN
    RETURN 'abs';
  END IF;

  -- OBLICUOS → obliques
  IF name_lower LIKE '%oblicuo%' OR name_lower LIKE '%russian twist%' OR name_lower LIKE '%giro ruso%' THEN
    RETURN 'obliques';
  END IF;

  -- TRAPECIO/ENCOGIMIENTOS → trapezius
  IF name_lower LIKE '%trapecio%' OR name_lower LIKE '%encogimiento%' OR name_lower LIKE '%shrug%' THEN
    RETURN 'trapezius';
  END IF;

  -- ANTEBRAZOS → forearms
  IF name_lower LIKE '%antebrazo%' OR name_lower LIKE '%forearm%' OR name_lower LIKE '%muñeca%' OR name_lower LIKE '%wrist%' THEN
    RETURN 'forearms';
  END IF;

  -- HIPEREXTENSIONES → back
  IF name_lower LIKE '%hiperext%' OR name_lower LIKE '%hyperext%' OR name_lower LIKE '%buenos dias%' OR name_lower LIKE '%good morning%' THEN
    RETURN 'back';
  END IF;

  -- CARDIO → fullBody (o podríamos dejarlo sin músculo)
  IF name_lower LIKE '%cardio%' OR name_lower LIKE '%burpee%' OR name_lower LIKE '%sprint%' OR name_lower LIKE '%cinta%' OR name_lower LIKE '%bicicleta%' OR name_lower LIKE '%eliptica%' OR name_lower LIKE '%remo%maquina%' THEN
    RETURN 'fullBody';
  END IF;

  -- ESTIRAMIENTOS → Mantener el primero o NULL
  IF name_lower LIKE '%estiramiento%' OR name_lower LIKE '%stretch%' THEN
    IF current_muscles IS NOT NULL AND array_length(current_muscles, 1) > 0 THEN
      RETURN current_muscles[1];
    ELSE
      RETURN NULL;
    END IF;
  END IF;

  -- DEFAULT: Devolver el primer músculo del array
  IF current_muscles IS NOT NULL AND array_length(current_muscles, 1) > 0 THEN
    RETURN current_muscles[1];
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASO 3: APLICAR LA CORRECCIÓN - UN SOLO MÚSCULO
-- =====================================================

UPDATE exercise_videos
SET muscles = CASE 
  WHEN get_primary_muscle(canonical_name, muscles) IS NOT NULL 
  THEN ARRAY[get_primary_muscle(canonical_name, muscles)]
  ELSE NULL
END
WHERE muscles IS NOT NULL;

-- =====================================================
-- PASO 4: VERIFICAR QUE YA NO HAY MÚLTIPLES MÚSCULOS
-- =====================================================

SELECT canonical_name, muscles, array_length(muscles, 1) as num_muscles
FROM exercise_videos 
WHERE muscles IS NOT NULL AND array_length(muscles, 1) > 1
ORDER BY canonical_name;

-- Si el resultado está vacío, todos los ejercicios tienen máximo 1 músculo

-- =====================================================
-- PASO 5: VER RESUMEN
-- =====================================================

SELECT 
  muscles[1] as muscle,
  COUNT(*) as count
FROM exercise_videos
WHERE muscles IS NOT NULL
GROUP BY muscles[1]
ORDER BY count DESC;

-- =====================================================
-- LIMPIAR FUNCIÓN
-- =====================================================
-- DROP FUNCTION IF EXISTS get_primary_muscle(text, text[]);
