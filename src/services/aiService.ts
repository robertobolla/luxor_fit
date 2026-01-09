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
  activity_types: string[];
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

    const activityTypesText = userData.activity_types.map(activity => {
      const activityMap: { [key: string]: string } = {
        cardio: 'cardio',
        strength: 'strength training',
        sports: 'sports',
        yoga: 'yoga/pilates',
        hiit: 'HIIT',
        mixed: 'mixed training',
      };
      return activityMap[activity] || activity;
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
- Preferred activity types: ${activityTypesText}
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

    const activityTypesText = userData.activity_types.map(activity => {
      const activityMap: { [key: string]: string } = {
        cardio: 'cardio',
        strength: 'entrenamiento de fuerza',
        sports: 'deportes',
        yoga: 'yoga/pilates',
        hiit: 'HIIT',
        mixed: 'entrenamiento mixto',
      };
      return activityMap[activity] || activity;
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
- Tipos de actividad preferidos: ${activityTypesText}
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
        plan: generateDefaultWorkoutPlan(userData),
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
            content: 'Eres un entrenador personal certificado (NSCA-CPT, ACE) con maestría en Ciencias del Ejercicio y 10+ años de experiencia. Especializaciones: periodización, biomecánica, fisiología del ejercicio, nutrición deportiva. Creas planes basados en literatura científica (Schoenfeld, Helms, Nuckols, Israetel). Tus planes son específicos, progresivos, seguros y ALTAMENTE EFECTIVOS.',
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
      
      // Fallback a plan por defecto
      return {
        success: true,
        plan: generateDefaultWorkoutPlan(userData),
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
      const plan = parsePlanSafely(planText);
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
        
        return { success: true, plan };
      }
      console.warn('⚠️ Plan inválido tras intentos de limpieza. Usando plan por defecto.');
      return { success: true, plan: generateDefaultWorkoutPlan(userData) };
    } catch (parseError) {
      console.error('Error al parsear plan:', parseError);
      return { success: true, plan: generateDefaultWorkoutPlan(userData) };
    }
  } catch (error) {
    console.error('Error al generar plan de entrenamiento:', error);
    
    // Fallback a plan por defecto
    return {
      success: true,
      plan: generateDefaultWorkoutPlan(userData),
    };
  }
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
 * Construye el prompt para generar un plan de entrenamiento
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
      weight_loss: 'bajar grasa',
      muscle_gain: 'ganar músculo',
      strength: 'aumentar fuerza',
      endurance: 'mejorar resistencia',
      flexibility: 'mejorar flexibilidad',
      general_fitness: 'mantener forma general',
    };
    return goalMap[goal] || goal;
  }).join(', ');

  const activityTypesText = userData.activity_types.map(activity => {
    const activityMap: { [key: string]: string } = {
      cardio: 'cardio',
      strength: 'entrenamiento de fuerza',
      sports: 'deportes',
      yoga: 'yoga/pilates',
      hiit: 'HIIT',
      mixed: 'entrenamiento mixto',
    };
    return activityMap[activity] || activity;
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

  const genderText = {
    male: 'Masculino',
    female: 'Femenino',
    other: 'Otro'
  }[userData.gender] || userData.gender;

  return `
Eres un entrenador personal certificado con 10+ años de experiencia. Crea un plan de entrenamiento PROFESIONAL y DETALLADO basado en evidencia científica.

PERFIL DEL USUARIO:
- Género: ${genderText}
- Edad: ${userData.age} años
- Nivel: ${fitnessLevelText}
- Objetivos principales: ${goalsText}
- Actividades preferidas: ${activityTypesText}
- Disponibilidad: ${userData.available_days} días/semana, ${userData.session_duration} min/sesión
- Equipamiento: ${equipmentText}

INSTRUCCIONES CRÍTICAS:

1. SELECCIÓN DE EJERCICIOS:
   - Usa ejercicios COMPUESTOS como base (sentadilla, peso muerto, press, dominadas, remo)
   - Incluye ejercicios ACCESORIOS específicos para los objetivos
   - Nombra ejercicios con PRECISIÓN (ej: "Sentadilla con barra alta" no solo "Sentadillas")
   - Varía el tipo de agarre, ángulos y variaciones
   - Para principiantes: prioriza movimientos básicos y técnica
   - Para avanzados: incluye variaciones complejas y técnicas avanzadas
   
   ADAPTACIÓN POR GÉNERO:
   - Masculino: Equilibrio entre tren superior e inferior, énfasis en fuerza general
   - Femenino: Mayor énfasis en tren inferior (piernas, glúteos), core y estabilidad
     * Incluye más variaciones de sentadillas, hip thrust, zancadas, peso muerto rumano
     * Mantén tren superior pero con enfoque funcional
     * Ejercicios específicos para glúteos: hip thrust, patada de glúteo, puente de glúteos
   - Otro: Plan balanceado adaptado a objetivos específicos

2. VOLUMEN Y INTENSIDAD (basado en ciencia):
   Principiante:
   - 8-12 series por grupo muscular/semana
   - Reps: 8-15 para hipertrofia, 12-20 para resistencia
   - RIR: 3-4 (intensidad moderada, enfoque en técnica)
   - Descansos: 60-90s
   - Tiempo por ejercicio: 12-15 minutos (menos series, descansos cortos)
   
   Intermedio:
   - 12-18 series por grupo muscular/semana
   - Reps: 6-12 para fuerza, 8-15 para hipertrofia
   - RIR: 2-3 (intensidad alta pero controlada)
   - Descansos: 90-180s para compuestos, 60-90s para accesorios
   - Tiempo por ejercicio: 15-18 minutos (series moderadas, descansos intermedios)
   
   Avanzado:
   - 16-25 series por grupo muscular/semana
   - Reps: 3-6 para fuerza máxima, 6-12 para hipertrofia, 12-20 para resistencia
   - RIR: 1-2 (muy cerca del fallo, solo en series finales)
   - Descansos: 2-5min para fuerza, 90-120s para hipertrofia
   - Tiempo por ejercicio: 18-20 minutos (más series, descansos largos, calentamiento extenso)
   
   NOTA: El número de ejercicios por sesión se calcula automáticamente según la duración disponible (ver sección 3).

2.1. INTENSIDAD Y PROXIMIDAD AL FALLO (RIR/RPE) - CRÍTICO:
   - USA SIEMPRE RIR (Reps In Reserve) en el formato de repeticiones
   - NUNCA uses números fijos sin RIR (ej: "10, 10, 10" es INCORRECTO)
   - Formato correcto: "8-10 @ RIR 2" significa 8-10 repeticiones dejando 2 en reserva
   - Alternativa: "6-8 @ RPE 8" (RPE 8 = RIR 2)
   
   RIR por nivel y objetivo:
   - Principiante: RIR 3-4 (intensidad moderada, enfoque en técnica y seguridad)
   - Intermedio: RIR 2-3 (intensidad alta pero controlada, permite progresión)
   - Avanzado: RIR 1-2 (muy cerca del fallo, solo en series finales de ejercicios principales)
   
   Reglas de RIR:
   - RIR 0 (fallo absoluto): SOLO para avanzados y SOLO en última serie del último ejercicio compuesto
   - RIR 1-2: Para series principales de ejercicios compuestos (sentadilla, peso muerto, press)
   - RIR 2-3: Para ejercicios accesorios y series de volumen
   - RIR 3-4: Para principiantes y series de calentamiento/aproximación
   
   IMPORTANTE: Cada serie debe tener RIR diferente según su posición:
   - Primera serie de trabajo: RIR 2-3 (más conservador)
   - Series intermedias: RIR 2 (intensidad objetivo)
   - Última serie: RIR 1-2 (puede acercarse más al fallo)

2.2. SERIES DE APROXIMACIÓN Y CALENTAMIENTO (OBLIGATORIO):
   Para ejercicios COMPUESTOS principales (sentadilla, peso muerto, press de banca, press militar, remo):
   - Series de calentamiento: 1-2 series con 40-60% del peso de trabajo, RIR 4-5
   - Series de aproximación: 1 serie con 70-85% del peso de trabajo, RIR 3
   - Series de trabajo: 3-5 series con peso objetivo y RIR específico
   
   Para ejercicios ACCESORIOS:
   - Pueden empezar directamente con series de trabajo
   - O 1 serie de calentamiento ligera (50% peso, RIR 4)
   
   Ejemplo de estructura profesional:
   Sentadilla con barra (objetivo: 100kg x 6-8):
   - Calentamiento 1: 1x10 @ 50kg (RIR 4-5)
   - Calentamiento 2: 1x5 @ 70kg (RIR 3)
   - Trabajo 1: 1x6-8 @ 100kg (RIR 2)
   - Trabajo 2: 1x6-8 @ 100kg (RIR 2)
   - Trabajo 3: 1x6-8 @ 100kg (RIR 1)

2.3. PROGRESIÓN DENTRO DE LA SESIÓN:
   NUNCA uses el mismo peso y repeticiones en todas las series (ej: 70kg x 10, 70kg x 10, 70kg x 10).
   
   Tipos de progresión profesional:
   - PIramidal: Aumenta peso, reduce reps (ej: 60kgx10, 70kgx8, 80kgx6) - MÁS COMÚN
   - Ascendente: Aumenta peso progresivamente (ej: 60kgx8, 65kgx8, 70kgx8)
   - Constante: Mismo peso y reps (SOLO para principiantes o ejercicios accesorios)
   - Inversa: Reduce peso, aumenta reps (avanzados, para fatiga acumulada)
   
   Regla general:
   - Principiantes: Constante o ascendente ligera (ej: 60kgx10, 62.5kgx10, 65kgx10)
   - Intermedios: Piramidal o ascendente (ej: 60kgx10, 70kgx8, 80kgx6)
   - Avanzados: Piramidal, inversa, o técnicas avanzadas (cluster sets, rest-pause)
   
   IMPORTANTE: Varía el peso entre series según el tipo de progresión elegido

3. NÚMERO DE EJERCICIOS POR SESIÓN (CRÍTICO - CALCULAR POR TIEMPO):
   El número de ejercicios DEBE calcularse basándose en el tiempo disponible:
   - Cada ejercicio toma 15-20 minutos (incluyendo calentamiento, series de trabajo, descansos)
   - Para INTENSIDAD ALTA (RIR 1-2): 18-20 minutos por ejercicio
   - Para INTENSIDAD MODERADA (RIR 2-3): 15-18 minutos por ejercicio
   - Para INTENSIDAD BAJA (RIR 3-4): 12-15 minutos por ejercicio
   
   FÓRMULA DE CÁLCULO:
   - Tiempo disponible: ${userData.session_duration} minutos
   - Tiempo por ejercicio (intensidad alta): 18-20 minutos
   - Número de ejercicios = ${userData.session_duration} ÷ 18-20 = ${Math.floor(userData.session_duration / 20)}-${Math.floor(userData.session_duration / 18)} ejercicios
   
   EJEMPLOS:
   - 30 minutos: 30 ÷ 20 = 1-2 ejercicios (máximo 2)
   - 45 minutos: 45 ÷ 20 = 2-3 ejercicios (máximo 3)
   - 60 minutos: 60 ÷ 20 = 3-4 ejercicios (máximo 4)
   - 90 minutos: 90 ÷ 20 = 4-5 ejercicios (máximo 5)
   
   IMPORTANTE:
   - Para una sesión de ${userData.session_duration} minutos, DEBES incluir ${Math.max(1, Math.floor(userData.session_duration / 20))}-${Math.max(2, Math.floor(userData.session_duration / 18))} ejercicios.
   - NUNCA excedas este número - cada ejercicio necesita tiempo suficiente para calentamiento, series de trabajo y descansos.
   - Si el nivel es avanzado o la intensidad es alta (RIR 1-2), usa el límite inferior (más tiempo por ejercicio).
   - Si el nivel es principiante o la intensidad es moderada (RIR 3-4), puedes usar el límite superior.
   
   DISTRIBUCIÓN RECOMENDADA:
   - Ejercicios COMPUESTOS principales: 20-25 minutos cada uno (calentamiento + 3-5 series + descansos largos)
   - Ejercicios ACCESORIOS: 12-15 minutos cada uno (1 serie calentamiento + 2-3 series + descansos cortos)

4. ESTRUCTURA SEMANAL:
   - Distribuye grupos musculares inteligentemente (evita solapamiento)
   - Incluye días de recuperación activa si es necesario
   - Para perder peso: más frecuencia cardio, déficit calórico
   - Para ganar músculo: enfoque en progresión de peso, superávit calórico
   - Para fuerza: ejercicios compuestos pesados, bajas reps

4. PROGRESIÓN:
   - Especifica EXACTAMENTE cómo aumentar la carga semana a semana
   - Incluye deloads cada 4-6 semanas
   - Menciona señales de sobreentrenamiento

5. PRINCIPIOS CLAVE:
   - Cita principios científicos específicos (sobrecarga progresiva, especificidad, etc.)
   - Explica el PORQUÉ de cada decisión
   - Incluye referencias a estudios si es relevante

FORMATO JSON REQUERIDO:

⚠️ CRÍTICO: "weekly_structure" DEBE contener EXACTAMENTE ${userData.available_days} días. NO menos, NO más.

{
  "name": "Nombre específico y motivador",
  "description": "Descripción detallada del enfoque y beneficios esperados",
  "duration_weeks": número (8-16 semanas),
  "days_per_week": ${userData.available_days},
  "weekly_structure": [
    // INCLUIR EXACTAMENTE ${userData.available_days} DÍAS AQUÍ
    {
      "day": "Día 1",
      "focus": "Enfoque específico (ej: Fuerza de tren superior - Empuje)",
      "duration": ${userData.session_duration},
      "exercises": [
        {
          "name": "Nombre ESPECÍFICO del ejercicio",
          "warmup_sets": [
            {
              "reps": número,
              "weight_note": "porcentaje o peso aproximado (ej: '50% peso de trabajo' o '40kg')",
              "rir": número (3-4 para calentamiento)
            }
          ],
          "working_sets": [
            {
              "reps": "rango con RIR (ej: '6-8 @ RIR 2')",
              "weight_note": "peso objetivo o progresión (ej: '80kg' o '60kg → 70kg → 80kg' para piramidal)",
              "rir": número (1-3 según nivel y posición de la serie),
              "rest": "tiempo específico",
              "notes": "opcional: notas sobre esta serie específica"
            }
          ],
          "progression_type": "piramidal" | "ascendente" | "constante" | "inversa",
          "total_sets": número (incluyendo warmup),
          "sets": número (total de series de trabajo, para compatibilidad),
          "reps": "rango con RIR (ej: '6-8 @ RIR 2', para compatibilidad con UI)",
          "rest": "tiempo de descanso entre series de trabajo"
        }
      ]
    }
  ],
  "key_principles": [
    "Principio científico 1 con explicación breve",
    "Principio científico 2 con explicación breve",
    "Principio científico 3 con explicación breve"
  ],
  "progression": "Plan DETALLADO de progresión semanal con números específicos y señales de cuándo aumentar carga",
  "recommendations": [
    "Recomendación específica y accionable 1",
    "Recomendación específica y accionable 2",
    "Recomendación específica y accionable 3"
  ]
}

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

IMPORTANTE - REGLAS CRÍTICAS:
- Responde SOLO con el JSON válido, sin markdown ni texto adicional
- Asegúrate de que el plan sea REALISTA y ALCANZABLE
- Prioriza CALIDAD sobre cantidad
- El plan debe ser lo suficientemente desafiante pero no abrumador
- Adapta el lenguaje técnico al nivel del usuario

REGLAS OBLIGATORIAS DE FORMATO:
1. NUNCA uses repeticiones fijas sin RIR (ej: "10, 10, 10" es INCORRECTO)
2. SIEMPRE incluye RIR en el formato: "8-10 @ RIR 2" o "6-8 @ RPE 8"
3. SIEMPRE incluye series de calentamiento/aproximación para ejercicios compuestos
4. SIEMPRE varía el peso entre series (piramidal, ascendente, etc.) - NUNCA constante en todas las series
5. Cada serie de trabajo debe tener RIR diferente según su posición (primera más conservadora, última más intensa)
6. Para ejercicios accesorios, puedes usar formato simplificado pero SIEMPRE con RIR
7. OBLIGATORIO: Incluye los campos "sets", "reps" y "rest" en cada ejercicio para compatibilidad con la UI
8. OBLIGATORIO: El número de ejercicios debe ser proporcional a la duración (60 min = mínimo 6 ejercicios)

EJEMPLO CORRECTO de ejercicio:
{
  "name": "Sentadilla con barra",
  "warmup_sets": [
    { "reps": 10, "weight_note": "50kg (50% peso de trabajo)", "rir": 4 },
    { "reps": 5, "weight_note": "70kg (70% peso de trabajo)", "rir": 3 }
  ],
  "working_sets": [
    { "reps": "6-8 @ RIR 2", "weight_note": "80kg", "rir": 2, "rest": "3min" },
    { "reps": "6-8 @ RIR 2", "weight_note": "85kg", "rir": 2, "rest": "3min" },
    { "reps": "6-8 @ RIR 1", "weight_note": "90kg", "rir": 1, "rest": "3min", "notes": "Última serie, puede acercarse más al fallo" }
  ],
  "progression_type": "piramidal",
  "total_sets": 5
}

${feedback ? '- PRIORIZA ejercicios que el usuario completa consistentemente' : ''}
${feedback && feedback.skippedExercises.length > 0 ? '- EVITA o REEMPLAZA ejercicios que el usuario frecuentemente salta' : ''}
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

  // Plan básico adaptado al nivel
  const plans = {
    beginner: {
      name: `Plan ${fitnessLevelText} - Fundamentos`,
      description: `Plan de ${daysPerWeek} días para construir una base sólida de fuerza y resistencia`,
      duration_weeks: 8,
      days_per_week: daysPerWeek,
      weekly_structure: [
        {
          day: 'Día 1',
          focus: 'Cuerpo completo - Fuerza',
          duration: userData.session_duration,
          exercises: [
            { name: 'Sentadillas', sets: 3, reps: '10-12', rest: '60s' },
            { name: 'Flexiones', sets: 3, reps: '8-10', rest: '60s' },
            { name: 'Remo con banda', sets: 3, reps: '12-15', rest: '45s' },
            { name: 'Plancha', sets: 3, reps: '30-45s', rest: '45s' },
          ],
        },
        {
          day: 'Día 2',
          focus: 'Cardio moderado',
          duration: userData.session_duration,
          exercises: [
            { name: 'Caminata rápida', sets: 1, reps: '20 min', rest: '-' },
            { name: 'Jumping jacks', sets: 3, reps: '30s', rest: '30s' },
            { name: 'Mountain climbers', sets: 3, reps: '20s', rest: '40s' },
          ],
        },
        {
          day: 'Día 3',
          focus: 'Cuerpo completo - Resistencia',
          duration: userData.session_duration,
          exercises: [
            { name: 'Zancadas', sets: 3, reps: '10 por pierna', rest: '45s' },
            { name: 'Flexiones de rodillas', sets: 3, reps: '10-12', rest: '45s' },
            { name: 'Superman', sets: 3, reps: '12-15', rest: '30s' },
            { name: 'Bicicleta abdominal', sets: 3, reps: '15 por lado', rest: '30s' },
          ],
        },
      ],
      key_principles: [
        'Enfoque en la técnica correcta antes que en la intensidad',
        'Progresión gradual en volumen e intensidad',
        'Descanso adecuado entre sesiones (48 horas para mismo grupo muscular)',
      ],
      progression: 'Aumenta repeticiones en 2-3 cada semana. Después de 4 semanas, incrementa la dificultad de los ejercicios.',
      recommendations: [
        'Calienta 5-10 minutos antes de cada sesión',
        'Mantén una buena hidratación',
        'Escucha a tu cuerpo y descansa cuando sea necesario',
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
          focus: 'Tren superior - Push',
          duration: userData.session_duration,
          exercises: [
            { name: 'Press de banca', sets: 4, reps: '8-10', rest: '90s' },
            { name: 'Press militar', sets: 3, reps: '8-12', rest: '90s' },
            { name: 'Fondos', sets: 3, reps: '10-12', rest: '60s' },
            { name: 'Extensiones de tríceps', sets: 3, reps: '12-15', rest: '60s' },
          ],
        },
        {
          day: 'Día 2',
          focus: 'Tren inferior - Fuerza',
          duration: userData.session_duration,
          exercises: [
            { name: 'Sentadillas', sets: 4, reps: '6-8', rest: '2-3 min' },
            { name: 'Peso muerto rumano', sets: 3, reps: '8-10', rest: '2 min' },
            { name: 'Zancadas', sets: 3, reps: '10 por pierna', rest: '90s' },
            { name: 'Elevaciones de gemelos', sets: 4, reps: '15-20', rest: '45s' },
          ],
        },
        {
          day: 'Día 3',
          focus: 'Tren superior - Pull',
          duration: userData.session_duration,
          exercises: [
            { name: 'Dominadas', sets: 4, reps: '6-10', rest: '2 min' },
            { name: 'Remo con barra', sets: 4, reps: '8-10', rest: '90s' },
            { name: 'Curl de bíceps', sets: 3, reps: '10-12', rest: '60s' },
            { name: 'Face pulls', sets: 3, reps: '15-20', rest: '45s' },
          ],
        },
        {
          day: 'Día 4',
          focus: 'HIIT / Cardio',
          duration: userData.session_duration,
          exercises: [
            { name: 'Burpees', sets: 4, reps: '30s', rest: '30s' },
            { name: 'Sprints', sets: 6, reps: '20s', rest: '40s' },
            { name: 'Box jumps', sets: 3, reps: '10', rest: '60s' },
            { name: 'Battle ropes', sets: 3, reps: '30s', rest: '30s' },
          ],
        },
      ],
      key_principles: [
        'Sobrecarga progresiva: aumenta peso o repeticiones gradualmente',
        'Volumen óptimo: 10-20 series por grupo muscular por semana',
        'Frecuencia: entrena cada grupo muscular 2 veces por semana',
      ],
      progression: 'Incrementa peso en 2.5-5% cuando puedas completar todas las series con buena técnica. Cada 4 semanas, toma una semana de descarga.',
      recommendations: [
        'Prioriza ejercicios compuestos',
        'Mantén un registro de tus levantamientos',
        'Asegura 7-9 horas de sueño para recuperación',
      ],
    },
    advanced: {
      name: `Plan ${fitnessLevelText} - Optimización`,
      description: `Plan de ${daysPerWeek} días con periodización para máximos resultados`,
      duration_weeks: 16,
      days_per_week: daysPerWeek,
      weekly_structure: [
        {
          day: 'Día 1',
          focus: 'Fuerza - Tren inferior',
          duration: userData.session_duration,
          exercises: [
            { name: 'Sentadilla con barra', sets: 5, reps: '3-5', rest: '3-4 min' },
            { name: 'Peso muerto', sets: 4, reps: '4-6', rest: '3 min' },
            { name: 'Hip thrust', sets: 4, reps: '8-10', rest: '2 min' },
            { name: 'Sentadilla búlgara', sets: 3, reps: '8 por pierna', rest: '90s' },
          ],
        },
        {
          day: 'Día 2',
          focus: 'Hipertrofia - Tren superior Push',
          duration: userData.session_duration,
          exercises: [
            { name: 'Press inclinado', sets: 4, reps: '8-12', rest: '2 min' },
            { name: 'Press militar', sets: 4, reps: '8-10', rest: '2 min' },
            { name: 'Aperturas', sets: 3, reps: '12-15', rest: '90s' },
            { name: 'Tríceps en polea', sets: 4, reps: '12-15', rest: '60s' },
          ],
        },
        {
          day: 'Día 3',
          focus: 'Potencia / Pliometría',
          duration: userData.session_duration,
          exercises: [
            { name: 'Power cleans', sets: 5, reps: '3-5', rest: '2-3 min' },
            { name: 'Box jumps', sets: 4, reps: '5-8', rest: '2 min' },
            { name: 'Med ball slams', sets: 4, reps: '8-10', rest: '90s' },
            { name: 'Sprint intervals', sets: 6, reps: '15s', rest: '45s' },
          ],
        },
        {
          day: 'Día 4',
          focus: 'Hipertrofia - Tren superior Pull',
          duration: userData.session_duration,
          exercises: [
            { name: 'Dominadas lastradas', sets: 4, reps: '6-8', rest: '2-3 min' },
            { name: 'Remo pendlay', sets: 4, reps: '6-8', rest: '2 min' },
            { name: 'Pullover', sets: 3, reps: '10-12', rest: '90s' },
            { name: 'Curl martillo', sets: 3, reps: '10-12', rest: '60s' },
          ],
        },
        {
          day: 'Día 5',
          focus: 'Accesorios / Core',
          duration: userData.session_duration,
          exercises: [
            { name: 'Plancha con peso', sets: 4, reps: '45-60s', rest: '90s' },
            { name: 'Pallof press', sets: 3, reps: '12 por lado', rest: '60s' },
            { name: 'Farmer walks', sets: 4, reps: '40m', rest: '90s' },
            { name: 'Ab wheel', sets: 3, reps: '10-15', rest: '60s' },
          ],
        },
      ],
      key_principles: [
        'Periodización ondulante: alterna entre fases de fuerza, hipertrofia y potencia',
        'Volumen alto: 15-25 series por grupo muscular por semana',
        'Intensidad variable: usa RPE y porcentajes de 1RM',
      ],
      progression: 'Sigue un ciclo de 4 semanas: acumulación (volumen alto), intensificación (peso alto), realización (pico), descarga. Ajusta basado en recuperación.',
      recommendations: [
        'Monitorea métricas de recuperación (HRV, calidad de sueño)',
        'Considera periodización de nutrición (surplus/déficit según fase)',
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

