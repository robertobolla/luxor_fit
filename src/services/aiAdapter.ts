import { WorkoutSession, AIRecommendation, RecommendationType, UserProfile } from '@/types';
import { supabase } from './supabase';

export class AIAdapter {
  /**
   * Analiza una sesión de entrenamiento completada y genera recomendaciones
   */
  static async analyzeWorkoutSession(
    session: WorkoutSession,
    userProfile: UserProfile
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    try {
      // Obtener historial de sesiones del usuario
      const { data: recentSessions } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', session.user_id)
        .order('started_at', { ascending: false })
        .limit(10);

      if (!recentSessions || recentSessions.length === 0) {
        return recommendations;
      }

      // Análisis basado en RPE (Rate of Perceived Exertion)
      if (session.rpe) {
        const avgRPE = recentSessions.reduce((sum, s) => sum + (s.rpe || 0), 0) / recentSessions.length;
        
        // Si el RPE es consistentemente bajo, sugerir aumentar intensidad
        if (session.rpe < 6 && avgRPE < 6) {
          recommendations.push({
            id: `rpe-${Date.now()}`,
            user_id: session.user_id,
            type: RecommendationType.INCREASE_WEIGHT,
            exercise_id: null,
            workout_id: session.workout_id,
            current_value: 0,
            recommended_value: 5, // Aumentar 5%
            reason: 'Tu RPE ha sido bajo en las últimas sesiones. Considera aumentar el peso para mayor desafío.',
            confidence: 0.8,
            created_at: new Date().toISOString(),
          });
        }
        
        // Si el RPE es muy alto, sugerir reducir intensidad
        if (session.rpe > 8) {
          recommendations.push({
            id: `rpe-reduce-${Date.now()}`,
            user_id: session.user_id,
            type: RecommendationType.DECREASE_WEIGHT,
            exercise_id: null,
            workout_id: session.workout_id,
            current_value: 0,
            recommended_value: 5, // Reducir 5%
            reason: 'Tu RPE fue muy alto en esta sesión. Considera reducir el peso para evitar sobreentrenamiento.',
            confidence: 0.9,
            created_at: new Date().toISOString(),
          });
        }
      }

      // Análisis de adherencia (frecuencia de entrenamientos)
      const lastWeekSessions = recentSessions.filter(s => {
        const sessionDate = new Date(s.started_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return sessionDate >= weekAgo;
      });

      const targetSessions = userProfile.available_days;
      const actualSessions = lastWeekSessions.length;

      if (actualSessions < targetSessions * 0.7) {
        recommendations.push({
          id: `adherence-${Date.now()}`,
          user_id: session.user_id,
          type: RecommendationType.ADD_EXERCISE,
          exercise_id: null,
          workout_id: null,
          current_value: actualSessions,
          recommended_value: targetSessions,
          reason: `Has entrenado ${actualSessions} de ${targetSessions} días objetivo. Intenta ser más consistente.`,
          confidence: 0.7,
          created_at: new Date().toISOString(),
        });
      }

      // Análisis de progresión basado en el nivel de fitness
      if (userProfile.fitness_level === 'beginner') {
        // Para principiantes, enfocarse en consistencia y técnica
        if (recentSessions.length >= 4 && avgRPE < 7) {
          recommendations.push({
            id: `progression-${Date.now()}`,
            user_id: session.user_id,
            type: RecommendationType.INCREASE_REPS,
            exercise_id: null,
            workout_id: session.workout_id,
            current_value: 0,
            recommended_value: 2, // Aumentar 2 repeticiones
            reason: 'Como principiante, has mostrado buena consistencia. Intenta aumentar las repeticiones gradualmente.',
            confidence: 0.6,
            created_at: new Date().toISOString(),
          });
        }
      } else if (userProfile.fitness_level === 'intermediate') {
        // Para intermedios, variar intensidad y volumen
        if (avgRPE < 6) {
          recommendations.push({
            id: `intermediate-${Date.now()}`,
            user_id: session.user_id,
            type: RecommendationType.INCREASE_SETS,
            exercise_id: null,
            workout_id: session.workout_id,
            current_value: 0,
            recommended_value: 1, // Aumentar 1 serie
            reason: 'Tu nivel intermedio te permite manejar más volumen. Considera agregar una serie extra.',
            confidence: 0.7,
            created_at: new Date().toISOString(),
          });
        }
      }

      // Análisis de objetivos específicos
      if (userProfile.goals.includes('muscle_gain')) {
        // Para ganancia de músculo, enfocarse en volumen y progresión
        if (avgRPE < 7 && recentSessions.length >= 3) {
          recommendations.push({
            id: `muscle-gain-${Date.now()}`,
            user_id: session.user_id,
            type: RecommendationType.INCREASE_WEIGHT,
            exercise_id: null,
            workout_id: session.workout_id,
            current_value: 0,
            recommended_value: 2.5, // Aumentar 2.5kg
            reason: 'Para ganancia de músculo, necesitas progresión constante. Aumenta el peso gradualmente.',
            confidence: 0.8,
            created_at: new Date().toISOString(),
          });
        }
      }

      if (userProfile.goals.includes('strength')) {
        // Para fuerza, enfocarse en intensidad y menos repeticiones
        if (avgRPE < 8) {
          recommendations.push({
            id: `strength-${Date.now()}`,
            user_id: session.user_id,
            type: RecommendationType.INCREASE_WEIGHT,
            exercise_id: null,
            workout_id: session.workout_id,
            current_value: 0,
            recommended_value: 5, // Aumentar 5kg
            reason: 'Para desarrollo de fuerza, necesitas cargas más pesadas. Aumenta el peso y reduce las repeticiones.',
            confidence: 0.9,
            created_at: new Date().toISOString(),
          });
        }
      }

      // Guardar recomendaciones en la base de datos
      if (recommendations.length > 0) {
        await supabase
          .from('ai_recommendations')
          .insert(recommendations);
      }

      return recommendations;
    } catch (error) {
      console.error('Error analizando sesión de entrenamiento:', error);
      return [];
    }
  }

  /**
   * Genera un nuevo entrenamiento basado en el perfil del usuario y recomendaciones
   */
  static async generateWorkout(
    userProfile: UserProfile,
    recommendations: AIRecommendation[] = []
  ): Promise<any> {
    try {
      // Obtener ejercicios disponibles basados en el equipamiento
      const { data: exercises } = await supabase
        .from('exercises')
        .select('*')
        .in('equipment_required', userProfile.equipment);

      if (!exercises || exercises.length === 0) {
        throw new Error('No hay ejercicios disponibles para tu equipamiento');
      }

      // Lógica de generación basada en objetivos y nivel
      const workout = {
        name: this.generateWorkoutName(userProfile),
        description: this.generateWorkoutDescription(userProfile),
        duration_minutes: this.calculateWorkoutDuration(userProfile),
        difficulty: this.calculateWorkoutDifficulty(userProfile),
        exercises: this.selectExercises(exercises, userProfile, recommendations),
      };

      return workout;
    } catch (error) {
      console.error('Error generando entrenamiento:', error);
      throw error;
    }
  }

  private static generateWorkoutName(userProfile: UserProfile): string {
    const goals = userProfile.goals;
    const level = userProfile.fitness_level;
    
    if (goals.includes('muscle_gain')) {
      return level === 'beginner' ? 'Entrenamiento de Fuerza Básico' : 'Hipertrofia Intensiva';
    }
    if (goals.includes('strength')) {
      return 'Entrenamiento de Fuerza Máxima';
    }
    if (goals.includes('endurance')) {
      return 'Entrenamiento de Resistencia';
    }
    if (goals.includes('weight_loss')) {
      return 'Quema de Grasa Intensiva';
    }
    
    return 'Entrenamiento General';
  }

  private static generateWorkoutDescription(userProfile: UserProfile): string {
    const goals = userProfile.goals;
    const days = userProfile.available_days;
    
    let description = `Entrenamiento personalizado para ${days} días por semana. `;
    
    if (goals.includes('muscle_gain')) {
      description += 'Enfocado en hipertrofia muscular con ejercicios compuestos.';
    } else if (goals.includes('strength')) {
      description += 'Desarrollo de fuerza máxima con cargas pesadas.';
    } else if (goals.includes('endurance')) {
      description += 'Mejora de resistencia cardiovascular y muscular.';
    } else if (goals.includes('weight_loss')) {
      description += 'Quema de calorías y pérdida de grasa.';
    } else {
      description += 'Mantenimiento general de la forma física.';
    }
    
    return description;
  }

  private static calculateWorkoutDuration(userProfile: UserProfile): number {
    const level = userProfile.fitness_level;
    const days = userProfile.available_days;
    
    // Más días = sesiones más cortas, menos días = sesiones más largas
    const baseDuration = level === 'beginner' ? 30 : level === 'intermediate' ? 45 : 60;
    const adjustment = days >= 5 ? -10 : days <= 2 ? 15 : 0;
    
    return Math.max(20, baseDuration + adjustment);
  }

  private static calculateWorkoutDifficulty(userProfile: UserProfile): number {
    const level = userProfile.fitness_level;
    const goals = userProfile.goals;
    
    let difficulty = level === 'beginner' ? 3 : level === 'intermediate' ? 6 : 8;
    
    // Ajustar según objetivos
    if (goals.includes('strength')) difficulty += 1;
    if (goals.includes('endurance')) difficulty += 1;
    if (goals.includes('weight_loss')) difficulty += 1;
    
    return Math.min(10, Math.max(1, difficulty));
  }

  private static selectExercises(
    exercises: any[],
    userProfile: UserProfile,
    recommendations: AIRecommendation[]
  ): any[] {
    // Lógica simplificada para seleccionar ejercicios
    // En una implementación real, esto sería mucho más sofisticado
    
    const selectedExercises = [];
    const muscleGroups = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'abs', 'quads', 'hamstrings'];
    
    // Seleccionar 1-2 ejercicios por grupo muscular principal
    muscleGroups.forEach((muscleGroup, index) => {
      const groupExercises = exercises.filter(ex => 
        ex.muscle_groups.includes(muscleGroup)
      );
      
      if (groupExercises.length > 0) {
        const exercise = groupExercises[Math.floor(Math.random() * groupExercises.length)];
        selectedExercises.push({
          ...exercise,
          sets: userProfile.fitness_level === 'beginner' ? 3 : 4,
          reps: userProfile.goals.includes('strength') ? '5-8' : '8-12',
          rest_seconds: 60,
          order: index + 1,
        });
      }
    });
    
    return selectedExercises.slice(0, 8); // Máximo 8 ejercicios
  }
}
