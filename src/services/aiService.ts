/**
 * Servicio de IA para generar contenido personalizado
 * Integración con ChatGPT (OpenAI API)
 */

interface UserProfile {
  name: string;
  age: number;
  fitness_level: string;
  goals: string[];
  activity_types: string[];
  available_days: number;
  session_duration: number;
  equipment: string[];
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
export async function generatePlanIntroduction(userData: UserProfile): Promise<AIResponse> {
  try {
    // Si no hay API key, usar texto por defecto
    if (!OPENAI_API_KEY || OPENAI_API_KEY === '') {
      console.warn('⚠️ OpenAI API Key no configurada, usando texto por defecto');
      return {
        success: true,
        introduction: generateDefaultIntroduction(userData),
      };
    }

    // Construir el prompt para ChatGPT
    const prompt = buildPrompt(userData);

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
            content: 'Eres un entrenador personal experto y motivador. Tu trabajo es crear introducciones personalizadas y motivadoras para planes de entrenamiento. Sé específico, positivo y realista. Usa un tono amigable y cercano en español.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error de OpenAI API:', errorData);
      
      // Fallback a texto por defecto si hay error
      return {
        success: true,
        introduction: generateDefaultIntroduction(userData),
      };
    }

    const data = await response.json();
    const introduction = data.choices[0]?.message?.content?.trim();

    if (!introduction) {
      return {
        success: false,
        error: 'No se pudo generar la introducción',
      };
    }

    return {
      success: true,
      introduction,
    };
  } catch (error) {
    console.error('Error al generar introducción con IA:', error);
    
    // Fallback a texto por defecto en caso de error
    return {
      success: true,
      introduction: generateDefaultIntroduction(userData),
    };
  }
}

/**
 * Construye el prompt para ChatGPT
 */
function buildPrompt(userData: UserProfile): string {
  const fitnessLevelText = {
    beginner: 'principiante',
    intermediate: 'intermedio',
    advanced: 'avanzado',
  }[userData.fitness_level] || userData.fitness_level;

  const goalsText = userData.goals.map(goal => {
    const goalMap: { [key: string]: string } = {
      weight_loss: 'perder peso',
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
      gym_access: 'gimnasio completo',
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
 * Genera una rutina de entrenamiento personalizada
 */
export async function generateWorkoutPlan(userData: UserProfile): Promise<any> {
  try {
    // Si no hay API key, usar plan por defecto
    if (!OPENAI_API_KEY || OPENAI_API_KEY === '') {
      console.warn('⚠️ OpenAI API Key no configurada, usando plan por defecto');
      return {
        success: true,
        plan: generateDefaultWorkoutPlan(userData),
      };
    }

    // Construir el prompt para generar el plan
    const prompt = buildWorkoutPrompt(userData);

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

    // Parsear el plan (asumiendo que viene en formato JSON)
    try {
      const plan = JSON.parse(planText);
      return {
        success: true,
        plan,
      };
    } catch (parseError) {
      console.error('Error al parsear plan:', parseError);
      // Si no se puede parsear, usar el plan por defecto
      return {
        success: true,
        plan: generateDefaultWorkoutPlan(userData),
      };
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
 * Construye el prompt para generar un plan de entrenamiento
 */
function buildWorkoutPrompt(userData: UserProfile): string {
  const fitnessLevelText = {
    beginner: 'principiante',
    intermediate: 'intermedio',
    advanced: 'avanzado',
  }[userData.fitness_level] || userData.fitness_level;

  const goalsText = userData.goals.map(goal => {
    const goalMap: { [key: string]: string } = {
      weight_loss: 'perder peso',
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
      gym_access: 'gimnasio completo',
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
   - 3-4 ejercicios por sesión
   - Reps: 8-15 para hipertrofia, 12-20 para resistencia
   - Descansos: 60-90s
   
   Intermedio:
   - 12-18 series por grupo muscular/semana
   - 4-6 ejercicios por sesión
   - Reps: 6-12 para fuerza, 8-15 para hipertrofia
   - Descansos: 90-180s para compuestos, 60-90s para accesorios
   
   Avanzado:
   - 16-25 series por grupo muscular/semana
   - 5-8 ejercicios por sesión
   - Reps: 3-6 para fuerza máxima, 6-12 para hipertrofia, 12-20 para resistencia
   - Descansos: 2-5min para fuerza, 90-120s para hipertrofia

3. ESTRUCTURA SEMANAL:
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
{
  "name": "Nombre específico y motivador",
  "description": "Descripción detallada del enfoque y beneficios esperados",
  "duration_weeks": número (8-16 semanas),
  "days_per_week": ${userData.available_days},
  "weekly_structure": [
    {
      "day": "Día 1",
      "focus": "Enfoque específico (ej: Fuerza de tren superior - Empuje)",
      "duration": ${userData.session_duration},
      "exercises": [
        {
          "name": "Nombre ESPECÍFICO del ejercicio",
          "sets": número,
          "reps": "rango específico",
          "rest": "tiempo específico"
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

IMPORTANTE:
- Responde SOLO con el JSON válido, sin markdown ni texto adicional
- Asegúrate de que el plan sea REALISTA y ALCANZABLE
- Prioriza CALIDAD sobre cantidad
- El plan debe ser lo suficientemente desafiante pero no abrumador
- Adapta el lenguaje técnico al nivel del usuario
`.trim();
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

  return plans[userData.fitness_level as keyof typeof plans] || plans.intermediate;
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

