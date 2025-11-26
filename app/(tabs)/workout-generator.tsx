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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../../src/services/supabase';
import { generateWorkoutPlan } from '../../src/services/aiService';
import { LoadingOverlay } from '../../src/components/LoadingOverlay';
import { useRetry } from '../../src/hooks/useRetry';
import { useLoadingState } from '../../src/hooks/useLoadingState';
import { FitnessLevel, FitnessGoal, Equipment, ActivityType } from '../../src/types';

// Mapeo de etiquetas para equipamiento
const EQUIPMENT_LABELS: Record<Equipment, string> = {
  [Equipment.NONE]: 'Solo peso corporal',
  [Equipment.DUMBBELLS]: 'Mancuernas',
  [Equipment.BARBELL]: 'Barra olímpica',
  [Equipment.RESISTANCE_BANDS]: 'Bandas de resistencia',
  [Equipment.PULL_UP_BAR]: 'Barra de dominadas',
  [Equipment.BENCH]: 'Banco',
  [Equipment.BENCH_DUMBBELLS]: 'Banco y mancuernas',
  [Equipment.BENCH_BARBELL]: 'Banco con barra',
  [Equipment.GYM_ACCESS]: 'Acceso a gimnasio',
  [Equipment.KETTLEBELL]: 'Kettlebell',
  [Equipment.CABLE_MACHINE]: 'Máquina de poleas',
  [Equipment.SMITH_MACHINE]: 'Máquina Smith',
  [Equipment.LEG_PRESS]: 'Prensa de piernas',
  [Equipment.MEDICINE_BALL]: 'Balón medicinal',
  [Equipment.YOGA_MAT]: 'Mat de yoga',
};

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
  body_fat_percentage?: number | null;
  muscle_percentage?: number | null;
}

export default function WorkoutGeneratorScreen() {
  const { user } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [error, setError] = useState('');
  
  // Estados para el formulario de generación
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState(0);
  const [formData, setFormData] = useState({
    fitness_level: FitnessLevel.BEGINNER,
    goals: [] as FitnessGoal[],
    activity_types: [] as ActivityType[],
    available_days: 3,
    session_duration: 30,
    equipment: [] as Equipment[],
  });
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [newPlanId, setNewPlanId] = useState<string | null>(null);

  // Hook para retry en generación de plan (ya no se usa directamente, pero lo mantenemos por compatibilidad)

  useEffect(() => {
    loadUserProfile();
  }, [user]);

  // NO mostrar modal automáticamente - solo cuando se hace clic en el botón

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
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error al cargar perfil:', error);
        setError('No se pudo cargar tu perfil');
        setIsLoading(false);
        return;
      }

      if (!data) {
        setError('No se encontró tu perfil. Completa el onboarding primero.');
        setIsLoading(false);
        return;
      }

      setUserProfile(data as UserProfile);
      setIsLoading(false);
    } catch (err) {
      console.error('Error inesperado:', err);
      setError('Error al cargar datos');
      setIsLoading(false);
    }
  };

  const handleStartGeneration = () => {
    // Validar que tenga datos básicos del perfil
    if (!userProfile) {
      Alert.alert('Error', 'No se pudo cargar tu perfil');
      return;
    }
    // Mostrar formulario directamente (ya se seleccionó IA desde el modal anterior)
    setShowForm(true);
  };

  const canProceedForm = () => {
    switch (formStep) {
      case 0: // fitness_level - siempre puede proceder
        return true;
      case 1: // goals
        return formData.goals.length > 0;
      case 2: // activity_types
        return formData.activity_types.length > 0;
      case 3: // availability
        return true;
      case 4: // session_duration
        return true;
      case 5: // equipment
        return formData.equipment.length > 0;
      default:
        return true;
    }
  };

  const nextFormStep = () => {
    if (formStep < 5) {
      setFormStep(formStep + 1);
    } else {
      // Último paso, generar plan
      handleGeneratePlan();
    }
  };

  const prevFormStep = () => {
    if (formStep > 0) {
      setFormStep(formStep - 1);
    } else {
      setShowForm(false);
    }
  };

  const toggleGoal = (goal: FitnessGoal) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }));
  };

  const toggleActivityType = (activityType: ActivityType) => {
    setFormData(prev => ({
      ...prev,
      activity_types: prev.activity_types.includes(activityType)
        ? prev.activity_types.filter(a => a !== activityType)
        : [...prev.activity_types, activityType]
    }));
  };

  const toggleEquipment = (equipment: Equipment) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(equipment)
        ? prev.equipment.filter(e => e !== equipment)
        : [...prev.equipment, equipment]
    }));
  };

  const handleGeneratePlan = async () => {
    if (!userProfile) {
      Alert.alert('Error', 'No se pudo cargar tu perfil');
      return;
    }

    // Cerrar formulario
    setShowForm(false);
    setIsGenerating(true);
    setError('');

    try {
      // Combinar datos del perfil con datos del formulario
      const workoutData: UserProfile = {
        ...userProfile,
        fitness_level: formData.fitness_level,
        goals: formData.goals,
        activity_types: formData.activity_types,
        available_days: formData.available_days,
        session_duration: formData.session_duration,
        equipment: formData.equipment,
      };

      // Generar plan con retry automático
      const result = await generateWorkoutPlan(workoutData);
      
      if (!result.success || !result.plan) {
        throw new Error(result.error || 'No se pudo generar el plan');
      }

      const plan = result.plan;

      if (plan) {
        setGeneratedPlan(plan);
        
        // Guardar el plan en Supabase (con retry manual)
        let saved = false;
        let planId: string | null = null;
        for (let attempt = 0; attempt < 3 && !saved; attempt++) {
          try {
            planId = await savePlanToDatabase(plan);
            saved = true;
          } catch (saveError) {
            if (attempt === 2) {
              // Último intento falló
              Alert.alert('Advertencia', 'El plan se generó pero no se pudo guardar. Intenta guardarlo manualmente.');
            } else {
              // Esperar antes del siguiente intento
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
          }
        }

        // Si se guardó exitosamente, mostrar modal para activar
        if (saved && planId) {
          setNewPlanId(planId);
          setShowActivateModal(true);
        }
      } else {
        setError('No se pudo generar el plan después de varios intentos');
      }
    } catch (err) {
      setError('Error al generar el plan');
      console.error('Error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const savePlanToDatabase = async (plan: any): Promise<string> => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      console.log('💾 Guardando nuevo plan de entrenamiento (inactivo)...');

      // Incluir datos del usuario en el plan_data para uso futuro en generación de dieta
      const planWithUserData = {
        ...plan,
        userData: {
          fitness_level: formData.fitness_level,
          goals: formData.goals,
          activity_types: formData.activity_types,
          available_days: formData.available_days,
          session_duration: formData.session_duration,
          equipment: formData.equipment,
        },
      };

      // Insertar el nuevo plan como INACTIVO por defecto
      const { data, error } = await supabase
        .from('workout_plans')
        .insert({
          user_id: user.id,
          plan_name: plan.name,
          description: plan.description,
          duration_weeks: plan.duration_weeks,
          plan_data: planWithUserData,
          is_active: false, // Se activa explícitamente luego
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error al guardar plan:', error);
        throw error;
      } else {
        console.log('✅ Nuevo plan guardado (inactivo). Actívalo desde la lista.');
        return data.id;
      }
    } catch (err) {
      console.error('❌ Error inesperado al guardar:', err);
      throw err;
    }
  };

  const handleActivatePlan = async (activate: boolean) => {
    if (!newPlanId || !user) return;

    setShowActivateModal(false);

    if (activate) {
      try {
        // Desactivar todos los planes del usuario
        await supabase
          .from('workout_plans')
          .update({ is_active: false })
          .eq('user_id', user.id);

        // Activar el nuevo plan
        const { error } = await supabase
          .from('workout_plans')
          .update({ is_active: true })
          .eq('id', newPlanId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error activando plan:', error);
          Alert.alert('Advertencia', 'El plan se guardó pero no se pudo activar. Puedes activarlo manualmente desde la lista.');
        } else {
          console.log('✅ Plan activado correctamente');
        }
      } catch (err) {
        console.error('Error activando plan:', err);
      }
    }

    // Redirigir a la pantalla de entrenamientos
    router.replace('/(tabs)/workout');
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

  // Render del formulario
  const renderForm = () => {
    const formSteps = [
      {
        title: '¿Cuál es tu nivel de fitness?',
        subtitle: 'Selecciona el nivel que mejor te describe',
        content: (
          <View>
            {Object.values(FitnessLevel).map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.formOptionButton,
                  formData.fitness_level === level && styles.formOptionButtonSelected
                ]}
                onPress={() => setFormData(prev => ({ ...prev, fitness_level: level }))}
              >
                <Text style={[
                  styles.formOptionText,
                  formData.fitness_level === level && styles.formOptionTextSelected
                ]}>
                  {level === FitnessLevel.BEGINNER && 'Principiante - Nuevo en el fitness'}
                  {level === FitnessLevel.INTERMEDIATE && 'Intermedio - Algunos meses de experiencia'}
                  {level === FitnessLevel.ADVANCED && 'Avanzado - Años de experiencia'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ),
      },
      {
        title: '¿Cuáles son tus objetivos?',
        subtitle: 'Selecciona todos los que apliquen',
        content: (
          <View>
            {Object.values(FitnessGoal).map((goal) => (
              <TouchableOpacity
                key={goal}
                style={[
                  styles.formOptionButton,
                  formData.goals.includes(goal) && styles.formOptionButtonSelected
                ]}
                onPress={() => toggleGoal(goal)}
              >
                <Text style={[
                  styles.formOptionText,
                  formData.goals.includes(goal) && styles.formOptionTextSelected
                ]}>
                  {goal === FitnessGoal.WEIGHT_LOSS && 'Perder peso'}
                  {goal === FitnessGoal.MUSCLE_GAIN && 'Ganar músculo'}
                  {goal === FitnessGoal.STRENGTH && 'Aumentar fuerza'}
                  {goal === FitnessGoal.ENDURANCE && 'Mejorar resistencia'}
                  {goal === FitnessGoal.FLEXIBILITY && 'Flexibilidad/Movilidad'}
                  {goal === FitnessGoal.GENERAL_FITNESS && 'Mantener forma general'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ),
      },
      {
        title: '¿Qué tipo de actividades prefieres?',
        subtitle: 'Selecciona todas las que te gusten',
        content: (
          <View>
            {Object.values(ActivityType).map((activity) => (
              <TouchableOpacity
                key={activity}
                style={[
                  styles.formOptionButton,
                  formData.activity_types.includes(activity) && styles.formOptionButtonSelected
                ]}
                onPress={() => toggleActivityType(activity)}
              >
                <Text style={[
                  styles.formOptionText,
                  formData.activity_types.includes(activity) && styles.formOptionTextSelected
                ]}>
                  {activity === ActivityType.CARDIO && '🏃 Cardio (correr, nadar, bici)'}
                  {activity === ActivityType.STRENGTH && '💪 Fuerza (pesas, calistenia)'}
                  {activity === ActivityType.SPORTS && '⚽ Deportes (fútbol, basketball)'}
                  {activity === ActivityType.YOGA && '🧘 Yoga/Pilates'}
                  {activity === ActivityType.HIIT && '🔥 HIIT (entrenamiento intenso)'}
                  {activity === ActivityType.MIXED && '🎯 Mixto (de todo un poco)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ),
      },
      {
        title: '¿Cuántos días puedes entrenar por semana?',
        subtitle: '',
        content: (
          <View>
            {[1, 2, 3, 4, 5, 6, 7].map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.formOptionButton,
                  formData.available_days === days && styles.formOptionButtonSelected
                ]}
                onPress={() => setFormData(prev => ({ ...prev, available_days: days }))}
              >
                <Text style={[
                  styles.formOptionText,
                  formData.available_days === days && styles.formOptionTextSelected
                ]}>
                  {days} {days === 1 ? 'día' : 'días'} por semana
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ),
      },
      {
        title: '¿Cuánto tiempo tienes por sesión?',
        subtitle: '',
        content: (
          <View>
            {[15, 30, 45, 60, 90].map((minutes) => (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.formOptionButton,
                  formData.session_duration === minutes && styles.formOptionButtonSelected
                ]}
                onPress={() => setFormData(prev => ({ ...prev, session_duration: minutes }))}
              >
                <Text style={[
                  styles.formOptionText,
                  formData.session_duration === minutes && styles.formOptionTextSelected
                ]}>
                  {minutes} minutos
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ),
      },
      {
        title: '¿Qué equipamiento tienes disponible?',
        subtitle: 'Selecciona todo lo que tengas',
        content: (
          <View>
            {Object.values(Equipment).map((equipment) => (
              <TouchableOpacity
                key={equipment}
                style={[
                  styles.formOptionButton,
                  formData.equipment.includes(equipment) && styles.formOptionButtonSelected
                ]}
                onPress={() => toggleEquipment(equipment)}
              >
                <Text style={[
                  styles.formOptionText,
                  formData.equipment.includes(equipment) && styles.formOptionTextSelected
                ]}>
                  {EQUIPMENT_LABELS[equipment] || equipment}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ),
      },
    ];

    const currentStepData = formSteps[formStep];

    return (
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForm(false)}
      >
        <SafeAreaView style={styles.formContainer}>
          <StatusBar barStyle="light-content" />
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.formHeaderTitle}>
              Paso {formStep + 1} de {formSteps.length}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.formContent}>
            <Text style={styles.formTitle}>{currentStepData.title}</Text>
            {currentStepData.subtitle && (
              <Text style={styles.formSubtitle}>{currentStepData.subtitle}</Text>
            )}
            {currentStepData.content}
          </ScrollView>

          <View style={styles.formFooter}>
            {formStep > 0 && (
              <TouchableOpacity style={styles.formBackButton} onPress={prevFormStep}>
                <Text style={styles.formBackButtonText}>Atrás</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[
                styles.formNextButton,
                !canProceedForm() && styles.formNextButtonDisabled
              ]}
              onPress={nextFormStep}
              disabled={!canProceedForm()}
            >
              <Text style={styles.formNextButtonText}>
                {formStep === formSteps.length - 1 ? 'Generar Plan' : 'Siguiente'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffb300" />
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
          <Ionicons name="fitness" size={80} color="#ffb300" />
          <LoadingOverlay visible={true} message="Generando tu plan personalizado..." />
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
            <TouchableOpacity 
              onPress={() => {
                try {
                  if (router.canGoBack && router.canGoBack()) {
                    router.back();
                  } else {
                    throw new Error('Cannot go back');
                  }
                } catch (error) {
                  // Si no hay pantalla anterior, navegar a workout
                  router.push('/(tabs)/workout' as any);
                }
              }}
            >
              <Ionicons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tu Plan Generado</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Plan Overview */}
          <View style={styles.planOverview}>
            <Ionicons name="checkmark-circle" size={64} color="#ffb300" />
            <Text style={styles.planTitle}>{generatedPlan.name}</Text>
            <Text style={styles.planDescription}>{generatedPlan.description}</Text>
            <View style={styles.planStats}>
              <View style={styles.planStat}>
                <Ionicons name="calendar" size={24} color="#ffb300" />
                <Text style={styles.planStatText}>
                  {generatedPlan.duration_weeks} semanas
                </Text>
              </View>
              <View style={styles.planStat}>
                <Ionicons name="fitness" size={24} color="#ffb300" />
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

        {/* Modal para activar plan */}
        <Modal
          visible={showActivateModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowActivateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Ionicons name="checkmark-circle" size={64} color="#ffb300" />
              <Text style={styles.modalTitle}>¡Plan Generado!</Text>
              <Text style={styles.modalText}>
                Tu plan de entrenamiento ha sido creado exitosamente.
              </Text>
              <Text style={styles.modalQuestion}>
                ¿Quieres activar este plan ahora?
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => handleActivatePlan(false)}
                >
                  <Text style={styles.modalButtonSecondaryText}>Más tarde</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={() => handleActivatePlan(true)}
                >
                  <Text style={styles.modalButtonPrimaryText}>Activar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                // Si no hay pantalla anterior, navegar a workout
                router.push('/(tabs)/workout' as any);
              }
            }}
          >
            <Ionicons name="arrow-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Generar Plan</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Intro */}
        <View style={styles.intro}>
          <Ionicons name="sparkles" size={48} color="#ffb300" />
          <Text style={styles.introTitle}>
            Plan de Entrenamiento con IA
          </Text>
          <Text style={styles.introDescription}>
            Generaremos un plan personalizado basado en evidencia científica usando tus datos
          </Text>
        </View>

        {/* What to Expect */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Qué Incluye</Text>
          <View style={styles.featuresCard}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#ffb300" />
              <Text style={styles.featureText}>
                Plan semanal estructurado adaptado a tu disponibilidad
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#ffb300" />
              <Text style={styles.featureText}>
                Ejercicios específicos basados en tu equipamiento
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#ffb300" />
              <Text style={styles.featureText}>
                Progresión gradual según tu nivel de fitness
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#ffb300" />
              <Text style={styles.featureText}>
                Recomendaciones basadas en evidencia científica
              </Text>
            </View>
          </View>
        </View>

        {/* Generate Button - Solo mostrar si no hay plan generado */}
        {!generatedPlan && (
          <TouchableOpacity
            style={styles.generateButton}
            onPress={handleStartGeneration}
          >
            <Ionicons name="flash" size={24} color="#1a1a1a" />
            <Text style={styles.generateButtonText}>Generar Mi Plan</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de formulario */}
      {renderForm()}
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
    backgroundColor: '#ffb300',
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
    backgroundColor: '#ffb300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 28,
    marginHorizontal: 24,
    gap: 12,
    shadowColor: '#ffb300',
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
    color: '#ffb300',
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
    color: '#ffb300',
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
    backgroundColor: '#ffb300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 28,
    marginHorizontal: 24,
    gap: 12,
    shadowColor: '#ffb300',
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
  // Estilos del formulario
  formContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  formHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  formContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 32,
    textAlign: 'center',
  },
  formOptionButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  formOptionButtonSelected: {
    borderColor: '#ffb300',
    backgroundColor: '#2a2a2a',
  },
  formOptionText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
  },
  formOptionTextSelected: {
    color: '#ffb300',
    fontWeight: '600',
  },
  formFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  formBackButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  formBackButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  formNextButton: {
    backgroundColor: '#ffb300',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  formNextButtonDisabled: {
    backgroundColor: '#444',
    opacity: 0.5,
  },
  formNextButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },
  // Estilos del modal de activación
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  modalQuestion: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#444',
  },
  modalButtonPrimary: {
    backgroundColor: '#ffb300',
  },
  modalButtonSecondaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonPrimaryText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  selectionOption: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  selectionOptionPrimary: {
    backgroundColor: '#ffb300',
    borderColor: '#ffb300',
  },
  selectionOptionSecondary: {
    backgroundColor: '#2a2a2a',
    borderColor: '#ffb300',
  },
  selectionOptionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 8,
  },
  selectionOptionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalCloseButton: {
    marginTop: 8,
    paddingVertical: 12,
  },
  modalCloseButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
});

