import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/services/supabase';
import { useWorkoutStore } from '@/store/workoutStore';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { useLoadingState } from '@/hooks/useLoadingState';
import { SkeletonWorkout } from '@/components/SkeletonLoaders';
import { PlanExpirationModal } from '@/components/PlanExpirationModal';
import { 
  getPendingTrainerInvitations, 
  respondToTrainerInvitation 
} from '../../src/services/trainerService';
import { useTutorial } from '@/contexts/TutorialContext';
import { HelpModal } from '@/components/HelpModal';
import { TutorialTooltip } from '@/components/TutorialTooltip';

export default function WorkoutScreen() {
  const { t } = useTranslation();
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
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [trainerInvitations, setTrainerInvitations] = useState<any[]>([]);
  const [showInvitationsModal, setShowInvitationsModal] = useState(false);
  const [isRespondingInvitation, setIsRespondingInvitation] = useState(false);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [expiredPlan, setExpiredPlan] = useState<any | null>(null);

  // Tutorial states
  const { 
    showHelpModal, 
    setShowHelpModal, 
    hasCompletedTutorial,
    shouldShowTooltip,
    completeTutorial,
    markTooltipShown 
  } = useTutorial();
  const [showWorkoutTooltips, setShowWorkoutTooltips] = useState(false);

  // Cargar datos cuando se monta el componente
  useEffect(() => {
    loadWorkouts();
    loadSessions();
    loadWorkoutPlans();
    loadTrainerInvitations();
  }, [user]);

  // Mostrar tooltips cuando corresponde
  const tutorialShownRef = React.useRef(false);
  useEffect(() => {
    const shouldShow = shouldShowTooltip('WORKOUT');
    
    // Si el tutorial debe mostrarse y el ref dice que ya se mostró,
    // significa que el usuario lo reseteó, así que reseteamos el ref
    if (shouldShow && tutorialShownRef.current) {
      tutorialShownRef.current = false;
    }
    
    if (!tutorialShownRef.current && shouldShow && user?.id && !isLoadingPlans) {
      tutorialShownRef.current = true;
      const timer = setTimeout(() => {
        setShowWorkoutTooltips(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [shouldShowTooltip, user, isLoadingPlans]);

  // Cerrar tutorial cuando la pantalla pierde el foco
  useFocusEffect(
    useCallback(() => {
      // Al entrar a la pantalla
      loadWorkoutPlans();
      loadWorkouts();
      loadSessions();
      loadTrainerInvitations();
      
      // Al salir de la pantalla, cerrar el tutorial si está abierto
      return () => {
        if (showWorkoutTooltips) {
          setShowWorkoutTooltips(false);
        }
      };
    }, [user, showWorkoutTooltips])
  );

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
        Alert.alert(t('common.error'), t('workout.errorLoadingPlans'));
        setWorkoutPlans([]);
        return;
      }

      setWorkoutPlans(data || []);
      
      // Verificar si el plan activo ha expirado
      checkForExpiredPlan(data || []);
    } catch (err) {
      console.error('Error inesperado:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const checkForExpiredPlan = (plans: any[]) => {
    // Encontrar el plan activo
    const activePlan = plans.find(p => p.is_active);
    if (!activePlan || !activePlan.activated_at) {
      console.log('📅 checkForExpiredPlan: No hay plan activo o no tiene fecha de activación');
      return;
    }

    // Obtener duration_weeks (puede haber sido editado)
    // Si el plan se editó y se cambió la duración, este valor reflejará el cambio
    const durationWeeks = activePlan.duration_weeks || activePlan.plan_data?.duration_weeks || 1;
    
    console.log(`📅 Verificando expiración de plan "${activePlan.plan_name}"`);
    console.log(`   - Duración del plan: ${durationWeeks} ${durationWeeks === 1 ? 'semana' : 'semanas'}`);
    console.log(`   - Activado: ${new Date(activePlan.activated_at).toLocaleDateString('es-ES')}`);

    // Calcular si el plan ha expirado
    // Las semanas vencen los domingos a la noche (a partir del lunes 00:00)
    const activatedDate = new Date(activePlan.activated_at);
    const now = new Date();
    
    // Obtener el lunes de la semana cuando se activó
    const activatedMonday = getMondayOfWeek(activatedDate);
    
    // Obtener el lunes de la semana actual
    const currentMonday = getMondayOfWeek(now);
    
    // Calcular cuántas semanas han pasado desde la activación
    const weeksPassed = Math.floor((currentMonday.getTime() - activatedMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    console.log(`   - Semanas transcurridas: ${weeksPassed}`);
    console.log(`   - Estado: ${weeksPassed >= durationWeeks ? '❌ EXPIRADO' : '✅ ACTIVO'}`);
    
    // Si han pasado duration_weeks o más, el plan ha expirado
    // Ejemplo: Plan de 3 semanas → se muestra modal al inicio de la semana 4 (weeksPassed >= 3)
    // Ejemplo: Plan de 1 semana → se muestra modal al inicio de la semana 2 (weeksPassed >= 1)
    if (weeksPassed >= durationWeeks) {
      console.log(`📅 Plan "${activePlan.plan_name}" ha finalizado (${weeksPassed} semanas de ${durationWeeks})`);
      console.log(`   ⚠️ Mostrando modal de finalización...`);
      setExpiredPlan(activePlan);
      setShowExpirationModal(true);
    }
  };

  const getMondayOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar cuando es domingo
    return new Date(d.setDate(diff));
  };

  const handleRepeatPlan = async () => {
    if (!user || !expiredPlan) return;

    try {
      // Reactivar el plan usando la función RPC
      // La función RPC automáticamente:
      // 1. Desactiva otros planes
      // 2. Activa este plan
      // 3. Actualiza activated_at a NOW()
      // 4. Actualiza last_week_monday al lunes de esta semana
      // 5. Incrementa times_repeated si es una nueva semana
      const { error: rpcError } = await supabase.rpc('activate_workout_plan', {
        p_user_id: user.id,
        p_plan_id: expiredPlan.id,
      });

      if (rpcError) {
        console.error('Error reactivating workout plan:', rpcError);
        Alert.alert(t('common.error'), t('workout.errorReactivatingPlan'));
        return;
      }
      
      // Cerrar modal y recargar planes
      setShowExpirationModal(false);
      setExpiredPlan(null);
      await loadWorkoutPlans();
      
      Alert.alert(
        '✅ Plan Reactivado',
        `El plan "${expiredPlan.plan_name}" ha sido reactivado. ¡Comienza una nueva semana!`
      );
    } catch (err) {
      console.error('Error reactivating plan:', err);
      Alert.alert(t('common.error'), t('workout.unexpectedErrorReactivating'));
    }
  };

  const handleChooseAnotherPlan = () => {
    // Cerrar el modal
    setShowExpirationModal(false);
    setExpiredPlan(null);
    
    // La pantalla actual ya muestra todos los planes disponibles
    // El usuario puede seleccionar otro plan directamente
  };

  const loadTrainerInvitations = async () => {
    if (!user) {
      console.log('🔴 loadTrainerInvitations: No hay usuario');
      return;
    }

    console.log('🔵 loadTrainerInvitations - Cargando invitaciones para:', user.id);
    try {
      const result = await getPendingTrainerInvitations(user.id);
      console.log('📊 Resultado de getPendingTrainerInvitations:', result);
      
      if (result.success && result.data) {
        console.log('📬 Invitaciones encontradas:', result.data.length);
        if (result.data.length > 0) {
          console.log('✅ Mostrando modal de invitaciones');
          console.log('📋 Invitaciones:', JSON.stringify(result.data, null, 2));
          setTrainerInvitations(result.data);
          setShowInvitationsModal(true);
        } else {
          console.log('ℹ️ No hay invitaciones pendientes');
        }
      } else {
        console.log('❌ Error al cargar invitaciones:', result.error);
      }
    } catch (error) {
      console.error('💥 Excepción en loadTrainerInvitations:', error);
    }
  };

  const handleRespondInvitation = async (invitationId: string, accept: boolean, trainerName: string) => {
    if (!user) return;

    setIsRespondingInvitation(true);
    try {
      const result = await respondToTrainerInvitation(user.id, invitationId, accept);
      
      if (result.success) {
        Alert.alert(
          accept ? '✅ Invitación Aceptada' : '❌ Invitación Rechazada',
          accept
            ? `Ahora ${trainerName} es tu entrenador y puede ver tus estadísticas. También son amigos para chatear.`
            : `Has rechazado la invitación de ${trainerName}.`,
          [{ text: 'OK' }]
        );
        
        // Remover la invitación de la lista
        setTrainerInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        
        // Si no quedan más invitaciones, cerrar el modal
        if (trainerInvitations.length <= 1) {
          setShowInvitationsModal(false);
        }
      } else {
        Alert.alert(t('common.error'), result.error || t('workout.errorProcessingInvitation'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('workout.unexpectedErrorProcessingInvitation'));
    } finally {
      setIsRespondingInvitation(false);
    }
  };

  const activateWorkoutPlan = async (planId: string) => {
    if (!user) return;

    try {
      console.log('🔄 Activando plan:', { userId: user.id, planId });
      
      // Activación atómica vía RPC (desactiva otros y activa este)
      const { data, error: rpcError } = await supabase.rpc('activate_workout_plan', {
        p_user_id: user.id,
        p_plan_id: planId,
      });

      console.log('📡 Respuesta RPC:', { data, error: rpcError });

      if (rpcError) {
        console.error('❌ Error activating workout plan:', {
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
          code: rpcError.code,
        });
        Alert.alert(
          t('workout.errorActivatingPlan'),
          `${rpcError.message}\n\n${t('common.details')}: ${rpcError.details || t('common.notAvailable')}\n\n${t('common.code')}: ${rpcError.code || 'N/A'}`
        );
        return;
      }
      
      console.log('✅ Plan activado correctamente');
      
      // Recargar la lista de planes para mostrar el estado actualizado
      await loadWorkoutPlans();
      
    } catch (err: any) {
      console.error('❌ Error inesperado activating workout plan:', err);
      Alert.alert(t('common.error'), `${t('workout.couldNotActivatePlan')}: ${err?.message || t('errors.unknownError')}`);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadWorkouts(), loadSessions(), loadWorkoutPlans(), loadTrainerInvitations()]);
    setRefreshing(false);
  };

  const getWorkoutDifficulty = (difficulty: number) => {
    const key = difficulty <= 3 ? 'easy' : (difficulty <= 6 ? 'moderate' : 'hard');
    // Usar claves de traducción para el texto
    return { text: t(`workout.difficulty.${key}`) ?? key, color: difficulty <= 3 ? '#4CAF50' : (difficulty <= 6 ? '#FF9800' : '#F44336') };
  };

  const getWorkoutType = (workout: any) => {
    const exerciseCount = workout.workout_exercises?.length || 0;
    if (exerciseCount <= 4) return t('workout.shortWorkout');
    if (exerciseCount <= 8) return t('workout.standardWorkout');
    return t('workout.intenseWorkout');
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      <View style={styles.headerContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{t('tabs.train')}</Text>
        </View>
        {/* Botón de ayuda */}
        <TouchableOpacity
          onPress={() => {
            // Si el tutorial está trabado, cerrarlo primero
            if (showWorkoutTooltips) {
              setShowWorkoutTooltips(false);
            } else {
              setShowHelpModal(true);
            }
          }}
          style={styles.helpButtonAbsolute}
        >
          <Ionicons name="help-circle-outline" size={28} color="#ffb300" />
        </TouchableOpacity>
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={() => setShowSelectionModal(true)}
          >
            <Ionicons name="add" size={20} color="#1a1a1a" />
            <Text style={styles.generateButtonText}>{t('workout.createWorkout')}</Text>
          </TouchableOpacity>

          {/* Botón Modo Entrenador */}
          <TouchableOpacity
            style={styles.trainerModeButton}
            onPress={() => router.push('/trainer-mode' as any)}
          >
            <Ionicons name="people" size={20} color="#ffffff" />
            <Text style={styles.trainerModeButtonText}>{t('workout.trainerMode')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Planes de Entrenamiento Generados */}
      {isLoadingPlans ? (
        <SkeletonWorkout />
      ) : workoutPlans.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('workout.myWorkoutPlans')}</Text>
          {workoutPlans.map((plan) => {
            const planData = plan.plan_data;
            
            // Verificar si es un plan personalizado (no de IA)
            const isCustomPlan = plan.description?.toLowerCase().includes('plan personalizado') || false;
            
            // Verificar si el plan está completo (todos los días tienen ejercicios)
            const totalDays = planData.days_per_week;
            const weeklyStructure = planData.weekly_structure || [];
            const completedDays = weeklyStructure.filter((day: any) => 
              day.exercises && day.exercises.length > 0
            ).length;
            // Solo considerar parcial si es un plan personalizado Y está incompleto
            const isPartialPlan = isCustomPlan && completedDays < totalDays && completedDays > 0;
            
            return (
              <View key={plan.id} style={styles.planCard}>
                <View style={styles.planHeader}>
                  <View style={styles.planTitleContainer}>
                    <Ionicons name="fitness" size={24} color="#ffb300" />
                    <Text style={styles.planName}>{plan.plan_name}</Text>
                  </View>
                  <View style={styles.badgesContainer}>
                    {plan.is_active && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>{t('workout.activePlan')}</Text>
                      </View>
                    )}
                    {isPartialPlan && (
                      <View style={styles.draftBadge}>
                        <Ionicons name="create-outline" size={10} color="#1a1a1a" />
                        <Text style={styles.draftBadgeText}>{t('common.draft')}</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <Text style={styles.planDescription}>{plan.description}</Text>
                
                {isPartialPlan && (
                  <View style={styles.progressInfo}>
                    <Ionicons name="information-circle-outline" size={14} color="#ff9800" />
                    <Text style={styles.progressText}>
                      {t('workout.daysCompleted', { completed: completedDays, total: totalDays })}
                    </Text>
                  </View>
                )}
                
                <View style={styles.planStats}>
                  <View style={styles.stat}>
                    <Ionicons name="calendar" size={16} color="#ffb300" />
                    <Text style={styles.statText}>{planData.duration_weeks} {t('common.weeks')}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons name="fitness-outline" size={16} color="#ffb300" />
                    <Text style={styles.statText}>{planData.days_per_week} {t('common.daysPerWeek')}</Text>
                  </View>
                  {!plan.description?.toLowerCase().includes('plan personalizado') && (
                    <View style={styles.stat}>
                      <Ionicons name="time-outline" size={16} color="#ffb300" />
                      <Text style={styles.statText}>{planData.weekly_structure?.[0]?.duration || 45} min</Text>
                    </View>
                  )}
                  {plan.times_repeated > 0 && (
                    <View style={styles.stat}>
                      <Ionicons name="refresh" size={16} color="#4CAF50" />
                      <Text style={[styles.statText, { color: '#4CAF50' }]}>
                        {plan.times_repeated} {plan.times_repeated === 1 ? 'repetición' : 'repeticiones'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.planActions}>
                  {isPartialPlan && (
                    <TouchableOpacity
                      style={styles.continueEditButton}
                      onPress={() => router.push({
                        pathname: '/(tabs)/workout/custom-plan-days',
                        params: {
                          planId: plan.id,
                          daysPerWeek: totalDays,
                          equipment: JSON.stringify(planData.equipment || []),
                        }
                      } as any)}
                    >
                      <Ionicons name="create-outline" size={16} color="#1a1a1a" />
                      <Text style={styles.continueEditButtonText}>{t('workout.continueEditing')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.viewPlanButton, isPartialPlan && styles.viewPlanButtonSecondary]}
                    onPress={() => router.push(`/(tabs)/workout-plan-detail?planId=${plan.id}` as any)}
                  >
                    <Ionicons name="eye" size={16} color={isPartialPlan ? "#ffb300" : "#ffffff"} />
                    <Text style={[styles.viewPlanButtonText, isPartialPlan && styles.viewPlanButtonTextSecondary]}>
                      {t('workout.viewPlan')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.planDate}>
                  {t('workout.created')} {new Date(plan.created_at).toLocaleDateString('es-ES')}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Entrenamientos del Store */}
      {workouts.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏋️ {t('workout.workoutTitle')}</Text>
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
                    <Ionicons name="time-outline" size={16} color="#ffb300" />
                    <Text style={styles.statText}>{workout.duration_minutes} min</Text>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons name="fitness-outline" size={16} color="#ffb300" />
                    <Text style={styles.statText}>{workout.workout_exercises?.length || 0} {t('workout.exercises')}</Text>
                  </View>
                  <View style={styles.stat}>
                    <Ionicons name="trending-up-outline" size={16} color="#ffb300" />
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
                      {workout.is_active ? t('workout.active') : t('workout.activate')}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() => router.push(`/workout-details/${workout.id}`)}
                  >
                    <Ionicons name="eye" size={16} color="#ffb300" />
                    <Text style={styles.detailsButtonText}>{t('workout.details')}</Text>
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
          <Text style={styles.emptyTitle}>{t('workout.noWorkouts')}</Text>
          <Text style={styles.emptyDescription}>
            {t('workout.noWorkoutsDesc')}
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowSelectionModal(true)}
          >
            <Text style={styles.createButtonText}>{t('workout.createWorkoutPlan')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {sessions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('workout.recentSessions')}</Text>
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
                  <Ionicons name="checkmark-circle" size={24} color="#ffb300" />
                ) : (
                  <Ionicons name="time" size={24} color="#FF9800" />
                )}
              </View>
            </View>
          ))}
        </View>
      )}
      </ScrollView>

      {/* Modal de selección de tipo de plan */}
      <Modal
        visible={showSelectionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSelectionModal(false)}
        onDismiss={() => {
          // Este callback se ejecuta cuando el modal se cierra completamente
        }}
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <View style={styles.modalContent} pointerEvents="box-none">
            <View pointerEvents="auto">
              <Text style={styles.modalTitle}>{t('workout.selectPlanType')}</Text>
              <Text style={styles.modalSubtitle}>
                {t('workout.selectPlanDesc')}
              </Text>
              
              <TouchableOpacity
                style={[styles.selectionOption, styles.selectionOptionPrimary]}
                onPress={() => {
                  setShowSelectionModal(false);
                  // Usar requestAnimationFrame para asegurar que el modal se cierre antes de navegar
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      router.push('/(tabs)/workout-generator');
                    });
                  });
                }}
                activeOpacity={0.8}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="sparkles" size={28} color="#ffb300" />
                </View>
                <Text style={styles.selectionOptionTitlePrimary}>{t('workout.generateAI')}</Text>
                <Text style={styles.selectionOptionDescriptionPrimary}>
                  {t('workout.generateAIDesc')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.selectionOption, styles.selectionOptionSecondary]}
                onPress={() => {
                  setShowSelectionModal(false);
                  // Usar requestAnimationFrame para asegurar que el modal se cierre antes de navegar
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      router.push('/(tabs)/workout/custom-plan-setup');
                    });
                  });
                }}
                activeOpacity={0.8}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="create" size={28} color="#ffb300" />
                </View>
                <Text style={styles.selectionOptionTitleSecondary}>{t('workout.customPlan')}</Text>
                <Text style={styles.selectionOptionDescriptionSecondary}>
                  {t('workout.customPlanDesc')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSelectionModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseButtonText}>{t('workout.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Invitaciones de Entrenador */}
      <Modal
        visible={showInvitationsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInvitationsModal(false)}
      >
        <View style={styles.invitationsModalOverlay}>
          <TouchableOpacity 
            style={styles.invitationsModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowInvitationsModal(false)}
          />
          <View style={styles.invitationsModalContent}>
            {/* Header Mejorado */}
            <View style={styles.invitationsHeaderContainer}>
              <View style={styles.invitationsIconWrapper}>
                <View style={styles.invitationsIconGradient}>
                  <Ionicons name="fitness" size={32} color="#1a1a1a" />
                </View>
              </View>
              <Text style={styles.invitationsMainTitle}>
                {trainerInvitations.length === 1 
                  ? t('workout.newInvitation') 
                  : t('workout.newInvitations', { count: trainerInvitations.length })}
              </Text>
              <Text style={styles.invitationsSubtitle}>
                {trainerInvitations.length === 1 
                  ? t('workout.pendingInvitationSingular') 
                  : t('workout.pendingInvitationPlural')}
              </Text>
            </View>

            {/* Lista de Invitaciones */}
            <ScrollView 
              style={styles.invitationsList} 
              contentContainerStyle={styles.invitationsListContent}
              showsVerticalScrollIndicator={false}
            >
              {trainerInvitations.map((invitation, index) => (
                <View key={invitation.id} style={styles.invitationCard}>
                  {/* Avatar y Info del Entrenador */}
                  <View style={styles.trainerInfoSection}>
                    <View style={styles.trainerAvatarWrapper}>
                      <View style={styles.trainerAvatarGradient}>
                        <Text style={styles.trainerAvatarText}>
                          {(invitation.trainer_name || invitation.trainer_username || 'T')[0].toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.trainerTextInfo}>
                      <Text style={styles.trainerNameText}>
                        {invitation.trainer_name || invitation.trainer_username || t('workout.trainer')}
                      </Text>
                      {invitation.trainer_username && (
                        <Text style={styles.trainerUsernameText}>@{invitation.trainer_username}</Text>
                      )}
                    </View>
                  </View>

                  {/* Mensaje */}
                  <View style={styles.invitationMessageContainer}>
                    <Ionicons name="information-circle-outline" size={18} color="#ffb300" />
                    <Text style={styles.invitationMessageText}>
                      {t('workout.wantsToBeYourTrainer')}
                    </Text>
                  </View>

                  {/* Botones de Acción */}
                  <View style={styles.invitationActionsRow}>
                    <TouchableOpacity
                      style={[styles.invitationActionButton, styles.rejectActionButton]}
                      onPress={() => handleRespondInvitation(
                        invitation.id,
                        false,
                        invitation.trainer_name || invitation.trainer_username || 'El entrenador'
                      )}
                      disabled={isRespondingInvitation}
                      activeOpacity={0.8}
                    >
                      {isRespondingInvitation ? (
                        <ActivityIndicator size="small" color="#ff4444" />
                      ) : (
                        <>
                          <Ionicons name="close-circle-outline" size={22} color="#ff4444" />
                          <Text style={styles.rejectActionText}>{t('common.reject')}</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.invitationActionButton, styles.acceptActionButton]}
                      onPress={() => handleRespondInvitation(
                        invitation.id,
                        true,
                        invitation.trainer_name || invitation.trainer_username || t('workout.trainer')
                      )}
                      disabled={isRespondingInvitation}
                      activeOpacity={0.8}
                    >
                      {isRespondingInvitation ? (
                        <ActivityIndicator size="small" color="#1a1a1a" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={22} color="#1a1a1a" />
                          <Text style={styles.acceptActionText}>{t('common.accept')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Botón Cerrar */}
            <TouchableOpacity
              style={styles.invitationsCloseButton}
              onPress={() => setShowInvitationsModal(false)}
              activeOpacity={0.8}
            >
<Text style={styles.invitationsCloseButtonText}>
  {t('common.reviewLater')}
</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Expiración de Plan */}
      {expiredPlan && (
        <PlanExpirationModal
          visible={showExpirationModal}
          planName={expiredPlan.plan_name}
          timesRepeated={expiredPlan.times_repeated || 0}
          onRepeat={handleRepeatPlan}
          onChooseAnother={handleChooseAnotherPlan}
        />
      )}

      {/* Modal de ayuda */}
      <HelpModal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* Tooltips de tutorial */}
      <TutorialTooltip
        visible={showWorkoutTooltips}
        steps={[
            {
              element: <View />,
              title: t('tutorial.workout.title1'),
              content: t('tutorial.workout.content1'),
              placement: 'center',
            },
            {
              element: <View />,
              title: t('tutorial.workout.title2'),
              content: t('tutorial.workout.content2'),
              placement: 'center',
              // Spotlight sobre el botón "Crear Entrenamiento"
              spotlightPosition: {
                x: 15,
                y: 110,
                width: 180,
                height: 51,
                borderRadius: 8,
              },
            },
            {
              element: <View />,
              title: t('tutorial.workout.title3'),
              content: t('tutorial.workout.content3'),
              placement: 'center',
              // Spotlight sobre el botón "Modo Entrenador"
              spotlightPosition: {
                x: 198,
                y: 110,
                width: 180,
                height: 51,
                borderRadius: 8,
              },
            },
            {
              element: <View />,
              title: t('tutorial.workout.title4'),
              content: t('tutorial.workout.content4'),
              placement: 'center',
            },
          ]}
          onComplete={() => {
            // Primero cerrar el modal, luego actualizar el contexto
            setShowWorkoutTooltips(false);
            setTimeout(() => {
              completeTutorial('WORKOUT');
              markTooltipShown('WORKOUT');
            }, 100);
          }}
          onSkip={() => {
            // Primero cerrar el modal, luego actualizar el contexto
            setShowWorkoutTooltips(false);
            setTimeout(() => {
              completeTutorial('WORKOUT');
              markTooltipShown('WORKOUT');
            }, 100);
          }}
        />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  headerContainer: {
    padding: 20,
    paddingTop: 65,
    paddingBottom: 15,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  helpButton: {
    padding: 4,
  },
  helpButtonAbsolute: {
    position: 'absolute',
    top: 68,
    right: 20,
    padding: 4,
    zIndex: 10,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  generateButton: {
    flex: 1,
    backgroundColor: '#ffb300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    position: 'relative',
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
    backgroundColor: '#ffb300',
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
    borderColor: '#ffb300',
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
  },
  detailsButtonText: {
    color: '#ffb300',
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
    backgroundColor: '#ffb300',
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
    borderColor: '#ffb300',
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
  badgesContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  activeBadge: {
    backgroundColor: '#ffb300',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: '600',
  },
  draftBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  draftBadgeText: {
    color: '#1a1a1a',
    fontSize: 11,
    fontWeight: '600',
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  progressText: {
    color: '#ff9800',
    fontSize: 12,
    fontWeight: '500',
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
    gap: 8,
  },
  continueEditButton: {
    backgroundColor: '#ff9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  continueEditButtonText: {
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  viewPlanButton: {
    backgroundColor: '#ffb300',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewPlanButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  viewPlanButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  viewPlanButtonTextSecondary: {
    color: '#ffb300',
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
    marginBottom: 8,
    textAlign: 'center',
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
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: '#1f1f1f',
  },
  selectionOptionPrimary: {
    borderColor: '#ffb300',
    backgroundColor: '#1f1f1f',
  },
  selectionOptionSecondary: {
    borderColor: '#ffb300',
    backgroundColor: '#1f1f1f',
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectionOptionTitlePrimary: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  selectionOptionDescriptionPrimary: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  selectionOptionTitleSecondary: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  selectionOptionDescriptionSecondary: {
    fontSize: 14,
    color: '#999',
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
  trainerModeButton: {
    flex: 1,
    backgroundColor: '#8B2635',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  trainerModeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Estilos del modal de invitaciones
  invitationsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'flex-end',
  },
  invitationsModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  invitationsModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '90%',
    borderTopWidth: 3,
    borderTopColor: '#ffb300',
  },
  invitationsHeaderContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  invitationsIconWrapper: {
    marginBottom: 16,
  },
  invitationsIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffb300',
  },
  invitationsMainTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  invitationsSubtitle: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  invitationsList: {
    maxHeight: 450,
  },
  invitationsListContent: {
    paddingBottom: 8,
  },
  invitationCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.2)',
  },
  trainerInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  trainerAvatarWrapper: {
    marginRight: 14,
  },
  trainerAvatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffb300',
  },
  trainerAvatarText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  trainerTextInfo: {
    flex: 1,
  },
  trainerNameText: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  trainerUsernameText: {
    fontSize: 14,
    color: '#ffb300',
    fontWeight: '500',
  },
  invitationMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 18,
    gap: 10,
  },
  invitationMessageText: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  invitationActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  invitationActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
  },
  acceptActionButton: {
    backgroundColor: '#ffb300',
  },
  acceptActionText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rejectActionButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ff4444',
  },
  rejectActionText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
  invitationsCloseButton: {
    marginTop: 20,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
  },
  invitationsCloseButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
});
