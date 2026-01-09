import React, { useState, useEffect, useCallback } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/services/supabase';
import { generateWorkoutPlan } from '../../src/services/aiService';
import { LoadingOverlay } from '../../src/components/LoadingOverlay';
import { useRetry } from '../../src/hooks/useRetry';
import { useLoadingState } from '../../src/hooks/useLoadingState';
import { FitnessLevel, FitnessGoal, Equipment, ActivityType } from '../../src/types';

// Equipment keys for translation lookup
const EQUIPMENT_KEYS: Record<Equipment, string> = {
  [Equipment.NONE]: 'none',
  [Equipment.DUMBBELLS]: 'dumbbells',
  [Equipment.BARBELL]: 'barbell',
  [Equipment.RESISTANCE_BANDS]: 'resistance_bands',
  [Equipment.PULL_UP_BAR]: 'pull_up_bar',
  [Equipment.BENCH]: 'bench',
  [Equipment.BENCH_DUMBBELLS]: 'bench_dumbbells',
  [Equipment.BENCH_BARBELL]: 'bench_barbell',
  [Equipment.GYM_ACCESS]: 'gym_access',
  [Equipment.KETTLEBELL]: 'kettlebell',
  [Equipment.CABLE_MACHINE]: 'cable_machine',
  [Equipment.SMITH_MACHINE]: 'smith_machine',
  [Equipment.LEG_PRESS]: 'leg_press',
  [Equipment.MEDICINE_BALL]: 'medicine_ball',
  [Equipment.YOGA_MAT]: 'yoga_mat',
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
  const { t } = useTranslation();
  
  // Helper functions for translations
  const getEquipmentLabel = (eq: Equipment) => t(`equipment.${EQUIPMENT_KEYS[eq]}`);
  const getGoalLabel = (goal: string) => t(`fitnessGoals.${goal}`);
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
  
  // Ref para cleanup de timeout de navegación
  const navigationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Hook para retry en generación de plan (ya no se usa directamente, pero lo mantenemos por compatibilidad)

  useEffect(() => {
    loadUserProfile();
  }, [user]);

  // Limpiar estado del plan generado cuando la pantalla recibe foco
  // Esto asegura que si el usuario borra un plan y vuelve, no vea el plan anterior
  useFocusEffect(
    useCallback(() => {
      // Solo limpiar si no estamos generando un plan actualmente
      if (!isGenerating && !showForm) {
        setGeneratedPlan(null);
        setNewPlanId(null);
        setShowActivateModal(false);
        setError('');
      }
    }, [isGenerating, showForm])
  );

  // Cleanup: Limpiar timeout de navegación al desmontar
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        console.log('🧹 Timeout de navegación limpiado al desmontar');
      }
    };
  }, []);

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
      Alert.alert(t('common.error'), t('workoutGenerator.couldNotLoadProfile'));
      return;
    }
    // Limpiar estado del plan anterior
    setGeneratedPlan(null);
    setNewPlanId(null);
    setShowActivateModal(false);
    setError('');
    setFormStep(0);
    // Resetear formulario a valores por defecto
    setFormData({
      fitness_level: FitnessLevel.BEGINNER,
      goals: [],
      activity_types: [],
      available_days: 3,
      session_duration: 30,
      equipment: [],
    });
    // Mostrar formulario directamente (ya se seleccionó IA desde el modal anterior)
    setShowForm(true);
  };

  const canProceedForm = () => {
    switch (formStep) {
      case 0: // fitness_level - siempre puede proceder
        return true;
      case 1: // goals
        return formData.goals.length > 0;
      case 2: // availability (days per week)
        return true;
      case 3: // session_duration
        return true;
      case 4: // equipment
        return formData.equipment.length > 0;
      default:
        return true;
    }
  };

  // Inferir tipos de actividad basándose en los objetivos seleccionados
  const inferActivityTypes = (goals: FitnessGoal[]): ActivityType[] => {
    const activitySet = new Set<ActivityType>();
    
    goals.forEach(goal => {
      switch (goal) {
        case FitnessGoal.MUSCLE_GAIN:
        case FitnessGoal.STRENGTH:
          activitySet.add(ActivityType.STRENGTH);
          break;
        case FitnessGoal.WEIGHT_LOSS:
          activitySet.add(ActivityType.CARDIO);
          activitySet.add(ActivityType.HIIT);
          break;
        case FitnessGoal.ENDURANCE:
          activitySet.add(ActivityType.CARDIO);
          break;
        case FitnessGoal.FLEXIBILITY:
          activitySet.add(ActivityType.YOGA);
          break;
        case FitnessGoal.GENERAL_FITNESS:
          activitySet.add(ActivityType.MIXED);
          break;
      }
    });
    
    // Si no hay actividades inferidas, usar mixed como fallback
    if (activitySet.size === 0) {
      activitySet.add(ActivityType.MIXED);
    }
    
    return Array.from(activitySet);
  };

  const nextFormStep = () => {
    if (formStep < 4) {
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
      Alert.alert(t('common.error'), t('workoutGenerator.couldNotLoadProfile'));
      return;
    }

    // Cerrar formulario
    setShowForm(false);
    setIsGenerating(true);
    setError('');

    try {
      // Inferir tipos de actividad basándose en los objetivos
      const inferredActivityTypes = inferActivityTypes(formData.goals);
      
      // Combinar datos del perfil con datos del formulario
      const workoutData: UserProfile = {
        ...userProfile,
        fitness_level: formData.fitness_level,
        goals: formData.goals,
        activity_types: inferredActivityTypes,
        available_days: formData.available_days,
        session_duration: formData.session_duration,
        equipment: formData.equipment,
      };

      // Generar plan con retry automático (pasar userId para análisis de feedback)
      const result = await generateWorkoutPlan(workoutData, user?.id);
      
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
              Alert.alert(t('common.warning'), t('workoutGenerator.planNotSaved'));
            } else {
              // Esperar antes del siguiente intento
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
          }
        }

        // Si se guardó exitosamente, preguntar si quiere activarlo
        if (saved && planId) {
          setGeneratedPlan(null); // Limpiar el plan generado para no mostrar la vista de detalle
          
          // Mostrar alerta para activar el plan
          Alert.alert(
            t('workoutGenerator.planCreated'),
            t('workoutGenerator.activatePlanQuestion'),
            [
              {
                text: t('workoutGenerator.viewLater'),
                style: 'cancel',
                onPress: () => {
                  // Limpiar estados y navegar a la pestaña Entrenar
                  setNewPlanId(null);
                  setShowForm(false);
                  setFormStep(0);
                  setError('');
                  router.replace('/(tabs)/workout' as any);
                },
              },
              {
                text: t('workoutGenerator.yesActivate'),
                onPress: async () => {
                  if (!user || !planId) return;
                  try {
                    // Activar el plan
                    const { error: rpcError } = await supabase.rpc('activate_workout_plan', {
                      p_user_id: user.id,
                      p_plan_id: planId,
                    });

                    if (rpcError) {
                      console.error('Error activando plan:', rpcError);
                      Alert.alert(t('common.error'), t('workoutGenerator.couldNotActivatePlan'));
                    }
                    
                    // Limpiar estados y navegar a la pestaña Entrenar
                    setNewPlanId(null);
                    setShowForm(false);
                    setFormStep(0);
                    setError('');
                    router.replace('/(tabs)/workout' as any);
                  } catch (err) {
                    console.error('Error activando plan:', err);
                    Alert.alert(t('common.error'), t('workoutGenerator.couldNotActivatePlan'));
                  }
                },
              },
            ]
          );
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
          Alert.alert(t('common.warning'), t('workoutGenerator.planSavedNotActivated'));
        } else {
          console.log('✅ Plan activado correctamente');
        }
      } catch (err) {
        console.error('Error activando plan:', err);
      }
    }

    // Limpiar estados antes de navegar
    setGeneratedPlan(null);
    setNewPlanId(null);
    setShowForm(false);
    setFormStep(0);
    setError('');

    // Pequeño delay para asegurar que los estados se limpien antes de navegar
    // Guardar referencia del timeout para poder limpiarlo
    navigationTimeoutRef.current = setTimeout(() => {
      // Navegar al detalle del plan recién creado para que lo vea inmediatamente
      router.replace({
        pathname: '/(tabs)/workout-plan-detail',
        params: { planId: newPlanId }
      } as any);
      navigationTimeoutRef.current = null; // Limpiar referencia después de ejecutar
    }, 100);
  };

  const handleUsePlan = () => {
    Alert.alert(
      t('workoutGenerator.planSavedTitle'),
      t('workoutGenerator.planSavedMessage'),
      [
        {
          text: t('workoutGenerator.viewWorkouts'),
          onPress: () => router.replace('/(tabs)/workout'),
        },
      ]
    );
    
  };

  const getFitnessLevelText = (level: string) => {
    return t(`fitnessLevels.${level}`) || level;
  };

  const getGoalText = (goal: string) => {
    return t(`fitnessGoals.${goal}`) || goal;
  };

  // Render del formulario
  const renderForm = () => {
    const formSteps = [
      {
        title: t('workoutGenerator.whatIsYourLevel'),
        subtitle: t('workoutGenerator.selectLevelDescription'),
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
                  {level === FitnessLevel.BEGINNER && t('workoutGenerator.beginnerDesc')}
                  {level === FitnessLevel.INTERMEDIATE && t('workoutGenerator.intermediateDesc')}
                  {level === FitnessLevel.ADVANCED && t('workoutGenerator.advancedDesc')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ),
      },
      {
        title: t('workoutGenerator.whatAreYourGoals'),
        subtitle: t('workoutGenerator.selectAllThatApply'),
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
                  {getGoalText(goal)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ),
      },
      {
        title: t('workoutGenerator.howManyDaysPerWeek'),
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
                  {days} {days === 1 ? t('workoutGenerator.day') : t('workoutGenerator.days')} {t('common.perWeek')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ),
      },
      {
        title: t('workoutGenerator.howLongPerSession'),
        subtitle: '',
        content: (
          <View>
            {[15, 30, 45, 60, 90].map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[
                  styles.formOptionButton,
                  formData.session_duration === mins && styles.formOptionButtonSelected
                ]}
                onPress={() => setFormData(prev => ({ ...prev, session_duration: mins }))}
              >
                <Text style={[
                  styles.formOptionText,
                  formData.session_duration === mins && styles.formOptionTextSelected
                ]}>
                  {mins} {t('workoutGenerator.minutes')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ),
      },
      {
        title: t('workoutGenerator.whatEquipmentDoYouHave'),
        subtitle: t('customPlan.selectAllYouHave'),
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
                  {getEquipmentLabel(equipment)}
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
<Text style={styles.formBackButtonText}>
  {t('common.back')}
</Text>
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
  {formStep === formSteps.length - 1
    ? t('workoutGenerator.generatePlan')
    : t('common.next')}
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
          <Text style={styles.loadingText}>
  {t('workoutGenerator.loadingProfile')}
</Text>
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
            onPress={() => router.push('/(tabs)/workout' as any)}
          >
<Text style={styles.backButtonText}>
  {t('common.back')}
</Text>
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
          <LoadingOverlay visible={true} message={t('commonUI.generatingPlanAI')} />
          <Text style={styles.generatingTitle}>
            {t('workoutGenerator.generatingTitle')}
          </Text>
          <Text style={styles.generatingSubtext}>
            {t('workoutGenerator.analyzingYourGoals')}
          </Text>
          <Text style={styles.generatingSubtext}>
  {t('workoutGenerator.mayTakeSeconds')}
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
                // Navegar directamente a workout
                router.push('/(tabs)/workout' as any);
              }}
            >
              <Ionicons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
  {t('workoutGenerator.generatedPlanTitle')}
</Text>

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
  {generatedPlan.duration_weeks}{' '}
  {generatedPlan.duration_weeks === 1
    ? t('workoutGenerator.week')
    : t('workoutGenerator.weeks')}
</Text>

              </View>
              <View style={styles.planStat}>
                <Ionicons name="fitness" size={24} color="#ffb300" />
                <Text style={styles.planStatText}>
  {generatedPlan.days_per_week}{' '}
  {generatedPlan.days_per_week === 1
    ? t('workoutGenerator.dayPerWeek')
    : t('workoutGenerator.daysPerWeek')}
</Text>
              </View>
            </View>
          </View>

          {/* Weekly Schedule */}
          <View style={styles.section}>
          <Text style={styles.sectionTitle}>
  📅 {t('workoutGenerator.weeklyStructure')}
</Text>
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
                      
                      // Intentar obtener información de series/reps del nuevo formato
                      let sets = null;
                      let reps = null;
                      let rest = null;
                      let rir = null;
                      
                      if (typeof exercise === 'object') {
                        // Formato nuevo con working_sets
                        if (exercise.working_sets && exercise.working_sets.length > 0) {
                          sets = exercise.working_sets.length;
                          const firstSet = exercise.working_sets[0];
                          reps = firstSet.reps || exercise.reps;
                          rest = firstSet.rest || exercise.rest;
                          rir = firstSet.rir;
                        } else {
                          // Formato simplificado
                          sets = exercise.sets;
                          reps = exercise.reps;
                          rest = exercise.rest;
                        }
                      }
                      
                      return (
                        <View key={idx} style={styles.exerciseItemContainer}>
                          <View style={styles.exerciseInfoContainer}>
                            <Text style={styles.exerciseItem}>
                              • {exerciseName}
                            </Text>
                            {(sets || reps) && (
                              <View style={styles.exerciseDetailsContainer}>
                                {sets && (
                                  <Text style={styles.exerciseDetails}>
                                    {sets} series
                                  </Text>
                                )}
                                {reps && (
                                  <Text style={styles.exerciseDetails}>
                                    {typeof reps === 'string' ? reps : `${reps} reps`}
                                  </Text>
                                )}
                                {rir && (
                                  <Text style={styles.rirIndicator}>
                                    RIR {rir}
                                  </Text>
                                )}
                                {rest && (
                                  <Text style={styles.restIndicator}>
                                    {rest} descanso
                                  </Text>
                                )}
                              </View>
                            )}
                          </View>
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
<Text style={styles.sectionTitle}>
  🎯 {t('workoutGenerator.keyPrinciplesTitle')}
</Text>
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
              <Text style={styles.sectionTitle}>
  📈 {t('workoutGenerator.progressionTitle')}
</Text>

              <View style={styles.progressionCard}>
                <Text style={styles.progressionText}>{generatedPlan.progression}</Text>
              </View>
            </View>
          )}

          {/* Recommendations */}
          {generatedPlan.recommendations && (
            <View style={styles.section}>
<Text style={styles.sectionTitle}>
  💡 {t('workoutGenerator.recommendationsTitle')}
</Text>
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
          <Text style={styles.usePlanButtonText}>
  {t('workoutGenerator.usePlan')}
</Text>
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
              <Text style={styles.modalTitle}>
  {t('workoutGenerator.planGenerated')}
</Text>
<Text style={styles.modalText}>
  {t('workoutGenerator.planGeneratedSuccess')}
</Text>
<Text style={styles.modalQuestion}>
  {t('workoutGenerator.activatePlanNow')}
</Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => handleActivatePlan(false)}
                >
                  <Text style={styles.modalButtonSecondaryText}>
  {t('workoutGenerator.later')}
</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={() => handleActivatePlan(true)}
                >
                  <Text style={styles.modalButtonPrimaryText}>
  {t('workoutGenerator.activate')}
</Text>
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
              // Navegar directamente a workout
              router.push('/(tabs)/workout' as any);
            }}
          >
            <Ionicons name="arrow-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
  {t('workoutGenerator.generatePlan')}
</Text>

          <View style={{ width: 28 }} />
        </View>

        {/* Intro */}
        <View style={styles.intro}>
          <Ionicons name="sparkles" size={48} color="#ffb300" />
          <Text style={styles.introTitle}>
  {t('workoutGenerator.introTitle')}
</Text>

<Text style={styles.introDescription}>
  {t('workoutGenerator.introDescription')}
</Text>

        </View>

        {/* What to Expect */}
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>
  ✨ {t('workoutGenerator.whatIsIncluded')}
</Text>

          <View style={styles.featuresCard}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#ffb300" />
              <Text style={styles.featureText}>
  {t('workoutGenerator.featureWeeklyPlan')}
</Text>

            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#ffb300" />
              <Text style={styles.featureText}>
  {t('workoutGenerator.featureEquipmentBasedExercises')}
</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#ffb300" />
              <Text style={styles.featureText}>
  {t('workoutGenerator.featureProgression')}
</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={24} color="#ffb300" />
              <Text style={styles.featureText}>
  {t('workoutGenerator.featureEvidenceBased')}
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
            <Text style={styles.generateButtonText}>
  {t('workoutGenerator.generateMyPlan')}
</Text>

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
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  exerciseInfoContainer: {
    flex: 1,
  },
  exerciseItem: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: 4,
  },
  exerciseDetailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  exerciseDetails: {
    fontSize: 12,
    color: '#ffb300',
    fontWeight: '600',
  },
  rirIndicator: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    backgroundColor: '#1a3a1a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  restIndicator: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
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

