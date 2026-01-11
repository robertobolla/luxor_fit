import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../../src/services/supabase';
import {
  getHealthDataForDate,
  requestHealthPermissions,
  hasHealthPermissions,
  resetPermissionsCache,
} from '@/services/healthService';
import {
  getExerciseDaysThisWeek,
  getGymDaysThisWeek,
  getExerciseDaysDatesThisWeek,
  getGymDaysDatesThisWeek,
} from '@/services/exerciseService';
import DashboardCustomizationModal from '@/components/DashboardCustomizationModal';
import { DashboardConfig, MetricType, AVAILABLE_METRICS, PRESET_PRIORITIES } from '@/types/dashboard';
import { loadDashboardConfig } from '@/services/dashboardPreferences';
import {
  getBodyMetricsHistory,
  getProgressComparison,
  getProgressToGoals,
} from '@/services/progressService';
import { useUnitsStore, conversions } from '@/store/unitsStore';
import {
  BodyMetricsChart,
  ProgressComparisonCard,
  ProgressIndicator,
} from '@/components/ProgressCharts';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { useLoadingState } from '@/hooks/useLoadingState';
import { EmptyProgress } from '@/components/EmptyStates';
import { SkeletonProgress } from '@/components/SkeletonLoaders';
import { useTutorial } from '@/contexts/TutorialContext';
import { HelpModal } from '@/components/HelpModal';
import { TutorialTooltip } from '@/components/TutorialTooltip';

const { width } = Dimensions.get('window');

// ✅ FIX #1 (errores "never" en supabase): si no tenés Database types, TS infiere payload como never.
// Solución rápida: castear el cliente a any dentro de este archivo.
const sb = supabase as any;

// ✅ FIX #2 (MetricType no incluye 'gym'): extendemos el tipo localmente para que el archivo compile.
type MetricTypeExtended = MetricType | 'gym';

// Componente para círculos de progreso
function ProgressCircle({
  size,
  strokeWidth,
  progress,
  color,
  icon,
  iconSize = 40,
}: {
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
  icon: any;
  iconSize?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressOffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {/* Círculo de fondo */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2a2a2a"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Círculo de progreso */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute' }}>
        <Ionicons name={icon} size={iconSize} color={color} />
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const { weightUnit, distanceUnit } = useUnitsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig | null>(null);
  const { isLoading: isCheckingOnboarding, setLoading: setIsCheckingOnboarding, executeAsync } =
    useLoadingState(true);

  // Tutorial states
  const {
    showHelpModal,
    setShowHelpModal,
    shouldShowTooltip,
    completeTutorial,
    markTooltipShown,
  } = useTutorial();

  const [showMetricsTooltips, setShowMetricsTooltips] = useState(false);
  const [progressData, setProgressData] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [progressGoals, setProgressGoals] = useState<any>(null);
  const [comparisonPeriod, setComparisonPeriod] = useState<'week' | 'month'>('week');

  // Datos de ejemplo
  const [stats, setStats] = useState({
    steps: 0,
    stepsGoal: 10000,
    distance: 0,
    distanceGoal: 10,
    calories: 217,
    caloriesGoal: 2000,
    sleep: 0,
    exerciseDays: 0,
    exerciseDaysGoal: 5,
    gymDays: 0,
    gymDaysGoal: 3,
    weight: 78,
    glucose: 0,
    mindfulnessDays: 0,
    food: 0,
    water: 0,
    waterGoal: 2000,
  });

  // Estados para los días completados
  const [exerciseCompletedDays, setExerciseCompletedDays] = useState<boolean[]>([
    false, false, false, false, false, false, false,
  ]);
  const [gymCompletedDays, setGymCompletedDays] = useState<boolean[]>([
    false, false, false, false, false, false, false,
  ]);

  // Mostrar tooltips la primera vez
  useEffect(() => {
    if (shouldShowTooltip('METRICS') && user?.id && !isCheckingOnboarding) {
      const timer = setTimeout(() => {
        setShowMetricsTooltips(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [shouldShowTooltip, user, isCheckingOnboarding]);

  // Verificar si el usuario completó el onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setIsCheckingOnboarding(false);
        return;
      }

      await executeAsync(async () => {
        const { data, error } = await sb
          .from('user_profiles')
          .select('id, name, username')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error al verificar onboarding:', error);
        }

        // ✅ FIX (name/username "does not exist on type never")
        const hasProfile = !!data && !!data?.name && !!data?.username;

        if (!hasProfile) {
          router.replace('/onboarding');
        }
      }, { showError: false });

      setIsCheckingOnboarding(false);
    };

    checkOnboarding();
  }, [user, executeAsync, setIsCheckingOnboarding]);

  // Cargar configuración del dashboard
  useEffect(() => {
    if (isCheckingOnboarding) return;

    const loadConfig = async () => {
      const config = await loadDashboardConfig();
      console.log('📊 Config cargada:', config);
      setDashboardConfig(config);
    };
    loadConfig();
  }, [showCustomizationModal, isCheckingOnboarding]);

  // Bandera para controlar si ya se intentó solicitar permisos en esta sesión
  const [permissionsChecked, setPermissionsChecked] = useState(false);

  // Solicitar permisos al cargar por primera vez (solo una vez por sesión)
  useEffect(() => {
    if (isCheckingOnboarding || permissionsChecked) return;

    const initializeHealthData = async () => {
      const alreadyHasPermissions = await hasHealthPermissions();

      if (!alreadyHasPermissions) {
        const granted = await requestHealthPermissions();

        if (!granted) {
          setTimeout(async () => {
            const healthData = await getHealthDataForDate(new Date());

            // ✅ FIX (activeEnergyBurned no existe en HealthData)
            const activeEnergy = (healthData as any)?.activeEnergyBurned ?? 0;

            const hasData =
              healthData &&
              ((healthData as any).steps > 0 ||
                (healthData as any).distance > 0 ||
                activeEnergy > 0);

            if (!hasData) {
              const platformMessage =
                Platform.OS === 'ios'
                  ? t('progress.healthPermissions.iosSteps')
                  : t('progress.healthPermissions.androidSteps');

              Alert.alert(
                t('progress.healthPermissions.title'),
                t('progress.healthPermissions.message') + '\n\n' + platformMessage,
                [
                  { text: t('common.later'), style: 'cancel' },
                  {
                    text: t('common.tryAgain'),
                    onPress: async () => {
                      resetPermissionsCache();
                      setPermissionsChecked(false);
                      await requestHealthPermissions();
                    },
                  },
                ]
              );
            } else {
              console.log('✅ Datos de salud disponibles, permisos funcionando correctamente');
            }
          }, 1000);
        } else {
          console.log('✅ Permisos de salud otorgados correctamente');
        }
      } else {
        console.log('✅ Ya tiene permisos de salud');
      }

      setPermissionsChecked(true);
    };

    initializeHealthData();
  }, [isCheckingOnboarding, permissionsChecked, t]);

  // Cargar datos de salud cuando cambia la fecha
  useEffect(() => {
    if (isCheckingOnboarding) return;
    loadHealthData();
    loadProgressData();
  }, [selectedDate, isCheckingOnboarding]);

  // Cargar datos de progreso
  useEffect(() => {
    if (isCheckingOnboarding || !user?.id) return;
    loadProgressData();
  }, [isCheckingOnboarding, user, comparisonPeriod]);

  // Recargar datos cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      if (!isCheckingOnboarding && user?.id) {
        loadHealthData();
      }
    }, [isCheckingOnboarding, user])
  );

  const loadHealthData = async () => {
    try {
      if (!user?.id) return;

      const healthData = await getHealthDataForDate(selectedDate);

      const exerciseDays = await getExerciseDaysThisWeek(user.id);
      const exerciseDates = await getExerciseDaysDatesThisWeek(user.id);

      const gymData = await getGymDaysThisWeek(user.id);
      const gymDates = await getGymDaysDatesThisWeek(user.id);

      let userWeight = 0;
      try {
        const { data: profileData } = await sb
          .from('user_profiles')
          .select('weight')
          .eq('user_id', user.id)
          .maybeSingle();

        // ✅ FIX (weight "does not exist on type never")
        userWeight = profileData?.weight || 0;
      } catch (error) {
        console.error('Error al obtener peso del perfil:', error);
      }

      const exerciseDaysArray = [false, false, false, false, false, false, false];
      exerciseDates.forEach((dateStr: string) => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        exerciseDaysArray[dayOfWeek] = true;
      });

      const gymDaysArray = [false, false, false, false, false, false, false];
      gymDates.forEach((dateStr: string) => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        gymDaysArray[dayOfWeek] = true;
      });

      setExerciseCompletedDays(exerciseDaysArray);
      setGymCompletedDays(gymDaysArray);

      setStats({
        steps: Math.round((healthData as any).steps || 0),
        stepsGoal: 10000,
        distance: (healthData as any).distance || 0,
        distanceGoal: 10,
        calories: Math.round((healthData as any).calories || 0),
        caloriesGoal: 2000,
        sleep: (healthData as any).sleep || 0,
        exerciseDays: exerciseDays,
        exerciseDaysGoal: 5,
        gymDays: (gymData as any).days ?? 0,
        gymDaysGoal: (gymData as any).goal ?? 3,
        weight: userWeight,
        glucose: (healthData as any).glucose || 0,
        mindfulnessDays: 2,
        food: (healthData as any).food || 0,
        water: (healthData as any).water || 0,
        waterGoal: 2000,
      });
    } catch (error) {
      console.error('Error cargando datos de salud:', error);
      Alert.alert(t('common.error'), t('progress.healthDataLoadError'));
    }
  };

  const loadProgressData = async () => {
    if (!user?.id) return;

    try {
      const [bodyMetrics, comparisonData, goals] = await Promise.all([
        getBodyMetricsHistory(user.id, 30),
        getProgressComparison(user.id, comparisonPeriod),
        getProgressToGoals(user.id),
      ]);

      setProgressData(bodyMetrics);
      setComparison(comparisonData);
      setProgressGoals(goals);
    } catch (error) {
      console.error('Error loading progress data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadHealthData(), loadProgressData()]);
    setRefreshing(false);
  };

  const goToPreviousDay = () => {
    const previousDay = new Date(selectedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    setSelectedDate(previousDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    if (nextDay <= new Date()) {
      setSelectedDate(nextDay);
    }
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const formatDate = (date: Date) => {
    if (isToday) return t('common.today');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return t('common.yesterday');

    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    };

    return date.toLocaleDateString(t('common.locale'), options);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.goodMorning').replace(/^[^\s]+ /, '');
    if (hour < 18) return t('home.goodAfternoon').replace(/^[^\s]+ /, '');
    return t('home.goodEvening').replace(/^[^\s]+ /, '');
  };

  const handleSaveCustomization = async (config: DashboardConfig) => {
    setDashboardConfig(config);
    await loadHealthData();
  };

  const getPriorityMetrics = (): MetricTypeExtended[] => {
    if (!dashboardConfig) return ['steps', 'distance', 'calories'] as MetricTypeExtended[];

    const { selectedPriority, customPriorities } = dashboardConfig;

    const customPriority = customPriorities.find((p) => p.id === selectedPriority);
    if (customPriority) return (customPriority.metrics.slice(0, 3) as any) as MetricTypeExtended[];

    const preset = PRESET_PRIORITIES.find((p) => p.id === selectedPriority);
    if (preset) return (preset.metrics.slice(0, 3) as any) as MetricTypeExtended[];

    return ['steps', 'distance', 'calories'] as MetricTypeExtended[];
  };

  const getMetricConfig = (metricType: MetricTypeExtended) => {
    // ✅ FIX (compat con 'gym' aunque no esté en MetricType)
    return (AVAILABLE_METRICS as any).find((m: any) => m.id === metricType) || AVAILABLE_METRICS[0];
  };

  const getMetricData = (metricType: MetricTypeExtended) => {
    switch (metricType) {
      case 'steps':
        return {
          value: stats.steps,
          goal: stats.stepsGoal,
          displayValue: stats.steps.toLocaleString(t('common.locale')),
          unit: '',
        };
      case 'distance':
        const distanceValue = distanceUnit === 'mi' ? conversions.kmToMi(stats.distance) : stats.distance;
        const distanceGoalValue = distanceUnit === 'mi' ? conversions.kmToMi(stats.distanceGoal) : stats.distanceGoal;
        return {
          value: distanceValue,
          goal: distanceGoalValue,
          displayValue: distanceValue.toFixed(1),
          unit: distanceUnit === 'mi' ? 'mi' : 'km',
        };
      case 'calories':
        return {
          value: stats.calories,
          goal: stats.caloriesGoal,
          displayValue: stats.calories.toLocaleString(t('common.locale')),
          unit: 'kcal',
        };
      case 'sleep':
        return {
          value: stats.sleep,
          goal: 8,
          displayValue: stats.sleep > 0 ? stats.sleep.toFixed(1) : '0',
          unit: 'h',
        };
      case 'exercise':
        return {
          value: stats.exerciseDays,
          goal: stats.exerciseDaysGoal,
          displayValue: stats.exerciseDays.toString(),
          unit: t('progress.daysUnit'),
        };
      case 'gym':
        return {
          value: stats.gymDays,
          goal: stats.gymDaysGoal,
          displayValue: stats.gymDays.toString(),
          unit: t('progress.daysUnit'),
        };
      case 'weight':
        const weightValue = weightUnit === 'lb' ? conversions.kgToLb(stats.weight) : stats.weight;
        const weightGoalValue = weightUnit === 'lb' ? conversions.kgToLb(80) : 80;
        return {
          value: weightValue,
          goal: weightGoalValue,
          displayValue: weightValue ? weightValue.toFixed(1) : '0',
          unit: weightUnit === 'lb' ? 'lb' : 'kg',
        };
      case 'water':
        return {
          value: stats.water,
          goal: stats.waterGoal,
          displayValue: stats.water.toString(),
          unit: 'ml',
        };
      default:
        return { value: 0, goal: 100, displayValue: '0', unit: '' };
    }
  };

  const priorityMetrics = getPriorityMetrics();
  const mainMetric = priorityMetrics[0];
  const secondaryMetrics = priorityMetrics.slice(1, 3);

  const mainMetricConfig = getMetricConfig(mainMetric);
  const mainMetricData = getMetricData(mainMetric);

  const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  if (isCheckingOnboarding) {
    return (
      <View style={styles.container}>
        <LoadingOverlay visible={true} message={t('progress.verifyingProfile')} fullScreen />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousDay}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <TouchableOpacity
            onPress={() => {
              if (!isToday) setSelectedDate(new Date());
            }}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Text style={styles.headerSubtitle}>{formatDate(selectedDate)}</Text>
            {!isToday && (
              <Ionicons name="calendar" size={16} color="#ffb300" style={{ marginLeft: 8 }} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          {!isToday ? (
            <TouchableOpacity onPress={goToNextDay}>
              <Ionicons name="chevron-forward" size={28} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.headerIcon} onPress={() => setShowCustomizationModal(true)}>
                <Ionicons name="create-outline" size={24} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerIcon, { marginLeft: 8 }]}
                onPress={() => setShowHelpModal(true)}
              >
                <Ionicons name="help-circle-outline" size={24} color="#ffb300" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffb300" />
        }
      >
        {/* Círculo Principal - Métrica prioritaria */}
        <View style={styles.mainCircleContainer}>
          <ProgressCircle
            size={200}
            strokeWidth={12}
            progress={(mainMetricData.value / mainMetricData.goal) * 100}
            color="#ffb300"
            icon={(mainMetricConfig as any).icon as any}
            iconSize={60}
          />
          <Text style={styles.mainNumber}>
            {mainMetricData.displayValue}
            {mainMetricData.unit && <Text style={styles.mainUnit}> {mainMetricData.unit}</Text>}
          </Text>
          <Text style={styles.mainLabel}>{(mainMetricConfig as any).name}</Text>
        </View>

        {/* Círculos Secundarios */}
        <View style={styles.secondaryCirclesContainer}>
          {secondaryMetrics.map((metricType) => {
            const metricConfig = getMetricConfig(metricType);
            const metricData = getMetricData(metricType);

            return (
              <View key={String(metricType)} style={styles.secondaryCircle}>
                <ProgressCircle
                  size={120}
                  strokeWidth={8}
                  progress={(metricData.value / metricData.goal) * 100}
                  color={(metricConfig as any).color}
                  icon={(metricConfig as any).icon as any}
                  iconSize={32}
                />
                <Text style={styles.secondaryNumber}>{metricData.displayValue}</Text>
                <Text style={styles.secondaryLabel}>{metricData.unit || (metricConfig as any).name}</Text>
              </View>
            );
          })}
        </View>

        {/* Sección de Recuperación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('progress.recovery')}</Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('progress.sleepDuration')}</Text>
                <Text style={styles.cardValue}>
                  {stats.sleep > 0 ? `${stats.sleep.toFixed(1)} h` : t('progress.noData')}
                </Text>
                <Text style={styles.cardSubtitle}>{formatDate(selectedDate)}</Text>
              </View>
              <View style={styles.iconCircle}>
                <Ionicons name="moon" size={22} color="#ffb300" />
              </View>
            </View>
          </View>
        </View>

        {/* Sección de Actividad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('progress.activity')}</Text>

          <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/exercise-detail')}>
            <Text style={styles.cardTitle}>{t('progress.exerciseDays')}</Text>
            <View style={styles.exerciseDaysContainer}>
              <View style={styles.exerciseDaysLeft}>
                <Text style={styles.exerciseDaysNumber}>
                  {stats.exerciseDays}{' '}
                  <Text style={styles.exerciseDaysGoal}>
                    {t('progress.of')} {stats.exerciseDaysGoal}
                  </Text>
                </Text>
                <Text style={styles.exerciseDaysLabel}>{t('progress.thisWeek')}</Text>
              </View>
              <View style={styles.weekDaysContainer}>
                {weekDays.map((day, index) => (
                  <View key={index} style={styles.dayColumn}>
                    <View style={[styles.dayBar, exerciseCompletedDays[index] && styles.dayBarCompleted]} />
                    <Text style={styles.dayLabel}>{day}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => router.push('/gym-detail')}>
            <Text style={styles.cardTitle}>{t('progress.gymDays')}</Text>
            <View style={styles.exerciseDaysContainer}>
              <View style={styles.exerciseDaysLeft}>
                <Text style={styles.exerciseDaysNumber}>
                  {stats.gymDays}{' '}
                  <Text style={styles.exerciseDaysGoal}>
                    {t('progress.of')} {stats.gymDaysGoal}
                  </Text>
                </Text>
                <Text style={styles.exerciseDaysLabel}>{t('progress.thisWeek')}</Text>
              </View>
              <View style={styles.weekDaysContainer}>
                {weekDays.map((day, index) => (
                  <View key={index} style={styles.dayColumn}>
                    <View style={[styles.dayBar, gymCompletedDays[index] && styles.dayBarCompleted]} />
                    <Text style={styles.dayLabel}>{day}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/steps-detail')}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('progress.steps')}</Text>
                <Text style={styles.cardValue}>{stats.steps.toLocaleString(t('common.locale'))}</Text>
                <Text style={styles.cardSubtitle}>{formatDate(selectedDate)}</Text>
              </View>
              <ProgressCircle
                size={70}
                strokeWidth={5}
                progress={(stats.steps / stats.stepsGoal) * 100}
                color="#ffb300"
                icon="footsteps"
                iconSize={20}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/distance-detail')}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('progress.distance')}</Text>
                <Text style={styles.cardValue}>
                  {(distanceUnit === 'mi' ? conversions.kmToMi(stats.distance) : stats.distance).toFixed(1)} {distanceUnit === 'mi' ? 'mi' : 'km'}
                </Text>
                <Text style={styles.cardSubtitle}>{formatDate(selectedDate)}</Text>
              </View>
              <ProgressCircle
                size={70}
                strokeWidth={5}
                progress={(stats.distance / stats.distanceGoal) * 100}
                color="#ffb300"
                icon="location"
                iconSize={20}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/calories-detail')}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('progress.caloriesBurned')}</Text>
                <Text style={styles.cardValue}>
                  {stats.calories.toLocaleString(t('common.locale'))} kcal
                </Text>
                <Text style={styles.cardSubtitle}>{formatDate(selectedDate)}</Text>
              </View>
              <ProgressCircle
                size={70}
                strokeWidth={5}
                progress={(stats.calories / stats.caloriesGoal) * 100}
                color="#ffb300"
                icon="flame"
                iconSize={20}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/nutrition' as any)}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('nutrition.title')}</Text>
                <Text style={styles.cardValue}>{t('nutrition.mealPlan')}</Text>
                <Text style={styles.cardSubtitle}>{t('dashboard.macrosWaterLessons')}</Text>
              </View>
              <View style={styles.iconCircle}>
                <Ionicons name="restaurant" size={22} color="#ffb300" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sección de Salud */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.section.health')}</Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('dashboard.weight')}</Text>
                <Text style={styles.cardValue}>
                  {stats.weight 
                    ? `${(weightUnit === 'lb' ? conversions.kgToLb(stats.weight) : stats.weight).toFixed(1)} ${weightUnit === 'lb' ? 'lb' : 'kg'}` 
                    : t('progress.noData')}
                </Text>
                <Text style={styles.cardSubtitle}>{formatDate(selectedDate)}</Text>
              </View>
              <View style={styles.iconCircle}>
                <Ionicons name="fitness" size={22} color="#ffb300" />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('dashboard.glucose')}</Text>
                <Text style={styles.cardValue}>
                  {stats.glucose ? `${stats.glucose} mg/dL` : t('progress.noData')}
                </Text>
                <Text style={styles.cardSubtitle}>{formatDate(selectedDate)}</Text>
              </View>
              <View style={styles.iconCircle}>
                <Ionicons name="water" size={22} color="#ffb300" />
              </View>
            </View>
          </View>
        </View>

        {/* Sección de Estrés y mindfulness */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.section.stressAndMindfulness')}</Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('dashboard.mindfulnessDays')}</Text>
                <Text style={styles.cardValue}>{t('dashboard.start')}</Text>
                <Text style={styles.cardSubtitle}>{t('dashboard.tapToConfigure')}</Text>
              </View>
              <View style={styles.iconCircle}>
                <Ionicons name="flower" size={22} color="#ffb300" />
              </View>
            </View>
          </View>
        </View>

        {/* Sección de Nutrición */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.section.nutrition')}</Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('dashboard.food')}</Text>
                <Text style={styles.cardValue}>
                  {stats.food
                    ? `${stats.food.toLocaleString(t('common.locale'))} kcal`
                    : t('progress.noData')}
                </Text>
                <Text style={styles.cardSubtitle}>{formatDate(selectedDate)}</Text>
              </View>
              <View style={styles.iconCircle}>
                <Ionicons name="restaurant" size={22} color="#ffb300" />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t('dashboard.water')}</Text>
                <Text style={styles.cardValue}>
                  {stats.water ? `${stats.water} ml` : t('progress.noData')}
                </Text>
                <Text style={styles.cardSubtitle}>{formatDate(selectedDate)}</Text>
              </View>
              <ProgressCircle
                size={70}
                strokeWidth={5}
                progress={(stats.water / stats.waterGoal) * 100}
                color="#ffb300"
                icon="water"
                iconSize={20}
              />
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Modal de personalización */}
      <DashboardCustomizationModal
        visible={showCustomizationModal}
        onClose={() => setShowCustomizationModal(false)}
        onSave={handleSaveCustomization}
      />

      {/* Modal de ayuda */}
      <HelpModal visible={showHelpModal} onClose={() => setShowHelpModal(false)} />

      {/* Tooltips de tutorial */}
      {showMetricsTooltips && (
        <TutorialTooltip
          visible={showMetricsTooltips}
          steps={[
            {
              element: <View />,
              title: t('tutorial.metrics.title1'),
              content: t('tutorial.metrics.content1'),
              placement: 'center',
            },
            {
              element: <View />,
              title: t('tutorial.metrics.title2'),
              content: t('tutorial.metrics.content2'),
              placement: 'center',
            },
            {
              element: <View />,
              title: t('tutorial.metrics.title3'),
              content: t('tutorial.metrics.content3'),
              placement: 'center',
            },
            {
              element: <View />,
              title: t('tutorial.metrics.title4'),
              content: t('tutorial.metrics.content4'),
              placement: 'center',
            },
          ]}
          onComplete={() => {
            setShowMetricsTooltips(false);
            completeTutorial('METRICS');
            markTooltipShown('METRICS');
          }}
          onSkip={() => {
            setShowMetricsTooltips(false);
            completeTutorial('METRICS');
            markTooltipShown('METRICS');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1a1a1a',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerSubtitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  progressPhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffb300',
    gap: 12,
  },
  progressPhotosTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  progressPhotosSubtitle: { fontSize: 12, color: '#ccc' },
  mainCircleContainer: { alignItems: 'center', paddingVertical: 40 },
  mainNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
  },
  mainUnit: { fontSize: 32, fontWeight: 'normal', color: '#999' },
  mainLabel: { fontSize: 18, color: '#999', marginTop: 4 },
  secondaryCirclesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    marginBottom: 32,
  },
  secondaryCircle: { alignItems: 'center' },
  secondaryNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  secondaryLabel: { fontSize: 14, color: '#999', marginTop: 2 },
  section: { paddingHorizontal: 20, marginBottom: 6 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  periodToggle: { backgroundColor: '#3a3a3a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  periodToggleText: { fontSize: 14, color: '#ffb300', fontWeight: '600' },
  card: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 16, marginBottom: 10, minHeight: 100 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, color: '#ffffff', marginBottom: 6 },
  cardValue: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 2 },
  cardSubtitle: { fontSize: 13, color: '#666' },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#3a3a3a', justifyContent: 'center', alignItems: 'center' },
  exerciseDaysContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  exerciseDaysLeft: { flex: 1 },
  exerciseDaysNumber: { fontSize: 32, fontWeight: 'bold', color: '#ffffff' },
  exerciseDaysGoal: { fontSize: 24, fontWeight: 'normal', color: '#666' },
  exerciseDaysLabel: { fontSize: 13, color: '#666', marginTop: 2 },
  weekDaysContainer: { flexDirection: 'row', gap: 8 },
  dayColumn: { alignItems: 'center' },
  dayBar: { width: 10, height: 40, backgroundColor: '#3a3a3a', borderRadius: 5, marginBottom: 4 },
  dayBarCompleted: { backgroundColor: '#ffb300' },
  dayLabel: { fontSize: 12, color: '#999' },
});
