-- Script para agregar nombres en inglés a los ejercicios
-- Ejecutar en Supabase SQL Editor

-- =====================================================
-- PASO 1: AGREGAR COLUMNA name_en
-- =====================================================

ALTER TABLE exercise_videos 
ADD COLUMN IF NOT EXISTS name_en text;

-- =====================================================
-- PASO 2: TRADUCIR EJERCICIOS AUTOMÁTICAMENTE
-- =====================================================

-- Función para traducir nombres de ejercicios
CREATE OR REPLACE FUNCTION translate_exercise_name(spanish_name text)
RETURNS text AS $$
DECLARE
  name_lower text := lower(spanish_name);
BEGIN
  -- =====================================================
  -- DOMINADAS Y VARIANTES
  -- =====================================================
  IF name_lower = 'dominadas' THEN RETURN 'Pull-ups';
  ELSIF name_lower = 'dominadas asistidas' THEN RETURN 'Assisted Pull-ups';
  ELSIF name_lower = 'dominadas con banda' THEN RETURN 'Band-Assisted Pull-ups';
  ELSIF name_lower = 'dominadas pronas' THEN RETURN 'Pronated Pull-ups';
  ELSIF name_lower = 'dominadas supinas' THEN RETURN 'Chin-ups';
  ELSIF name_lower = 'dominadas neutras' THEN RETURN 'Neutral Grip Pull-ups';
  ELSIF name_lower = 'dominadas con peso' THEN RETURN 'Weighted Pull-ups';
  ELSIF name_lower = 'dominadas explosivas' THEN RETURN 'Explosive Pull-ups';
  ELSIF name_lower = 'dominadas arqueras' THEN RETURN 'Archer Pull-ups';
  
  -- =====================================================
  -- JALONES (LAT PULLDOWN)
  -- =====================================================
  ELSIF name_lower LIKE '%jalon%frontal%' OR name_lower LIKE '%jalon frontal%' THEN RETURN 'Lat Pulldown';
  ELSIF name_lower LIKE '%jalon%tras nuca%' OR name_lower LIKE '%jalon tras nuca%' THEN RETURN 'Behind Neck Lat Pulldown';
  ELSIF name_lower LIKE '%jalon%agarre cerrado%' THEN RETURN 'Close Grip Lat Pulldown';
  ELSIF name_lower LIKE '%jalon%agarre neutro%' THEN RETURN 'Neutral Grip Lat Pulldown';
  ELSIF name_lower LIKE '%jalon%supino%' THEN RETURN 'Supinated Lat Pulldown';
  ELSIF name_lower LIKE '%jalon%un brazo%' OR name_lower LIKE '%jalon unilateral%' THEN RETURN 'Single Arm Lat Pulldown';
  ELSIF name_lower LIKE '%jalon%' THEN RETURN 'Lat Pulldown';
  
  -- =====================================================
  -- REMOS (ROWS)
  -- =====================================================
  ELSIF name_lower LIKE '%remo con barra%' OR name_lower = 'remo con barra' THEN RETURN 'Barbell Row';
  ELSIF name_lower LIKE '%remo con mancuerna%' THEN RETURN 'Dumbbell Row';
  ELSIF name_lower LIKE '%remo pendlay%' THEN RETURN 'Pendlay Row';
  ELSIF name_lower LIKE '%remo t%' OR name_lower LIKE '%remo en t%' THEN RETURN 'T-Bar Row';
  ELSIF name_lower LIKE '%remo en polea%' OR name_lower LIKE '%remo polea%' THEN RETURN 'Cable Row';
  ELSIF name_lower LIKE '%remo sentado%' THEN RETURN 'Seated Cable Row';
  ELSIF name_lower LIKE '%remo invertido%' THEN RETURN 'Inverted Row';
  ELSIF name_lower LIKE '%remo gorila%' THEN RETURN 'Gorilla Row';
  ELSIF name_lower LIKE '%remo meadows%' THEN RETURN 'Meadows Row';
  ELSIF name_lower LIKE '%remo seal%' OR name_lower LIKE '%remo foca%' THEN RETURN 'Seal Row';
  ELSIF name_lower LIKE '%remo%' THEN RETURN 'Row';
  
  -- =====================================================
  -- PRESS DE PECHO (CHEST PRESS)
  -- =====================================================
  ELSIF name_lower LIKE '%press banca%' OR name_lower = 'press de banca' THEN RETURN 'Bench Press';
  ELSIF name_lower LIKE '%press inclinado%' AND name_lower LIKE '%mancuerna%' THEN RETURN 'Incline Dumbbell Press';
  ELSIF name_lower LIKE '%press inclinado%' THEN RETURN 'Incline Bench Press';
  ELSIF name_lower LIKE '%press declinado%' THEN RETURN 'Decline Bench Press';
  ELSIF name_lower LIKE '%press con mancuernas%' OR name_lower LIKE '%press mancuernas%' THEN RETURN 'Dumbbell Press';
  ELSIF name_lower LIKE '%press plano%' THEN RETURN 'Flat Bench Press';
  ELSIF name_lower LIKE '%press cerrado%' THEN RETURN 'Close Grip Bench Press';
  
  -- =====================================================
  -- APERTURAS (FLYES)
  -- =====================================================
  ELSIF name_lower LIKE '%aperturas%mancuerna%' OR name_lower LIKE '%apertura%mancuerna%' THEN RETURN 'Dumbbell Flyes';
  ELSIF name_lower LIKE '%aperturas%inclinado%' OR name_lower LIKE '%apertura%inclinado%' THEN RETURN 'Incline Dumbbell Flyes';
  ELSIF name_lower LIKE '%aperturas%polea%' OR name_lower LIKE '%apertura%polea%' OR name_lower LIKE '%cable crossover%' THEN RETURN 'Cable Crossover';
  ELSIF name_lower LIKE '%pec deck%' OR name_lower LIKE '%mariposa%' THEN RETURN 'Pec Deck';
  ELSIF name_lower LIKE '%aperturas%' OR name_lower LIKE '%apertura%' THEN RETURN 'Flyes';
  
  -- =====================================================
  -- FLEXIONES (PUSH-UPS)
  -- =====================================================
  ELSIF name_lower = 'flexiones' OR name_lower = 'lagartijas' THEN RETURN 'Push-ups';
  ELSIF name_lower LIKE '%flexiones diamante%' THEN RETURN 'Diamond Push-ups';
  ELSIF name_lower LIKE '%flexiones inclinadas%' THEN RETURN 'Incline Push-ups';
  ELSIF name_lower LIKE '%flexiones declinadas%' THEN RETURN 'Decline Push-ups';
  ELSIF name_lower LIKE '%flexiones arquero%' THEN RETURN 'Archer Push-ups';
  ELSIF name_lower LIKE '%flexiones explosivas%' OR name_lower LIKE '%flexiones con palmada%' THEN RETURN 'Clap Push-ups';
  ELSIF name_lower LIKE '%flexiones pike%' THEN RETURN 'Pike Push-ups';
  ELSIF name_lower LIKE '%flexiones%' OR name_lower LIKE '%lagartijas%' THEN RETURN 'Push-ups';
  
  -- =====================================================
  -- PRESS DE HOMBROS (SHOULDER PRESS)
  -- =====================================================
  ELSIF name_lower LIKE '%press militar%' THEN RETURN 'Military Press';
  ELSIF name_lower LIKE '%press arnold%' THEN RETURN 'Arnold Press';
  ELSIF name_lower LIKE '%press hombro%mancuerna%' OR name_lower LIKE '%press de hombro%' THEN RETURN 'Dumbbell Shoulder Press';
  ELSIF name_lower LIKE '%press tras nuca%' THEN RETURN 'Behind Neck Press';
  ELSIF name_lower LIKE '%push press%' THEN RETURN 'Push Press';
  
  -- =====================================================
  -- ELEVACIONES (RAISES)
  -- =====================================================
  ELSIF name_lower LIKE '%elevacion%lateral%' OR name_lower LIKE '%vuelos laterales%' THEN RETURN 'Lateral Raises';
  ELSIF name_lower LIKE '%elevacion%frontal%' OR name_lower LIKE '%vuelos frontales%' THEN RETURN 'Front Raises';
  ELSIF name_lower LIKE '%pajaro%' OR name_lower LIKE '%reverse fly%' OR name_lower LIKE '%posterior%' THEN RETURN 'Reverse Flyes';
  ELSIF name_lower LIKE '%face pull%' THEN RETURN 'Face Pulls';
  
  -- =====================================================
  -- ENCOGIMIENTOS (SHRUGS)
  -- =====================================================
  ELSIF name_lower LIKE '%encogimiento%' OR name_lower LIKE '%shrug%' THEN RETURN 'Shrugs';
  
  -- =====================================================
  -- CURL DE BÍCEPS (BICEP CURLS)
  -- =====================================================
  ELSIF name_lower LIKE '%curl%martillo%' THEN RETURN 'Hammer Curls';
  ELSIF name_lower LIKE '%curl%concentrado%' OR name_lower LIKE '%curl concentracion%' THEN RETURN 'Concentration Curls';
  ELSIF name_lower LIKE '%curl%predicador%' OR name_lower LIKE '%curl%scott%' THEN RETURN 'Preacher Curls';
  ELSIF name_lower LIKE '%curl%inclinado%' THEN RETURN 'Incline Dumbbell Curls';
  ELSIF name_lower LIKE '%curl%barra%' OR name_lower LIKE '%curl con barra%' THEN RETURN 'Barbell Curls';
  ELSIF name_lower LIKE '%curl%mancuerna%' THEN RETURN 'Dumbbell Curls';
  ELSIF name_lower LIKE '%curl%polea%' OR name_lower LIKE '%curl%cable%' THEN RETURN 'Cable Curls';
  ELSIF name_lower LIKE '%curl%araña%' OR name_lower LIKE '%spider curl%' THEN RETURN 'Spider Curls';
  ELSIF name_lower LIKE '%curl 21%' OR name_lower LIKE '%21s%' THEN RETURN '21s Bicep Curls';
  ELSIF name_lower LIKE '%curl%' AND name_lower NOT LIKE '%femoral%' AND name_lower NOT LIKE '%pierna%' THEN RETURN 'Bicep Curls';
  
  -- =====================================================
  -- TRÍCEPS (TRICEPS)
  -- =====================================================
  ELSIF name_lower LIKE '%press frances%' OR name_lower LIKE '%skull crusher%' THEN RETURN 'Skull Crushers';
  ELSIF name_lower LIKE '%extension%tricep%polea%' OR name_lower LIKE '%pushdown%' THEN RETURN 'Tricep Pushdown';
  ELSIF name_lower LIKE '%extension%tricep%' OR name_lower LIKE '%tricep extension%' THEN RETURN 'Tricep Extensions';
  ELSIF name_lower LIKE '%patada%tricep%' OR name_lower LIKE '%kickback%' THEN RETURN 'Tricep Kickbacks';
  ELSIF name_lower LIKE '%fondos%' AND name_lower LIKE '%tricep%' THEN RETURN 'Tricep Dips';
  ELSIF name_lower LIKE '%fondos en banco%' THEN RETURN 'Bench Dips';
  ELSIF name_lower LIKE '%fondos%' THEN RETURN 'Dips';
  
  -- =====================================================
  -- SENTADILLAS (SQUATS)
  -- =====================================================
  ELSIF name_lower = 'sentadilla' OR name_lower = 'sentadillas' THEN RETURN 'Squats';
  ELSIF name_lower LIKE '%sentadilla%frontal%' THEN RETURN 'Front Squats';
  ELSIF name_lower LIKE '%sentadilla%sumo%' THEN RETURN 'Sumo Squats';
  ELSIF name_lower LIKE '%sentadilla%goblet%' OR name_lower LIKE '%sentadilla copa%' THEN RETURN 'Goblet Squats';
  ELSIF name_lower LIKE '%sentadilla%bulgara%' THEN RETURN 'Bulgarian Split Squats';
  ELSIF name_lower LIKE '%sentadilla%hack%' THEN RETURN 'Hack Squats';
  ELSIF name_lower LIKE '%sentadilla%pistola%' OR name_lower LIKE '%pistol squat%' THEN RETURN 'Pistol Squats';
  ELSIF name_lower LIKE '%sentadilla%zercher%' THEN RETURN 'Zercher Squats';
  ELSIF name_lower LIKE '%sentadilla%' THEN RETURN 'Squats';
  
  -- =====================================================
  -- PESO MUERTO (DEADLIFT)
  -- =====================================================
  ELSIF name_lower LIKE '%peso muerto%rumano%' OR name_lower LIKE '%rdl%' THEN RETURN 'Romanian Deadlift';
  ELSIF name_lower LIKE '%peso muerto%sumo%' THEN RETURN 'Sumo Deadlift';
  ELSIF name_lower LIKE '%peso muerto%convencional%' THEN RETURN 'Conventional Deadlift';
  ELSIF name_lower LIKE '%peso muerto%un pie%' OR name_lower LIKE '%peso muerto%una pierna%' THEN RETURN 'Single Leg Deadlift';
  ELSIF name_lower LIKE '%peso muerto%' OR name_lower LIKE '%deadlift%' THEN RETURN 'Deadlift';
  
  -- =====================================================
  -- PRENSA DE PIERNAS (LEG PRESS)
  -- =====================================================
  ELSIF name_lower LIKE '%prensa%pierna%' OR name_lower LIKE '%leg press%' THEN RETURN 'Leg Press';
  ELSIF name_lower LIKE '%prensa%45%' THEN RETURN '45 Degree Leg Press';
  ELSIF name_lower LIKE '%prensa%horizontal%' THEN RETURN 'Horizontal Leg Press';
  
  -- =====================================================
  -- EXTENSIONES Y CURLS DE PIERNA
  -- =====================================================
  ELSIF name_lower LIKE '%extension%pierna%' OR name_lower LIKE '%leg extension%' THEN RETURN 'Leg Extensions';
  ELSIF name_lower LIKE '%curl%femoral%' OR name_lower LIKE '%curl%pierna%' OR name_lower LIKE '%leg curl%' THEN RETURN 'Leg Curls';
  ELSIF name_lower LIKE '%curl%femoral%sentado%' THEN RETURN 'Seated Leg Curls';
  ELSIF name_lower LIKE '%curl%femoral%acostado%' OR name_lower LIKE '%curl%femoral%tumbado%' THEN RETURN 'Lying Leg Curls';
  
  -- =====================================================
  -- ZANCADAS (LUNGES)
  -- =====================================================
  ELSIF name_lower LIKE '%zancada%' OR name_lower LIKE '%estocada%' THEN RETURN 'Lunges';
  ELSIF name_lower LIKE '%zancada%caminando%' OR name_lower LIKE '%walking lunge%' THEN RETURN 'Walking Lunges';
  ELSIF name_lower LIKE '%zancada%reversa%' OR name_lower LIKE '%zancada%atras%' THEN RETURN 'Reverse Lunges';
  ELSIF name_lower LIKE '%zancada%lateral%' THEN RETURN 'Lateral Lunges';
  
  -- =====================================================
  -- HIP THRUST Y GLÚTEOS
  -- =====================================================
  ELSIF name_lower LIKE '%hip thrust%' THEN RETURN 'Hip Thrust';
  ELSIF name_lower LIKE '%puente%gluteo%' OR name_lower LIKE '%glute bridge%' THEN RETURN 'Glute Bridge';
  ELSIF name_lower LIKE '%patada%gluteo%' OR name_lower LIKE '%kickback%gluteo%' THEN RETURN 'Glute Kickbacks';
  ELSIF name_lower LIKE '%abduccion%cadera%' OR name_lower LIKE '%hip abduction%' THEN RETURN 'Hip Abduction';
  ELSIF name_lower LIKE '%aduccion%cadera%' OR name_lower LIKE '%hip adduction%' THEN RETURN 'Hip Adduction';
  
  -- =====================================================
  -- PANTORRILLAS (CALVES)
  -- =====================================================
  ELSIF name_lower LIKE '%elevacion%talon%pie%' OR name_lower LIKE '%calf raise%pie%' THEN RETURN 'Standing Calf Raises';
  ELSIF name_lower LIKE '%elevacion%talon%sentado%' OR name_lower LIKE '%calf raise%sentado%' THEN RETURN 'Seated Calf Raises';
  ELSIF name_lower LIKE '%pantorrilla%' OR name_lower LIKE '%gemelo%' OR name_lower LIKE '%calf%' THEN RETURN 'Calf Raises';
  
  -- =====================================================
  -- ABDOMINALES (ABS)
  -- =====================================================
  ELSIF name_lower = 'crunch' OR name_lower = 'crunches' OR name_lower LIKE '%crunch abdominal%' THEN RETURN 'Crunches';
  ELSIF name_lower LIKE '%crunch%inverso%' OR name_lower LIKE '%reverse crunch%' THEN RETURN 'Reverse Crunches';
  ELSIF name_lower LIKE '%crunch%bicicleta%' OR name_lower LIKE '%bicycle crunch%' THEN RETURN 'Bicycle Crunches';
  ELSIF name_lower LIKE '%plancha%' OR name_lower LIKE '%plank%' THEN RETURN 'Plank';
  ELSIF name_lower LIKE '%plancha%lateral%' OR name_lower LIKE '%side plank%' THEN RETURN 'Side Plank';
  ELSIF name_lower LIKE '%elevacion%pierna%colgado%' OR name_lower LIKE '%hanging leg raise%' THEN RETURN 'Hanging Leg Raises';
  ELSIF name_lower LIKE '%elevacion%pierna%' OR name_lower LIKE '%leg raise%' THEN RETURN 'Leg Raises';
  ELSIF name_lower LIKE '%rueda%ab%' OR name_lower LIKE '%ab wheel%' OR name_lower LIKE '%ab rollout%' THEN RETURN 'Ab Wheel Rollout';
  ELSIF name_lower LIKE '%sit up%' OR name_lower LIKE '%sit-up%' OR name_lower LIKE '%situp%' THEN RETURN 'Sit-ups';
  ELSIF name_lower LIKE '%v-up%' OR name_lower LIKE '%v up%' THEN RETURN 'V-ups';
  ELSIF name_lower LIKE '%mountain climber%' OR name_lower LIKE '%escalador%' THEN RETURN 'Mountain Climbers';
  
  -- =====================================================
  -- OBLICUOS (OBLIQUES)
  -- =====================================================
  ELSIF name_lower LIKE '%russian twist%' OR name_lower LIKE '%giro ruso%' THEN RETURN 'Russian Twists';
  ELSIF name_lower LIKE '%woodchop%' OR name_lower LIKE '%leñador%' THEN RETURN 'Woodchops';
  ELSIF name_lower LIKE '%oblicuo%' THEN RETURN 'Oblique Crunches';
  
  -- =====================================================
  -- HIPEREXTENSIONES
  -- =====================================================
  ELSIF name_lower LIKE '%hiperextension%' OR name_lower LIKE '%hyperextension%' THEN RETURN 'Hyperextensions';
  ELSIF name_lower LIKE '%buenos dias%' OR name_lower LIKE '%good morning%' THEN RETURN 'Good Mornings';
  
  -- =====================================================
  -- CARDIO
  -- =====================================================
  ELSIF name_lower LIKE '%burpee%' THEN RETURN 'Burpees';
  ELSIF name_lower LIKE '%jumping jack%' OR name_lower LIKE '%salto%estrella%' THEN RETURN 'Jumping Jacks';
  ELSIF name_lower LIKE '%salto%cuerda%' OR name_lower LIKE '%jump rope%' OR name_lower LIKE '%comba%' THEN RETURN 'Jump Rope';
  ELSIF name_lower LIKE '%sprint%' THEN RETURN 'Sprints';
  ELSIF name_lower LIKE '%box jump%' OR name_lower LIKE '%salto%caja%' THEN RETURN 'Box Jumps';
  
  -- =====================================================
  -- ANTEBRAZO (FOREARMS)
  -- =====================================================
  ELSIF name_lower LIKE '%curl%muñeca%' OR name_lower LIKE '%wrist curl%' THEN RETURN 'Wrist Curls';
  ELSIF name_lower LIKE '%antebrazo%' OR name_lower LIKE '%forearm%' THEN RETURN 'Forearm Exercises';
  
  -- =====================================================
  -- DEFAULT: Mantener el nombre original
  -- =====================================================
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PASO 3: APLICAR TRADUCCIONES
-- =====================================================

UPDATE exercise_videos
SET name_en = translate_exercise_name(canonical_name)
WHERE translate_exercise_name(canonical_name) IS NOT NULL;

-- =====================================================
-- PASO 4: VER EJERCICIOS TRADUCIDOS
-- =====================================================

SELECT canonical_name, name_en 
FROM exercise_videos 
WHERE name_en IS NOT NULL 
ORDER BY canonical_name
LIMIT 50;

-- =====================================================
-- PASO 5: VER EJERCICIOS SIN TRADUCIR (para revisión manual)
-- =====================================================

SELECT canonical_name 
FROM exercise_videos 
WHERE name_en IS NULL 
ORDER BY canonical_name;

-- =====================================================
-- LIMPIAR FUNCIÓN
-- =====================================================
-- DROP FUNCTION IF EXISTS translate_exercise_name(text);
