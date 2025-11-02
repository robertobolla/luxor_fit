import { supabase } from './supabase';

interface WorkoutAdaptationRequest {
  workoutPlanId: string;
  userId: string;
  adaptationPrompt: string;
  currentPlan: any;
}

interface WorkoutAdaptationResponse {
  success: boolean;
  adaptedPlan?: any;
  message: string;
  changes?: string[];
}

export class AIWorkoutAdapterService {
  private static readonly OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  /**
   * Adapta un plan de entrenamiento basado en un prompt del usuario
   */
  static async adaptWorkoutPlan({
    workoutPlanId,
    userId,
    adaptationPrompt,
    currentPlan
  }: WorkoutAdaptationRequest): Promise<WorkoutAdaptationResponse> {
    try {
      console.log('🤖 Iniciando adaptación de entrenamiento...');
      console.log('📝 Prompt:', adaptationPrompt);

      // Crear el prompt para la IA
      const systemPrompt = this.createSystemPrompt(currentPlan);
      const userPrompt = this.createUserPrompt(adaptationPrompt, currentPlan);

      // Llamar a OpenAI
      const response = await this.callOpenAI(systemPrompt, userPrompt);
      
      if (!response) {
        return {
          success: false,
          message: 'No se pudo generar la adaptación. Intenta de nuevo.'
        };
      }

      // Parsear la respuesta
      const adaptedRaw = this.parseAIResponse(response);
      
      if (!adaptedRaw) {
        return {
          success: false,
          message: 'La respuesta de la IA no es válida. Intenta con un prompt más específico.'
        };
      }

      // Normalizar y completar campos faltantes para evitar que falten secciones en la UI
      const normalizedPlan = {
        // Mantener metadatos previos si existen
        plan_name: adaptedRaw.plan_name || currentPlan?.plan_name || 'Plan Adaptado',
        description: adaptedRaw.description || currentPlan?.description || '',
        duration_weeks: adaptedRaw.duration_weeks ?? currentPlan?.duration_weeks ?? 4,
        days_per_week: adaptedRaw.days_per_week ?? currentPlan?.days_per_week ?? (currentPlan?.weekly_structure?.length || 3),
        weekly_structure: adaptedRaw.weekly_structure ?? currentPlan?.weekly_structure ?? [],
        // Secciones que suelen faltar en respuestas de IA
        key_principles: Array.isArray(adaptedRaw.key_principles)
          ? adaptedRaw.key_principles
          : Array.isArray(currentPlan?.key_principles) ? currentPlan.key_principles : [],
        progression: typeof adaptedRaw.progression === 'string'
          ? adaptedRaw.progression
          : (currentPlan?.progression || 'Progresión gradual basada en tu nivel actual'),
        recommendations: Array.isArray(adaptedRaw.recommendations)
          ? adaptedRaw.recommendations
          : Array.isArray(currentPlan?.recommendations) ? currentPlan.recommendations : [],
        // Cambios informativos si vienen
        changes_made: Array.isArray(adaptedRaw.changes_made) ? adaptedRaw.changes_made : undefined,
      } as any;

      // Guardar el plan adaptado
      const savedPlan = await this.saveAdaptedPlan(workoutPlanId, userId, normalizedPlan, adaptationPrompt);
      
      if (!savedPlan) {
        return {
          success: false,
          message: 'Error al guardar el plan adaptado.'
        };
      }

      return {
        success: true,
        adaptedPlan: savedPlan,
        message: '¡Entrenamiento adaptado exitosamente!',
        changes: this.extractChanges(currentPlan, normalizedPlan)
      };

    } catch (error) {
      console.error('❌ Error adaptando entrenamiento:', error);
      return {
        success: false,
        message: 'Error al adaptar el entrenamiento. Verifica tu conexión e intenta de nuevo.'
      };
    }
  }

  /**
   * Crea el prompt del sistema para la IA
   */
  private static createSystemPrompt(currentPlan: any): string {
    return `Eres un entrenador personal experto en adaptación de planes de entrenamiento. 

Tu tarea es adaptar el plan de entrenamiento existente basándote en las instrucciones específicas del usuario, manteniendo la estructura general pero modificando ejercicios, series, repeticiones o cualquier otro aspecto según sea necesario.

REGLAS IMPORTANTES:
1. Mantén la estructura semanal del plan original
2. Conserva el nivel de dificultad apropiado
3. Asegúrate de que todos los ejercicios sean seguros y efectivos
4. Si se excluyen ejercicios, reemplázalos con alternativas apropiadas
5. Mantén el balance muscular
6. Responde SOLO con JSON válido, sin texto adicional

FORMATO DE RESPUESTA REQUERIDO:
{
  "plan_name": "Nombre del plan adaptado",
  "description": "Descripción de los cambios realizados",
  "weekly_structure": [
    {
      "day": "Lunes",
      "muscle_groups": ["pecho", "tríceps"],
      "exercises": [
        {
          "name": "Nombre del ejercicio",
          "sets": 3,
          "reps": "8-12",
          "rest": "90 segundos",
          "notes": "Notas adicionales"
        }
      ]
    }
  ],
  "changes_made": ["Lista de cambios específicos realizados"]
}`;
  }

  /**
   * Crea el prompt del usuario
   */
  private static createUserPrompt(adaptationPrompt: string, currentPlan: any): string {
    return `Plan de entrenamiento actual:
${JSON.stringify(currentPlan, null, 2)}

Instrucciones de adaptación del usuario:
"${adaptationPrompt}"

Por favor adapta este plan de entrenamiento siguiendo las instrucciones del usuario. Mantén la estructura semanal pero modifica los ejercicios, series, repeticiones o cualquier otro aspecto según sea necesario.

Responde SOLO con el JSON del plan adaptado, sin texto adicional.`;
  }

  /**
   * Llama a la API de OpenAI
   */
  private static async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string | null> {
    if (!this.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key no configurada');
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout

    try {
      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;

    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('⏰ Timeout en llamada a OpenAI');
        throw new Error('La adaptación está tardando mucho. Intenta de nuevo.');
      }
      throw error;
    }
  }

  /**
   * Parsea la respuesta de la IA
   */
  private static parseAIResponse(response: string): any | null {
    try {
      // Limpiar la respuesta de posibles markdown fences
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Buscar el primer JSON válido en la respuesta
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌ No se encontró JSON válido en la respuesta');
        return null;
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('❌ Error parseando respuesta de IA:', error);
      return null;
    }
  }

  /**
   * Guarda el plan adaptado en la base de datos
   */
  private static async saveAdaptedPlan(
    workoutPlanId: string,
    userId: string,
    adaptedPlan: any,
    adaptationPrompt: string
  ): Promise<any | null> {
    try {
      // Actualizar el plan existente en lugar de crear uno nuevo
      const { data, error } = await supabase
        .from('workout_plans')
        .update({
          plan_name: adaptedPlan.plan_name || 'Plan Adaptado',
          plan_data: adaptedPlan,
          adaptation_prompt: adaptationPrompt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workoutPlanId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error actualizando plan adaptado:', error);
        return null;
      }

      console.log('✅ Plan actualizado con adaptación IA');
      return data;
    } catch (error) {
      console.error('❌ Error en saveAdaptedPlan:', error);
      return null;
    }
  }

  /**
   * Extrae los cambios realizados para mostrar al usuario
   */
  private static extractChanges(originalPlan: any, adaptedPlan: any): string[] {
    const changes: string[] = [];
    
    try {
      // Comparar ejercicios por día
      const originalDays = originalPlan.weekly_structure || [];
      const adaptedDays = adaptedPlan.weekly_structure || [];
      
      for (let i = 0; i < Math.max(originalDays.length, adaptedDays.length); i++) {
        const originalDay = originalDays[i];
        const adaptedDay = adaptedDays[i];
        
        if (!originalDay && adaptedDay) {
          changes.push(`Agregado nuevo día: ${adaptedDay.day}`);
        } else if (originalDay && !adaptedDay) {
          changes.push(`Eliminado día: ${originalDay.day}`);
        } else if (originalDay && adaptedDay) {
          // Comparar ejercicios
          const originalExercises = originalDay.exercises || [];
          const adaptedExercises = adaptedDay.exercises || [];
          
          if (originalExercises.length !== adaptedExercises.length) {
            changes.push(`${adaptedDay.day}: ${adaptedExercises.length} ejercicios (antes ${originalExercises.length})`);
          }
        }
      }
      
      // Agregar cambios específicos si están en la respuesta
      if (adaptedPlan.changes_made && Array.isArray(adaptedPlan.changes_made)) {
        changes.push(...adaptedPlan.changes_made);
      }
      
    } catch (error) {
      console.error('❌ Error extrayendo cambios:', error);
      changes.push('Plan adaptado con modificaciones personalizadas');
    }
    
    return changes.length > 0 ? changes : ['Plan adaptado según tus especificaciones'];
  }
}
