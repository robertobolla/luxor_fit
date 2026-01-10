/**
 * Servicio de IA para generar contenido personalizado
 * Integración con ChatGPT (OpenAI API)
 */

import { supabase } from './supabase';

interface UserProfile {
  name: string;
  age: number;
  fitness_level: string;
  goals: string[];
  available_days: number;
  session_duration: number;
  equipment: string[];
  gender?: string;
}

interface AIResponse {
  success: boolean;
  introduction?: string;
  error?: string;
}

// Configuración de la API de OpenAI
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Genera una introducción personalizada del plan de entrenamiento
 */
export async function generatePlanIntroduction(userData: UserProfile, language: 'es' | 'en' = 'es'): Promise<AIResponse> {
  try {
    // Si no hay API key, usar texto por defecto
    if (!OPENAI_API_KEY || OPENAI_API_KEY === '') {
      console.warn('⚠️ OpenAI API Key no configurada, usando texto por defecto');
      return {
        success: true,
        introduction: generateDefaultIntroduction(userData),
      };
    }

    console.log('🤖 Generando introducción con IA...');
    console.log('📋 Datos del usuario:', userData);
    console.log('🌍 Idioma:', language);

    // Construir el prompt para ChatGPT
    const prompt = buildPrompt(userData, language);
    console.log('📝 Prompt construido:', prompt.substring(0, 200) + '...');

    const systemMessage = language === 'en' 
      ? 'You are an expert and motivating personal trainer. Your job is to create personalized and motivating introductions for workout plans. Be specific, positive and realistic. Use a friendly and approachable tone in English.'
      : 'Eres un entrenador personal experto y motivador. Tu trabajo es crear introducciones personalizadas y motivadoras para planes de entrenamiento. Sé específico, positivo y realista. Usa un tono amigable y cercano en español.';

    // Llamar a la API de OpenAI con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      console.error('❌ Error de OpenAI API:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      // Fallback a texto por defecto si hay error
      return {
        success: true,
        introduction: generateDefaultIntroduction(userData),
      };
    }

    const data = await response.json();
    const introduction = data.choices[0]?.message?.content?.trim();

    if (!introduction) {
      console.warn('⚠️ Respuesta vacía de OpenAI, usando texto por defecto');
      return {
        success: true,
        introduction: generateDefaultIntroduction(userData),
      };
    }

    console.log('✅ Introducción generada exitosamente');
    return {
      success: true,
      introduction,
    };
  } catch (error) {
    console.error('❌ Error al generar introducción con IA:', error);
    
    // Determinar el tipo de error
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('⏰ Timeout en la llamada a OpenAI');
      } else if (error.message.includes('Network request failed')) {
        console.error('🌐 Error de red - verificar conexión a internet');
      } else {
        console.error('🔧 Error técnico:', error.message);
      }
    }
    
    // Fallback a texto por defecto en caso de error
    console.log('🔄 Usando introducción por defecto');
    return {
      success: true,
      introduction: generateDefaultIntroduction(userData),
    };
  }
}

/**
 * Construye el prompt para ChatGPT
 */
function buildPrompt(userData: UserProfile, language: 'es' | 'en' = 'es'): string {
  if (language === 'en') {
    const fitnessLevelText = {
      beginner: 'beginner',
      intermediate: 'intermediate',
      advanced: 'advanced',
    }[userData.fitness_level] || userData.fitness_level;

    const goalsText = userData.goals.map(goal => {
      const goalMap: { [key: string]: string } = {
        weight_loss: 'lose fat',
        muscle_gain: 'gain muscle',
        strength: 'increase strength',
        endurance: 'improve endurance',
        flexibility: 'improve flexibility',
        general_fitness: 'maintain general fitness',
      };
      return goalMap[goal] || goal;
    }).join(', ');

    const equipmentText = userData.equipment.map(eq => {
      const equipmentMap: { [key: string]: string } = {
        none: 'bodyweight only',
        dumbbells: 'dumbbells',
        barbell: 'barbell',
        resistance_bands: 'resistance bands',
        pull_up_bar: 'pull-up bar',
        bench: 'bench',
        bench_dumbbells: 'bench and dumbbells',
        bench_barbell: 'bench with barbell',
        gym_access: 'full gym',
        kettlebell: 'kettlebell',
        cable_machine: 'cable machine',
        smith_machine: 'smith machine',
        leg_press: 'leg press',
        medicine_ball: 'medicine ball',
        yoga_mat: 'yoga mat',
      };
      return equipmentMap[eq] || eq;
    }).join(', ');

    return `
Create a personalized and motivating introduction (maximum 3 paragraphs) for a workout plan with the following information:

- Name: ${userData.name}
- Age: ${userData.age} years old
- Fitness level: ${fitnessLevelText}
- Goals: ${goalsText}
- Availability: ${userData.available_days} days per week, ${userData.session_duration} minutes per session
- Available equipment: ${equipmentText}

The introduction should:
1. Be motivating and personalized
2. Specifically mention their goals and how we'll achieve them
3. Explain how their availability and equipment will adapt to the plan
4. Be realistic about expected results
5. Generate enthusiasm to start

Don't use headings or special formatting, just flowing text in paragraphs.
`.trim();
  } else {
    const fitnessLevelText = {
      beginner: 'principiante',
      intermediate: 'intermedio',
      advanced: 'avanzado',
    }[userData.fitness_level] || userData.fitness_level;

    const goalsText = userData.goals.map(goal => {
      const goalMap: { [key: string]: string } = {
        weight_loss: 'bajar grasa',
        muscle_gain: 'ganar músculo',
        strength: 'aumentar fuerza',
        endurance: 'mejorar resistencia',
        flexibility: 'mejorar flexibilidad',
        general_fitness: 'mantener forma general',
      };
      return goalMap[goal] || goal;
    }).join(', ');

    const equipmentText = userData.equipment.map(eq => {
      const equipmentMap: { [key: string]: string } = {
        none: 'solo peso corporal',
        dumbbells: 'mancuernas',
        barbell: 'barra olímpica',
        resistance_bands: 'bandas de resistencia',
        pull_up_bar: 'barra de dominadas',
        bench: 'banco',
        bench_dumbbells: 'banco y mancuernas',
        bench_barbell: 'banco con barra',
        gym_access: 'gimnasio completo',
        kettlebell: 'kettlebell',
        cable_machine: 'máquina de poleas',
        smith_machine: 'máquina Smith',
        leg_press: 'prensa de piernas',
        medicine_ball: 'balón medicinal',
        yoga_mat: 'mat de yoga',
      };
      return equipmentMap[eq] || eq;
    }).join(', ');

    return `
Crea una introducción personalizada y motivadora (máximo 3 párrafos) para un plan de entrenamiento con los siguientes datos:

- Nombre: ${userData.name}
- Edad: ${userData.age} años
- Nivel de fitness: ${fitnessLevelText}
- Objetivos: ${goalsText}
- Disponibilidad: ${userData.available_days} días por semana, ${userData.session_duration} minutos por sesión
- Equipamiento disponible: ${equipmentText}

La introducción debe:
1. Ser motivadora y personalizada
2. Mencionar específicamente sus objetivos y cómo los lograremos
3. Explicar cómo su disponibilidad y equipamiento se adaptarán al plan
4. Ser realista sobre los resultados esperados
5. Generar entusiasmo para comenzar

No uses encabezados ni formato especial, solo texto corrido en párrafos.
`.trim();
  }
}

/**
 * Genera una introducción por defecto cuando no hay API key o hay error
 */
function generateDefaultIntroduction(userData: UserProfile): string {
  const fitnessLevelText = {
    beginner: 'principiante',
    intermediate: 'intermedio',
    advanced: 'avanzado',
  }[userData.fitness_level] || userData.fitness_level;

  const primaryGoal = userData.goals[0] || 'general_fitness';
  const goalText = {
    weight_loss: 'perder peso',
    muscle_gain: 'ganar músculo',
    strength: 'aumentar tu fuerza',
    endurance: 'mejorar tu resistencia',
    flexibility: 'mejorar tu flexibilidad',
    general_fitness: 'mantener una buena forma física',
  }[primaryGoal] || 'alcanzar tus objetivos';

  return `¡Hola ${userData.name}! Estamos emocionados de comenzar este viaje contigo. Basándonos en tu perfil como ${fitnessLevelText} y tu objetivo principal de ${goalText}, hemos diseñado un plan que se adapta perfectamente a tus ${userData.available_days} días disponibles por semana y tus sesiones de ${userData.session_duration} minutos.

Tu plan combina ejercicios que se alinean con tus preferencias de entrenamiento y aprovecha al máximo el equipamiento que tienes disponible. Cada rutina está diseñada para ser desafiante pero alcanzable, permitiéndote progresar de manera constante hacia tus metas.

Recuerda que la consistencia es clave. Con tu dedicación y nuestro plan personalizado, verás resultados reales. ¡Estamos aquí para apoyarte en cada paso del camino!`;
}

/**
 * Analiza el feedback del usuario de entrenamientos completados
 */
interface WorkoutFeedback {
  avgDifficulty: number;
  completedExercises: string[];
  skippedExercises: string[];
  commonNotes: string;
  totalCompletions: number;
}

async function analyzeWorkoutFeedback(userId: string): Promise<WorkoutFeedback | null> {
  try {
    // Obtener últimos 10 entrenamientos completados con plan_id para comparar
    const { data: completions, error } = await supabase
      .from('workout_completions')
      .select('difficulty_rating, notes, exercises_completed, workout_plan_id, day_name')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error obteniendo feedback:', error);
      return null;
    }

    if (!completions || completions.length === 0) {
      console.log('📊 No hay historial de entrenamientos para analizar');
      return null;
    }

    // Calcular dificultad promedio
    const validRatings = completions
      .map(c => c.difficulty_rating)
      .filter((r): r is number => r !== null && r !== undefined && r > 0);
    
    const avgDifficulty = validRatings.length > 0
      ? validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length
      : 0;

    // Analizar ejercicios completados
    // Por ahora, analizamos solo los ejercicios que aparecen en completions
    // En el futuro se puede mejorar comparando con el plan original
    const exerciseCounts: { [key: string]: { completed: number; total: number } } = {};
    
    completions.forEach(completion => {
      const exercises = completion.exercises_completed;
      if (Array.isArray(exercises) && exercises.length > 0) {
        exercises.forEach((ex: any) => {
          // El ejercicio puede venir como string o como objeto con name
          const exerciseName = typeof ex === 'string' ? ex : (ex?.name || ex?.exercise_name || '');
          if (exerciseName && exerciseName.trim()) {
            const normalizedName = exerciseName.trim();
            if (!exerciseCounts[normalizedName]) {
              exerciseCounts[normalizedName] = { completed: 0, total: 0 };
            }
            exerciseCounts[normalizedName].total++;
            // Si el ejercicio está en exercises_completed, se completó
            exerciseCounts[normalizedName].completed++;
          }
        });
      }
    });

    // Identificar ejercicios completados consistentemente (>80% de las veces)
    const completedExercises = Object.entries(exerciseCounts)
      .filter(([_, counts]) => counts.total >= 2 && (counts.completed / counts.total) >= 0.8)
      .map(([name, _]) => name);

    // Identificar ejercicios frecuentemente saltados (<50% de las veces)
    const skippedExercises = Object.entries(exerciseCounts)
      .filter(([_, counts]) => counts.total >= 2 && (counts.completed / counts.total) < 0.5)
      .map(([name, _]) => name);

    // Extraer notas comunes
    const notes = completions
      .map(c => c.notes)
      .filter((n): n is string => n !== null && n !== undefined && n.trim().length > 0);
    
    const commonNotes = notes.length > 0
      ? notes.slice(0, 3).join('; ') // Tomar las primeras 3 notas
      : '';

    console.log('📊 Análisis de feedback:', {
      avgDifficulty: avgDifficulty.toFixed(1),
      completedExercises: completedExercises.length,
      skippedExercises: skippedExercises.length,
      totalCompletions: completions.length,
    });

    return {
      avgDifficulty,
      completedExercises,
      skippedExercises,
      commonNotes,
      totalCompletions: completions.length,
    };
  } catch (error) {
    console.error('Error analizando feedback:', error);
    return null;
  }
}

/**
 * Genera una rutina de entrenamiento personalizada
 */
export async function generateWorkoutPlan(
  userData: UserProfile,
  userId?: string
): Promise<any> {
  try {
    // Si no hay API key, usar plan por defecto
    if (!OPENAI_API_KEY || OPENAI_API_KEY === '') {
      console.warn('⚠️ OpenAI API Key no configurada, usando plan por defecto');
      return {
        success: true,
        plan: enrichPlanWithProgression(generateDefaultWorkoutPlan(userData), userData.fitness_level),
      };
    }

    // Analizar feedback si tenemos userId
    let feedback: WorkoutFeedback | null = null;
    if (userId) {
      feedback = await analyzeWorkoutFeedback(userId);
    }

    // Construir el prompt para generar el plan (con feedback si está disponible)
    const prompt = await buildWorkoutPrompt(userData, feedback);

    // Llamar a la API de OpenAI
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Eres un entrenador personal certificado con más de 10 años de experiencia, especializado en entrenamiento de fuerza, hipertrofia, recomposición corporal y acondicionamiento general, con un enfoque estrictamente basado en evidencia científica. Creas planes de entrenamiento PROFESIONALES, REALISTAS, ESTRUCTURADOS y ESCALABLES. Siempre usas RIR (Reps In Reserve) para indicar intensidad.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error de OpenAI API:', errorData);
      
      // Fallback a plan por defecto con progresión
      return {
        success: true,
        plan: enrichPlanWithProgression(generateDefaultWorkoutPlan(userData), userData.fitness_level),
      };
    }

    const data = await response.json();
    const planText = data.choices[0]?.message?.content?.trim();

    if (!planText) {
      return {
        success: false,
        error: 'No se pudo generar el plan',
      };
    }

    // Parseo robusto del plan
    try {
      let plan = parsePlanSafely(planText);
      if (plan) {
        // Validar que el plan tenga el número correcto de días
        const requestedDays = userData.available_days;
        const actualDays = plan.weekly_structure?.length || 0;
        
        if (actualDays !== requestedDays) {
          console.warn(`⚠️ IA generó ${actualDays} días pero se solicitaron ${requestedDays}. Ajustando...`);
          
          // Ajustar el plan para tener el número correcto de días
          if (actualDays < requestedDays) {
            // Agregar días faltantes duplicando días existentes
            const daysToAdd = requestedDays - actualDays;
            for (let i = 0; i < daysToAdd; i++) {
              const dayIndex = i % actualDays;
              const dayToCopy = plan.weekly_structure[dayIndex];
              plan.weekly_structure.push({
                ...JSON.parse(JSON.stringify(dayToCopy)),
                day: `Día ${actualDays + i + 1}`,
              });
            }
          } else if (actualDays > requestedDays) {
            // Reducir al número solicitado
            plan.weekly_structure = plan.weekly_structure.slice(0, requestedDays);
          }
          
          // Actualizar days_per_week
          plan.days_per_week = plan.weekly_structure.length;
        }
        
        // Enriquecer el plan con progresión de series (calentamiento, RIR progresivo, al fallo)
        console.log('🔧 Enriqueciendo plan con progresión de series...');
        plan = enrichPlanWithProgression(plan, userData.fitness_level);
        
        return { success: true, plan };
      }
      console.warn('⚠️ Plan inválido tras intentos de limpieza. Usando plan por defecto.');
      return { success: true, plan: enrichPlanWithProgression(generateDefaultWorkoutPlan(userData), userData.fitness_level) };
    } catch (parseError) {
      console.error('Error al parsear plan:', parseError);
      return { success: true, plan: enrichPlanWithProgression(generateDefaultWorkoutPlan(userData), userData.fitness_level) };
    }
  } catch (error) {
    console.error('Error al generar plan de entrenamiento:', error);
    
    // Fallback a plan por defecto con progresión
    return {
      success: true,
      plan: enrichPlanWithProgression(generateDefaultWorkoutPlan(userData), userData.fitness_level),
    };
  }
}

/**
 * Enriquece los ejercicios de un plan con estructura de progresión (setTypes)
 * Transforma el formato simple "8-10 @ RIR 2" al formato con series individuales
 */
export function enrichPlanWithProgression(plan: any, fitnessLevel: string = 'intermediate'): any {
  if (!plan || !plan.weekly_structure) return plan;
  
  const enrichedPlan = { ...plan };
  
  enrichedPlan.weekly_structure = plan.weekly_structure.map((day: any) => {
    if (!day.exercises) return day;
    
    return {
      ...day,
      exercises: day.exercises.map((exercise: any, exerciseIndex: number) => {
        return enrichExerciseWithProgression(exercise, fitnessLevel, exerciseIndex === 0);
      }),
    };
  });
  
  return enrichedPlan;
}

/**
 * Determina si un ejercicio es de abdominales o peso corporal (sin RIR, más reps permitidas)
 */
function isAbsOrBodyweightExercise(name: string): boolean {
  const absKeywords = [
    'abdominal', 'crunch', 'plancha', 'plank', 'sit-up', 'situp',
    'oblicuo', 'core', 'dead bug', 'dragon flag', 'leg raise',
    'elevacion de piernas', 'russian twist', 'giros rusos'
  ];
  const bodyweightKeywords = [
    'flexiones', 'push-up', 'pushup', 'push up',
    'dominadas', 'pull-up', 'pullup', 'pull up', 
    'fondos', 'dips', 'burpees', 'jumping jack',
    'mountain climber', 'escalador'
  ];
  
  const lowerName = (name || '').toLowerCase();
  return absKeywords.some(k => lowerName.includes(k)) || 
         bodyweightKeywords.some(k => lowerName.includes(k));
}

/**
 * Enriquece un ejercicio individual con setTypes y progresión
 * Reglas:
 * - Máximo 12 reps, terminar por debajo de 10
 * - Ejercicios de abs/peso corporal: más reps permitidas, sin RIR
 */
function enrichExerciseWithProgression(
  exercise: any, 
  fitnessLevel: string = 'intermediate',
  isFirstExercise: boolean = false
): any {
  // Si ya tiene setTypes completos, no modificar
  if (exercise.setTypes && exercise.setTypes.length > 0 && exercise.setTypes[0].type) {
    return exercise;
  }
  
  const exerciseName = exercise.name || '';
  const isAbsOrBodyweight = isAbsOrBodyweightExercise(exerciseName);
  
  // Parsear el formato de reps: "8-10 @ RIR 2" o "10" o "8-10"
  const repsString = String(exercise.reps || '10');
  let { minReps, maxReps, baseRir } = parseRepsString(repsString);
  
  // Aplicar límites de repeticiones para ejercicios normales (no abs/bodyweight)
  if (!isAbsOrBodyweight) {
    // Máximo 12 reps para empezar
    maxReps = Math.min(maxReps, 12);
    // Mínimo terminar por debajo de 10
    minReps = Math.min(minReps, 8);
    // Asegurar que maxReps >= minReps
    if (maxReps < minReps) {
      maxReps = minReps + 2;
    }
  }
  
  const numWorkingSets = exercise.sets || 4;
  const restSeconds = parseRestToSeconds(exercise.rest);
  
  // Configuración según nivel
  const levelConfig = {
    beginner: { warmupSets: 1, useFailure: false, startRir: 4, endRir: 3 },
    intermediate: { warmupSets: 2, useFailure: true, startRir: 3, endRir: 1 },
    advanced: { warmupSets: 2, useFailure: true, startRir: 2, endRir: 0 },
  }[fitnessLevel] || { warmupSets: 2, useFailure: true, startRir: 3, endRir: 1 };
  
  // Solo agregar calentamiento al PRIMER ejercicio del día (no para abs/bodyweight)
  const warmupCount = (isFirstExercise && !isAbsOrBodyweight) ? levelConfig.warmupSets : 0;
  
  const setTypes: any[] = [];
  const repsArray: number[] = [];
  
  // Agregar series de calentamiento
  for (let i = 0; i < warmupCount; i++) {
    setTypes.push({ type: 'warmup', reps: null, rir: null });
    repsArray.push(0);
  }
  
  // Calcular progresión de RIR y reps para series de trabajo
  const rirRange = levelConfig.startRir - levelConfig.endRir;
  const repsRange = maxReps - minReps;
  
  for (let i = 0; i < numWorkingSets; i++) {
    const progress = i / Math.max(numWorkingSets - 1, 1); // 0 a 1
    
    // Reps bajan progresivamente (más peso = menos reps)
    const currentReps = Math.round(maxReps - (repsRange * progress));
    
    // Para ejercicios de abs/bodyweight: sin RIR, solo reps
    if (isAbsOrBodyweight) {
      setTypes.push({
        type: 'normal',
        reps: currentReps,
        rir: null, // Sin RIR para abs/bodyweight
      });
    } else {
      // RIR baja progresivamente (más intensidad)
      const currentRir = Math.round(levelConfig.startRir - (rirRange * progress));
      
      // Última serie puede ser al fallo para intermedios/avanzados
      const isLastSet = i === numWorkingSets - 1;
      const isFailureSet = isLastSet && levelConfig.useFailure && currentRir <= 1;
      
      setTypes.push({
        type: isFailureSet ? 'failure' : 'normal',
        reps: currentReps,
        rir: isFailureSet ? 0 : currentRir,
      });
    }
    
    repsArray.push(currentReps);
  }
  
  return {
    ...exercise,
    sets: warmupCount + numWorkingSets,
    reps: repsArray,
    setTypes,
    rest_seconds: restSeconds,
  };
}

/**
 * Parsea el string de reps para extraer valores
 */
function parseRepsString(repsString: string): { minReps: number; maxReps: number; baseRir: number | null } {
  // Formato: "8-10 @ RIR 2" o "10" o "8-10"
  const rirMatch = repsString.match(/@\s*RIR\s*(\d+)/i);
  const baseRir = rirMatch ? parseInt(rirMatch[1]) : null;
  
  // Extraer rango de reps
  const repsOnlyString = repsString.replace(/@.*$/, '').trim();
  const rangeMatch = repsOnlyString.match(/(\d+)\s*[-–]\s*(\d+)/);
  
  if (rangeMatch) {
    return {
      minReps: parseInt(rangeMatch[1]),
      maxReps: parseInt(rangeMatch[2]),
      baseRir,
    };
  }
  
  // Si es un número único
  const singleMatch = repsOnlyString.match(/(\d+)/);
  const reps = singleMatch ? parseInt(singleMatch[1]) : 10;
  
  return {
    minReps: Math.max(reps - 2, 4),
    maxReps: reps,
    baseRir,
  };
}

/**
 * Convierte string de descanso a segundos
 */
function parseRestToSeconds(rest: string | number | undefined): number {
  if (typeof rest === 'number') return rest;
  if (!rest) return 90;
  
  const match = String(rest).match(/(\d+)/);
  if (match) {
    const value = parseInt(match[0]);
    // Si es mayor a 300, probablemente ya está en segundos
    // Si es menor, probablemente está en formato "90s" o "2min"
    if (value > 300) return value;
    if (String(rest).toLowerCase().includes('min')) return value * 60;
    return value;
  }
  return 90;
}

/**
 * Determina si un ejercicio es compuesto (necesita calentamiento)
 */
function isCompoundExercise(name: string): boolean {
  const compoundKeywords = [
    'press', 'sentadilla', 'squat', 'peso muerto', 'deadlift', 
    'dominadas', 'pull-up', 'remo', 'row', 'hip thrust',
    'zancadas', 'lunges', 'fondos', 'dips'
  ];
  const lowerName = (name || '').toLowerCase();
  return compoundKeywords.some(keyword => lowerName.includes(keyword));
}

/**
 * Intenta extraer y parsear JSON aunque venga con fences, texto extra o comas colgantes.
 */
function parsePlanSafely(raw: string): any | null {
  if (!raw) return null;

  const text = raw.trim();
  // 1) Extraer bloque dentro de ``` ``` si existe
  let candidate = extractCodeFenceJson(text);
  if (!candidate) candidate = text;

  // 2) Extraer primer objeto JSON balanceado { ... }
  const balanced = extractBalancedJsonObject(candidate);
  const jsonStr = cleanJsonString(balanced || candidate);

  try {
    return JSON.parse(jsonStr);
  } catch {
    // 3) Segundo intento: quitar comas colgantes y normalizar quotes
    const repaired = jsonStr
      .replace(/,\s*(\}|\])/g, '$1')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, '"');
    try {
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

function extractCodeFenceJson(text: string): string | null {
  const fenceMatch = text.match(/```(?:json)?\n([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) return fenceMatch[1].trim();
  return null;
}

function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }
  return null;
}

function cleanJsonString(s: string): string {
  return s
    .replace(/^\s*```json\s*/i, '')
    .replace(/^\s*```\s*/i, '')
    .replace(/```\s*$/i, '')
    .replace(/[\u00A0\u200B\u200C\u200D]/g, '') // espacios invisibles
    .trim();
}

/**
 * Construye el prompt profesional para generar un plan de entrenamiento
 * Basado en evidencia científica y mejores prácticas de entrenamiento
 */
async function buildWorkoutPrompt(
  userData: UserProfile,
  feedback: WorkoutFeedback | null = null
): Promise<string> {
  const fitnessLevelText = {
    beginner: 'principiante',
    intermediate: 'intermedio',
    advanced: 'avanzado',
  }[userData.fitness_level] || userData.fitness_level;

  const goalsText = userData.goals.map(goal => {
    const goalMap: { [key: string]: string } = {
      weight_loss: 'pérdida de grasa',
      muscle_gain: 'ganancia muscular',
      strength: 'aumento de fuerza',
      endurance: 'mejora de resistencia',
      flexibility: 'mejora de flexibilidad',
      general_fitness: 'acondicionamiento general',
    };
    return goalMap[goal] || goal;
  }).join(', ');

  const equipmentText = userData.equipment.map(eq => {
    const equipmentMap: { [key: string]: string } = {
      none: 'solo peso corporal',
      dumbbells: 'mancuernas',
      barbell: 'barra olímpica',
      resistance_bands: 'bandas de resistencia',
      pull_up_bar: 'barra de dominadas',
      bench: 'banco',
      bench_dumbbells: 'banco y mancuernas',
      bench_barbell: 'banco con barra',
      gym_access: 'gimnasio completo',
      kettlebell: 'kettlebell',
      cable_machine: 'máquina de poleas',
      smith_machine: 'máquina Smith',
      leg_press: 'prensa de piernas',
      medicine_ball: 'balón medicinal',
      yoga_mat: 'mat de yoga',
    };
    return equipmentMap[eq] || eq;
  }).join(', ');

  const genderMap: Record<string, string> = {
    male: 'Masculino',
    female: 'Femenino',
    other: 'Otro'
  };
  const genderText = (userData.gender && genderMap[userData.gender]) || userData.gender || 'No especificado';

  // Calcular número de ejercicios basado en duración (15 min por ejercicio)
  const numExercises = Math.floor(userData.session_duration / 15);

  return `
Eres un entrenador personal certificado especializado en BODYBUILDING e HIPERTROFIA con más de 10 años de experiencia.

⚠️ TIPO DE RUTINA: BODYBUILDING / HIPERTROFIA EXCLUSIVAMENTE
- NUNCA incluyas días de potencia, pliometría, deportes, funcional o crossfit
- TODOS los días deben ser de FUERZA e HIPERTROFIA
- Enfoques permitidos: Push/Pull/Legs, Upper/Lower, Full Body, Torso/Pierna, PPL
- PROHIBIDO: días de cardio puro, días de potencia, días de pliometría, días de acondicionamiento

PERFIL DEL USUARIO

Género: ${genderText}
Edad: ${userData.age} años
Nivel actual: ${fitnessLevelText}
Objetivos: ${goalsText}
Disponibilidad: ${userData.available_days} días por semana
Duración por sesión: ${userData.session_duration} minutos
Equipamiento disponible: ${equipmentText}

REGLAS ESTRUCTURALES OBLIGATORIAS

1. Duración fija: 12 semanas
2. Cada ejercicio = 15 minutos
3. Número de ejercicios por sesión = ${userData.session_duration} ÷ 15 = ${numExercises} ejercicios EXACTOS
4. Base del plan: HIPERTROFIA y FUERZA (estilo bodybuilding)

ESTRUCTURA DE DÍAS SEGÚN DISPONIBILIDAD:
- 3 días: Full Body x3 o Push/Pull/Legs
- 4 días: Upper/Lower x2 o Push/Pull/Upper/Lower
- 5 días: Push/Pull/Legs/Upper/Lower o PPL + Upper/Lower
- 6 días: Push/Pull/Legs x2

EJERCICIOS - REGLAS:

1. Usa ejercicios de gimnasio tradicionales de bodybuilding
2. Prioriza compuestos: Press banca, Sentadilla, Peso muerto, Dominadas, Remo, Press militar
3. Complementa con aislamiento: Curl bíceps, Extensiones tríceps, Elevaciones laterales, etc.
4. PROHIBIDO: Box jumps, burpees, battle ropes, cleans, snatches, ejercicios de crossfit

⚠️ INTENSIDAD CON RIR - OBLIGATORIO EN CADA EJERCICIO

El campo "reps" DEBE incluir el RIR. Formato: "8-10 @ RIR 2"

REGLAS DE REPETICIONES:
- MÁXIMO 12 reps para empezar una progresión
- MÍNIMO terminar con 8 reps o menos (nunca más de 9 en la serie final)
- Rango típico: iniciar 10-12 reps, terminar 6-8 reps

EXCEPCIONES (SIN RIR, MÁS REPS PERMITIDAS):
- Ejercicios de ABDOMINALES: 15-20 reps, sin RIR
- Ejercicios de PESO CORPORAL (dominadas, flexiones, fondos): 8-15 reps, sin RIR
- SEMANAS DE DESCARGA: se pueden usar reps más altas (12-15) con RIR 4-5

Ejemplos CORRECTOS para ejercicios CON PESO:
- "8-10 @ RIR 2" (empezar 10, terminar 8)
- "6-8 @ RIR 1" (empezar 8, terminar 6)
- "10-12 @ RIR 3" (solo primera semana/principiantes)

Ejemplos CORRECTOS para ABDOMINALES/PESO CORPORAL:
- "15-20" (sin RIR)
- "12-15" (sin RIR)
- "8-12" (sin RIR, para dominadas)

Ejemplos INCORRECTOS (PROHIBIDOS):
- "15-20 @ RIR 2" (demasiadas reps para ejercicio con peso)
- "10" (sin rango)
- "3x10" (formato incorrecto)

RIR por nivel:
- Principiante: RIR 3-4
- Intermedio: RIR 2-3
- Avanzado: RIR 1-2

VOLUMEN E INTENSIDAD:

Principiante (Semanas 1-2):
- 8-12 series/grupo muscular/semana
- Reps: 8-12 (máx)
- RIR: 3-4
- Descanso: 60-90s

Intermedio (Semanas 3-12):
- 12-18 series/grupo muscular/semana
- Reps: 6-10 (fuerza-hipertrofia)
- RIR: 2-3
- Descanso: 90-180s (compuestos), 60-90s (aislamiento)

CARDIO (SOLO SI EL OBJETIVO ES PÉRDIDA DE GRASA):
- Se agrega AL FINAL de la sesión de pesas
- NUNCA reemplaza el entrenamiento de fuerza
- Tipo: LISS (20-40 min) o HIIT (15-20 min, máx 2x/semana)

${feedback ? `
HISTORIAL DE ENTRENAMIENTOS (últimos ${feedback.totalCompletions}):
- Dificultad promedio reportada: ${feedback.avgDifficulty.toFixed(1)}/5
${feedback.avgDifficulty < 2.5 
  ? '  ⚠️ El usuario reporta entrenamientos muy fáciles. AUMENTAR intensidad en 15-20%'
  : feedback.avgDifficulty > 4 
  ? '  ⚠️ El usuario reporta entrenamientos muy difíciles. REDUCIR volumen o simplificar ejercicios'
  : '  ✅ Dificultad adecuada. Mantener nivel similar'
}
- Ejercicios completados consistentemente (>80%): ${feedback.completedExercises.length > 0 ? feedback.completedExercises.join(', ') : 'Ninguno identificado'}
- Ejercicios frecuentemente saltados (<50%): ${feedback.skippedExercises.length > 0 ? feedback.skippedExercises.join(', ') : 'Ninguno identificado'}
${feedback.commonNotes ? `- Notas del usuario: "${feedback.commonNotes}"` : ''}

ADAPTACIONES REQUERIDAS BASADAS EN FEEDBACK:
${generateAdaptationInstructions(feedback)}
` : ''}

FORMATO JSON FINAL (OBLIGATORIO)

⚠️ CRÍTICO: 
- "weekly_structure" DEBE contener EXACTAMENTE ${userData.available_days} días (Día 1, Día 2, etc.)
- Cada día DEBE contener EXACTAMENTE ${numExercises} ejercicios
- El campo "reps" SIEMPRE debe incluir RIR: "8-10 @ RIR 2"
- Responde SOLO con JSON válido, sin markdown ni texto adicional

EJEMPLO DE DÍA CORRECTO (copia este formato):
{
  "day": "Día 1",
  "focus": "Pecho y Tríceps",
  "duration": ${userData.session_duration},
  "exercises": [
    {
      "name": "Press de banca con barra",
      "sets": 4,
      "reps": "8-10 @ RIR 2",
      "rest": "120s"
    },
    {
      "name": "Press inclinado con mancuernas",
      "sets": 3,
      "reps": "10-12 @ RIR 2",
      "rest": "90s"
    },
    {
      "name": "Aperturas con mancuernas",
      "sets": 3,
      "reps": "12-15 @ RIR 3",
      "rest": "60s"
    },
    {
      "name": "Fondos en paralelas",
      "sets": 3,
      "reps": "8-10 @ RIR 2",
      "rest": "90s"
    }
  ]
}

ESTRUCTURA COMPLETA:
{
  "name": "Plan de Hipertrofia - ${userData.available_days} días",
  "description": "Plan de bodybuilding enfocado en hipertrofia muscular",
  "duration_weeks": 12,
  "days_per_week": ${userData.available_days},
  "training_base": "hypertrophy",
  "weekly_structure": [
    // ${userData.available_days} objetos de día aquí, cada uno con ${numExercises} ejercicios
  ],
  "key_principles": ["Sobrecarga progresiva", "Volumen adecuado", "Recuperación"],
  "progression": "Aumentar peso cuando logres el límite superior de repeticiones con buena técnica",
  "recommendations": ["Dormir 7-9 horas", "Consumir suficiente proteína", "Mantener consistencia"]
}

REGLAS FINALES INQUEBRANTABLES

1. TODOS los días son de hipertrofia/fuerza (NO potencia, NO pliometría, NO crossfit)
2. El campo "reps" SIEMPRE incluye RIR: "8-10 @ RIR 2" (NUNCA solo "10")
3. Exactamente ${userData.available_days} días en weekly_structure
4. Exactamente ${numExercises} ejercicios por día
5. Enfoques de día: Push, Pull, Legs, Upper, Lower, Chest, Back, Shoulders, Arms (NO Potencia, NO Pliometría)
6. Los días se numeran "Día 1", "Día 2", "Día 3", etc.
`.trim();
}

/**
 * Genera instrucciones de adaptación basadas en feedback
 */
function generateAdaptationInstructions(feedback: WorkoutFeedback): string {
  const instructions: string[] = [];

  // Adaptación por dificultad
  if (feedback.avgDifficulty < 2.5) {
    instructions.push('1. AUMENTAR intensidad general en 15-20% (dificultad muy baja)');
    instructions.push('   - Aumentar peso o repeticiones en ejercicios principales');
    instructions.push('   - Reducir tiempos de descanso en 10-15%');
    instructions.push('   - Agregar 1-2 ejercicios adicionales por sesión');
  } else if (feedback.avgDifficulty > 4) {
    instructions.push('1. REDUCIR intensidad o volumen (dificultad muy alta)');
    instructions.push('   - Reducir peso o repeticiones en ejercicios principales');
    instructions.push('   - Aumentar tiempos de descanso en 15-20%');
    instructions.push('   - Simplificar ejercicios complejos o usar variaciones más accesibles');
  } else {
    instructions.push('1. Mantener nivel de dificultad similar (está bien calibrado)');
  }

  // Adaptación por ejercicios completados
  if (feedback.completedExercises.length > 0) {
    instructions.push(`2. PRIORIZAR ejercicios que el usuario completa consistentemente: ${feedback.completedExercises.slice(0, 5).join(', ')}`);
    instructions.push('   - Incluir estos ejercicios en múltiples días de la semana');
    instructions.push('   - Usarlos como base del plan');
  }

  // Adaptación por ejercicios saltados
  if (feedback.skippedExercises.length > 0) {
    instructions.push(`3. EVITAR o REEMPLAZAR ejercicios frecuentemente saltados: ${feedback.skippedExercises.slice(0, 5).join(', ')}`);
    instructions.push('   - Buscar alternativas que trabajen los mismos grupos musculares');
    instructions.push('   - Si es necesario incluirlos, usar variaciones más accesibles');
  }

  // Adaptación por notas
  if (feedback.commonNotes) {
    instructions.push('4. Considerar feedback del usuario en las notas proporcionadas');
  }

  return instructions.join('\n');
}

/**
 * Genera un plan de entrenamiento por defecto
 */
function generateDefaultWorkoutPlan(userData: UserProfile): any {
  const fitnessLevelText = {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
  }[userData.fitness_level] || 'Intermedio';

  const primaryGoal = userData.goals[0] || 'general_fitness';
  const daysPerWeek = Math.min(userData.available_days, 5);

  // Plan básico adaptado al nivel - ESTILO BODYBUILDING
  const plans = {
    beginner: {
      name: `Plan ${fitnessLevelText} - Fundamentos`,
      description: `Plan de ${daysPerWeek} días para construir una base sólida de fuerza e hipertrofia`,
      duration_weeks: 12,
      days_per_week: daysPerWeek,
      weekly_structure: [
        {
          day: 'Día 1',
          focus: 'Full Body A',
          duration: userData.session_duration,
          exercises: [
            { name: 'Sentadilla con barra', sets: 3, reps: '10-12 @ RIR 3', rest: '90s' },
            { name: 'Press de banca con barra', sets: 3, reps: '10-12 @ RIR 3', rest: '90s' },
            { name: 'Remo con barra', sets: 3, reps: '10-12 @ RIR 3', rest: '90s' },
            { name: 'Press militar con mancuernas', sets: 3, reps: '10-12 @ RIR 3', rest: '60s' },
          ],
        },
        {
          day: 'Día 2',
          focus: 'Full Body B',
          duration: userData.session_duration,
          exercises: [
            { name: 'Peso muerto rumano', sets: 3, reps: '10-12 @ RIR 3', rest: '90s' },
            { name: 'Press inclinado con mancuernas', sets: 3, reps: '10-12 @ RIR 3', rest: '90s' },
            { name: 'Jalón al pecho', sets: 3, reps: '10-12 @ RIR 3', rest: '90s' },
            { name: 'Curl de bíceps con barra', sets: 3, reps: '12-15 @ RIR 3', rest: '60s' },
          ],
        },
        {
          day: 'Día 3',
          focus: 'Full Body C',
          duration: userData.session_duration,
          exercises: [
            { name: 'Prensa de piernas', sets: 3, reps: '12-15 @ RIR 3', rest: '90s' },
            { name: 'Aperturas con mancuernas', sets: 3, reps: '12-15 @ RIR 3', rest: '60s' },
            { name: 'Remo con mancuerna', sets: 3, reps: '10-12 @ RIR 3', rest: '60s' },
            { name: 'Elevaciones laterales', sets: 3, reps: '12-15 @ RIR 3', rest: '60s' },
          ],
        },
      ],
      key_principles: [
        'Enfoque en la técnica correcta antes que en la intensidad',
        'Progresión gradual en volumen e intensidad',
        'Descanso adecuado entre sesiones (48 horas para mismo grupo muscular)',
      ],
      progression: 'Aumenta peso cuando logres el límite superior de repeticiones con RIR 3. Después de 4 semanas, reduce RIR a 2.',
      recommendations: [
        'Calienta 5-10 minutos antes de cada sesión',
        'Mantén una buena hidratación',
        'Consume suficiente proteína (1.6-2.2g/kg de peso)',
      ],
    },
    intermediate: {
      name: `Plan ${fitnessLevelText} - Desarrollo`,
      description: `Plan de ${daysPerWeek} días para aumentar fuerza y masa muscular`,
      duration_weeks: 12,
      days_per_week: daysPerWeek,
      weekly_structure: [
        {
          day: 'Día 1',
          focus: 'Push - Pecho y Tríceps',
          duration: userData.session_duration,
          exercises: [
            { name: 'Press de banca con barra', sets: 4, reps: '8-10 @ RIR 2', rest: '120s' },
            { name: 'Press inclinado con mancuernas', sets: 3, reps: '10-12 @ RIR 2', rest: '90s' },
            { name: 'Fondos en paralelas', sets: 3, reps: '8-10 @ RIR 2', rest: '90s' },
            { name: 'Extensiones de tríceps en polea', sets: 3, reps: '12-15 @ RIR 2', rest: '60s' },
          ],
        },
        {
          day: 'Día 2',
          focus: 'Pull - Espalda y Bíceps',
          duration: userData.session_duration,
          exercises: [
            { name: 'Dominadas', sets: 4, reps: '6-10 @ RIR 2', rest: '120s' },
            { name: 'Remo con barra', sets: 4, reps: '8-10 @ RIR 2', rest: '90s' },
            { name: 'Remo con mancuerna', sets: 3, reps: '10-12 @ RIR 2', rest: '60s' },
            { name: 'Curl de bíceps con barra', sets: 3, reps: '10-12 @ RIR 2', rest: '60s' },
          ],
        },
        {
          day: 'Día 3',
          focus: 'Legs - Piernas',
          duration: userData.session_duration,
          exercises: [
            { name: 'Sentadilla con barra', sets: 4, reps: '8-10 @ RIR 2', rest: '180s' },
            { name: 'Peso muerto rumano', sets: 3, reps: '10-12 @ RIR 2', rest: '120s' },
            { name: 'Prensa de piernas', sets: 3, reps: '12-15 @ RIR 2', rest: '90s' },
            { name: 'Elevación de gemelos sentado', sets: 4, reps: '15-20 @ RIR 2', rest: '60s' },
          ],
        },
        {
          day: 'Día 4',
          focus: 'Upper - Hombros y Brazos',
          duration: userData.session_duration,
          exercises: [
            { name: 'Press militar con barra', sets: 4, reps: '8-10 @ RIR 2', rest: '120s' },
            { name: 'Elevaciones laterales', sets: 4, reps: '12-15 @ RIR 2', rest: '60s' },
            { name: 'Curl martillo', sets: 3, reps: '10-12 @ RIR 2', rest: '60s' },
            { name: 'Press francés', sets: 3, reps: '10-12 @ RIR 2', rest: '60s' },
          ],
        },
      ],
      key_principles: [
        'Sobrecarga progresiva: aumenta peso cuando logres el límite superior de repeticiones',
        'Volumen óptimo: 12-18 series por grupo muscular por semana',
        'Frecuencia: entrena cada grupo muscular 2 veces por semana',
      ],
      progression: 'Incrementa peso en 2.5-5% cuando completes todas las series con RIR 2. Semana 4 y 8: deload (reduce volumen 40%).',
      recommendations: [
        'Prioriza ejercicios compuestos',
        'Mantén un registro de tus levantamientos',
        'Asegura 7-9 horas de sueño para recuperación',
      ],
    },
    advanced: {
      name: `Plan ${fitnessLevelText} - Optimización`,
      description: `Plan de ${daysPerWeek} días con periodización para máxima hipertrofia`,
      duration_weeks: 12,
      days_per_week: daysPerWeek,
      weekly_structure: [
        {
          day: 'Día 1',
          focus: 'Push - Pecho énfasis',
          duration: userData.session_duration,
          exercises: [
            { name: 'Press de banca con barra', sets: 4, reps: '6-8 @ RIR 1', rest: '180s' },
            { name: 'Press inclinado con mancuernas', sets: 4, reps: '8-10 @ RIR 2', rest: '120s' },
            { name: 'Aperturas en polea', sets: 3, reps: '12-15 @ RIR 2', rest: '60s' },
            { name: 'Press de hombro con mancuernas', sets: 3, reps: '10-12 @ RIR 2', rest: '90s' },
          ],
        },
        {
          day: 'Día 2',
          focus: 'Pull - Espalda énfasis',
          duration: userData.session_duration,
          exercises: [
            { name: 'Dominadas lastradas', sets: 4, reps: '6-8 @ RIR 1', rest: '180s' },
            { name: 'Remo con barra', sets: 4, reps: '8-10 @ RIR 2', rest: '120s' },
            { name: 'Jalón al pecho agarre cerrado', sets: 3, reps: '10-12 @ RIR 2', rest: '90s' },
            { name: 'Curl de bíceps inclinado', sets: 3, reps: '10-12 @ RIR 2', rest: '60s' },
          ],
        },
        {
          day: 'Día 3',
          focus: 'Legs - Cuádriceps énfasis',
          duration: userData.session_duration,
          exercises: [
            { name: 'Sentadilla con barra', sets: 4, reps: '6-8 @ RIR 1', rest: '180s' },
            { name: 'Prensa de piernas', sets: 4, reps: '10-12 @ RIR 2', rest: '120s' },
            { name: 'Extensiones de cuádriceps', sets: 3, reps: '12-15 @ RIR 2', rest: '60s' },
            { name: 'Elevación de gemelos de pie', sets: 4, reps: '12-15 @ RIR 2', rest: '60s' },
          ],
        },
        {
          day: 'Día 4',
          focus: 'Push - Hombros énfasis',
          duration: userData.session_duration,
          exercises: [
            { name: 'Press militar con barra', sets: 4, reps: '6-8 @ RIR 1', rest: '180s' },
            { name: 'Elevaciones laterales', sets: 4, reps: '12-15 @ RIR 2', rest: '60s' },
            { name: 'Elevaciones frontales', sets: 3, reps: '12-15 @ RIR 2', rest: '60s' },
            { name: 'Press francés con barra Z', sets: 3, reps: '10-12 @ RIR 2', rest: '60s' },
          ],
        },
        {
          day: 'Día 5',
          focus: 'Legs - Isquiotibiales y Glúteos',
          duration: userData.session_duration,
          exercises: [
            { name: 'Peso muerto convencional', sets: 4, reps: '5-6 @ RIR 1', rest: '180s' },
            { name: 'Hip thrust con barra', sets: 4, reps: '8-10 @ RIR 2', rest: '120s' },
            { name: 'Curl femoral tumbado', sets: 3, reps: '10-12 @ RIR 2', rest: '60s' },
            { name: 'Zancadas con mancuernas', sets: 3, reps: '10 c/pierna @ RIR 2', rest: '90s' },
          ],
        },
      ],
      key_principles: [
        'Periodización ondulante: alterna entre fases de fuerza (RIR 1) e hipertrofia (RIR 2)',
        'Volumen alto: 16-22 series por grupo muscular por semana',
        'Intensidad variable: usa RIR para regular la proximidad al fallo',
      ],
      progression: 'Semanas 1-3: RIR 2-3 (acumulación). Semanas 4-6: RIR 1-2 (intensificación). Semana 7: deload. Repetir ciclo.',
      recommendations: [
        'Monitorea métricas de recuperación (calidad de sueño, fatiga)',
        'Consume 1.8-2.2g de proteína por kg de peso corporal',
        'Incluye trabajo de movilidad y prevención de lesiones',
      ],
    },
  };

  // Obtener el plan base según nivel
  const basePlan = plans[userData.fitness_level as keyof typeof plans] || plans.intermediate;
  
  // Asegurar que el número de días en weekly_structure coincida con days_per_week
  const planCopy = JSON.parse(JSON.stringify(basePlan)); // Deep copy
  const currentDays = planCopy.weekly_structure.length;
  const requestedDays = daysPerWeek;
  
  if (currentDays < requestedDays) {
    // Necesitamos agregar más días
    const daysToAdd = requestedDays - currentDays;
    
    // Duplicar días existentes según sea necesario
    for (let i = 0; i < daysToAdd; i++) {
      const dayIndex = i % currentDays; // Rotar entre los días existentes
      const dayToCopy = planCopy.weekly_structure[dayIndex];
      
      planCopy.weekly_structure.push({
        ...dayToCopy,
        day: `Día ${currentDays + i + 1}`,
      });
    }
  } else if (currentDays > requestedDays) {
    // Necesitamos menos días de los que tenemos
    planCopy.weekly_structure = planCopy.weekly_structure.slice(0, requestedDays);
  }
  
  // Actualizar days_per_week para que coincida
  planCopy.days_per_week = planCopy.weekly_structure.length;
  
  return planCopy;
}

/**
 * Genera consejos nutricionales personalizados (para futuro uso)
 */
export async function generateNutritionAdvice(userData: UserProfile): Promise<AIResponse> {
  // TODO: Implementar generación de consejos nutricionales
  return {
    success: false,
    error: 'Función no implementada aún',
  };
}

