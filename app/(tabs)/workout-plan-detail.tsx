import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/services/supabase';

export default function WorkoutPlanDetailScreen() {
  const { planId } = useLocalSearchParams();
  const { user } = useUser();
  const [plan, setPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());

  const loadPlanDetails = async () => {
    if (!user || !planId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', planId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error al cargar plan:', error);
        setError('No se pudo cargar el plan');
        return;
      }

      setPlan(data);
    } catch (err) {
      console.error('Error inesperado:', err);
      setError('Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!plan || !user) return;

    try {
      if (plan.is_active) {
        // Desactivar plan: UPDATE directo (no viola constraint único)
        const { error } = await supabase
          .from('workout_plans')
          .update({ is_active: false })
          .eq('id', plan.id);

        if (error) {
          console.error('Error al desactivar plan:', error);
          Alert.alert('Error', 'No se pudo desactivar el plan');
          return;
        }

        setPlan({ ...plan, is_active: false });
        Alert.alert('Éxito', 'Plan desactivado');
      } else {
        // Activar plan: usar RPC para garantizar único activo
        const { error } = await supabase.rpc('activate_workout_plan', {
          p_user_id: user.id,
          p_plan_id: plan.id,
        });

        if (error) {
          console.error('Error al activar plan:', error);
          Alert.alert('Error', 'No se pudo activar el plan');
          return;
        }

        setPlan({ ...plan, is_active: true });
        Alert.alert('Éxito', 'Plan activado');
      }
    } catch (err) {
      console.error('Error inesperado:', err);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    }
  };

  const handleDeletePlan = () => {
    Alert.alert(
      'Eliminar Plan',
      '¿Estás seguro de que quieres eliminar este plan?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('workout_plans')
                .delete()
                .eq('id', plan.id);

              if (error) {
                console.error('Error al eliminar plan:', error);
                Alert.alert('Error', 'No se pudo eliminar el plan');
                return;
              }

              Alert.alert('Éxito', 'Plan eliminado correctamente');
              router.back();
            } catch (err) {
              console.error('Error inesperado:', err);
              Alert.alert('Error', 'Ocurrió un error inesperado');
            }
          },
        },
      ]
    );
  };

  const loadCompletedDays = useCallback(async () => {
    if (!user?.id || !planId) return;

    try {
      const { data, error } = await supabase
        .from('workout_completions')
        .select('day_name')
        .eq('user_id', user.id)
        .eq('workout_plan_id', planId);

      if (error) {
        console.error('Error al cargar días completados:', error);
        return;
      }

      const completedSet = new Set(data.map((completion: any) => completion.day_name));
      setCompletedDays(completedSet);
      console.log('✅ Días completados cargados:', Array.from(completedSet));
    } catch (err) {
      console.error('Error inesperado al cargar días completados:', err);
    }
  }, [user?.id, planId]);

  useEffect(() => {
    loadPlanDetails();
  }, [planId]);

  useEffect(() => {
    if (plan && user?.id) {
      loadCompletedDays();
    }
  }, [plan, user, loadCompletedDays]);

  // Recargar los días completados cuando se enfoca la pantalla
  useFocusEffect(
    useCallback(() => {
      if (plan && user?.id) {
        loadCompletedDays();
      }
    }, [plan, user, loadCompletedDays])
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color="#00D4AA" />
          <Text style={styles.loadingText}>Cargando plan...</Text>
        </View>
      </>
    );
  }

  if (error || !plan) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent]}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF5722" />
          <Text style={styles.errorText}>{error || 'Plan no encontrado'}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const planData = plan.plan_data;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/workout' as any)} style={styles.backIconButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Plan de Entrenamiento</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Plan Info */}
        <View style={styles.planHeader}>
          <View style={styles.planTitleContainer}>
            <Ionicons name="fitness" size={32} color="#00D4AA" />
            <View style={styles.planTitleTextContainer}>
              <Text style={styles.planName}>{plan.plan_name}</Text>
              {plan.is_active && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Plan Activo</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.planDescription}>{plan.description}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#00D4AA" />
            <Text style={styles.statValue}>{planData.duration_weeks}</Text>
            <Text style={styles.statLabel}>Semanas</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="fitness-outline" size={24} color="#00D4AA" />
            <Text style={styles.statValue}>{planData.days_per_week}</Text>
            <Text style={styles.statLabel}>Días/Semana</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={24} color="#00D4AA" />
            <Text style={styles.statValue}>{planData.weekly_structure?.[0]?.duration || 45}</Text>
            <Text style={styles.statLabel}>Min/Sesión</Text>
          </View>
        </View>

        {/* Weekly Structure */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Estructura Semanal</Text>
          <Text style={styles.sectionSubtitle}>Toca cada día para ver detalles y tips</Text>
          {planData.weekly_structure?.map((day: any, index: number) => {
            const dayKey = day.day || `day_${index + 1}`;
            const isCompleted = completedDays.has(dayKey);
            
            return (
              <TouchableOpacity
                key={index}
                style={[styles.dayCard, isCompleted && styles.dayCardCompleted]}
                onPress={() => {
                  router.push({
                    pathname: '/(tabs)/workout-day-detail',
                    params: {
                      dayData: JSON.stringify(day),
                      planName: plan.plan_name,
                      planId: plan.id,
                      dayName: dayKey,
                    },
                  } as any);
                }}
                activeOpacity={0.7}
              >
                {isCompleted && <View style={styles.completedSideBar} />}
                <View style={styles.dayHeader}>
                  <View style={styles.dayTitleContainer}>
                    <Text style={styles.dayTitle}>{day.day}</Text>
                    {isCompleted && (
                      <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                        <Text style={styles.completedBadgeText}>Completado</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.dayDuration}>
                    <Ionicons name="time-outline" size={14} color="#00D4AA" />
                    <Text style={styles.dayDurationText}>{day.duration} min</Text>
                  </View>
                </View>
                <Text style={styles.dayFocus}>{day.focus}</Text>
                <View style={styles.exercisesContainer}>
                  <Text style={styles.exercisesTitle}>Ejercicios ({day.exercises?.length || 0}):</Text>
                  <View style={styles.exercisesList}>
                    {day.exercises?.slice(0, 3).map((exercise: any, idx: number) => {
                      const isOldFormat = typeof exercise === 'string';
                      const exerciseName = isOldFormat ? exercise : exercise.name;

                      return (
                        <View key={idx} style={styles.exercisePreviewItem}>
                          <Ionicons name="checkmark-circle" size={14} color="#00D4AA" />
                          <Text style={styles.exercisePreviewText}>{exerciseName}</Text>
                        </View>
                      );
                    })}
                    {day.exercises?.length > 3 && (
                      <Text style={styles.moreExercisesText}>
                        +{day.exercises.length - 3} más
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.viewDetailsButton}>
                  <Text style={styles.viewDetailsText}>Ver detalles completos</Text>
                  <Ionicons name="chevron-forward" size={16} color="#00D4AA" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Key Principles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Principios Clave</Text>
          <View style={styles.principlesContainer}>
            {planData.key_principles?.map((principle: string, index: number) => (
              <View key={index} style={styles.principleItem}>
                <Ionicons name="bulb" size={16} color="#FFD700" />
                <Text style={styles.principleText}>{principle}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Progression */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Progresión</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>{planData.progression}</Text>
          </View>
        </View>

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Recomendaciones</Text>
          <View style={styles.recommendationsContainer}>
            {planData.recommendations?.map((rec: string, index: number) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons name="star" size={16} color="#00D4AA" />
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, plan.is_active ? styles.deactivateButton : styles.activateButton]}
            onPress={handleToggleActive}
          >
            <Ionicons
              name={plan.is_active ? 'pause-circle' : 'play-circle'}
              size={20}
              color="#ffffff"
            />
            <Text style={styles.actionButtonText}>
              {plan.is_active ? 'Desactivar Plan' : 'Activar Plan'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeletePlan}>
            <Ionicons name="trash" size={20} color="#ffffff" />
            <Text style={styles.deleteButtonText}>Eliminar Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Creation Date */}
        <Text style={styles.creationDate}>
          Creado el {new Date(plan.created_at).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#FF5722',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#00D4AA',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1a1a1a',
  },
  backIconButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  planHeader: {
    padding: 20,
    paddingTop: 0,
  },
  planTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planTitleTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  activeBadge: {
    backgroundColor: '#00D4AA',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: '600',
  },
  planDescription: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
  },
  dayCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#00D4AA',
    position: 'relative',
    overflow: 'hidden',
  },
  dayCardCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)', // Verde muy tenue
    borderColor: '#4CAF50',
  },
  completedSideBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#4CAF50',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dayTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  completedBadgeText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4,
  },
  dayDuration: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayDurationText: {
    fontSize: 14,
    color: '#00D4AA',
    marginLeft: 4,
    fontWeight: '600',
  },
  dayFocus: {
    fontSize: 15,
    color: '#00D4AA',
    marginBottom: 12,
    fontWeight: '600',
  },
  exercisesContainer: {
    marginTop: 8,
  },
  exercisesTitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
    fontWeight: '600',
  },
  exercisesList: {
    gap: 6,
  },
  exercisePreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  exercisePreviewText: {
    fontSize: 13,
    color: '#ffffff',
    marginLeft: 6,
  },
  moreExercisesText: {
    fontSize: 12,
    color: '#00D4AA',
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 20,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#00D4AA',
    fontWeight: '600',
    marginRight: 4,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseDetails: {
    flex: 1,
    marginLeft: 8,
  },
  exerciseName: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseSpecs: {
    fontSize: 12,
    color: '#00D4AA',
    fontWeight: '500',
  },
  exerciseText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 8,
  },
  principlesContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  principleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  principleText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 22,
  },
  recommendationsContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  activateButton: {
    backgroundColor: '#00D4AA',
  },
  deactivateButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F44336',
    gap: 8,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  creationDate: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
});

