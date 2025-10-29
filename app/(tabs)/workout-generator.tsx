import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../../src/services/supabase';
import { generateWorkoutPlan } from '../../src/services/aiService';

interface UserProfile {
  name: string;
  age: number;
  height: number;
  weight: number;
  fitness_level: string;
  goals: string[];
  activity_types: string[];
  available_days: number;
  session_duration: number;
  equipment: string[];
}

export default function WorkoutGeneratorScreen() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) {
      setError('Usuario no autenticado');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error al cargar perfil:', error);
        setError('No se pudo cargar tu perfil');
        return;
      }

      if (!data) {
        setError('No se encontró tu perfil. Completa el onboarding primero.');
        return;
      }

      setUserProfile(data as UserProfile);
    } catch (err) {
      console.error('Error inesperado:', err);
      setError('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!userProfile) {
      Alert.alert('Error', 'No se pudo cargar tu perfil');
      return;
    }

    try {
      setIsGenerating(true);
      setError('');

      // Generar plan con IA
      const result = await generateWorkoutPlan(userProfile);

      if (result.success && result.plan) {
        setGeneratedPlan(result.plan);
        
        // Guardar el plan en Supabase
        await savePlanToDatabase(result.plan);
      } else {
        setError(result.error || 'No se pudo generar el plan');
        Alert.alert('Error', result.error || 'No se pudo generar el plan');
      }
    } catch (err) {
      console.error('Error al generar plan:', err);
      setError('Error inesperado al generar el plan');
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setIsGenerating(false);
    }
  };

  const savePlanToDatabase = async (plan: any) => {
    if (!user) return;

    try {
      console.log('💾 Guardando nuevo plan de entrenamiento (inactivo)...');

      // Insertar el nuevo plan como INACTIVO por defecto
      const { error } = await supabase
        .from('workout_plans')
        .insert({
          user_id: user.id,
          plan_name: plan.name,
          description: plan.description,
          duration_weeks: plan.duration_weeks,
          plan_data: plan,
          is_active: false, // Se activa explícitamente luego
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('❌ Error al guardar plan:', error);
        throw error;
      } else {
        console.log('✅ Nuevo plan guardado (inactivo). Actívalo desde la lista.');
      }
    } catch (err) {
      console.error('❌ Error inesperado al guardar:', err);
      throw err;
    }
  };

  const handleUsePlan = () => {
    Alert.alert(
      '¡Plan Guardado!',
      'Tu plan de entrenamiento ha sido guardado. Podrás verlo en la sección de Entrenamientos.',
      [
        {
          text: 'Ver Entrenamientos',
          onPress: () => router.replace('/(tabs)/workout'),
        },
      ]
    );
  };

  const getFitnessLevelText = (level: string) => {
    const map: { [key: string]: string } = {
      beginner: 'Principiante',
      intermediate: 'Intermedio',
      advanced: 'Avanzado',
    };
    return map[level] || level;
  };

  const getGoalText = (goal: string) => {
    const map: { [key: string]: string } = {
      weight_loss: 'Perder peso',
      muscle_gain: 'Ganar músculo',
      strength: 'Aumentar fuerza',
      endurance: 'Mejorar resistencia',
      flexibility: 'Flexibilidad',
      general_fitness: 'Forma general',
    };
    return map[goal] || goal;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D4AA" />
          <Text style={styles.loadingText}>Cargando tu perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF5722" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isGenerating) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.generatingContainer}>
          <Ionicons name="fitness" size={80} color="#00D4AA" />
          <ActivityIndicator size="large" color="#00D4AA" style={{ marginTop: 24 }} />
          <Text style={styles.generatingTitle}>
            Generando tu plan personalizado...
          </Text>
          <Text style={styles.generatingSubtext}>
            Analizando tus objetivos, nivel de fitness y disponibilidad
          </Text>
          <Text style={styles.generatingSubtext}>
            Esto puede tomar 10-20 segundos
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (generatedPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScrollView style={styles.scrollView}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tu Plan Generado</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Plan Overview */}
          <View style={styles.planOverview}>
            <Ionicons name="checkmark-circle" size={64} color="#00D4AA" />
            <Text style={styles.planTitle}>{generatedPlan.name}</Text>
            <Text style={styles.planDescription}>{generatedPlan.description}</Text>
            <View style={styles.planStats}>
              <View style={styles.planStat}>
                <Ionicons name="calendar" size={24} color="#00D4AA" />
                <Text style={styles.planStatText}>
                  {generatedPlan.duration_weeks} semanas
                </Text>
              </View>
              <View style={styles.planStat}>
                <Ionicons name="fitness" size={24} color="#00D4AA" />
                <Text style={styles.planStatText}>
                  {generatedPlan.days_per_week} días/semana
                </Text>
              </View>
            </View>
          </View>

          {/* Weekly Schedule */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Estructura Semanal</Text>
            {generatedPlan.weekly_structure?.map((day: any, index: number) => (
              <View key={index} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayTitle}>{day.day}</Text>
                  <Text style={styles.dayDuration}>{day.duration} min</Text>
                </View>
                <Text style={styles.dayFocus}>{day.focus}</Text>
                {day.exercises && (
                  <View style={styles.exercisesList}>
                    {day.exercises.map((exercise: any, idx: number) => {
                      // Soporte para formato antiguo (string) y nuevo (objeto)
                      const exerciseName = typeof exercise === 'string' ? exercise : exercise.name;
                      const sets = typeof exercise === 'object' ? exercise.sets : null;
                      const reps = typeof exercise === 'object' ? exercise.reps : null;
                      
                      return (
                        <View key={idx} style={styles.exerciseItemContainer}>
                          <Text style={styles.exerciseItem}>
                            • {exerciseName}
                          </Text>
                          {sets && reps && (
                            <Text style={styles.exerciseDetails}>
                              {sets} × {reps}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Key Principles */}
          {generatedPlan.key_principles && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎯 Principios Clave</Text>
              <View style={styles.principlesCard}>
                {generatedPlan.key_principles.map((principle: string, index: number) => (
                  <Text key={index} style={styles.principleText}>
                    • {principle}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {/* Progression */}
          {generatedPlan.progression && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📈 Progresión</Text>
              <View style={styles.progressionCard}>
                <Text style={styles.progressionText}>{generatedPlan.progression}</Text>
              </View>
            </View>
          )}

          {/* Recommendations */}
          {generatedPlan.recommendations && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Recomendaciones</Text>
              <View style={styles.recommendationsCard}>
                {generatedPlan.recommendations.map((rec: string, index: number) => (
                  <Text key={index} style={styles.recommendationText}>
                    • {rec}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {/* Use Plan Button */}
          <TouchableOpacity style={styles.usePlanButton} onPress={handleUsePlan}>
            <Text style={styles.usePlanButtonText}>Usar este Plan</Text>
            <Ionicons name="arrow-forward" size={24} color="#1a1a1a" />
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Generar Plan</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Intro */}
        <View style={styles.intro}>
          <Ionicons name="sparkles" size={48} color="#00D4AA" />
          <Text style={styles.introTitle}>
            Plan de Entrenamiento con IA
          </Text>
          <Text style={styles.introDescription}>
            Generaremos un plan personalizado basado en evidencia científica usando tus datos
          </Text>
        </View>

        {/* User Profile Summary */}
        {userProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Tu Perfil</Text>
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Nivel:</Text>
                <Text style={styles.profileValue}>
                  {getFitnessLevelText(userProfile.fitness_level)}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Objetivos:</Text>
                <Text style={styles.profileValue}>
                  {userProfile.goals.map(getGoalText).join(', ')}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Disponibilidad:</Text>
                <Text style={styles.profileValue}>
                  {userProfile.available_days} días/semana, {userProfile.session_duration} min/sesión
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Equipamiento:</Text>
                <Text style={styles.profileValue}>
                  {userProfile.equipment.length} tipos disponibles
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* What to Expect */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Qué Incluye</Text>
          <View style={styles.featuresCard}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#00D4AA" />
              <Text style={styles.featureText}>
                Plan semanal estructurado adaptado a tu disponibilidad
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#00D4AA" />
              <Text style={styles.featureText}>
                Ejercicios específicos basados en tu equipamiento
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#00D4AA" />
              <Text style={styles.featureText}>
                Progresión gradual según tu nivel de fitness
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#00D4AA" />
              <Text style={styles.featureText}>
                Recomendaciones basadas en evidencia científica
              </Text>
            </View>
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGeneratePlan}
        >
          <Ionicons name="flash" size={24} color="#1a1a1a" />
          <Text style={styles.generateButtonText}>Generar Mi Plan</Text>
        </TouchableOpacity>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  errorText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  backButton: {
    backgroundColor: '#00D4AA',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    marginTop: 32,
  },
  backButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },
  generatingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  generatingTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 24,
    textAlign: 'center',
  },
  generatingSubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  intro: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
  },
  introDescription: {
    fontSize: 16,
    color: '#888',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  profileLabel: {
    fontSize: 14,
    color: '#888',
    flex: 1,
  },
  profileValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  featuresCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  generateButton: {
    backgroundColor: '#00D4AA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 28,
    marginHorizontal: 24,
    gap: 12,
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  generateButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '700',
  },
  planOverview: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  planTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
  },
  planDescription: {
    fontSize: 16,
    color: '#888',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  planStats: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 24,
  },
  planStat: {
    alignItems: 'center',
  },
  planStatText: {
    fontSize: 14,
    color: '#ffffff',
    marginTop: 8,
  },
  dayCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00D4AA',
  },
  dayDuration: {
    fontSize: 14,
    color: '#888',
  },
  dayFocus: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 8,
  },
  exercisesList: {
    marginTop: 8,
  },
  exerciseItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  exerciseItem: {
    fontSize: 13,
    color: '#888',
    flex: 1,
  },
  exerciseDetails: {
    fontSize: 12,
    color: '#00D4AA',
    fontWeight: '600',
    marginLeft: 8,
  },
  principlesCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  principleText: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 12,
    lineHeight: 20,
  },
  progressionCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  progressionText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 22,
  },
  recommendationsCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  recommendationText: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 12,
    lineHeight: 20,
  },
  usePlanButton: {
    backgroundColor: '#00D4AA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 28,
    marginHorizontal: 24,
    gap: 12,
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  usePlanButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '700',
  },
});

