// Servicio para generar puntos clave con IA

interface ExerciseContext {
  name: string;
  category?: string;
  muscles?: string[];
  equipment?: string[];
  exerciseType?: string;
}

export async function generateKeyPoints(context: ExerciseContext): Promise<string[]> {
  try {
    // Construir el prompt para la IA
    const prompt = buildPrompt(context);

    // Llamar a OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto entrenador personal y fisioterapeuta con amplia experiencia en biomecánica y técnica de ejercicios. Tu tarea es proporcionar puntos clave técnicos para ejecutar ejercicios correctamente.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error('Error al generar puntos clave con IA');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // Parsear los puntos clave (esperamos una lista numerada o con viñetas)
    const keyPoints = parseKeyPoints(content);

    return keyPoints;
  } catch (error) {
    console.error('Error generando puntos clave:', error);
    throw error;
  }
}

function buildPrompt(context: ExerciseContext): string {
  let prompt = `Genera 4 puntos clave técnicos específicos y concisos para ejecutar correctamente el siguiente ejercicio:\n\n`;
  
  prompt += `**Ejercicio:** ${context.name}\n`;
  
  if (context.category) {
    prompt += `**Categoría:** ${context.category}\n`;
  }
  
  if (context.muscles && context.muscles.length > 0) {
    prompt += `**Músculos trabajados:** ${context.muscles.join(', ')}\n`;
  }
  
  if (context.equipment && context.equipment.length > 0) {
    prompt += `**Equipamiento:** ${context.equipment.join(', ')}\n`;
  }
  
  if (context.exerciseType) {
    prompt += `**Tipo:** ${context.exerciseType}\n`;
  }

  prompt += `\nProporciona exactamente 4 puntos clave técnicos, cada uno en una línea separada.`;
  prompt += `\nCada punto debe ser:\n`;
  prompt += `- Específico para este ejercicio\n`;
  prompt += `- Conciso (máximo 10-12 palabras)\n`;
  prompt += `- Enfocado en técnica, postura o ejecución\n`;
  prompt += `- Práctico y accionable\n`;
  prompt += `\nFormato de salida: Una lista numerada simple, sin explicaciones adicionales.`;
  
  return prompt;
}

function parseKeyPoints(content: string): string[] {
  // Eliminar cualquier introducción o conclusión
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const keyPoints: string[] = [];
  
  for (const line of lines) {
    // Remover numeración, viñetas, asteriscos, guiones, etc.
    let cleaned = line
      .replace(/^\d+[\.\)]\s*/, '') // Números con punto o paréntesis
      .replace(/^[-•*]\s*/, '')      // Viñetas
      .replace(/^\*\*.*?\*\*:?\s*/, '') // Negritas
      .trim();
    
    // Si la línea tiene contenido y no es muy larga, agregarla
    if (cleaned.length > 10 && cleaned.length < 150) {
      keyPoints.push(cleaned);
    }
    
    // Limitar a 4-5 puntos
    if (keyPoints.length >= 5) break;
  }
  
  return keyPoints;
}


