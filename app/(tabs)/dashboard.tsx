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
  Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser, useAuth } from '@clerk/clerk-expo';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '@/services/supabase';
import { getHealthDataForDate, requestHealthPermissions, hasHealthPermissions, resetPermissionsCache, showHealthDiagnosticsAlert, getHealthDiagnostics, HealthData } from '@/services/healthService';
import { getExerciseDaysThisWeek, getGymDaysThisWeek } from '@/services/exerciseService';
import DashboardCustomizationModal from '@/components/DashboardCustomizationModal';
import WeeklyCheckinModal from '@/components/WeeklyCheckinModal';
import { DashboardConfig, MetricType, AVAILABLE_METRICS, PRESET_PRIORITIES } from '@/types/dashboard';
import { loadDashboardConfig } from '@/services/dashboardPreferences';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { useLoadingState } from '@/hooks/useLoadingState';
import { SkeletonDashboard } from '@/components/SkeletonLoaders';
import { checkIfNeedsWeeklyCheckin, CheckinStatus, shouldShowCheckinReminder, markCheckinReminderShown } from '@/services/weeklyCheckinService';

const { width } = Dimensions.get('window');

// Componente para círculos de progreso
function ProgressCircle({ 
  size, 
  strokeWidth, 
  progress, 
  color, 
  icon, 
  iconSize = 40 
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

export default function DashboardScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(null);
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig | null>(null);
  const { isLoading: isCheckingOnboarding, setLoading: setIsCheckingOnboarding, executeAsync } = useLoadingState(true);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  // Datos de salud
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
  
  // Fuente de datos de salud
  const [healthDataSource, setHealthDataSource] = useState<'apple_health' | 'google_fit' | 'expo_pedometer' | 'none'>('none');

  // Verificar si el usuario completó el onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setIsCheckingOnboarding(false);
        return;
      }

        await executeAsync(async () => {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('id, name, username')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            console.error('Error al verificar onboarding:', error);
          }

          // El onboarding simplificado solo requiere name y username
          // fitness_level se recopila más tarde al generar un plan
          const hasProfile = !!data && !!data.name && !!data.username;

          if (!hasProfile) {
            // Redirigir al onboarding si no tiene perfil
            router.replace('/onboarding');
          }
        }, { showError: false });
    };

    checkOnboarding();
  }, [user]);

  // Cargar configuración del dashboard
  useEffect(() => {
    if (isCheckingOnboarding) return; // Esperar a verificar onboarding
    
    const loadConfig = async () => {
      const config = await loadDashboardConfig();
      console.log('📊 Config cargada:', config);
      setDashboardConfig(config);
    };
    loadConfig();
  }, [showCustomizationModal, isCheckingOnboarding]); // Recargar cuando se cierre el modal

  // Solicitar permisos al cargar por primera vez
  useEffect(() => {
    if (isCheckingOnboarding) return; // Esperar a verificar onboarding
    
    const initializeHealthData = async () => {
      // Primero verificar si ya tiene permisos
      const alreadyHasPermissions = await hasHealthPermissions();
      
      if (!alreadyHasPermissions) {
        // Si no tiene permisos, solicitarlos
        const granted = await requestHealthPermissions();
        if (!granted) {
          const platformMessage = Platform.OS === 'ios' 
            ? 'Ve a Configuración → Salud → Datos de Salud y Apps → Luxor Fitness para otorgar permisos.'
            : 'Asegúrate de tener Google Fit instalado y conectado.';
          
          Alert.alert(
            'Permisos de Salud',
            'Para mostrar tus estadísticas reales (pasos, distancia, calorías), Luxor Fitness necesita acceso a tus datos de salud.\n\n' + platformMessage,
            [
              { text: 'Más tarde', style: 'cancel' },
              { 
                text: 'Intentar de nuevo', 
                onPress: async () => {
                  resetPermissionsCache();
                  await requestHealthPermissions();
                }
              }
            ]
          );
        } else {
          console.log('✅ Permisos de salud otorgados correctamente');
        }
      } else {
        console.log('✅ Ya tiene permisos de salud');
      }
    };
    
    initializeHealthData();
  }, [isCheckingOnboarding]);

  // Cargar datos de salud cuando cambia la fecha
  useEffect(() => {
    if (isCheckingOnboarding) return; // Esperar a verificar onboarding
    loadHealthData();
  }, [selectedDate, isCheckingOnboarding]);

  // Recargar datos cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      if (!isCheckingOnboarding && user?.id) {
        loadHealthData();
        checkWeeklyCheckin();
      }
    }, [isCheckingOnboarding, user])
  );

  // Verificar si necesita hacer check-in semanal
  const checkWeeklyCheckin = async () => {
    if (!user?.id) return;

    try {
      const status = await checkIfNeedsWeeklyCheckin(user.id);
      setCheckinStatus(status);

      // Solo mostrar el modal si:
      // 1. Necesita check-in
      // 2. Estamos viendo "hoy" (no navegando por días pasados)
      // 3. No se ha mostrado el recordatorio esta semana
      const isViewingToday = selectedDate.toDateString() === new Date().toDateString();
      const showReminder = await shouldShowCheckinReminder();

      if (status.needsCheckin && isViewingToday && showReminder) {
        // Mostrar el modal después de un pequeño delay para mejor UX
        setTimeout(() => {
          setShowCheckinModal(true);
          markCheckinReminderShown();
        }, 1500);
      }
    } catch (error) {
      console.error('Error verificando check-in semanal:', error);
    }
  };

  const handleCheckinComplete = async () => {
    // Recargar datos después del check-in
    await loadHealthData();
    
    // Mostrar mensaje de éxito
    Alert.alert(
      '✅ ¡Genial!',
      'Tu check-in se completó exitosamente. Tu plan de nutrición ha sido actualizado.',
      [{ text: 'OK' }]
    );
  };

  const loadHealthData = async () => {
    try {
      if (!user?.id) return;
      
      // Obtener datos de Apple Health, Google Fit o Expo Pedometer
      const healthData = await getHealthDataForDate(selectedDate);
      
      // Guardar la fuente de datos
      setHealthDataSource(healthData.source || 'none');
      
      // Obtener días de ejercicio de la semana actual (incluye ejercicios libres y entrenamientos)
      const exerciseDays = await getExerciseDaysThisWeek(user.id);
      
      // Obtener días de gimnasio de la semana actual (solo entrenamientos completados)
      const gymData = await getGymDaysThisWeek(user.id);
      
      // Cargar foto de perfil
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('profile_photo_url')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profileData?.profile_photo_url) {
        setProfilePhotoUrl(profileData.profile_photo_url);
      } else {
        setProfilePhotoUrl(null);
      }
      
      // Log para debugging
      console.log('📊 Datos de salud obtenidos:', {
        pasos: healthData.steps,
        distancia: healthData.distance,
        calorías: healthData.calories,
        sueño: healthData.sleep,
        fuente: healthData.source,
        fecha: selectedDate.toISOString().split('T')[0],
      });
      
      // Actualizar estados con los datos obtenidos
      setStats({
        steps: Math.round(healthData.steps),
        stepsGoal: 10000,
        distance: healthData.distance,
        distanceGoal: 10,
        calories: Math.round(healthData.calories),
        caloriesGoal: 2000,
        sleep: healthData.sleep,
        exerciseDays: exerciseDays, // Días de ejercicio reales (incluye entrenamientos completados)
        exerciseDaysGoal: 5,
        gymDays: gymData.days, // Días de gimnasio (solo entrenamientos completados)
        gymDaysGoal: gymData.goal, // Meta basada en el plan de entrenamiento activo
        weight: healthData.weight || 78,
        glucose: healthData.glucose || 0,
        mindfulnessDays: 2, // Esto requiere tracking manual
        food: healthData.food || 0,
        water: healthData.water || 0,
        waterGoal: 2000,
      });
    } catch (error) {
      console.error('Error cargando datos de salud:', error);
      setHealthDataSource('none');
    }
  };
  
  // Función para obtener el texto de la fuente de datos
  const getHealthSourceLabel = () => {
    switch (healthDataSource) {
      case 'apple_health':
        return '🍎 Apple Health';
      case 'google_fit':
        return '💚 Google Fit';
      case 'expo_pedometer':
        return '📱 Pedómetro del dispositivo';
      default:
        return '⚠️ Sin fuente de datos';
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHealthData();
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
    // No permitir fechas futuras
    if (nextDay <= new Date()) {
      setSelectedDate(nextDay);
    }
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const formatDate = (date: Date) => {
    if (isToday) return 'Hoy';
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
    
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    };
    return date.toLocaleDateString('es-ES', options);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const handleSaveCustomization = async (config: DashboardConfig) => {
    setDashboardConfig(config);
    // Recargar datos si es necesario
    await loadHealthData();
  };

  // Obtener las métricas prioritarias para mostrar en los círculos
  const getPriorityMetrics = (): MetricType[] => {
    if (!dashboardConfig) {
      return ['steps', 'distance', 'calories']; // Default
    }

    const { selectedPriority, customPriorities } = dashboardConfig;

    // Buscar en prioridades custom primero
    const customPriority = customPriorities.find(p => p.id === selectedPriority);
    if (customPriority) {
      console.log('🎯 Usando prioridad custom:', customPriority.name, customPriority.metrics);
      return customPriority.metrics.slice(0, 3); // Máximo 3 para los círculos
    }

    // Buscar en prioridades preset
    const preset = PRESET_PRIORITIES.find(p => p.id === selectedPriority);
    if (preset) {
      console.log('🎯 Usando prioridad preset:', preset.name, preset.metrics);
      return preset.metrics.slice(0, 3);
    }

    console.log('🎯 Usando métricas por defecto');
    return ['steps', 'distance', 'calories'];
  };

  // Obtener configuración de una métrica
  const getMetricConfig = (metricType: MetricType) => {
    return AVAILABLE_METRICS.find(m => m.id === metricType) || AVAILABLE_METRICS[0];
  };

  // Obtener valor y progreso de una métrica
  const getMetricData = (metricType: MetricType) => {
    switch (metricType) {
      case 'steps':
        return {
          value: stats.steps,
          goal: stats.stepsGoal,
          displayValue: stats.steps.toLocaleString('es-ES'),
          unit: '',
        };
      case 'distance':
        return {
          value: stats.distance,
          goal: stats.distanceGoal,
          displayValue: stats.distance.toFixed(1),
          unit: 'km',
        };
      case 'calories':
        return {
          value: stats.calories,
          goal: stats.caloriesGoal,
          displayValue: stats.calories.toLocaleString('es-ES'),
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
          unit: 'días',
        };
      case 'gym':
        return {
          value: stats.gymDays,
          goal: stats.gymDaysGoal,
          displayValue: stats.gymDays.toString(),
          unit: 'días',
        };
      case 'weight':
        return {
          value: stats.weight,
          goal: 80, // Meta de ejemplo
          displayValue: stats.weight ? stats.weight.toFixed(1) : '0',
          unit: 'kg',
        };
      case 'water':
        return {
          value: stats.water,
          goal: stats.waterGoal,
          displayValue: stats.water.toString(),
          unit: 'ml',
        };
      default:
        return {
          value: 0,
          goal: 100,
          displayValue: '0',
          unit: '',
        };
    }
  };

  const priorityMetrics = getPriorityMetrics();
  const mainMetric = priorityMetrics[0];
  const secondaryMetrics = priorityMetrics.slice(1, 3);

  const mainMetricConfig = getMetricConfig(mainMetric);
  const mainMetricData = getMetricData(mainMetric);

  const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const completedDays = [false, false, false, false, false, true, false]; // Ejemplo

  // Mostrar loading mientras se verifica el onboarding
  if (isCheckingOnboarding) {
    return (
      <View style={styles.container}>
        <LoadingOverlay visible={true} message="Verificando perfil..." fullScreen />
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
          <Text style={styles.headerTitle}>Luxor Fitness</Text>
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
              <TouchableOpacity 
                style={styles.headerIcon}
                onPress={() => setShowCustomizationModal(true)}
              >
                <Ionicons name="create-outline" size={24} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIcon}>
                <Ionicons name="chatbubble-outline" size={24} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerIcon}
                onPress={() => router.push('/(tabs)/profile')}
              >
                {profilePhotoUrl ? (
                  <Image
                    source={{ uri: profilePhotoUrl }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {user?.firstName?.charAt(0) || 'U'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#ffb300"
          />
        }
      >
        {/* Círculo Principal - Métrica prioritaria */}
        <View style={styles.mainCircleContainer}>
          <ProgressCircle
            size={200}
            strokeWidth={12}
            progress={(mainMetricData.value / mainMetricData.goal) * 100}
            color="#ffb300"
            icon={mainMetricConfig.icon as any}
            iconSize={60}
          />
          <Text style={styles.mainNumber}>
            {mainMetricData.displayValue}
            {mainMetricData.unit && <Text style={styles.mainUnit}> {mainMetricData.unit}</Text>}
          </Text>
          <Text style={styles.mainLabel}>{mainMetricConfig.name}</Text>
        </View>

        {/* Círculos Secundarios */}
        <View style={styles.secondaryCirclesContainer}>
          {secondaryMetrics.map((metricType, index) => {
            const metricConfig = getMetricConfig(metricType);
            const metricData = getMetricData(metricType);
            
            return (
              <View key={metricType} style={styles.secondaryCircle}>
                <ProgressCircle
                  size={120}
                  strokeWidth={8}
                  progress={(metricData.value / metricData.goal) * 100}
                  color={metricConfig.color}
                  icon={metricConfig.icon as any}
                  iconSize={32}
                />
                <Text style={styles.secondaryNumber}>
                  {metricData.displayValue}
                </Text>
                <Text style={styles.secondaryLabel}>
                  {metricData.unit || metricConfig.name}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Sección de Recuperación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recuperación</Text>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Duración del sueño</Text>
                <Text style={styles.cardValue}>
                  {stats.sleep > 0 ? `${stats.sleep.toFixed(1)} h` : 'No hay datos'}
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
          <Text style={styles.sectionTitle}>Actividad</Text>
          
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/(tabs)/exercise-detail')}
          >
            <Text style={styles.cardTitle}>Días de ejercicio</Text>
            <View style={styles.exerciseDaysContainer}>
              <View style={styles.exerciseDaysLeft}>
                <Text style={styles.exerciseDaysNumber}>
                  {stats.exerciseDays} <Text style={styles.exerciseDaysGoal}>de {stats.exerciseDaysGoal}</Text>
                </Text>
                <Text style={styles.exerciseDaysLabel}>Esta semana</Text>
              </View>
              <View style={styles.weekDaysContainer}>
                {weekDays.map((day, index) => (
                  <View key={index} style={styles.dayColumn}>
                    <View style={[
                      styles.dayBar,
                      completedDays[index] && styles.dayBarCompleted
                    ]} />
                    <Text style={styles.dayLabel}>{day}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/gym-detail')}
          >
            <Text style={styles.cardTitle}>Gimnasio</Text>
            <View style={styles.exerciseDaysContainer}>
              <View style={styles.exerciseDaysLeft}>
                <Text style={styles.exerciseDaysNumber}>
                  {stats.gymDays} <Text style={styles.exerciseDaysGoal}>de {stats.gymDaysGoal}</Text>
                </Text>
                <Text style={styles.exerciseDaysLabel}>Esta semana</Text>
              </View>
              <View style={styles.weekDaysContainer}>
                {weekDays.map((day, index) => (
                  <View key={index} style={styles.dayColumn}>
                    <View style={[
                      styles.dayBar,
                      completedDays[index] && styles.dayBarCompleted
                    ]} />
                    <Text style={styles.dayLabel}>{day}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/(tabs)/steps-detail')}
            onLongPress={() => showHealthDiagnosticsAlert()}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Pasos</Text>
                <Text style={styles.cardValue}>{stats.steps.toLocaleString('es-ES')}</Text>
                <Text style={styles.cardSubtitle}>{formatDate(selectedDate)}</Text>
                <Text style={[styles.cardSubtitle, { fontSize: 11, marginTop: 4, color: healthDataSource === 'none' ? '#ff6b6b' : '#4ecdc4' }]}>
                  {getHealthSourceLabel()}
                </Text>
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
            {healthDataSource === 'none' && (
              <TouchableOpacity 
                style={styles.diagnosticButton}
                onPress={() => showHealthDiagnosticsAlert()}
              >
                <Ionicons name="help-circle-outline" size={16} color="#ffb300" />
                <Text style={styles.diagnosticButtonText}>¿Por qué no veo mis pasos?</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/(tabs)/distance-detail')}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Distancia</Text>
                <Text style={styles.cardValue}>{stats.distance.toFixed(1)} km</Text>
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

          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/(tabs)/calories-detail')}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Energía quemada</Text>
                <Text style={styles.cardValue}>{stats.calories.toLocaleString('es-ES')} kcal</Text>
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

          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push('/(tabs)/nutrition' as any)}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Nutrición</Text>
                <Text style={styles.cardValue}>Plan de comidas</Text>
                <Text style={styles.cardSubtitle}>Macros, agua y lecciones</Text>
              </View>
              <View style={styles.iconCircle}>
                <Ionicons name="restaurant" size={22} color="#ffb300" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sección de Salud */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Salud</Text>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Peso</Text>
                <Text style={styles.cardValue}>
                  {stats.weight ? `${stats.weight.toFixed(1)} kg` : 'No hay datos'}
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
                <Text style={styles.cardTitle}>Glucosa</Text>
                <Text style={styles.cardValue}>
                  {stats.glucose ? `${stats.glucose} mg/dL` : 'No hay datos'}
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
          <Text style={styles.sectionTitle}>Estrés y mindfulness</Text>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Días de mindfulness</Text>
                <Text style={styles.cardValue}>Empezar</Text>
                <Text style={styles.cardSubtitle}>Toca para configurar</Text>
              </View>
              <View style={styles.iconCircle}>
                <Ionicons name="flower" size={22} color="#ffb300" />
              </View>
            </View>
          </View>
        </View>

        {/* Sección de Nutrición */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrición</Text>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Comida</Text>
                <Text style={styles.cardValue}>
                  {stats.food ? `${stats.food.toLocaleString('es-ES')} kcal` : 'No hay datos'}
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
                <Text style={styles.cardTitle}>Agua</Text>
                <Text style={styles.cardValue}>
                  {stats.water ? `${stats.water} ml` : 'No hay datos'}
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

      {/* Botón flotante de agregar */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>

      {/* Modal de personalización */}
      <DashboardCustomizationModal
        visible={showCustomizationModal}
        onClose={() => setShowCustomizationModal(false)}
        onSave={handleSaveCustomization}
      />

      {/* Modal de check-in semanal */}
      {checkinStatus && (
        <WeeklyCheckinModal
          visible={showCheckinModal}
          onClose={() => setShowCheckinModal(false)}
          userId={user?.id || ''}
          checkinStatus={checkinStatus}
          onCheckinComplete={handleCheckinComplete}
        />
      )}
    </View>
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
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1a1a1a',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  avatarText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  mainCircleContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  mainNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
  },
  mainUnit: {
    fontSize: 32,
    fontWeight: 'normal',
    color: '#999',
  },
  mainLabel: {
    fontSize: 18,
    color: '#999',
    marginTop: 4,
  },
  secondaryCirclesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    marginBottom: 32,
  },
  secondaryCircle: {
    alignItems: 'center',
  },
  secondaryNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  secondaryLabel: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    minHeight: 100,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    color: '#ffffff',
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  exerciseDaysLeft: {
    flex: 1,
  },
  exerciseDaysNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  exerciseDaysGoal: {
    fontSize: 24,
    fontWeight: 'normal',
    color: '#666',
  },
  exerciseDaysLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dayColumn: {
    alignItems: 'center',
  },
  dayBar: {
    width: 10,
    height: 40,
    backgroundColor: '#3a3a3a',
    borderRadius: 5,
    marginBottom: 4,
  },
  dayBarCompleted: {
    backgroundColor: '#ffb300',
  },
  dayLabel: {
    fontSize: 12,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2a6d5e',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  diagnosticButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a3a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  diagnosticButtonText: {
    color: '#ffb300',
    fontSize: 12,
    fontWeight: '500',
  },
});
