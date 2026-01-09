import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import {
  getStudentStats,
  getStudentActivePlan,
  StudentStats,
} from '../src/services/trainerService';

type PeriodType = '1week' | '1month' | '3months' | '6months' | 'all';

const PERIODS = {
  '1week': { label: '7 días', days: 7 },
  '1month': { label: 'Este mes', days: 30 },
  '3months': { label: '3 meses', days: 90 },
  '6months': { label: '6 meses', days: 180 },
  'all': { label: 'Todo', days: null },
};

export default function TrainerStudentDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const { user } = useUser();
  const studentId = params.studentId as string;
  const studentName = params.studentName as string;
  const studentPhoto = params.studentPhoto as string;

  const [stats, setStats] = useState<StudentStats | null>(null);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('1month');

  useEffect(() => {
    loadStudentData();
  }, [user, studentId, selectedPeriod]);

  useFocusEffect(
    useCallback(() => {
      loadStudentData();
    }, [user, studentId])
  );

  const loadStudentData = async () => {
    if (!user || !studentId) return;

    setIsLoading(true);
    try {
      // Calcular fechas según el periodo seleccionado
      const endDate = new Date().toISOString().split('T')[0];
      let startDate: string;
      
      if (PERIODS[selectedPeriod].days) {
        const start = new Date();
        start.setDate(start.getDate() - PERIODS[selectedPeriod].days!);
        startDate = start.toISOString().split('T')[0];
      } else {
        // 'all' - usar una fecha muy antigua
        startDate = '2020-01-01';
      }

      // Cargar estadísticas con rango de fechas
      console.log('📊 Cargando estadísticas del alumno:', {
        trainerId: user.id,
        studentId,
        startDate,
        endDate,
        periodo: selectedPeriod
      });
      
      const statsResult = await getStudentStats(user.id, studentId, startDate, endDate);
      console.log('📊 Resultado de getStudentStats:', {
        success: statsResult.success,
        hasData: !!statsResult.data,
        error: statsResult.error,
        data: statsResult.data
      });
      
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
        console.log('✅ Stats guardadas en estado');
      } else {
        console.warn('⚠️ No se pudieron cargar stats:', statsResult.error);
      }

      // Cargar plan activo
      const planResult = await getStudentActivePlan(user.id, studentId);
      console.log('📋 Resultado de getStudentActivePlan:', {
        success: planResult.success,
        hasData: !!planResult.data,
      });
      
      if (planResult.success && planResult.data) {
        setActivePlan(planResult.data);
      }
    } catch (error) {
      console.error('❌ Error loading student data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStudentData();
    setRefreshing(false);
  };

  const handleEditPlan = () => {
    if (!activePlan) {
      Alert.alert(t('trainer.noActivePlan'), t('trainer.studentNoActivePlan'));
      return;
    }

    router.push({
      pathname: '/(tabs)/workout-plan-detail',
      params: {
        planId: activePlan.id,
        isTrainerView: 'true',
        studentId: studentId,
      },
    } as any);
  };

  const handleViewAllWorkouts = () => {
    // Navegar a una vista de todos los entrenamientos del alumno
    Alert.alert(t('trainer.comingSoon'), t('trainer.featureComingSoon'));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffb300" />
          <Text style={styles.loadingText}>Cargando estadísticas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {studentName}
        </Text>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => router.push({
            pathname: '/chat',
            params: {
              otherUserId: studentId,
              otherUserName: studentName,
            },
          } as any)}
        >
          <Ionicons name="chatbubble" size={24} color="#ffb300" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Avatar y nombre */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarPlaceholder}>
              {(studentName || 'A')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.studentNameLarge}>{studentName}</Text>
        </View>

        {/* Plan Activo */}
        {activePlan ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🏋️ Plan de Entrenamiento Activo</Text>
            </View>
            <View style={styles.planCard}>
              <Text style={styles.planName}>{activePlan.plan_name}</Text>
              <Text style={styles.planDescription}>{activePlan.description}</Text>
              
              <View style={styles.planStats}>
                <View style={styles.stat}>
                  <Ionicons name="calendar" size={16} color="#ffb300" />
                  <Text style={styles.statText}>
                    {activePlan.plan_data?.duration_weeks || 0} semanas
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="fitness-outline" size={16} color="#ffb300" />
                  <Text style={styles.statText}>
                    {activePlan.plan_data?.days_per_week || 0} días/semana
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditPlan}
              >
                <Ionicons name="create-outline" size={18} color="#1a1a1a" />
                <Text style={styles.editButtonText}>Editar Plan</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏋️ Plan de Entrenamiento</Text>
            <View style={styles.emptyCard}>
              <Ionicons name="fitness-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>Sin plan activo</Text>
            </View>
          </View>
        )}

        {/* Estadísticas de Entrenamientos */}
        {stats && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeaderWithPeriod}>
                <Text style={styles.sectionTitle}>📊 Estadísticas de Entrenamientos</Text>
                
                {/* Selector de Periodo */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.periodSelector}
                  contentContainerStyle={styles.periodSelectorContent}
                >
                  {(Object.keys(PERIODS) as PeriodType[]).map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.periodButton,
                        selectedPeriod === period && styles.periodButtonActive,
                      ]}
                      onPress={() => setSelectedPeriod(period)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.periodButtonText,
                          selectedPeriod === period && styles.periodButtonTextActive,
                        ]}
                      >
                        {PERIODS[period].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
                  <Text style={styles.statNumber}>{stats.workout_count}</Text>
                  <Text style={styles.statLabel}>Completados ({PERIODS[selectedPeriod].label})</Text>
                </View>

                {stats.recent_workouts && stats.recent_workouts.length > 0 && (
                  <View style={styles.statCard}>
                    <Ionicons name="time-outline" size={32} color="#ffb300" />
                    <Text style={styles.statNumber}>
                      {Math.round(
                        stats.recent_workouts.reduce((acc, w) => acc + (w.duration_minutes || 0), 0) /
                        stats.recent_workouts.length
                      )}
                    </Text>
                    <Text style={styles.statLabel}>Min. Promedio</Text>
                  </View>
                )}
              </View>

              {stats.recent_workouts && stats.recent_workouts.length > 0 && (
                <View style={styles.recentWorkoutsContainer}>
                  <Text style={styles.subsectionTitle}>Entrenamientos Recientes</Text>
                  {stats.recent_workouts.slice(0, 5).map((workout, index) => (
                    <View key={workout.id || index} style={styles.workoutItem}>
                      <Ionicons name="fitness" size={20} color="#ffb300" />
                      <View style={styles.workoutInfo}>
                        <Text style={styles.workoutDate}>
                          {new Date(workout.completed_at).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                        <Text style={styles.workoutDuration}>
                          {workout.duration_minutes} minutos
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Métricas Corporales */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>📏 Métricas Corporales</Text>
                <TouchableOpacity
                  style={styles.viewEvolutionButton}
                  onPress={() => router.push({
                    pathname: '/body-evolution',
                    params: {
                      userId: studentId,
                      userName: studentName,
                      isTrainerView: 'true',
                    },
                  } as any)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trending-up" size={16} color="#ffb300" />
                  <Text style={styles.viewEvolutionText}>Ver Evolución</Text>
                </TouchableOpacity>
              </View>
              
              {stats.body_metrics ? (
                <View style={styles.metricsCard}>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Peso Actual</Text>
                    <Text style={styles.metricValue}>
                      {stats.body_metrics.current_weight.toFixed(1)} kg
                    </Text>
                  </View>
                  {stats.body_metrics.body_fat_percentage && (
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Grasa Corporal</Text>
                      <Text style={styles.metricValue}>
                        {stats.body_metrics.body_fat_percentage.toFixed(1)}%
                      </Text>
                    </View>
                  )}
                  {stats.body_metrics.muscle_percentage && (
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Masa Muscular</Text>
                      <Text style={styles.metricValue}>
                        {stats.body_metrics.muscle_percentage.toFixed(1)}%
                      </Text>
                    </View>
                  )}
                  <Text style={styles.metricDate}>
                    Actualizado: {new Date(stats.body_metrics.recorded_at).toLocaleDateString('es-ES')}
                  </Text>
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="body-outline" size={48} color="#666" />
                  <Text style={styles.emptyText}>El alumno aún no ha registrado su peso</Text>
                  <Text style={styles.emptySubtext}>
                    Puedes ver la evolución una vez que registre sus primeras métricas
                  </Text>
                </View>
              )}
            </View>

            {/* Nutrición */}
            {stats.nutrition_stats && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🍎 Nutrición (últimos 7 días)</Text>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionCard}>
                    <Ionicons name="flame" size={24} color="#FF6B6B" />
                    <Text style={styles.nutritionValue}>
                      {Math.round(stats.nutrition_stats.avg_calories)}
                    </Text>
                    <Text style={styles.nutritionLabel}>Cal/día</Text>
                  </View>
                  <View style={styles.nutritionCard}>
                    <Ionicons name="fish" size={24} color="#4ECDC4" />
                    <Text style={styles.nutritionValue}>
                      {Math.round(stats.nutrition_stats.avg_protein)}g
                    </Text>
                    <Text style={styles.nutritionLabel}>Proteína</Text>
                  </View>
                  <View style={styles.nutritionCard}>
                    <Ionicons name="restaurant" size={24} color="#FFD93D" />
                    <Text style={styles.nutritionValue}>
                      {Math.round(stats.nutrition_stats.avg_carbs)}g
                    </Text>
                    <Text style={styles.nutritionLabel}>Carbos</Text>
                  </View>
                  <View style={styles.nutritionCard}>
                    <Ionicons name="water" size={24} color="#95E1D3" />
                    <Text style={styles.nutritionValue}>
                      {Math.round(stats.nutrition_stats.avg_fats)}g
                    </Text>
                    <Text style={styles.nutritionLabel}>Grasas</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Pasos */}
            {stats.steps_stats && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>👟 Actividad Diaria (últimos 7 días)</Text>
                <View style={styles.stepsCard}>
                  <View style={styles.stepsRow}>
                    <Ionicons name="footsteps" size={32} color="#ffb300" />
                    <View style={styles.stepsInfo}>
                      <Text style={styles.stepsNumber}>
                        {Math.round(stats.steps_stats.avg_steps).toLocaleString()}
                      </Text>
                      <Text style={styles.stepsLabel}>Pasos promedio/día</Text>
                    </View>
                  </View>
                  <View style={styles.stepsDivider} />
                  <View style={styles.stepsRow}>
                    <Ionicons name="trophy" size={32} color="#4CAF50" />
                    <View style={styles.stepsInfo}>
                      <Text style={styles.stepsNumber}>
                        {Math.round(stats.steps_stats.total_steps).toLocaleString()}
                      </Text>
                      <Text style={styles.stepsLabel}>Total de pasos</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  chatButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    marginTop: 12,
    fontSize: 14,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  studentNameLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  sectionHeaderWithPeriod: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  periodSelector: {
    marginTop: 12,
    marginBottom: 8,
  },
  periodSelectorContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444',
  },
  periodButtonActive: {
    backgroundColor: '#ffb300',
    borderColor: '#ffb300',
  },
  periodButtonText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  viewEvolutionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  viewEvolutionText: {
    fontSize: 13,
    color: '#ffb300',
    fontWeight: '600',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffb300',
    marginTop: 16,
    marginBottom: 12,
  },
  planCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
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
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#ffffff',
    fontSize: 14,
  },
  editButton: {
    backgroundColor: '#ffb300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  emptyCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#555',
    marginTop: 8,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  recentWorkoutsContainer: {
    marginTop: 20,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  workoutInfo: {
    flex: 1,
    marginLeft: 12,
  },
  workoutDate: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: 4,
  },
  workoutDuration: {
    fontSize: 12,
    color: '#999',
  },
  metricsCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  metricLabel: {
    fontSize: 16,
    color: '#ccc',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffb300',
  },
  metricDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    textAlign: 'right',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#999',
  },
  stepsCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepsInfo: {
    flex: 1,
  },
  stepsNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  stepsLabel: {
    fontSize: 14,
    color: '#999',
  },
  stepsDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 16,
  },
});

