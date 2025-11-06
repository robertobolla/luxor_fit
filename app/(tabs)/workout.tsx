import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/services/supabase';
import { useWorkoutStore } from '@/store/workoutStore';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { useLoadingState } from '@/hooks/useLoadingState';

export default function WorkoutScreen() {
  const { user } = useUser();
  const { 
    workouts, 
    sessions, 
    loadWorkouts, 
    loadSessions, 
    isLoading: isLoadingStore 
  } = useWorkoutStore();
  const { isLoading: isLoadingPlans, setLoading: setLoadingPlans } = useLoadingState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [workoutPlans, setWorkoutPlans] = useState<any[]>([]);

  useEffect(() => {
    loadWorkouts();
    loadSessions();
    loadWorkoutPlans();
  }, [user]);

  const loadWorkoutPlans = async () => {
    if (!user) return;

    setLoadingPlans(true);
    try {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading workout plans:', error);
        return;
      }

      setWorkoutPlans(data || []);
    } catch (err) {
      console.error('Error inesperado:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const activateWorkoutPlan = async (planId: string) => {
    if (!user) return;

    try {
      // Activación atómica vía RPC (desactiva otros y activa este)
      const { error: rpcError } = await supabase.rpc('activate_workout_plan', {
        p_user_id: user.id,
        p_plan_id: planId,
      });

      if (rpcError) {
        console.error('Error activating workout plan:', rpcError);
        return;
      }
      
      // Recargar la lista de planes para mostrar el estado actualizado
      await loadWorkoutPlans();
      
    } catch (err) {
      console.error('Error activating workout plan:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadWorkouts(), loadSessions(), loadWorkoutPlans()]);
    setRefreshing(false);
  };

  const getWorkoutDifficulty = (difficulty: number) => {
    if (difficulty <= 3) return { text: 'Fácil', color: '#4CAF50' };
    if (difficulty <= 6) return { text: 'Moderado', color: '#FF9800' };
    return { text: 'Difícil', color: '#F44336' };
  };

  const getWorkoutType = (workout: any) => {
    const exerciseCount = workout.workout_exercises?.length || 0;
    if (exerciseCount <= 4) return 'Entrenamiento corto';
    if (exerciseCount <= 8) return 'Entrenamiento estándar';
    return 'Entrenamiento intenso';
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Entrenamientos</Text>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={() => router.push('/workout-generator')}
        >
          <Ionicons name="add" size={20} color="#1a1a1a" />
          <Text style={styles.generateButtonText}>Generar</Text>
        </TouchableOpacity>
      </View>

      {/* Planes de Entrenamiento Generados */}
      {isLoadingPlans && (
        <LoadingOverlay visible={true} message="Cargando planes..." />
      )}
      {!isLoadingPlans && workoutPlans.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Mis Planes de Entrenamiento</Text>
          {workoutPlans.map((plan) => {
            const planData = plan.plan_data;
            return (
              <View key={plan.id} style={styles.planCard}>
                <View style={styles.planHeader}>
                  <View style={styles.planTitleContainer}>
                    <Ionicons name="fitness" size={24} color="#00D4AA" />
                    <Text style={styles.planName}>{plan.plan_name}</Text>
                  </View>
                  {plan.is_active && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Activo</Text>
                    </View>
                  )}
                </View>
                
                <Text style={styles.planDescription}>{plan.description}</Text>
                
                <View style={styles.planStats}>
                  <View style={styles.stat}>
                    <Ionicons name="calendar" size={16} color="#00D4AA" />
                    <Text style={styles.statText}>{planData.duration_weeks} semanas</Text>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons name="fitness-outline" size={16} color="#00D4AA" />
                    <Text style={styles.statText}>{planData.days_per_week} días/semana</Text>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons name="time-outline" size={16} color="#00D4AA" />
                    <Text style={styles.statText}>{planData.weekly_structure?.[0]?.duration || 45} min</Text>
                  </View>
                </View>

                <View style={styles.planActions}>
                  <TouchableOpacity
                    style={styles.viewPlanButton}
                    onPress={() => router.push(`/(tabs)/workout-plan-detail?planId=${plan.id}` as any)}
                  >
                    <Ionicons name="eye" size={16} color="#ffffff" />
                    <Text style={styles.viewPlanButtonText}>Ver Plan Completo</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.planDate}>
                  Creado: {new Date(plan.created_at).toLocaleDateString('es-ES')}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Entrenamientos del Store */}
      {workouts.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏋️ Entrenamientos</Text>
          {workouts.map((workout) => {
            const difficulty = getWorkoutDifficulty(workout.difficulty);
            const type = getWorkoutType(workout);
            
            return (
              <TouchableOpacity
                key={workout.id}
                style={styles.workoutCard}
                onPress={() => router.push(`/workout-details/${workout.id}`)}
              >
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutName}>{workout.name}</Text>
                  <View style={[styles.difficultyBadge, { backgroundColor: difficulty.color }]}>
                    <Text style={styles.difficultyText}>{difficulty.text}</Text>
                  </View>
                </View>
                
                <Text style={styles.workoutDescription}>{workout.description}</Text>
                
                <View style={styles.workoutStats}>
                  <View style={styles.stat}>
                    <Ionicons name="time-outline" size={16} color="#00D4AA" />
                    <Text style={styles.statText}>{workout.duration_minutes} min</Text>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons name="fitness-outline" size={16} color="#00D4AA" />
                    <Text style={styles.statText}>{workout.workout_exercises?.length || 0} ejercicios</Text>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons name="trending-up-outline" size={16} color="#00D4AA" />
                    <Text style={styles.statText}>{type}</Text>
                  </View>
                </View>

                <View style={styles.workoutActions}>
                  <TouchableOpacity
                    style={[
                      styles.startButton,
                      workout.is_active && styles.activePlanButton
                    ]}
                    onPress={() => {
                      if (workout.is_active) {
                        router.push(`/workout-active/${workout.id}`);
                      } else {
                        activateWorkoutPlan(workout.id);
                      }
                    }}
                  >
                    <Ionicons 
                      name={workout.is_active ? "checkmark" : "play"} 
                      size={16} 
                      color={workout.is_active ? "#ffffff" : "#1a1a1a"} 
                    />
                    <Text style={[
                      styles.startButtonText,
                      workout.is_active && styles.activePlanButtonText
                    ]}>
                      {workout.is_active ? "Activo" : "Activar"}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() => router.push(`/workout-details/${workout.id}`)}
                  >
                    <Ionicons name="eye" size={16} color="#00D4AA" />
                    <Text style={styles.detailsButtonText}>Ver detalles</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {/* Empty State - Solo si no hay planes ni entrenamientos */}
      {workoutPlans.length === 0 && workouts.length === 0 && !isLoadingPlans && (
        <View style={styles.emptyState}>
          <Ionicons name="fitness-outline" size={64} color="#666" />
          <Text style={styles.emptyTitle}>No hay entrenamientos</Text>
          <Text style={styles.emptyDescription}>
            Genera tu primer plan de entrenamiento personalizado
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/(tabs)/workout-generator' as any)}
          >
            <Text style={styles.createButtonText}>Crear plan de entrenamiento</Text>
          </TouchableOpacity>
        </View>
      )}

      {sessions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sesiones recientes</Text>
          {sessions.slice(0, 3).map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionName}>{session.workout.name}</Text>
                <Text style={styles.sessionDate}>
                  {new Date(session.started_at).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
              <View style={styles.sessionStatus}>
                {session.completed_at ? (
                  <Ionicons name="checkmark-circle" size={24} color="#00D4AA" />
                ) : (
                  <Ionicons name="time" size={24} color="#FF9800" />
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  generateButton: {
    backgroundColor: '#00D4AA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  generateButtonText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  workoutsList: {
    padding: 20,
    paddingTop: 10,
  },
  workoutCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  workoutDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 16,
  },
  workoutStats: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statText: {
    color: '#ffffff',
    fontSize: 12,
    marginLeft: 4,
  },
  workoutActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  startButton: {
    backgroundColor: '#00D4AA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  activePlanButton: {
    backgroundColor: '#4CAF50',
  },
  activePlanButtonText: {
    color: '#ffffff',
  },
  detailsButton: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00D4AA',
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
  },
  detailsButtonText: {
    color: '#00D4AA',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#00D4AA',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#999',
    marginTop: 12,
    fontSize: 14,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#00D4AA',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
    flex: 1,
  },
  activeBadge: {
    backgroundColor: '#00D4AA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: '600',
  },
  planDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 16,
    lineHeight: 20,
  },
  planStats: {
    flexDirection: 'row',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  planActions: {
    marginBottom: 12,
  },
  viewPlanButton: {
    backgroundColor: '#00D4AA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewPlanButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  planDate: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  sessionCard: {
    backgroundColor: '#2a2a2a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 14,
    color: '#666',
  },
  sessionStatus: {
    marginLeft: 16,
  },
});
