/**
 * Utilidades para formatear texto en la aplicación
 */

/**
 * Capitaliza la primera letra de cada palabra en un string
 * Ejemplo: "press banca plano" → "Press Banca Plano"
 * 
 * @param text - El texto a capitalizar
 * @returns El texto con cada palabra capitalizada
 */
export function capitalizeWords(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Capitaliza solo la primera letra de la primera palabra
 * Ejemplo: "press banca plano" → "Press banca plano"
 * 
 * @param text - El texto a capitalizar
 * @returns El texto con la primera letra capitalizada
 */
export function capitalizeFirstLetter(text: string): string {
  if (!text) return '';
  
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Normaliza el nombre de un ejercicio para mostrarlo
 * Aplica capitalización consistente
 * 
 * @param exerciseName - El nombre del ejercicio
 * @returns El nombre normalizado
 */
export function normalizeExerciseName(exerciseName: string): string {
  if (!exerciseName) return '';
  
  // Casos especiales que necesitan tratamiento particular
  const specialCases: { [key: string]: string } = {
    'rir': 'RIR',
    'z': 'Z',
    'hiit': 'HIIT',
    'emom': 'EMOM',
    'amrap': 'AMRAP',
  };
  
  const words = exerciseName.toLowerCase().split(' ');
  
  return words
    .map((word, index) => {
      // Revisar si es un caso especial
      if (specialCases[word]) {
        return specialCases[word];
      }
      
      // Capitalizar la primera letra
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Formatea el nombre de un día de entrenamiento
 * Ejemplo: "dia 1" → "Día 1"
 * 
 * @param dayName - El nombre del día
 * @returns El nombre formateado
 */
export function formatDayName(dayName: string): string {
  if (!dayName) return '';
  
  return normalizeExerciseName(dayName);
}

/**
 * Formatea el nombre de un músculo/grupo muscular
 * Ejemplo: "pecho y bíceps" → "Pecho y Bíceps"
 * 
 * @param muscleName - El nombre del músculo
 * @returns El nombre formateado
 */
export function formatMuscleName(muscleName: string): string {
  if (!muscleName) return '';
  
  return capitalizeWords(muscleName);
}

