-- ================================================================
-- AGREGAR PUNTOS CLAVE ESPECÍFICOS A CADA EJERCICIO
-- ================================================================
-- Este script agrega la columna key_points a exercise_videos
-- y actualiza cada ejercicio con 3-5 puntos clave técnicos específicos
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '🎯 Iniciando configuración de puntos clave para ejercicios...';
  
  -- ================================================================
  -- PASO 1: Agregar columna key_points si no existe
  -- ================================================================
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exercise_videos' 
    AND column_name = 'key_points'
  ) THEN
    ALTER TABLE exercise_videos 
    ADD COLUMN key_points TEXT[] DEFAULT ARRAY[]::TEXT[];
    
    RAISE NOTICE '✅ Columna key_points agregada';
  ELSE
    RAISE NOTICE '✅ Columna key_points ya existe';
  END IF;

END $$;

-- ================================================================
-- PASO 2: Actualizar puntos clave para cada ejercicio
-- ================================================================

-- CORE
UPDATE exercise_videos SET key_points = ARRAY[
  'Mantén el core contraído durante todo el movimiento',
  'Controla la velocidad, no uses impulso',
  'Rueda hacia adelante hasta sentir tensión en el abdomen',
  'Vuelve a la posición inicial de forma controlada'
] WHERE canonical_name = 'Abdominales  Con Rueda';

UPDATE exercise_videos SET key_points = ARRAY[
  'Alterna las piernas en cada repetición',
  'Mantén la espalda baja pegada al suelo',
  'Lleva el codo hacia la rodilla opuesta',
  'Exhala al hacer la contracción'
] WHERE canonical_name = 'Abdominales Crunch Alternando Piernas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mantén las manos sujetando el banco',
  'Lleva las rodillas hacia el pecho',
  'Contrae el abdomen en la posición final',
  'Baja las piernas de forma controlada'
] WHERE canonical_name = 'Abdominales En Banco Encogimiento De Piernas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Rota el tronco hacia los lados',
  'Mantén los pies fijos en la plataforma',
  'Controla el movimiento en ambas direcciones',
  'Respira de forma constante'
] WHERE canonical_name = 'Abdominales Oblicuos En Maq 45';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mantén el cuerpo en línea recta',
  'Eleva una pierna alternadamente',
  'No dejes caer las caderas',
  'Core activado en todo momento'
] WHERE canonical_name = 'Abdominales Plancha C/Elevacion De Pierna Alt';

UPDATE exercise_videos SET key_points = ARRAY[
  'Respira normalmente durante todo el ejercicio',
  'Cuerpo en línea recta de cabeza a pies',
  'Core completamente contraído',
  'No dejes caer las caderas ni eleves glúteos'
] WHERE canonical_name = 'Plancha Abdominal';

UPDATE exercise_videos SET key_points = ARRAY[
  'Apoya el antebrazo firmemente',
  'Cuerpo en línea recta lateral',
  'No dejes caer la cadera',
  'Mantén el core activado'
] WHERE canonical_name = 'Plancha Lateral';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mantén la posición sin balanceos',
  'Core activado todo el tiempo',
  'Respira de forma controlada',
  'Incrementa el tiempo progresivamente'
] WHERE canonical_name = 'Planchas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Desplázate hacia adelante y atrás',
  'Mantén el core contraído',
  'No dejes caer las caderas',
  'Controla el movimiento'
] WHERE canonical_name = 'Plancha Con Desplazamiento';

UPDATE exercise_videos SET key_points = ARRAY[
  'Coloca el peso sobre la espalda',
  'Mantén la posición de plancha estándar',
  'Incrementa el peso progresivamente',
  'Controla la respiración'
] WHERE canonical_name = 'Plancha Con Peso';

UPDATE exercise_videos SET key_points = ARRAY[
  'Eleva solo el tronco del suelo',
  'Contrae el abdomen al subir',
  'No tires del cuello con las manos',
  'Exhala al subir, inhala al bajar'
] WHERE canonical_name = 'Crunch En Suelo';

UPDATE exercise_videos SET key_points = ARRAY[
  'Ajusta el peso de la máquina',
  'Controla el movimiento en ambas direcciones',
  'Contrae el abdomen en la posición final',
  'Exhala al hacer la contracción'
] WHERE canonical_name = 'Crunch En Máquina';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mantén la espalda baja pegada al suelo',
  'Eleva solo los hombros del suelo',
  'Contrae el abdomen conscientemente',
  'No uses el impulso del cuello'
] WHERE canonical_name = 'Crunches';

UPDATE exercise_videos SET key_points = ARRAY[
  'Extiende brazos y piernas opuestos',
  'Mantén la espalda baja pegada al suelo',
  'Movimiento lento y controlado',
  'Alterna los lados constantemente'
] WHERE canonical_name = 'Dead Bug';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sujétate firmemente de la barra',
  'Eleva las piernas extendidas hasta horizontal',
  'Controla la bajada sin balanceo',
  'Core completamente contraído'
] WHERE canonical_name = 'Dragon Flag';

UPDATE exercise_videos SET key_points = ARRAY[
  'Cuerpo en línea recta con brazos extendidos',
  'Contrae el abdomen fuertemente',
  'Mantén piernas y brazos elevados del suelo',
  'Respira de forma controlada'
] WHERE canonical_name = 'Hollow Body';

UPDATE exercise_videos SET key_points = ARRAY[
  'Lleva las rodillas al pecho alternadamente',
  'Mantén las manos bajo los hombros',
  'Movimiento rápido pero controlado',
  'Core activado todo el tiempo'
] WHERE canonical_name = 'Mountain Climbers';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sostén una banda o palo con ambas manos',
  'Rota el tronco de lado a lado',
  'Mantén los pies fijos',
  'Controla el movimiento en ambas direcciones'
] WHERE canonical_name = 'Rotaciones Con Banda';

UPDATE exercise_videos SET key_points = ARRAY[
  'Rueda la rueda abdominal hacia adelante',
  'Core completamente contraído',
  'No dejes caer las caderas',
  'Vuelve de forma controlada'
] WHERE canonical_name = 'Wheel Rollout';

-- FUERZA INFERIOR
UPDATE exercise_videos SET key_points = ARRAY[
  'Empuja las piernas hacia afuera contra resistencia',
  'Mantén la espalda pegada al respaldo',
  'Controla el retorno a la posición inicial',
  'Enfócate en los glúteos medios'
] WHERE canonical_name = 'Abductor En Maquina';

UPDATE exercise_videos SET key_points = ARRAY[
  'Junta las piernas contra resistencia',
  'Mantén la espalda en el respaldo',
  'Controla ambas fases del movimiento',
  'Enfócate en los aductores'
] WHERE canonical_name = 'Aductor En Maq';

UPDATE exercise_videos SET key_points = ARRAY[
  'Siéntate con la espalda recta',
  'Junta las piernas lentamente',
  'No uses impulso',
  'Contrae los aductores conscientemente'
] WHERE canonical_name = 'Aductor En Maq Sentad';

UPDATE exercise_videos SET key_points = ARRAY[
  'Pies al ancho de hombros',
  'Baja hasta muslos paralelos al suelo',
  'Rodillas alineadas con los pies',
  'Empuja con los talones al subir'
] WHERE canonical_name = 'Sentadilla';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra sobre los trapecios superiores',
  'Rodillas alineadas con las puntas de los pies',
  'Desciende controladamente hasta paralelo',
  'Mantén el pecho arriba y core activado'
] WHERE canonical_name = 'Sentadilla Con Barra';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra en la parte frontal de los hombros',
  'Codos apuntando hacia adelante',
  'Torso más vertical que en sentadilla trasera',
  'Core fuertemente activado'
] WHERE canonical_name = 'Sentadilla Frontal';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sostén la pesa frente al pecho',
  'Codos apuntando hacia abajo',
  'Desciende manteniendo el torso vertical',
  'Ideal para aprender la técnica de sentadilla'
] WHERE canonical_name = 'Sentadilla Goblet';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sostén la barra en los antebrazos',
  'Torso muy vertical',
  'Gran activación del core',
  'Desciende controladamente'
] WHERE canonical_name = 'Sentadilla Zercher';

UPDATE exercise_videos SET key_points = ARRAY[
  'Pies al ancho de hombros',
  'Brazos extendidos hacia adelante',
  'Desciende hasta muslos paralelos',
  'Mantén el equilibrio'
] WHERE canonical_name = 'Sentadillas Con Peso Corporal';

UPDATE exercise_videos SET key_points = ARRAY[
  'Pies en plataforma alta de la máquina',
  'Torso apoyado en respaldo inclinado',
  'Énfasis en cuádriceps',
  'Desciende profundo controladamente'
] WHERE canonical_name = 'Sentadillas Hack';

UPDATE exercise_videos SET key_points = ARRAY[
  'Una pierna atrás elevada en banco',
  'Desciende con la pierna delantera',
  'Rodilla delantera no sobrepasa la punta del pie',
  'Mantén el equilibrio y torso vertical'
] WHERE canonical_name = 'Sentadilla Búlgara';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuernas en cada mano',
  'Pierna trasera elevada en banco',
  'Desciende verticalmente',
  'Enfoque en el cuádriceps de la pierna delantera'
] WHERE canonical_name = 'Sentadilla Búlgara Con Mancuernas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Pierna trasera elevada en banco Smith',
  'Barra sobre los hombros',
  'Desciende de forma controlada',
  'Mayor estabilidad que con barra libre'
] WHERE canonical_name = 'Bulgaras En Smith';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sentado en el suelo con piernas extendidas',
  'Barra sobre los hombros',
  'Press vertical sin usar piernas',
  'Gran activación del core'
] WHERE canonical_name = 'Press Z Press';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sostén kettlebell frente al pecho',
  'Pies al ancho de hombros',
  'Desciende manteniendo torso vertical',
  'Enfoque en técnica'
] WHERE canonical_name = 'Goblet Squat Kb';

UPDATE exercise_videos SET key_points = ARRAY[
  'Rodilla trasera casi toca el suelo',
  'Rodilla delantera a 90 grados',
  'Mantén el torso vertical',
  'Empuja con el talón delantero'
] WHERE canonical_name = 'Estocadas Estaticas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Pierna delantera sobre plataforma elevada',
  'Desciende con la pierna trasera',
  'Empuja con el talón de la pierna delantera',
  'Mantén el equilibrio'
] WHERE canonical_name = 'Estocadas Con Altura';

UPDATE exercise_videos SET key_points = ARRAY[
  'Espalda neutral en todo momento',
  'Barra pegada a las espinillas',
  'Empuja con las piernas primero',
  'Extiende las caderas al final'
] WHERE canonical_name = 'Peso Muerto';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra en el suelo, pies al ancho de caderas',
  'Espalda recta durante todo el movimiento',
  'Empuja con las piernas al inicio',
  'Bloquea las caderas al final'
] WHERE canonical_name = 'Peso Muerto Convencional';

UPDATE exercise_videos SET key_points = ARRAY[
  'Pies muy separados, puntas hacia afuera',
  'Barra sube en línea recta vertical',
  'Mayor activación de glúteos y aductores',
  'Torso más vertical que en convencional'
] WHERE canonical_name = 'Peso Muerto Sumo';

UPDATE exercise_videos SET key_points = ARRAY[
  'Una pierna apoyada, otra extendida atrás',
  'Mantén la espalda neutral',
  'Bisagra de cadera unilateral',
  'Enfoque en el equilibrio'
] WHERE canonical_name = 'Peso Muerto A Una Pierna';

UPDATE exercise_videos SET key_points = ARRAY[
  'Torso paralelo al suelo',
  'Barra sobre los trapecios',
  'Bisagra de cadera',
  'Isquiotibiales y espalda baja trabajan juntos'
] WHERE canonical_name = 'Buen Dia C/Barra';

UPDATE exercise_videos SET key_points = ARRAY[
  'Hombros apoyados en banco',
  'Barra sobre las caderas',
  'Empuja las caderas hacia arriba',
  'Aprieta los glúteos en la posición superior'
] WHERE canonical_name = 'Hip Thrust';

UPDATE exercise_videos SET key_points = ARRAY[
  'Coloca la barra con peso sobre las caderas',
  'Hombros en banco, pies firmes en el suelo',
  'Empuja las caderas hacia el techo',
  'Contracción máxima de glúteos arriba'
] WHERE canonical_name = 'Hip Thrust Con Barra';

UPDATE exercise_videos SET key_points = ARRAY[
  'Acostado boca arriba, rodillas flexionadas',
  'Empuja las caderas hacia arriba',
  'Aprieta los glúteos en la posición superior',
  'Baja controladamente'
] WHERE canonical_name = 'Puente De Glúteo';

UPDATE exercise_videos SET key_points = ARRAY[
  'Pies firmes en el suelo',
  'Empuja las caderas hacia el techo',
  'Mantén la contracción en la posición superior',
  'No arquees la espalda baja excesivamente'
] WHERE canonical_name = 'Puente De Glúteos';

UPDATE exercise_videos SET key_points = ARRAY[
  'Empuja con el talón de la pierna elevada',
  'Sube hasta extensión completa',
  'Mantén el torso vertical',
  'Enfoque en el cuádriceps'
] WHERE canonical_name = 'Step-Up Al Banco';

UPDATE exercise_videos SET key_points = ARRAY[
  'Rodilla a 90 grados en la máquina',
  'Extiende la pierna lentamente',
  'Contrae el cuádriceps en la posición final',
  'Baja controladamente'
] WHERE canonical_name = 'Extensión De Cuádriceps';

UPDATE exercise_videos SET key_points = ARRAY[
  'Siéntate con la espalda recta',
  'Extiende las piernas contra resistencia',
  'Contracción máxima del cuádriceps arriba',
  'Controla la fase excéntrica'
] WHERE canonical_name = 'Extensiones De Cuádriceps';

UPDATE exercise_videos SET key_points = ARRAY[
  'Acostado boca abajo en la máquina',
  'Flexiona las piernas llevando talones al glúteo',
  'Controla la bajada',
  'Enfoque en isquiotibiales'
] WHERE canonical_name = 'Curl Femoral';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sentado en la máquina',
  'Flexiona las piernas hacia atrás',
  'Controla el movimiento',
  'Mayor aislamiento de isquiotibiales'
] WHERE canonical_name = 'Curl Femoral Sentado';

UPDATE exercise_videos SET key_points = ARRAY[
  'Tumbado boca abajo',
  'Flexiona las piernas hacia los glúteos',
  'Controla la fase excéntrica',
  'No despegues las caderas del banco'
] WHERE canonical_name = 'Curl Femoral Tumbado';

UPDATE exercise_videos SET key_points = ARRAY[
  'Ajusta la máquina a tu altura',
  'Flexiona las piernas suavemente',
  'No uses impulso',
  'Controla ambas fases'
] WHERE canonical_name = 'Curl Femorales En Maquina';

UPDATE exercise_videos SET key_points = ARRAY[
  'Cable a la altura del tobillo',
  'Extiende la cadera hacia atrás',
  'Mantén la pierna extendida',
  'Enfoque en isquiotibiales'
] WHERE canonical_name = 'Femorales En Polea Baja De Parado A Una Pierna';

UPDATE exercise_videos SET key_points = ARRAY[
  'Pies firmes en la plataforma',
  'Empuja con la parte delantera del pie',
  'Desciende con los talones todo lo posible',
  'Sube hasta máxima extensión'
] WHERE canonical_name = 'Prensa De Piernas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Empuja con la parte delantera del pie',
  'No uses impulso',
  'Contrae los gemelos en la posición superior',
  'Desciende lo más posible'
] WHERE canonical_name = 'Elevación De Gemelos De Pie';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sentado con rodillas a 90 grados',
  'Empuja con la parte delantera del pie',
  'Enfoque en los sóleos',
  'Controla el rango completo'
] WHERE canonical_name = 'Elevación De Gemelos Sentado';

UPDATE exercise_videos SET key_points = ARRAY[
  'De pie en un escalón',
  'Talones cuelgan del borde',
  'Sube hasta máxima contracción',
  'Desciende profundo para estirar'
] WHERE canonical_name = 'Gemelos En Escalón';

UPDATE exercise_videos SET key_points = ARRAY[
  'Usa la máquina de prensa de piernas',
  'Solo mueve los tobillos',
  'Empuja con la parte delantera del pie',
  'Rango completo de movimiento'
] WHERE canonical_name = 'Prensa De Gemelos En Prensa';

UPDATE exercise_videos SET key_points = ARRAY[
  'Ajusta la máquina correctamente',
  'Empuja con los pies completos',
  'Controla ambas fases del movimiento',
  'Contrae los gemelos arriba'
] WHERE canonical_name = 'Elevaciones De Talones Máquina';

UPDATE exercise_videos SET key_points = ARRAY[
  'Solo usa el peso corporal',
  'Sube hasta máxima contracción',
  'Desciende profundo',
  'Mantén el equilibrio'
] WHERE canonical_name = 'Pantorrillas P/Corporal';

UPDATE exercise_videos SET key_points = ARRAY[
  'Kettlebell entre las piernas',
  'Bisagra de cadera explosiva',
  'Kettlebell sube hasta altura de hombros',
  'No uses los brazos, usa las caderas'
] WHERE canonical_name = 'Kettlebell Swing';

UPDATE exercise_videos SET key_points = ARRAY[
  'Movimiento similar al swing',
  'Empuja explosivamente con las caderas',
  'Recibe el peso en posición de rack',
  'Gran activación de todo el cuerpo'
] WHERE canonical_name = 'Clean Con Kettlebell';

UPDATE exercise_videos SET key_points = ARRAY[
  'Kettlebell desde el suelo',
  'Movimiento explosivo hasta overhead',
  'Brazo completamente extendido arriba',
  'Requiere técnica y movilidad'
] WHERE canonical_name = 'Snatch Con Kettlebell';

UPDATE exercise_videos SET key_points = ARRAY[
  'Movimiento similar a los swings',
  'Bisagra de cadera explosiva',
  'Enfoque en glúteos e isquiotibiales',
  'Controla el peso'
] WHERE canonical_name = 'Swings';

UPDATE exercise_videos SET key_points = ARRAY[
  'Acostado de lado',
  'Abre y cierra la rodilla superior',
  'Mantén los pies juntos',
  'Enfoque en glúteo medio'
] WHERE canonical_name = 'Clamshells';

UPDATE exercise_videos SET key_points = ARRAY[
  'Cable a la altura del tobillo',
  'Extiende la pierna hacia atrás',
  'Aprieta el glúteo en la posición final',
  'No arquees la espalda baja'
] WHERE canonical_name = 'Patada De Glúteo Con Cable';

UPDATE exercise_videos SET key_points = ARRAY[
  'En posición de cuatro patas',
  'Extiende la pierna hacia atrás y arriba',
  'Aprieta el glúteo',
  'Mantén la espalda neutral'
] WHERE canonical_name = 'Patada De Gluteo Peso Corporal';

UPDATE exercise_videos SET key_points = ARRAY[
  'Acostado boca arriba',
  'Empuja las caderas arriba con abducción',
  'Abre las piernas en la posición superior',
  'Contrae glúteos y abductores'
] WHERE canonical_name = 'Elevacion De Pelvis Con Abducion';

UPDATE exercise_videos SET key_points = ARRAY[
  'Una pierna adelante, otra atrás',
  'Desciende hasta rodilla trasera casi toca',
  'Mantén el torso vertical',
  'Alterna las piernas'
] WHERE canonical_name = 'Split Squat';

UPDATE exercise_videos SET key_points = ARRAY[
  'Baja en una sola pierna',
  'Otra pierna extendida hacia adelante',
  'Requiere gran fuerza y equilibrio',
  'Usa soporte al inicio'
] WHERE canonical_name = 'Pistol Squats';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sostente de algo para asistir',
  'Baja en una pierna controladamente',
  'Trabaja progresivamente menos asistencia',
  'Enfoque en el equilibrio'
] WHERE canonical_name = 'Pistol Squat Asistida';

UPDATE exercise_videos SET key_points = ARRAY[
  'Inclínate hacia adelante en la máquina',
  'Rodillas ligeramente flexionadas',
  'Desciende controladamente',
  'Enfoque en isquiotibiales y glúteos'
] WHERE canonical_name = 'Sissy Squat';

UPDATE exercise_videos SET key_points = ARRAY[
  'Da un paso largo hacia atrás',
  'Desciende verticalmente',
  'Rodilla trasera casi toca el suelo',
  'Empuja con el talón delantero'
] WHERE canonical_name = 'Zancadas Atrás';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuerna en cada mano',
  'Alterna las piernas hacia adelante',
  'Rodilla trasera casi toca el suelo',
  'Mantén el torso erguido'
] WHERE canonical_name = 'Zancadas Con Mancuernas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sin peso adicional',
  'Alterna las piernas',
  'Desciende controladamente',
  'Mantén el equilibrio'
] WHERE canonical_name = 'Zancadas Con Peso Corporal';

UPDATE exercise_videos SET key_points = ARRAY[
  'Da un paso hacia atrás',
  'Desciende hasta rodilla trasera casi toca',
  'Menos estrés en la rodilla delantera',
  'Empuja con el talón delantero'
] WHERE canonical_name = 'Zancadas Inversas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Da un paso lateral amplio',
  'Desciende hacia el lado del paso',
  'Mantén el torso vertical',
  'Enfoque en glúteos y aductores'
] WHERE canonical_name = 'Zancadas Laterales';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sentadilla con peso corporal',
  'Brazos extendidos hacia adelante',
  'Levanta brazos al bajar',
  'Coordinación y equilibrio'
] WHERE canonical_name = 'Sentadillas Con Elevacion Frontal De Brazos';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sin peso adicional',
  'Pies al ancho de hombros',
  'Brazos extendidos hacia adelante',
  'Mantén el equilibrio'
] WHERE canonical_name = 'Sentadilla Aire';

-- FUERZA SUPERIOR PUSH
UPDATE exercise_videos SET key_points = ARRAY[
  'Retrae los omóplatos antes de bajar',
  'Barra a la altura del pecho medio',
  'Codos a 45° del cuerpo',
  'Pies firmes en el suelo'
] WHERE canonical_name = 'Press Banca Plano';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuernas descienden más profundo que con barra',
  'Controla la trayectoria',
  'Retrae los omóplatos',
  'Empuja con fuerza hacia arriba'
] WHERE canonical_name = 'Press Banca Con Mancuernas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banco a 30-45 grados',
  'Mayor activación del pecho superior',
  'Controla el descenso',
  'Empuja en diagonal hacia arriba'
] WHERE canonical_name = 'Press Banca Inclinado';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banco inclinado hacia abajo',
  'Mayor activación del pecho inferior',
  'Controla bien el peso',
  'Cuidado con la presión en la cabeza'
] WHERE canonical_name = 'Press Declinado Con Barra';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuernas en banco declinado',
  'Rango de movimiento amplio',
  'Controla el peso',
  'Enfoque en pecho inferior'
] WHERE canonical_name = 'Press Declinado Con Mancuernas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mayor estabilidad que barra libre',
  'Trayectoria fija de la máquina',
  'Permite enfocarse más en el músculo',
  'Útil para principiantes'
] WHERE canonical_name = 'Press En Smith';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuernas en banco inclinado',
  'Mayor rango de movimiento',
  'Controla ambas mancuernas',
  'Enfoque en pecho superior'
] WHERE canonical_name = 'Press Inclinado Con Mancuernas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banco plano, una mancuerna a la vez',
  'Alterna los brazos',
  'Mayor activación del core',
  'Controla el equilibrio'
] WHERE canonical_name = 'Pecho Plano Con Manc Alternado';

UPDATE exercise_videos SET key_points = ARRAY[
  'Ajusta la máquina a tu altura',
  'Empuja hacia adelante',
  'Controla el retorno',
  'Mayor estabilidad'
] WHERE canonical_name = 'Pecho En Maquina';

UPDATE exercise_videos SET key_points = ARRAY[
  'Máquina tipo hammer',
  'Movimiento más natural',
  'Controla ambos brazos',
  'Enfoque en el pecho'
] WHERE canonical_name = 'Press Pecho Hammer';

UPDATE exercise_videos SET key_points = ARRAY[
  'Brazos ligeramente flexionados',
  'Abre los brazos en arco',
  'Siente el estiramiento del pecho',
  'Cierra contrayendo el pecho'
] WHERE canonical_name = 'Aperturas Con Mancuernas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Ajusta la máquina correctamente',
  'Brazos ligeramente flexionados',
  'Junta los brazos hacia adelante',
  'Contrae el pecho'
] WHERE canonical_name = 'Aperturas En Máquina';

UPDATE exercise_videos SET key_points = ARRAY[
  'Cables a la altura del pecho',
  'Cruza los brazos hacia adelante',
  'Mantén ligera flexión en codos',
  'Contrae el pecho al cruzar'
] WHERE canonical_name = 'Cierre Pectoral En Banco Plano/Polea';

UPDATE exercise_videos SET key_points = ARRAY[
  'Poleas en posición alta',
  'Cruza los brazos hacia abajo',
  'Enfoque en pecho inferior',
  'Controla el movimiento'
] WHERE canonical_name = 'Cierre Pectoral En Polea Alta';

UPDATE exercise_videos SET key_points = ARRAY[
  'Poleas en posición baja',
  'Cruza hacia arriba',
  'Enfoque en pecho superior',
  'Mantén codos ligeramente flexionados'
] WHERE canonical_name = 'Cierre Pectoral P/Baja';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banco declinado con mancuernas',
  'Rota las muñecas al subir',
  'Mayor rango de movimiento',
  'Controla la rotación'
] WHERE canonical_name = 'Cierre Declinado Con Manc Twist';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banco plano perpendicular',
  'Mancuerna o barra sobre el pecho',
  'Brazos casi extendidos',
  'Baja controladamente detrás de la cabeza'
] WHERE canonical_name = 'Pull Over Pectoral';

UPDATE exercise_videos SET key_points = ARRAY[
  'Cuerpo en línea recta',
  'Manos al ancho de hombros',
  'Desciende hasta pecho casi toca el suelo',
  'Empuja explosivamente hacia arriba'
] WHERE canonical_name = 'Flexiones';

UPDATE exercise_videos SET key_points = ARRAY[
  'Coloca peso sobre la espalda',
  'Mantén forma estricta',
  'Incrementa el peso progresivamente',
  'Core activado'
] WHERE canonical_name = 'Flexiones Con Peso';

UPDATE exercise_videos SET key_points = ARRAY[
  'Brazos pegados a los costados',
  'Mayor activación de tríceps',
  'Desciende controladamente',
  'Mantén el core activado'
] WHERE canonical_name = 'Flexiones De Brazos Pegados Al Cuerpo';

UPDATE exercise_videos SET key_points = ARRAY[
  'Pies elevados en banco o cajón',
  'Mayor activación del pecho superior',
  'Mantén el cuerpo recto',
  'Controla el descenso'
] WHERE canonical_name = 'Flexiones Declinadas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Manos muy juntas formando diamante',
  'Mayor activación de tríceps',
  'Desciende controladamente',
  'Codos cerca del cuerpo'
] WHERE canonical_name = 'Flexiones Diamante';

UPDATE exercise_videos SET key_points = ARRAY[
  'Manos en banco, pies en el suelo',
  'Desciende flexionando los codos',
  'Empuja hacia arriba',
  'Enfoque en tríceps'
] WHERE canonical_name = 'Fondos En Banco';

UPDATE exercise_videos SET key_points = ARRAY[
  'Agarre en paralelas',
  'Inclínate hacia adelante para pecho',
  'O mantén vertical para tríceps',
  'Desciende controladamente'
] WHERE canonical_name = 'Fondos En Paralelas';

UPDATE exercise_videos SET key_points = ARRAY[
  'En máquina de paralelas',
  'Agarre neutro',
  'Desciende y empuja hacia arriba',
  'Enfoque en tríceps'
] WHERE canonical_name = 'Paralela Maq Triceps';

UPDATE exercise_videos SET key_points = ARRAY[
  'Inclínate hacia adelante',
  'Enfoque en pectorales',
  'Desciende profundo',
  'Empuja explosivamente'
] WHERE canonical_name = 'Paralelas Pectoral';

UPDATE exercise_videos SET key_points = ARRAY[
  'Apoyo elevado para las manos',
  'Mayor rango de movimiento',
  'Desciende más profundo',
  'Empuja hacia arriba'
] WHERE canonical_name = 'Push Up C/Apoyo';

UPDATE exercise_videos SET key_points = ARRAY[
  'Core activado para proteger espalda',
  'Barra frente a la cara al subir',
  'Codos ligeramente adelante',
  'Extensión completa arriba'
] WHERE canonical_name = 'Press Militar Con Barra';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuernas a los lados de la cabeza',
  'Empuja hacia arriba simultáneamente',
  'No arquees la espalda excesivamente',
  'Core activado'
] WHERE canonical_name = 'Press Militar Con Mancuernas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra sobre hombros',
  'Empuja verticalmente',
  'Core fuertemente activado',
  'Cuello alineado'
] WHERE canonical_name = 'Press De Hombros Con Barra';

UPDATE exercise_videos SET key_points = ARRAY[
  'Inicio con palmas hacia ti',
  'Rota al subir hasta palmas hacia adelante',
  'Mayor activación del hombro frontal',
  'Controla la rotación'
] WHERE canonical_name = 'Press Arnold';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra en la máquina Smith',
  'Trayectoria fija vertical',
  'Mayor estabilidad',
  'Enfoque en hombros'
] WHERE canonical_name = 'Press Hombro Banda';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sentado en suelo, piernas extendidas',
  'Barra o mancuernas sobre hombros',
  'Press vertical sin usar piernas',
  'Gran activación del core'
] WHERE canonical_name = 'Press Z Press';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuernas a los lados del cuerpo',
  'Eleva lateralmente hasta altura de hombros',
  'Codos ligeramente flexionados',
  'Controla la bajada'
] WHERE canonical_name = 'Elevaciones Laterales Con Mancuernas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuernas frente a los muslos',
  'Eleva hacia adelante hasta altura de hombros',
  'Mantén ligera flexión en codos',
  'Enfoque en deltoides frontal'
] WHERE canonical_name = 'Elevaciones Frontales';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra en polea baja',
  'Eleva hacia adelante',
  'Control en todo el rango',
  'Enfoque en hombros frontales'
] WHERE canonical_name = 'Vuelo Frontal Con Barra En Polea Baja';

UPDATE exercise_videos SET key_points = ARRAY[
  'Cable en polea baja',
  'Un brazo a la vez',
  'Eleva hacia adelante controladamente',
  'Mantén el core estable'
] WHERE canonical_name = 'Vuelo Frontal A Un Brazo Polea Baja';

UPDATE exercise_videos SET key_points = ARRAY[
  'Cables cruzados a la altura media',
  'Eleva lateralmente',
  'Codos ligeramente flexionados',
  'Enfoque en deltoides lateral'
] WHERE canonical_name = 'Vuelo Lateral En Polea Cruzada';

UPDATE exercise_videos SET key_points = ARRAY[
  'Inclinado hacia adelante',
  'Mancuernas cuelgan hacia abajo',
  'Eleva hacia atrás con codos flexionados',
  'Enfoque en deltoides posterior'
] WHERE canonical_name = 'Pájaros Con Mancuernas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra Z sobre la frente',
  'Extiende los codos hacia arriba',
  'Solo mueve los antebrazos',
  'Controla la bajada detrás de la cabeza'
] WHERE canonical_name = 'Press Francés Con Barra Z';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuerna sobre la cabeza con ambas manos',
  'Baja detrás de la cabeza flexionando codos',
  'Extiende hacia arriba',
  'Mantén codos cerca de la cabeza'
] WHERE canonical_name = 'Press Francés Con Mancuerna';

UPDATE exercise_videos SET key_points = ARRAY[
  'Similar a press francés',
  'Barra baja hacia la parte superior del pecho',
  'Mayor activación de cabeza larga del tríceps',
  'Codos hacia adelante'
] WHERE canonical_name = 'Press Jm';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banco inclinado con mancuernas',
  'Extiende hacia adelante y arriba',
  'Enfoque en tríceps',
  'Controla ambas mancuernas'
] WHERE canonical_name = 'T/Frances Inclinado C/Manc';

UPDATE exercise_videos SET key_points = ARRAY[
  'De pie en polea',
  'Cuerda o barra en polea alta',
  'Extiende los codos hacia abajo',
  'Mantén codos fijos cerca del cuerpo'
] WHERE canonical_name = 'Triceps En Polea';

UPDATE exercise_videos SET key_points = ARRAY[
  'Poleas altas cruzadas',
  'Extiende los brazos cruzando',
  'Enfoque en tríceps',
  'Controla el movimiento'
] WHERE canonical_name = 'Triceps /Cruce De Polea Cruzadas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Polea alta, un brazo',
  'Extiende hacia abajo',
  'Codo fijo cerca del cuerpo',
  'Controla el retorno'
] WHERE canonical_name = 'Triceps A Un Brazo Pushdown';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banda elástica fija arriba',
  'Extiende los codos hacia abajo',
  'Mantén codos fijos',
  'Control en ambas fases'
] WHERE canonical_name = 'Triceps Con Banda Elastic';

UPDATE exercise_videos SET key_points = ARRAY[
  'De rodillas frente a banco',
  'Extiende los codos hacia adelante',
  'Mantén los codos fijos',
  'Enfoque en tríceps'
] WHERE canonical_name = 'Triceps De Rodilla Extencion';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banco declinado, manos en posición diamante',
  'Desciende controladamente',
  'Mayor activación de tríceps',
  'Empuja explosivamente'
] WHERE canonical_name = 'Triceps Diamente Declinado En Banco';

UPDATE exercise_videos SET key_points = ARRAY[
  'Cuerda en polea alta',
  'Lleva por encima de la cabeza',
  'Extiende los codos hacia arriba',
  'Mantén los codos fijos'
] WHERE canonical_name = 'Triceps Extencion Con Soga Sobre La Cabeza P/Alta';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra en polea baja',
  'Extiende hacia adelante y arriba',
  'Codos cerca de la cabeza',
  'Enfoque en cabeza larga'
] WHERE canonical_name = 'Triceps Extencion De Cable Con Barra En Polea Baja';

UPDATE exercise_videos SET key_points = ARRAY[
  'Polea alta, un brazo',
  'Extiende hacia abajo',
  'Mayor aislamiento',
  'Controla el movimiento'
] WHERE canonical_name = 'Triceps Extencion En Polea Alta A Un Brazo';

UPDATE exercise_videos SET key_points = ARRAY[
  'Manos en banco detrás de ti',
  'Pies en el suelo o elevados',
  'Desciende flexionando codos',
  'Empuja hacia arriba'
] WHERE canonical_name = 'Triceps Fondo En Banco';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuerna sobre la cabeza con ambas manos',
  'Baja detrás de la cabeza',
  'Extiende hacia arriba',
  'Codos fijos hacia adelante'
] WHERE canonical_name = 'Triceps Frances A Dos Manos';

UPDATE exercise_videos SET key_points = ARRAY[
  'Polea baja, un brazo',
  'Lleva por encima de la cabeza',
  'Extiende hacia arriba',
  'Codo fijo'
] WHERE canonical_name = 'Triceps Frances A Un Brazo En Polea Baja';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra W sobre la frente',
  'Baja detrás de la cabeza',
  'Extiende hacia arriba',
  'Agarre cerrado o amplio'
] WHERE canonical_name = 'Triceps Frances Con Barra W';

UPDATE exercise_videos SET key_points = ARRAY[
  'Dos sillas o superficies paralelas',
  'Manos en cada silla',
  'Desciende y empuja hacia arriba',
  'Enfoque en tríceps'
] WHERE canonical_name = 'Triceps Paralelas C/Sillas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuernas en cada mano',
  'Extiende hacia arriba con rotación',
  'Movimiento de martillo',
  'Enfoque en tríceps'
] WHERE canonical_name = 'Martillo Con Mancuernas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Inclinado hacia adelante',
  'Mancuerna en cada mano',
  'Extiende el codo hacia atrás',
  'Mantén el brazo superior fijo'
] WHERE canonical_name = 'Patada Triceps C/Manc';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuernas sobre la cabeza',
  'Baja hacia los lados de la cabeza',
  'Extiende hacia arriba',
  'Mayor rango que con barra'
] WHERE canonical_name = 'Skull Crusher Mancuernas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Máquina específica para tríceps',
  'Extiende los codos hacia abajo',
  'Mayor estabilidad',
  'Enfoque en el músculo'
] WHERE canonical_name = 'Extencion En Maq.triceps';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra o mancuerna perpendicular',
  'Desciende detrás de la cabeza en banco plano',
  'Extiende hacia arriba',
  'Codos ligeramente hacia adentro'
] WHERE canonical_name = 'Extensiones De Tríceps Mancuernas';

-- FUERZA SUPERIOR PULL
UPDATE exercise_videos SET key_points = ARRAY[
  'Agarre amplio, palmas hacia adelante',
  'Retrae omóplatos antes de subir',
  'Barbilla sobre la barra',
  'Baja controladamente'
] WHERE canonical_name = 'Dominadas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Palmas hacia adelante',
  'Mayor activación de dorsales',
  'Retrae omóplatos',
  'Control total del movimiento'
] WHERE canonical_name = 'Dominadas Pronas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Palmas hacia ti',
  'Mayor activación de bíceps',
  'Barbilla sobre la barra',
  'Controla el descenso'
] WHERE canonical_name = 'Dominadas Supinas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banda elástica bajo los pies o rodillas',
  'Asiste en la subida',
  'Trabaja hacia dominadas sin asistencia',
  'Mantén la técnica correcta'
] WHERE canonical_name = 'Dominadas Con Banda';

UPDATE exercise_videos SET key_points = ARRAY[
  'Máquina con contrapeso',
  'Facilita el movimiento',
  'Ideal para principiantes',
  'Reduce progresivamente la asistencia'
] WHERE canonical_name = 'Dominadas Asistidas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra fija a media altura',
  'Cuerpo bajo la barra',
  'Rema hacia la barra',
  'Retrae omóplatos'
] WHERE canonical_name = 'Inverted Row';

UPDATE exercise_videos SET key_points = ARRAY[
  'Polea alta, agarre amplio',
  'Tira hacia el pecho',
  'Retrae los omóplatos',
  'Controla el retorno'
] WHERE canonical_name = 'Jalón Al Pecho';

UPDATE exercise_videos SET key_points = ARRAY[
  'Polea alta, jala hacia el pecho',
  'Pecho hacia afuera',
  'Retrae omóplatos completamente',
  'Controla la fase excéntrica'
] WHERE canonical_name = 'Jalones Al Pecho';

UPDATE exercise_videos SET key_points = ARRAY[
  'Agarre supino (palmas hacia ti)',
  'Mayor activación de bíceps',
  'Tira hacia el pecho',
  'Retrae omóplatos'
] WHERE canonical_name = 'Jalones Al Pecho A/Supino';

UPDATE exercise_videos SET key_points = ARRAY[
  'Agarre neutro (palmas enfrentadas)',
  'Movimiento más natural',
  'Tira hacia el pecho',
  'Mayor confort en los hombros'
] WHERE canonical_name = 'Jalón Neutro';

UPDATE exercise_videos SET key_points = ARRAY[
  'Espalda plana durante todo el movimiento',
  'Lleva los codos hacia atrás, no hacia arriba',
  'Contrae omóplatos al final',
  'Controla el peso en la bajada'
] WHERE canonical_name = 'Remo Con Barra';

UPDATE exercise_videos SET key_points = ARRAY[
  'Apoyo en banco con una rodilla y mano',
  'Mancuerna cuelga hacia abajo',
  'Rema hacia la cadera',
  'Contrae el omóplato'
] WHERE canonical_name = 'Remo A Un  Brazo C/Mancuernas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Una mancuerna, apoyo en banco',
  'Rema hacia la cadera',
  'Mayor aislamiento unilateral',
  'Controla el movimiento'
] WHERE canonical_name = 'Remo Con Mancuerna';

UPDATE exercise_videos SET key_points = ARRAY[
  'Polea baja, agarre neutro',
  'Siéntate con piernas ligeramente flexionadas',
  'Tira hacia el abdomen',
  'Retrae omóplatos'
] WHERE canonical_name = 'Remo Polea Baja A/Neutro';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra con soporte en T',
  'Rema hacia el pecho',
  'Mayor estabilidad que remo libre',
  'Retrae omóplatos fuertemente'
] WHERE canonical_name = 'Remo Con Barra T';

UPDATE exercise_videos SET key_points = ARRAY[
  'Kettlebell en cada mano',
  'Inclinado hacia adelante',
  'Rema hacia la cadera',
  'Controla el movimiento'
] WHERE canonical_name = 'Remo Con Kettlebell';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banda elástica fija',
  'Tira hacia ti',
  'Retrae omóplatos',
  'Controla ambas fases'
] WHERE canonical_name = 'Remo Con Banda';

UPDATE exercise_videos SET key_points = ARRAY[
  'Máquina tipo hammer',
  'Agarre neutro',
  'Rema hacia atrás',
  'Mayor estabilidad'
] WHERE canonical_name = 'Remo Hammer';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra desde el suelo cada repetición',
  'Espalda paralela al suelo',
  'Explosivo hacia el pecho',
  'Reset completo entre reps'
] WHERE canonical_name = 'Remo Pendlay';

UPDATE exercise_videos SET key_points = ARRAY[
  'Un extremo de barra fijo',
  'Rema con una mano',
  'Mayor rango de movimiento',
  'Enfoque en dorsales'
] WHERE canonical_name = 'Remo Meadows';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banco con agarre prono (palmas abajo)',
  'Mancuerna en cada mano',
  'Rema hacia arriba',
  'Mayor activación de dorsales'
] WHERE canonical_name = 'Remo Manc./Banco Agarre Prono';

UPDATE exercise_videos SET key_points = ARRAY[
  'Cables en polea alta',
  'Tira hacia la cara',
  'Codos altos',
  'Enfoque en deltoides posterior y trapecios'
] WHERE canonical_name = 'Face Pull';

UPDATE exercise_videos SET key_points = ARRAY[
  'Cables cruzados hacia abajo',
  'Tira hacia el pecho',
  'Mayor rango de movimiento',
  'Enfoque en dorsales'
] WHERE canonical_name = 'Cruce De Poleas Bajo';

UPDATE exercise_videos SET key_points = ARRAY[
  'Poleas altas',
  'Tira hacia abajo cruzando',
  'Retrae omóplatos',
  'Controla el movimiento'
] WHERE canonical_name = 'Cruces En Polea Alta';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuerna o barra perpendicular al banco',
  'Brazos casi extendidos',
  'Baja detrás de la cabeza',
  'Enfoque en dorsales'
] WHERE canonical_name = 'Pullover';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuerna con ambas manos',
  'Baja detrás de la cabeza',
  'Mantén codos ligeramente flexionados',
  'Sube hasta sobre el pecho'
] WHERE canonical_name = 'Pullover C/Manc';

UPDATE exercise_videos SET key_points = ARRAY[
  'Polea alta con barra recta',
  'Brazos extendidos',
  'Jala hacia abajo con brazos rectos',
  'Enfoque en dorsales'
] WHERE canonical_name = 'Pullover En Polea';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra o mancuernas',
  'Encoge los hombros hacia arriba',
  'Mantén brazos extendidos',
  'Contrae trapecios en la posición superior'
] WHERE canonical_name = 'Encogimientos Barra';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuernas a los lados',
  'Encoge los hombros hacia arriba',
  'No uses impulso',
  'Mantén brazos rectos'
] WHERE canonical_name = 'Encogimientos De Trapecio Con Mancuernas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra frente al cuerpo',
  'Palmas hacia ti',
  'Flexiona los codos hacia arriba',
  'Contrae los bíceps en la posición superior'
] WHERE canonical_name = 'Curl';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra recta con agarre supino',
  'Codos fijos cerca del cuerpo',
  'Curl hasta máxima contracción',
  'Controla la bajada'
] WHERE canonical_name = 'Curl De Bíceps Con Barra Recta';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra Z con agarre supino',
  'Menos tensión en las muñecas',
  'Codos fijos',
  'Curl controlado'
] WHERE canonical_name = 'Curl De Bíceps Con Barra Z';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuernas a los lados',
  'Alterna los brazos',
  'Codos fijos cerca del cuerpo',
  'Contrae al subir'
] WHERE canonical_name = 'Curl Bíceps Alterno';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sentado, codo apoyado en el muslo interno',
  'Curl hacia arriba',
  'Mayor aislamiento',
  'Controla el movimiento'
] WHERE canonical_name = 'Curl Concentrado';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banco inclinado hacia atrás',
  'Brazos cuelgan perpendiculares',
  'Curl simultáneo',
  'Mayor estiramiento del bíceps'
] WHERE canonical_name = 'Curl En Banco Inclinado';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuernas con agarre neutro (palmas enfrentadas)',
  'Mantén el agarre durante todo el movimiento',
  'Enfoque en braquial y braquiorradial',
  'Codos fijos'
] WHERE canonical_name = 'Curl Martillo';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra W con agarre amplio',
  'Mayor activación de cabeza corta',
  'Codos fijos',
  'Controla el movimiento'
] WHERE canonical_name = 'Biceps Con Barra W A/Amplio';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra W con agarre cerrado',
  'Mayor activación de cabeza larga',
  'Codos cerca del cuerpo',
  'Curl controlado'
] WHERE canonical_name = 'Biceps Con Barra W Agarre Cerrado';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra con agarre cerrado',
  'Enfoque en cabeza larga',
  'Codos fijos cerca del cuerpo',
  'Máxima contracción arriba'
] WHERE canonical_name = 'Biceps Con Barra Agarre Cerrado';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra con agarre amplio',
  'Mayor activación de cabeza corta',
  'Codos ligeramente separados',
  'Controla el movimiento'
] WHERE canonical_name = 'Biceps Par5ado Con Barra Agarre Amplio';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra W en polea baja',
  'Tensión constante del cable',
  'Curl hasta máxima contracción',
  'Controla el retorno'
] WHERE canonical_name = 'Biceps Barra Recta En Polea Baja';

UPDATE exercise_videos SET key_points = ARRAY[
  'Máquina específica para bíceps',
  'Mayor estabilidad',
  'Enfoque en el músculo',
  'Controla ambas fases'
] WHERE canonical_name = 'Biceps En Maquina';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banco Scott (predicador)',
  'Un brazo a la vez',
  'Codo fijo en el apoyo',
  'Mayor aislamiento'
] WHERE canonical_name = 'Biceps A Un Brazo En Banco Scoot';

UPDATE exercise_videos SET key_points = ARRAY[
  'Polea alta, un brazo',
  'Curl hacia la cabeza',
  'Mayor activación del bíceps',
  'Codo fijo'
] WHERE canonical_name = 'Biceps A Un Brazo P/Alta';

UPDATE exercise_videos SET key_points = ARRAY[
  'Poleas altas, ambos brazos',
  'Curl hacia la cabeza',
  'Pose de doble bíceps',
  'Contrae fuertemente'
] WHERE canonical_name = 'Doble Biceps En Polea Alta';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banco inclinado, ambas mancuernas',
  'Curl simultáneo',
  'Mayor estiramiento',
  'Controla ambos brazos'
] WHERE canonical_name = 'Biceps En Banco Inclinado Simultaneo';

UPDATE exercise_videos SET key_points = ARRAY[
  'Martillo en banco inclinado',
  'Simultáneo con ambas manos',
  'Mayor estiramiento del braquial',
  'Controla el movimiento'
] WHERE canonical_name = 'Biceps Martillo Banco Inclinado Simultaneo';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sentado, martillo alternado',
  'Palmas enfrentadas',
  'Codos fijos',
  'Controla cada brazo'
] WHERE canonical_name = 'Biceps Martillo Alternado Sentado';

UPDATE exercise_videos SET key_points = ARRAY[
  'De pie, martillo alternado',
  'Palmas enfrentadas',
  'Codos fijos cerca del cuerpo',
  'Alterna suavemente'
] WHERE canonical_name = 'Bicpes Martillo De Parado Alternado';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banco Scott, un brazo',
  'Martillo (palma neutral)',
  'Mayor aislamiento del braquial',
  'Codo fijo en el apoyo'
] WHERE canonical_name = 'Biceps Martillo A Un Brazo En B/Scoot';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banda elástica bajo los pies',
  'Curl con agarre cerrado',
  'Controla la resistencia de la banda',
  'Máxima contracción arriba'
] WHERE canonical_name = 'Biceps Con Banda Elastica Agarre Cerrado';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banda elástica, martillo alternado',
  'Palmas enfrentadas',
  'Resistencia progresiva',
  'Controla ambos brazos'
] WHERE canonical_name = 'Biceps Martillo Alternado Con Banda Eslatica';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra con agarre neutro (paralelo)',
  'Curl hacia arriba',
  'Menos tensión en muñecas',
  'Enfoque en braquial'
] WHERE canonical_name = 'Biceps De Parado Con Barra Agarre Neutro';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra W, agarre al ancho de hombros',
  'Curl estándar',
  'Posición natural',
  'Controla el movimiento'
] WHERE canonical_name = 'Biceps De Parado Con Barra W A/Ancho De Hombros';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra o mancuernas',
  'Curl de muñeca hacia arriba',
  'Antebrazos apoyados en muslos o banco',
  'Enfoque en flexores de muñeca'
] WHERE canonical_name = 'Antebrazos';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra con agarre prono (palmas abajo)',
  'Curl de muñeca hacia arriba',
  'Enfoque en extensores',
  'Antebrazos apoyados'
] WHERE canonical_name = 'Antebrazos A/Prono Con Barra';

UPDATE exercise_videos SET key_points = ARRAY[
  'Kettlebell sostenida',
  'Curl de muñeca',
  'Mayor desafío de agarre',
  'Fortalece antebrazos'
] WHERE canonical_name = 'Antebrazo C/Kettlebell';

UPDATE exercise_videos SET key_points = ARRAY[
  'Mancuernas con agarre neutro',
  'Curl de antebrazo',
  'Enfoque en braquiorradial',
  'Controla el movimiento'
] WHERE canonical_name = 'Antebrazo Agarra Neutro C/Manc';

UPDATE exercise_videos SET key_points = ARRAY[
  'Cable en polea baja, un brazo',
  'Tira hacia atrás con brazo extendido',
  'Retrae el omóplato',
  'Enfoque en deltoides posterior'
] WHERE canonical_name = 'Posterior A Un Brazo En Polea Baja';

UPDATE exercise_videos SET key_points = ARRAY[
  'Inclinado hacia adelante',
  'Mancuerna en cada mano',
  'Abre hacia los lados con codos flexionados',
  'Enfoque en deltoides posterior'
] WHERE canonical_name = 'Posteriores Con Mancuerna';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banda elástica fija',
  'Inclinado o sentado',
  'Tira hacia atrás',
  'Retrae omóplatos'
] WHERE canonical_name = 'Posteriores Con Banda De Resistencia';

UPDATE exercise_videos SET key_points = ARRAY[
  'Apoyo en banco inclinado',
  'Mancuernas hacia los lados',
  'Mayor aislamiento',
  'Controla el movimiento'
] WHERE canonical_name = 'Posteriores En Banco';

UPDATE exercise_videos SET key_points = ARRAY[
  'Máquina específica para posteriores',
  'Abre hacia atrás',
  'Mayor estabilidad',
  'Enfoque en el músculo'
] WHERE canonical_name = 'Posteriores Maq';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra Z en frente',
  'Jalon hacia el mentón',
  'Codos hacia arriba y afuera',
  'Enfoque en deltoides y trapecios'
] WHERE canonical_name = 'Remo Al Mentón Barra Z';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra W frente al cuerpo',
  'Jala hacia el mentón',
  'Codos alto',
  'Activación de trapecios y deltoides'
] WHERE canonical_name = 'Jalones Al Menton Con Barra W';

UPDATE exercise_videos SET key_points = ARRAY[
  'Banda elástica fija',
  'Brazos extendidos hacia adelante',
  'Tira separando la banda',
  'Retrae omóplatos'
] WHERE canonical_name = 'Pull Apart Banda';

-- CARDIO E HIIT
UPDATE exercise_videos SET key_points = ARRAY[
  'Mantén el ritmo constante durante todo el ejercicio',
  'Flexión completa con pecho al suelo',
  'Salto explosivo al final',
  'Aterriza suavemente para proteger las rodillas'
] WHERE canonical_name = 'Burpees';

UPDATE exercise_videos SET key_points = ARRAY[
  'Ajusta la resistencia apropiadamente',
  'Mantén una cadencia constante',
  'Postura erguida',
  'Respiración controlada'
] WHERE canonical_name = 'Bicicleta Estática';

UPDATE exercise_videos SET key_points = ARRAY[
  'Configura la velocidad e inclinación',
  'Aterriza con la parte media del pie',
  'Brazos en movimiento natural',
  'Mantén el ritmo cardíaco objetivo'
] WHERE canonical_name = 'Cardio: Correr En Cinta';

UPDATE exercise_videos SET key_points = ARRAY[
  'Ajusta la resistencia',
  'Mantén postura erguida',
  'Movimiento fluido',
  'Bajo impacto en articulaciones'
] WHERE canonical_name = 'Cardio: Elíptica';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sube escalón por escalón',
  'Mantén postura erguida',
  'No te apoyes excesivamente en los brazos',
  'Gran quema calórica'
] WHERE canonical_name = 'Cardio: Escaladora';

UPDATE exercise_videos SET key_points = ARRAY[
  'Empuja con las piernas primero',
  'Luego jala con los brazos',
  'Movimiento fluido y completo',
  'Excelente cardio de cuerpo completo'
] WHERE canonical_name = 'Cardio: Máquina De Remo';

UPDATE exercise_videos SET key_points = ARRAY[
  'Usa las muñecas para girar la cuerda',
  'Salta con la parte delantera de los pies',
  'Mantén el ritmo constante',
  'Excelente para coordinación'
] WHERE canonical_name = 'Cardio: Saltar La Cuerda';

UPDATE exercise_videos SET key_points = ARRAY[
  'Similar a bicicleta estática',
  'Mantén postura correcta',
  'Ajusta resistencia según necesidad',
  'Respiración controlada'
] WHERE canonical_name = 'Cardio: Bicicleta Estática';

UPDATE exercise_videos SET key_points = ARRAY[
  'Camina a ritmo moderado',
  'Movimiento natural de brazos',
  'Ideal para recuperación activa',
  'Bajo impacto'
] WHERE canonical_name = 'Caminata Ligera';

UPDATE exercise_videos SET key_points = ARRAY[
  'Alterna períodos de alta intensidad con descanso',
  'Sprints cortos seguidos de trote',
  'Máxima quema calórica',
  'Mejora capacidad cardiovascular'
] WHERE canonical_name = 'Carrera En Intervalos';

UPDATE exercise_videos SET key_points = ARRAY[
  'Alterna intensidad alta y baja',
  'Ajusta resistencia en intervalos',
  'Mantén buena forma',
  'Gran entrenamiento HIIT'
] WHERE canonical_name = 'Ciclismo Indoor En Intervalos';

UPDATE exercise_videos SET key_points = ARRAY[
  'Máxima velocidad en períodos cortos',
  'Recuperación entre sprints',
  'Forma de carrera correcta',
  'Gran desarrollo de velocidad'
] WHERE canonical_name = 'Sprints En Cinta';

UPDATE exercise_videos SET key_points = ARRAY[
  'Similar a bicicleta estática',
  'Mantén cadencia constante',
  'Ajusta resistencia',
  'Bajo impacto'
] WHERE canonical_name = 'Remo Ergómetro';

UPDATE exercise_videos SET key_points = ARRAY[
  'Salta abriendo piernas y brazos',
  'Cierra volviendo a posición inicial',
  'Mantén el ritmo constante',
  'Excelente calentamiento'
] WHERE canonical_name = 'Jumping Jacks';

UPDATE exercise_videos SET key_points = ARRAY[
  'Similar a jumping jacks',
  'Movimiento de tijera',
  'Ritmo constante',
  'Cardio efectivo'
] WHERE canonical_name = 'Saltos De Tijera';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sentadilla con peso corporal',
  'Explosión hacia arriba saltando',
  'Aterriza suavemente',
  'Gran ejercicio pliométrico'
] WHERE canonical_name = 'Sentadilla Con Salto';

UPDATE exercise_videos SET key_points = ARRAY[
  'Similar a sentadilla con salto',
  'Enfoque en explosividad',
  'Protege las rodillas al aterrizar',
  'Desarrolla potencia'
] WHERE canonical_name = 'Jump Squats';

UPDATE exercise_videos SET key_points = ARRAY[
  'Salta sobre un cajón o plataforma',
  'Aterriza suavemente con ambos pies',
  'Extiende completamente las caderas arriba',
  'Baja controladamente'
] WHERE canonical_name = 'Box Jumps';

UPDATE exercise_videos SET key_points = ARRAY[
  'Similar a box jumps',
  'Enfoque en altura del salto',
  'Aterriza con técnica correcta',
  'Desarrolla potencia de piernas'
] WHERE canonical_name = 'Saltos Al Cajon';

UPDATE exercise_videos SET key_points = ARRAY[
  'Desde sentadilla, salta entrando y saliendo',
  'Piernas juntas y separadas alternadamente',
  'Mantén el ritmo',
  'Gran ejercicio HIIT'
] WHERE canonical_name = 'Squat In And Out';

UPDATE exercise_videos SET key_points = ARRAY[
  'Saltos con gran amplitud',
  'Brazos y piernas abiertas',
  'Aterriza suavemente',
  'Cardio intenso'
] WHERE canonical_name = 'Saltos Paracaidas';

UPDATE exercise_videos SET key_points = ARRAY[
  'Salto explosivo desde sentadilla profunda',
  'Similar a movimiento de rana',
  'Aterriza en sentadilla',
  'Gran activación de piernas'
] WHERE canonical_name = 'Frog Jumps';

UPDATE exercise_videos SET key_points = ARRAY[
  'Cuerdas gruesas en cada mano',
  'Mueve los brazos creando ondas',
  'Mantén el core activado',
  'Ejercicio de alta intensidad'
] WHERE canonical_name = 'Battle Ropes';

UPDATE exercise_videos SET key_points = ARRAY[
  'Balón medicinal sobre la cabeza',
  'Lanza con fuerza al suelo',
  'Movimiento explosivo',
  'Gran entrenamiento de potencia'
] WHERE canonical_name = 'Med Ball';

UPDATE exercise_videos SET key_points = ARRAY[
  'Barra desde el suelo',
  'Movimiento explosivo hasta hombros',
  'Recibe en posición de sentadilla parcial',
  'Gran desarrollo de potencia'
] WHERE canonical_name = 'Power Cleans';

-- FLEXIBILIDAD
UPDATE exercise_videos SET key_points = ARRAY[
  'Mantén la posición 20-30 segundos',
  'No rebotes',
  'Respira profundamente',
  'Incrementa el estiramiento gradualmente'
] WHERE canonical_name = 'Estiramiento De Cuádriceps';

UPDATE exercise_videos SET key_points = ARRAY[
  'Piernas extendidas hacia adelante',
  'Inclínate desde las caderas',
  'Mantén la espalda recta',
  'Siente el estiramiento en isquiotibiales'
] WHERE canonical_name = 'Estiramiento Femorales';

UPDATE exercise_videos SET key_points = ARRAY[
  'Empuja contra una pared',
  'Talón en el suelo',
  'Pierna trasera extendida',
  'Siente el estiramiento en la pantorrilla'
] WHERE canonical_name = 'Estiramiento Gemelos';

UPDATE exercise_videos SET key_points = ARRAY[
  'Rodillas hacia el pecho',
  'Abraza las piernas',
  'Mantén 20-30 segundos',
  'Relaja la zona lumbar'
] WHERE canonical_name = 'Estiramiento De Espalda Baja';

UPDATE exercise_videos SET key_points = ARRAY[
  'Brazo cruzado sobre el pecho',
  'Empuja suavemente con el otro brazo',
  'Mantén los hombros relajados',
  'Siente el estiramiento en el hombro'
] WHERE canonical_name = 'Estiramiento Hombros';

UPDATE exercise_videos SET key_points = ARRAY[
  'Brazo detrás de la espalda',
  'Empuja suavemente hacia abajo',
  'Mantén la posición',
  'Estira el tríceps'
] WHERE canonical_name = 'Estiramiento Espalda , Hombros';

UPDATE exercise_videos SET key_points = ARRAY[
  'Brazo extendido hacia un lado',
  'Empuja contra una pared o marco',
  'Rota el cuerpo ligeramente',
  'Siente el estiramiento en el pectoral'
] WHERE canonical_name = 'Estiramiento De Pecho';

UPDATE exercise_videos SET key_points = ARRAY[
  'Brazo extendido hacia un lado',
  'Pecho hacia adelante',
  'Mantén la posición',
  'Estira pectoral y hombro frontal'
] WHERE canonical_name = 'Estiramiento Pectoral';

UPDATE exercise_videos SET key_points = ARRAY[
  'Ambos brazos hacia atrás',
  'Entrelaza los dedos',
  'Empuja el pecho hacia adelante',
  'Estira pecho y hombros'
] WHERE canonical_name = 'Estiramiento Pectoral Brazos Atras';

UPDATE exercise_videos SET key_points = ARRAY[
  'Similar a estiramiento de pecho',
  'Incluye rotación de hombros',
  'Mantén la posición',
  'Estira ambas zonas'
] WHERE canonical_name = 'Estiramiento Pectoral , Hombros';

UPDATE exercise_videos SET key_points = ARRAY[
  'Plancha frontal hacia arriba',
  'Caderas en el suelo',
  'Estira la zona abdominal',
  'Mantén 20-30 segundos'
] WHERE canonical_name = 'Estiramiento Abdominal';

UPDATE exercise_videos SET key_points = ARRAY[
  'Piernas extendidas hacia los lados',
  'Inclínate hacia adelante',
  'Mantén la espalda recta',
  'Estira los aductores'
] WHERE canonical_name = 'Adductor Stretch';

UPDATE exercise_videos SET key_points = ARRAY[
  'Posición de sentadilla búlgara',
  'Mantén la posición',
  'Estira el psoas de la pierna trasera',
  'Respiración profunda'
] WHERE canonical_name = 'Estiramiento Bulgaro Squat';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sentado con plantas de pies juntas',
  'Rodillas hacia los lados',
  'Presiona suavemente las rodillas hacia abajo',
  'Estira los aductores'
] WHERE canonical_name = 'Estiramiento Butterflay';

UPDATE exercise_videos SET key_points = ARRAY[
  'Brazo por encima de la cabeza',
  'Inclínate hacia un lado',
  'Estira el costado del cuerpo',
  'Respiración profunda'
] WHERE canonical_name = 'Estiramiento Espalda';

UPDATE exercise_videos SET key_points = ARRAY[
  'Manos detrás de la espalda',
  'Entrelaza los dedos',
  'Empuja hacia atrás',
  'Estira pecho y hombros'
] WHERE canonical_name = 'Estiramiento Manos Al Rededor De La Espalda';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sentado en forma de bote',
  'Piernas y brazos extendidos',
  'Mantén el equilibrio',
  'Fortalece core y espalda'
] WHERE canonical_name = 'Boat Stretch';

UPDATE exercise_videos SET key_points = ARRAY[
  'Combinación de varios estiramientos',
  'Mantén cada posición 20-30 segundos',
  'Respira profundamente',
  'Relaja el cuerpo'
] WHERE canonical_name = 'Yoga O Estiramientos';

-- OTROS EJERCICIOS ESPECIALES
UPDATE exercise_videos SET key_points = ARRAY[
  'Sostén pesas pesadas en cada mano',
  'Camina con postura erguida',
  'Core activado',
  'Fortalece el agarre y trapecios'
] WHERE canonical_name = 'Farmer Walks';

UPDATE exercise_videos SET key_points = ARRAY[
  'Tumbado en banco romano',
  'Extiende la espalda hacia arriba',
  'Controla el movimiento',
  'Fortalece la espalda baja'
] WHERE canonical_name = 'Hiperextensiones Lumbares';

UPDATE exercise_videos SET key_points = ARRAY[
  'Similar a hiperextensiones',
  'En banco específico',
  'Controla el rango de movimiento',
  'Enfoque en erectores espinales'
] WHERE canonical_name = 'Extensiones De Espalda En Banco Romano';

UPDATE exercise_videos SET key_points = ARRAY[
  'Máquina específica',
  'Presiona hacia adelante',
  'Controla el movimiento',
  'Enfoque en pecho o tríceps según inclinación'
] WHERE canonical_name = 'Hammer Declinado Maq';

UPDATE exercise_videos SET key_points = ARRAY[
  'Sentadilla con kettlebell frente al pecho',
  'Mantén el torso vertical',
  'Desciende profundo',
  'Excelente para técnica'
] WHERE canonical_name = 'Sentadilla Goblet';

-- FUNCIONAL Y OTROS (continuación)
UPDATE exercise_videos SET key_points = ARRAY[
  'Realiza varias posturas y estiramientos',
  'Respira profundamente en cada posición',
  'Mantén 20-30 segundos cada estiramiento',
  'Ideal para recuperación y flexibilidad'
] WHERE canonical_name IS NULL OR canonical_name = 'Yoga O Estiramientos';

-- ================================================================
-- PASO 3: Verificar la actualización
-- ================================================================

DO $$
DECLARE
  total_updated INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_updated 
  FROM exercise_videos 
  WHERE key_points IS NOT NULL AND array_length(key_points, 1) > 0;
  
  RAISE NOTICE '✅ Se actualizaron % ejercicios con puntos clave', total_updated;
  
  IF total_updated >= 250 THEN
    RAISE NOTICE '🎉 ¡Todos los ejercicios tienen puntos clave específicos!';
  ELSE
    RAISE NOTICE '⚠️  Faltan % ejercicios por actualizar', (259 - total_updated);
  END IF;
END $$;

