import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { generatePlanIntroduction } from '../src/services/aiService';

export default function PlanIntroductionScreen() {
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [introduction, setIntroduction] = useState('');
  const [error, setError] = useState('');

  // Parsear los datos del onboarding de los parámetros con validación
  const parseSafeInt = (value: string | undefined, defaultValue: number): number => {
    if (!value) return defaultValue;
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  const parseSafeJSON = (value: string | undefined, defaultValue: any[]): any[] => {
    if (!value) return defaultValue;
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error('Error parseando JSON:', e);
      return defaultValue;
    }
  };

  const userData = {
    name: (params.name as string) || 'Usuario',
    age: parseSafeInt(params.age as string, 25),
    fitness_level: (params.fitness_level as string) || 'intermediate',
    goals: parseSafeJSON(params.goals as string, []),
    activity_types: parseSafeJSON(params.activity_types as string, []),
    available_days: parseSafeInt(params.available_days as string, 3),
    session_duration: parseSafeInt(params.session_duration as string, 45),
    equipment: parseSafeJSON(params.equipment as string, []),
  };

  useEffect(() => {
    generateIntroduction();
  }, []);

  const generateIntroduction = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Llamar al servicio de IA para generar la introducción
      const result = await generatePlanIntroduction(userData);

      if (result.success && result.introduction) {
        setIntroduction(result.introduction);
      } else {
        setError(result.error || 'No se pudo generar la introducción');
      }
    } catch (err) {
      console.error('Error al generar introducción:', err);
      setError('Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    router.replace('/(tabs)/dashboard');
  };

  const getFitnessLevelText = (level: string) => {
    switch (level) {
      case 'beginner': return 'Principiante';
      case 'intermediate': return 'Intermedio';
      case 'advanced': return 'Avanzado';
      default: return level;
    }
  };

  const getGoalText = (goal: string) => {
    const goalMap: { [key: string]: string } = {
      weight_loss: 'Bajar grasa',
      muscle_gain: 'Ganar músculo',
      strength: 'Aumentar fuerza',
      endurance: 'Mejorar resistencia',
      flexibility: 'Flexibilidad',
      general_fitness: 'Forma general',
    };
    return goalMap[goal] || goal;
  };

  const getActivityTypeText = (activity: string) => {
    const activityMap: { [key: string]: string } = {
      cardio: 'Cardio',
      strength: 'Fuerza',
      sports: 'Deportes',
      yoga: 'Yoga/Pilates',
      hiit: 'HIIT',
      mixed: 'Mixto',
    };
    return activityMap[activity] || activity;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffb300" />
          <Text style={styles.loadingText}>
            Analizando tus datos y creando tu plan personalizado...
          </Text>
          <Text style={styles.loadingSubtext}>
            Esto puede tomar unos segundos
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF5722" />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={generateIntroduction}>
            <Text style={styles.retryButtonText}>Intentar nuevamente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipButton} onPress={handleContinue}>
            <Text style={styles.skipButtonText}>Continuar sin introducción</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="fitness" size={48} color="#ffb300" />
          <Text style={styles.headerTitle}>¡Tu Plan Está Listo, {userData.name}!</Text>
          <Text style={styles.headerSubtitle}>
            Hemos analizado tu perfil y creado un plan personalizado
          </Text>
        </View>

        {/* Resumen del Perfil */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Tu Perfil</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Nivel:</Text>
              <Text style={styles.profileValue}>{getFitnessLevelText(userData.fitness_level)}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Objetivos:</Text>
              <Text style={styles.profileValue}>
                {userData.goals.map(getGoalText).join(', ')}
              </Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Actividades:</Text>
              <Text style={styles.profileValue}>
                {userData.activity_types.map(getActivityTypeText).join(', ')}
              </Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Disponibilidad:</Text>
              <Text style={styles.profileValue}>
                {userData.available_days} días/semana, {userData.session_duration} min/sesión
              </Text>
            </View>
          </View>
        </View>

        {/* Introducción Generada por IA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Tu Plan Personalizado</Text>
          <View style={styles.introductionCard}>
            <Text style={styles.introductionText}>{introduction}</Text>
          </View>
        </View>

        {/* Próximos Pasos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Próximos Pasos</Text>
          <View style={styles.stepsCard}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Explora tu Dashboard</Text>
                <Text style={styles.stepDescription}>
                  Conoce tus métricas y estadísticas de salud
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Comienza a Entrenar</Text>
                <Text style={styles.stepDescription}>
                  Accede a tus rutinas personalizadas en la pestaña Entrenamientos
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Registra tu Progreso</Text>
                <Text style={styles.stepDescription}>
                  Monitorea tus ejercicios y ve tu evolución
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Botón de Continuar */}
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>¡Comenzar mi Viaje!</Text>
          <Ionicons name="arrow-forward" size={24} color="#1a1a1a" />
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
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 28,
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
  retryButton: {
    backgroundColor: '#ffb300',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    marginTop: 32,
  },
  retryButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#888',
    fontSize: 14,
    textDecoration: 'underline',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 16,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  section: {
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
  introductionCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  introductionText: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 26,
  },
  stepsCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: '#ffb300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 28,
    marginTop: 16,
    gap: 12,
    shadowColor: '#ffb300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '700',
  },
});

