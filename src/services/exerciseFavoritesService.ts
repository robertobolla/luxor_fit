import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'exercise_favorites';

export interface FavoriteExercise {
  id: string;
  canonical_name: string;
  muscle: string;
  addedAt: string;
}

/**
 * Obtiene todos los ejercicios favoritos
 */
export const getFavoriteExercises = async (): Promise<FavoriteExercise[]> => {
  try {
    const data = await AsyncStorage.getItem(FAVORITES_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error al obtener favoritos:', error);
    return [];
  }
};

/**
 * Verifica si un ejercicio está en favoritos
 */
export const isExerciseFavorite = async (exerciseId: string): Promise<boolean> => {
  const favorites = await getFavoriteExercises();
  return favorites.some(fav => fav.id === exerciseId);
};

/**
 * Obtiene los IDs de todos los ejercicios favoritos (para verificación rápida)
 */
export const getFavoriteExerciseIds = async (): Promise<Set<string>> => {
  const favorites = await getFavoriteExercises();
  return new Set(favorites.map(fav => fav.id));
};

/**
 * Agrega un ejercicio a favoritos
 */
export const addExerciseToFavorites = async (
  exerciseId: string,
  canonicalName: string,
  muscle: string
): Promise<boolean> => {
  try {
    const favorites = await getFavoriteExercises();
    
    // Verificar si ya existe
    if (favorites.some(fav => fav.id === exerciseId)) {
      return true; // Ya está en favoritos
    }
    
    const newFavorite: FavoriteExercise = {
      id: exerciseId,
      canonical_name: canonicalName,
      muscle: muscle,
      addedAt: new Date().toISOString(),
    };
    
    favorites.push(newFavorite);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    
    console.log(`⭐ Ejercicio agregado a favoritos: ${canonicalName}`);
    return true;
  } catch (error) {
    console.error('Error al agregar a favoritos:', error);
    return false;
  }
};

/**
 * Elimina un ejercicio de favoritos
 */
export const removeExerciseFromFavorites = async (exerciseId: string): Promise<boolean> => {
  try {
    const favorites = await getFavoriteExercises();
    const filteredFavorites = favorites.filter(fav => fav.id !== exerciseId);
    
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(filteredFavorites));
    
    console.log(`💔 Ejercicio eliminado de favoritos: ${exerciseId}`);
    return true;
  } catch (error) {
    console.error('Error al eliminar de favoritos:', error);
    return false;
  }
};

/**
 * Alterna el estado de favorito de un ejercicio
 */
export const toggleExerciseFavorite = async (
  exerciseId: string,
  canonicalName: string,
  muscle: string
): Promise<boolean> => {
  const isFavorite = await isExerciseFavorite(exerciseId);
  
  if (isFavorite) {
    await removeExerciseFromFavorites(exerciseId);
    return false; // Ya no es favorito
  } else {
    await addExerciseToFavorites(exerciseId, canonicalName, muscle);
    return true; // Ahora es favorito
  }
};

/**
 * Obtiene los favoritos filtrados por músculo
 */
export const getFavoritesByMuscle = async (muscle: string): Promise<FavoriteExercise[]> => {
  const favorites = await getFavoriteExercises();
  return favorites.filter(fav => fav.muscle === muscle);
};

/**
 * Obtiene el conteo de favoritos por músculo
 */
export const getFavoritesCountByMuscle = async (): Promise<Record<string, number>> => {
  const favorites = await getFavoriteExercises();
  const counts: Record<string, number> = {};
  
  favorites.forEach(fav => {
    counts[fav.muscle] = (counts[fav.muscle] || 0) + 1;
  });
  
  return counts;
};

/**
 * Limpia todos los favoritos
 */
export const clearAllFavorites = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(FAVORITES_KEY);
    console.log('🗑️ Todos los favoritos eliminados');
  } catch (error) {
    console.error('Error al limpiar favoritos:', error);
  }
};
