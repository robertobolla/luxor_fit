import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';

import { supabase } from '../../src/services/supabase';
import { AIWorkoutAdaptationModal } from '../../src/components/AIWorkoutAdaptationModal';
import { getFriends } from '../../src/services/friendsService';
import { shareWorkout } from '../../src/services/sharedWorkoutService';
import { FriendSelectionModal, ConfirmModal } from '../../src/components/CustomModal';
import { LoadingOverlay } from '../../src/components/LoadingOverlay';


type WorkoutExercise =
  | string
  | {
      name?: string;
      sets?: number | string;
      reps?: number | string;
      rest?: number | string;
      notes?: string;
      [key: string]: unknown;
    };

type WeeklyDay = {
  day?: string;
  duration?: number;
  focus?: string;
  exercises?: WorkoutExercise[];
  [key: string]: unknown;
};

type MultiWeek = {
  week_number?: number;
  days?: WeeklyDay[];
  [key: string]: unknown;
};

type PlanData = {
  duration_weeks?: number;
  days_per_week?: number;

  weekly_structure?: WeeklyDay[];
  multi_week_structure?: MultiWeek[];

  key_principles?: unknown;
  principles?: unknown;
  core_principles?: unknown;
  keyPrinciples?: unknown;
  principios_clave?: unknown;

  recommendations?: unknown;
  tips?: unknown;
  advice?: unknown;
  suggestions?: unknown;
  recomendaciones?: unknown;

  progression?: unknown;
  progress?: unknown;
  progression_notes?: unknown;
  progresion?: unknown;

  equipment?: unknown;
  userData?: { equipment?: unknown };

  [key: string]: unknown;
};

type WorkoutPlanRow = {
  id: string;
  plan_name: string;
  description?: string;
  created_at?: string;
  activated_at?: string;
  is_active?: boolean;
  plan_data?: unknown;

  duration_weeks?: number;
  days_per_week?: number;
  weekly_structure?: unknown;

  key_principles?: unknown;
  recommendations?: unknown;
  progression?: unknown;
  progress?: unknown;
  progression_notes?: unknown;
  principles?: unknown;
  core_principles?: unknown;
  tips?: unknown;
  advice?: unknown;
  suggestions?: unknown;

  [key: string]: unknown;
};

type NormalizedWorkoutPlan = Omit<WorkoutPlanRow, 'plan_data'> & { plan_data: PlanData };

type FriendsResult = { success: boolean; data?: any[]; error?: string };

const { t } = useTranslation();

const DEFAULT_PRINCIPLES = t('training.principles', { returnObjects: true }) as string[];
const DEFAULT_RECOMMENDATIONS = t('training.recommendations', { returnObjects: true }) as string[];


const getParamString = (v: string | string[] | undefined): string | undefined => {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
};

const safeJsonParse = <T,>(input: string, fallback: T): T => {
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
};

const str = (v: unknown, fallback = ''): string => {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return fallback;
};

const lowerStr = (v: unknown): string => str(v).toLowerCase();

const dateValue = (v: unknown): string | number | Date => {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') return v;
  return Date.now();
};

const toNumber = (v: unknown, fallback: number): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
};

const coerceStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === 'string') return [value];
  if (typeof value === 'object') {
    const v = value as any;
    const arr = (v.items || v.values || v.list) as unknown;
    if (Array.isArray(arr)) return arr.map((x) => String(x));
  }
  return [];
};

const coerceString = (value: unknown, fallback: string): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join('. ');
  if (typeof value === 'object') {
    const v = value as any;
    return (v.text || v.description || fallback) as string;
  }
  return String(value);
};

const normalizePlanRow = (row: WorkoutPlanRow): NormalizedWorkoutPlan => {
  const raw = row.plan_data;

  let planDataObj: PlanData = {};
  if (typeof raw === 'string') {
    planDataObj = safeJsonParse<PlanData>(raw, {});
  } else if (raw && typeof raw === 'object') {
    planDataObj = raw as PlanData;
  }

  return {
    ...row,
    plan_data: planDataObj,
  };
};

export default function WorkoutPlanDetailScreen() {
  const { t } = useTranslation();
  const { user } = useUser();

  const params = useLocalSearchParams<{
    planId?: string | string[];
    isTrainerView?: string | string[];
    studentId?: string | string[];
  }>();

  const planId = getParamString(params.planId);
  const isTrainerView = getParamString(params.isTrainerView);
  const studentId = getParamString(params.studentId);

  const [plan, setPlan] = useState<NormalizedWorkoutPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());
  const [showAIModal, setShowAIModal] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);

  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  const getMondayOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const calculateCurrentWeekIndex = (activatedAt: string, totalWeeks: number): number => {
    const safeTotal = Math.max(1, totalWeeks);
    if (!activatedAt) return 0;

    const activatedDate = new Date(activatedAt);
    const now = new Date();

    const activatedMonday = getMondayOfWeek(activatedDate);
    const currentMonday = getMondayOfWeek(now);

    const weeksPassed = Math.floor(
      (currentMonday.getTime() - activatedMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    return Math.max(0, Math.min(weeksPassed, safeTotal - 1));
  };

  const loadPlanDetails = useCallback(async () => {
    if (!planId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: sbError, status } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', planId)
        .limit(1)
        .maybeSingle();

      if (sbError) {
        console.error('Error al cargar plan:', sbError);
        setError(str(t('workoutPlanDetail.couldNotLoadPlan'), 'No se pudo cargar el plan'));
        return;
      }

      if (!data) {
        console.warn('Plan no encontrado para id:', planId, 'status:', status);
        setError(str(t('workoutPlanDetail.planNotFound'), 'Plan no encontrado'));
        return;
      }

      const normalized = normalizePlanRow(data as WorkoutPlanRow);
      setPlan(normalized);

      const durationWeeks = toNumber(normalized.plan_data.duration_weeks ?? normalized.duration_weeks, 4);

      const hasMulti =
        Array.isArray(normalized.plan_data.multi_week_structure) &&
        normalized.plan_data.multi_week_structure.length > 0;

      if (normalized.is_active && normalized.activated_at && hasMulti) {
        setCurrentWeekIndex(calculateCurrentWeekIndex(str(normalized.activated_at), durationWeeks));
      } else {
        setCurrentWeekIndex(0);
      }
    } catch (err) {
      console.error('Error inesperado:', err);
      setError(str(t('workoutPlanDetail.unexpectedError'), 'Error inesperado'));
    } finally {
      setIsLoading(false);
    }
  }, [planId, t]);

  const loadCompletedDays = useCallback(async () => {
    if (!user?.id || !planId) return;

    try {
      const { data, error: sbError } = await supabase
        .from('workout_completions')
        .select('day_name')
        .eq('user_id', user.id)
        .eq('workout_plan_id', planId);

      if (sbError) {
        console.error('Error al cargar días completados:', sbError);
        return;
      }

      const completedSet = new Set((data || []).map((c: any) => str(c.day_name)));
      setCompletedDays(completedSet);
    } catch (err) {
      console.error('Error inesperado al cargar días completados:', err);
    }
  }, [user?.id, planId]);

  useEffect(() => {
    loadPlanDetails();
  }, [loadPlanDetails]);

  useEffect(() => {
    if (plan && user?.id) loadCompletedDays();
  }, [plan, user?.id, loadCompletedDays]);

  useFocusEffect(
    useCallback(() => {
      loadPlanDetails().then(() => {
        if (user?.id) loadCompletedDays();
      });
    }, [loadPlanDetails, loadCompletedDays, user?.id])
  );

  const handleToggleActive = async () => {
    if (!plan || !user) return;

    const planId = String(plan.id);
    try {
      if (!!plan.is_active) {
        const { error: sbError } = await supabase
          .from('workout_plans')
          .update({ is_active: false })
          .eq('id', planId);

        if (sbError) {
          console.error('Error al desactivar plan:', sbError);
          Alert.alert(str(t('common.error'), 'Error'), str(t('workout.couldNotDeactivatePlan'), 'No se pudo desactivar'));
          return;
        }

        setPlan({ ...plan, is_active: false });
        Alert.alert(str(t('common.success'), 'OK'), str(t('workout.planDeactivated'), 'Plan desactivado'));
      } else {
        const { error: rpcError } = await supabase.rpc('activate_workout_plan', {
          p_user_id: user.id,
          p_plan_id: planId,
        });

        if (rpcError) {
          console.error('❌ Error al activar plan:', rpcError);
          Alert.alert(str(t('workout.errorActivatingPlan'), 'Error'), rpcError.message);
          return;
        }

        setPlan({ ...plan, is_active: true });
        Alert.alert(str(t('common.success'), 'OK'), str(t('workout.planActivated'), 'Plan activado'));
      }
    } catch (err) {
      console.error('Error inesperado:', err);
      Alert.alert(str(t('common.error'), 'Error'), str(t('common.unexpectedError'), 'Error inesperado'));
    }
  };

  const handleSharePlan = async () => {
    if (!plan || !user?.id) return;

    setIsLoadingFriends(true);
    setShareError(null);

    const friendsResult = (await getFriends(user.id)) as FriendsResult;

    if (friendsResult.success && friendsResult.data && friendsResult.data.length > 0) {
      setFriends(friendsResult.data);
      setShowShareModal(true);
    } else {
      setShareError(
        'No tienes amigos aún. Ve a la pestaña Inicio y agrega amigos para compartir entrenamientos.'
      );
    }

    setIsLoadingFriends(false);
  };

  const handleSelectFriend = async (friendId: string) => {
    if (!plan || !user?.id) return;

    const result = await shareWorkout(user.id, friendId, String(plan.id));
    if (result.success) {
      setShowShareSuccess(true);
    } else {
      setShareError(str(result.error as string, 'No se pudo compartir el entrenamiento'));
    }
  };

  const handleEditPlan = async () => {
    if (!plan) {
      Alert.alert(str(t('common.error'), 'Error'), str(t('workout.couldNotLoadPlanData'), 'No se pudo cargar'));
      return;
    }

    try {
      const equipment = plan.plan_data.equipment || plan.plan_data.userData?.equipment || [];

      router.push({
        pathname: '/(tabs)/workout/custom-plan-days',
        params: {
          equipment: JSON.stringify(equipment),
          planId: String(plan.id),
          isTrainerView: isTrainerView || 'false',
          studentId: studentId || '',
        },
      } as any);
    } catch (e) {
      console.error('Error al cargar plan para edición:', e);
      Alert.alert(str(t('common.error'), 'Error'), str(t('workout.couldNotLoadForEdit'), 'No se pudo abrir'));
    }
  };

  const handleDeletePlan = () => {
    if (!plan) return;

    Alert.alert(str(t('workout.deletePlanConfirm'), 'Eliminar plan'), str(t('workout.deletePlanMessage'), '¿Seguro?'), [
      { text: str(t('common.cancel'), 'Cancelar'), style: 'cancel' },
      {
        text: str(t('common.delete'), 'Eliminar'),
        style: 'destructive',
        onPress: async () => {
          try {
            const { error: sbError } = await supabase.from('workout_plans').delete().eq('id', String(plan.id));

            if (sbError) {
              console.error('Error al eliminar plan:', sbError);
              Alert.alert(str(t('common.error'), 'Error'), str(t('workout.couldNotDeletePlan'), 'No se pudo eliminar'));
              return;
            }

            Alert.alert(str(t('common.success'), 'OK'), str(t('workout.planDeletedSuccessfully'), 'Plan eliminado'));
            router.push('/(tabs)/workout' as any);
          } catch (err) {
            console.error('Error inesperado:', err);
            Alert.alert(str(t('common.error'), 'Error'), str(t('common.unexpectedError'), 'Error inesperado'));
          }
        },
      },
    ]);
  };

  const safePlanData = useMemo(() => {
    if (!plan) {
      return {
        duration_weeks: 4,
        days_per_week: 3,
        weekly_structure: [] as WeeklyDay[],
        multi_week_structure: [] as MultiWeek[],
        key_principles: DEFAULT_PRINCIPLES,
        progression: str(t('workout.progressionDefault'), 'Progresión semanal'),
        recommendations: DEFAULT_RECOMMENDATIONS,
      };
    }

    const pd = plan.plan_data;

    const weeklyStructure = Array.isArray(pd.weekly_structure)
      ? pd.weekly_structure
      : Array.isArray(plan.weekly_structure)
        ? (plan.weekly_structure as WeeklyDay[])
        : [];

    const multiWeekStructure = Array.isArray(pd.multi_week_structure) ? pd.multi_week_structure : [];

    const durationWeeks = toNumber(pd.duration_weeks ?? plan.duration_weeks, 4);
    const daysPerWeek = toNumber(pd.days_per_week ?? plan.days_per_week ?? weeklyStructure.length, weeklyStructure.length || 3);

    const keyPrinciples = coerceStringArray(
      pd.key_principles ||
        pd.principles ||
        pd.core_principles ||
        pd.keyPrinciples ||
        plan.key_principles ||
        plan.principles ||
        plan.core_principles ||
        plan.keyPrinciples ||
        pd.principios_clave
    );

    const recommendations = coerceStringArray(
      pd.recommendations ||
        pd.tips ||
        pd.advice ||
        pd.suggestions ||
        plan.recommendations ||
        plan.tips ||
        plan.advice ||
        plan.suggestions ||
        pd.recomendaciones
    );

    const progression = coerceString(
      pd.progression ||
        pd.progress ||
        pd.progression_notes ||
        plan.progression ||
        plan.progress ||
        plan.progression_notes ||
        pd.progresion,
      str(t('workout.progressionDefault'), 'Progresión semanal')
    );

    return {
      duration_weeks: durationWeeks,
      days_per_week: daysPerWeek,
      weekly_structure: weeklyStructure,
      multi_week_structure: multiWeekStructure,
      key_principles: keyPrinciples.length ? keyPrinciples : DEFAULT_PRINCIPLES,
      progression,
      recommendations: recommendations.length ? recommendations : DEFAULT_RECOMMENDATIONS,
    };
  }, [plan, t]);

  const isCustomPlan = useMemo(() => {
    return lowerStr(plan?.description).includes('plan personalizado');
  }, [plan]);

  const minPerSession = safePlanData.weekly_structure?.[0]?.duration || 45;

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
        <LoadingOverlay
  visible={true}
  message={t('common.loading')}
  fullScreen
/>
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/workout' as any)}>
          <Text style={styles.backButtonText}>
  {t('workout.backToWorkout')}
</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/workout' as any)} style={styles.backIconButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{str(t('workout.planTitle'), 'Plan')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.planHeader}>
          <View style={styles.planTitleContainer}>
            <Ionicons name="fitness" size={32} color="#ffb300" />
            <View style={styles.planTitleTextContainer}>
              <Text style={styles.planName}>{str(plan.plan_name, 'Plan')}</Text>
              {!!plan.is_active && (
                <View style={styles.activeBadge}>
<Text style={styles.activeBadgeText}>
  {t('workout.activePlan')}
</Text>
                  </View>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.aiButton} onPress={handleEditPlan} activeOpacity={0.8}>
            <View style={styles.aiButtonContent}>
              <View style={styles.aiIconContainer}>
                <Ionicons name="create-outline" size={18} color="#ffffff" />
              </View>
              <View style={styles.aiTextContainer}>
              <Text style={styles.aiButtonTitle}>
  {t('workout.editPlan')}
</Text>

<Text style={styles.aiButtonSubtitle}>
  {t('workout.modifyExercises')}
</Text>

              </View>
              <Ionicons name="chevron-forward" size={16} color="#ffb300" />
            </View>
          </TouchableOpacity>

          {!isCustomPlan && (
            <TouchableOpacity style={[styles.aiButton, { marginTop: 12 }]} onPress={() => setShowAIModal(true)} activeOpacity={0.8}>
              <View style={styles.aiButtonContent}>
                <View style={styles.aiIconContainer}>
                  <Ionicons name="sparkles" size={18} color="#ffffff" />
                </View>
                <View style={styles.aiTextContainer}>
                <Text style={styles.aiButtonTitle}>
  {t('ai.adaptButtonTitle')}
</Text>

<Text style={styles.aiButtonSubtitle}>
  {t('ai.adaptButtonSubtitle')}
</Text>

                </View>
                <Ionicons name="chevron-forward" size={16} color="#ffb300" />
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.shareButton} onPress={handleSharePlan} activeOpacity={0.8}>
            <View style={styles.shareButtonContent}>
              <Ionicons name="share-social" size={18} color="#ffb300" />
              <Text style={styles.shareButtonText}>{str(t('workout.shareWithFriend'), 'Compartir')}</Text>
            </View>
          </TouchableOpacity>

          {!!str(plan.description) && <Text style={styles.planDescription}>{str(plan.description)}</Text>}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#ffb300" />
            <Text style={styles.statValue}>{safePlanData.duration_weeks}</Text>
            <Text style={styles.statLabel}>Semanas</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="fitness-outline" size={24} color="#ffb300" />
            <Text style={styles.statValue}>{safePlanData.days_per_week}</Text>
            <Text style={styles.statLabel}>{str(t('workout.daysPerWeekLabel'), 'Días/semana')}</Text>
          </View>

          {!isCustomPlan && (
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={24} color="#ffb300" />
              <Text style={styles.statValue}>{minPerSession}</Text>
              <Text style={styles.statLabel}>{str(t('workout.minPerSessionLabel'), 'Min/sesión')}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
        <Text style={styles.sectionTitle}>
  {t('workout.weeklyStructure')}
</Text>
          <Text style={styles.sectionSubtitle}>{str(t('workout.tapDayForDetails'), 'Tocá un día para ver detalles')}</Text>

          {safePlanData.multi_week_structure.length > 0 ? (
            <>
              {safePlanData.multi_week_structure.length > 1 && (
                <View style={styles.weekNavigation}>
                  <TouchableOpacity
                    style={[styles.weekNavButton, currentWeekIndex === 0 && styles.weekNavButtonDisabled]}
                    onPress={() => setCurrentWeekIndex((v) => Math.max(0, v - 1))}
                    disabled={currentWeekIndex === 0}
                  >
                    <Ionicons name="chevron-back" size={24} color={currentWeekIndex === 0 ? '#555' : '#ffb300'} />
                  </TouchableOpacity>

                  <View style={styles.weekIndicator}>
                    <Text style={styles.weekIndicatorText}>
                      Semana {currentWeekIndex + 1} de {safePlanData.multi_week_structure.length}
                    </Text>
                    {!!plan.is_active && !!str(plan.activated_at) && (
                     <Text style={styles.weekIndicatorSubtext}>
                     {currentWeekIndex === calculateCurrentWeekIndex(str(plan.activated_at), safePlanData.duration_weeks)
                       ? t('workout.weekIndicator.current')
                       : currentWeekIndex < calculateCurrentWeekIndex(str(plan.activated_at), safePlanData.duration_weeks)
                         ? t('workout.weekIndicator.completed')
                         : t('workout.weekIndicator.next')}
                   </Text>
                   
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.weekNavButton,
                      currentWeekIndex >= safePlanData.multi_week_structure.length - 1 && styles.weekNavButtonDisabled,
                    ]}
                    onPress={() => setCurrentWeekIndex((v) => Math.min(safePlanData.multi_week_structure.length - 1, v + 1))}
                    disabled={currentWeekIndex >= safePlanData.multi_week_structure.length - 1}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color={currentWeekIndex >= safePlanData.multi_week_structure.length - 1 ? '#555' : '#ffb300'}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {(() => {
                const week = safePlanData.multi_week_structure[currentWeekIndex];
                if (!week) return null;

                const weekNumber = toNumber(week.week_number, currentWeekIndex + 1);

                return (
                  <View key={currentWeekIndex} style={styles.weekContainer}>
                    {safePlanData.multi_week_structure.length === 1 && (
                      <Text style={styles.weekTitle}>Semana {weekNumber}</Text>
                    )}

                    {(week.days || []).map((day, dayIndex) => {
                      const dayKey = day.day || `week_${weekNumber}_day_${dayIndex + 1}`;
                      const isCompleted = completedDays.has(dayKey);

                      let dayTitle = str(day.day).trim();
                      if (!dayTitle) dayTitle = `Día ${dayIndex + 1}`;
                      if (!/^Día\s*\d+/i.test(dayTitle)) dayTitle = `Día ${dayIndex + 1}`;

                      const safeDay = {
                        day: dayTitle,
                        duration: toNumber(day.duration, 45),
                        focus: str(day.focus, str(t('workout.generalTraining'), 'Entrenamiento general')),
                        exercises: Array.isArray(day.exercises) ? day.exercises : [],
                      };

                      return (
                        <TouchableOpacity
                          key={dayIndex}
                          style={[styles.dayCard, isCompleted && styles.dayCardCompleted]}
                          onPress={() => {
                            router.push({
                              pathname: '/(tabs)/workout-day-detail',
                              params: {
                                dayData: JSON.stringify(safeDay),
                                planName: str(plan.plan_name, 'Plan'),
                                planId: String(plan.id),
                                dayName: dayKey,
                                isCustomPlan: isCustomPlan ? 'true' : 'false',
                              },
                            } as any);
                          }}
                          activeOpacity={0.7}
                        >
                          {isCompleted && <View style={styles.completedSideBar} />}

                          <View style={styles.dayHeader}>
                            <View style={styles.dayTitleContainer}>
                              <Text style={styles.dayTitle}>{safeDay.day}</Text>
                              {isCompleted && (
                                <View style={styles.completedBadge}>
                                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                                  <Text style={styles.completedBadgeText}>
  {t('workout.completed')}
</Text>
                                </View>
                              )}
                            </View>

                            {!isCustomPlan && (
                              <View style={styles.dayDuration}>
                                <Ionicons name="time-outline" size={14} color="#ffb300" />
                                <Text style={styles.dayDurationText}>{safeDay.duration} min</Text>
                              </View>
                            )}
                          </View>

                          <Text style={styles.dayFocus}>{safeDay.focus}</Text>

                          <View style={styles.exercisesContainer}>
                            <Text style={styles.exercisesTitle}>Ejercicios ({safeDay.exercises.length}):</Text>
                            <View style={styles.exercisesList}>
                              {safeDay.exercises.map((exercise: WorkoutExercise, idx: number) => {
                                const name = typeof exercise === 'string' ? exercise : str(exercise.name, 'Ejercicio');
                                return (
                                  <View key={idx} style={styles.exercisePreviewItem}>
                                    <Ionicons name="checkmark-circle" size={14} color="#ffb300" />
                                    <Text style={styles.exercisePreviewText}>{name}</Text>
                                  </View>
                                );
                              })}
                            </View>
                          </View>

                          <View style={styles.viewDetailsButton}>
                          <Text style={styles.viewDetailsText}>
  {t('workout.viewFullDetails')}
</Text>
                            <Ionicons name="chevron-forward" size={16} color="#ffb300" />
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })()}
            </>
          ) : (
            (safePlanData.weekly_structure || []).map((day, index) => {
              const dayKey = day.day || `day_${index + 1}`;
              const isCompleted = completedDays.has(dayKey);

              let dayTitle = str(day.day).trim();
              if (!dayTitle) dayTitle = `Día ${index + 1}`;
              if (!/^Día\s*\d+/i.test(dayTitle)) dayTitle = `Día ${index + 1}`;

              const safeDay = {
                day: dayTitle,
                duration: toNumber(day.duration, 45),
                focus: str(day.focus, str(t('workout.generalTraining'), 'Entrenamiento general')),
                exercises: Array.isArray(day.exercises) ? day.exercises : [],
              };

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.dayCard, isCompleted && styles.dayCardCompleted]}
                  onPress={() => {
                    router.push({
                      pathname: '/(tabs)/workout-day-detail',
                      params: {
                        dayData: JSON.stringify(safeDay),
                        planName: str(plan.plan_name, 'Plan'),
                        planId: String(plan.id),
                        dayName: dayKey,
                        isCustomPlan: isCustomPlan ? 'true' : 'false',
                      },
                    } as any);
                  }}
                  activeOpacity={0.7}
                >
                  {isCompleted && <View style={styles.completedSideBar} />}

                  <View style={styles.dayHeader}>
                    <View style={styles.dayTitleContainer}>
                      <Text style={styles.dayTitle}>{safeDay.day}</Text>
                      {isCompleted && (
                        <View style={styles.completedBadge}>
                          <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                          <Text style={styles.completedBadgeText}>  {t('workout.completed')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {!isCustomPlan && (
                      <View style={styles.dayDuration}>
                        <Ionicons name="time-outline" size={14} color="#ffb300" />
                        <Text style={styles.dayDurationText}>{safeDay.duration} min</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.dayFocus}>{safeDay.focus}</Text>

                  <View style={styles.exercisesContainer}>
                    <Text style={styles.exercisesTitle}>Ejercicios ({safeDay.exercises.length}):</Text>
                    <View style={styles.exercisesList}>
                      {safeDay.exercises.map((exercise: WorkoutExercise, idx: number) => {
                        const name = typeof exercise === 'string' ? exercise : str(exercise.name, 'Ejercicio');
                        return (
                          <View key={idx} style={styles.exercisePreviewItem}>
                            <Ionicons name="checkmark-circle" size={14} color="#ffb300" />
                            <Text style={styles.exercisePreviewText}>{name}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.viewDetailsButton}>
                    <Text style={styles.viewDetailsText}>{t('workout.viewFullDetails')}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#ffb300" />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.section}>
        <Text style={styles.sectionTitle}>
  {t('workout.keyPrinciples')}
</Text>
          <View style={styles.principlesContainer}>
            {safePlanData.key_principles.map((principle, index) => (
              <View key={index} style={styles.principleItem}>
                <Ionicons name="bulb" size={16} color="#FFD700" />
                <Text style={styles.principleText}>{principle}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{str(t('workout.progressionTitle'), 'Progresión')}</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>{safePlanData.progression}</Text>
          </View>
        </View>

        <View style={styles.section}>
        <Text style={styles.sectionTitle}>
  {t('workout.recommendations')}
</Text>
          <View style={styles.recommendationsContainer}>
            {safePlanData.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons name="star" size={16} color="#ffb300" />
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, !!plan.is_active ? styles.deactivateButton : styles.activateButton]}
            onPress={handleToggleActive}
          >
            <Ionicons name={!!plan.is_active ? 'pause-circle' : 'play-circle'} size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>{!!plan.is_active ? 'Desactivar Plan' : 'Activar Plan'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeletePlan}>
            <Ionicons name="trash" size={20} color="#ffffff" />
            <Text style={styles.deleteButtonText}>
  {t('workout.deletePlan')}
</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.creationDate}>
          Creado el{' '}
          {new Date(dateValue(plan.created_at)).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
      </ScrollView>

      <AIWorkoutAdaptationModal
        visible={showAIModal}
        onClose={() => setShowAIModal(false)}
        onSuccess={(adaptedPlan: any) => {
          const normalized = normalizePlanRow(adaptedPlan as WorkoutPlanRow);
          setPlan(normalized);
          setShowAIModal(false);

          Alert.alert(
            t('workout.planAdaptedTitle'),
            t('workout.planAdaptedMessage'),
            [{ text: t('common.ok'), style: 'default' }],
          );
          
        }}
        workoutPlan={plan}
        userId={user?.id || ''}
      />

      <FriendSelectionModal
        visible={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setShareError(null);
        }}
        friends={friends}
        onSelectFriend={handleSelectFriend}
        title={`Compartir "${str(plan.plan_name, 'Entrenamiento')}"`}
      />

      <ConfirmModal
        visible={showShareSuccess}
        onClose={() => setShowShareSuccess(false)}
        title={str(t('workoutPlan.workoutShared'), 'Listo')}
        message={str(t('workoutPlan.sharedWithFriend'), 'Compartido')}
        confirmText={str(t('common.ok'), 'OK')}
        cancelText=""
        onConfirm={() => setShowShareSuccess(false)}
      />

      <ConfirmModal
        visible={!!shareError}
        onClose={() => setShareError(null)}
        title={str(t('workoutPlan.errorSharing'), 'Error')}
        message={shareError || str(t('chat.couldNotShare'), 'No se pudo compartir')}
        confirmText={str(t('common.ok'), 'OK')}
        cancelText=""
        onConfirm={() => setShareError(null)}
      />
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
    backgroundColor: '#ffb300',
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
    backgroundColor: '#ffb300',
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
  shareButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  shareButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  shareButtonText: {
    color: '#ffb300',
    fontSize: 15,
    fontWeight: '600',
  },
  aiButton: {
    backgroundColor: '#ffb300',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#ffb300',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  aiButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  aiIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiTextContainer: {
    flex: 1,
  },
  aiButtonTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  aiButtonSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
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
    borderColor: '#ffb300',
    position: 'relative',
    overflow: 'hidden',
  },
  dayCardCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
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
    color: '#ffb300',
    marginLeft: 4,
    fontWeight: '600',
  },
  dayFocus: {
    fontSize: 15,
    color: '#ffb300',
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
    color: '#ffb300',
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
    color: '#ffb300',
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
    color: '#ffb300',
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
    backgroundColor: '#ffb300',
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
  emptyText: {
    color: '#888888',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  weekContainer: {
    marginBottom: 24,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffb300',
    marginBottom: 12,
    paddingLeft: 4,
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  weekNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  weekNavButtonDisabled: {
    opacity: 0.3,
  },
  weekIndicator: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  weekIndicatorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  weekIndicatorSubtext: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
});
