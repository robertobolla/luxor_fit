import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { saveExercise, getDaysWithExercise, getExercisesByDateRange, Exercise } from '@/services/exerciseService';
import { supabase } from '../../src/services/supabase';
import { useUnitsStore, conversions } from '../../src/store/unitsStore';


const { width } = Dimensions.get('window');

type ViewMode = 'week' | 'month';

type ActivityType = 'running' | 'walking' | 'cycling' | 'hiking' | 'weights' | 'calisthenics' | 'soccer' | 'other';
type ModalStep = 'initial' | 'selectMonitorActivity' | 'selectManualActivity' | 'tracking' | 'manualEntry';
type IntensityLevel = 'low' | 'medium' | 'high';

interface Activity {
  id: ActivityType;
  name: string;
  icon: string;
  hasGPS: boolean;
}

const getMonitorActivities = (t: any): Activity[] => [
  { id: 'running', name: t('exerciseDetail.running'), icon: 'fitness', hasGPS: true },
  { id: 'walking', name: t('exerciseDetail.walking'), icon: 'walk', hasGPS: true },
  { id: 'cycling', name: t('exerciseDetail.cycling'), icon: 'bicycle', hasGPS: true },
  { id: 'hiking', name: t('exerciseDetail.hiking'), icon: 'trail-sign', hasGPS: true },
];

const getManualActivities = (t: any): Activity[] => [
  { id: 'yoga', name: t('exerciseDetail.yoga'), icon: 'heart-half-sharp', hasGPS: false },
  { id: 'calisthenics', name: t('exerciseDetail.calisthenics'), icon: 'body', hasGPS: false },
  { id: 'soccer', name: t('exerciseDetail.soccer'), icon: 'football', hasGPS: false },
  { id: 'other', name: t('exerciseDetail.otherActivity'), icon: 'add-circle', hasGPS: false },
];

export default function ExerciseDetailScreen() {
  const { user } = useUser();
  const { t } = useTranslation();
  const { distanceUnit } = useUnitsStore();
  
  // Helpers para conversión de unidades
  const displayDistance = (km: number) => distanceUnit === 'mi' ? conversions.kmToMi(km) : km;
  const displaySpeed = (kmh: number) => distanceUnit === 'mi' ? conversions.kmToMi(kmh) : kmh;
  const distanceLabel = distanceUnit === 'mi' ? 'mi' : 'km';
  const speedLabel = distanceUnit === 'mi' ? 'mph' : 'km/h';

  const MONITOR_ACTIVITIES = useMemo(() => getMonitorActivities(t), [t]);
  const MANUAL_ACTIVITIES = useMemo(() => getManualActivities(t), [t]);
  
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('initial');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [targetDays, setTargetDays] = useState<number>(7); // meta semanal (se reemplaza con Supabase)

  // Estados para registro manual
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState<IntensityLevel>('medium');
  const [customActivityName, setCustomActivityName] = useState('');
  
  // Estados para tracking GPS
  const [isTracking, setIsTracking] = useState(false);
  const [distance, setDistance] = useState(0);
  const [trackingTime, setTrackingTime] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  
  // Estados para días con ejercicio
  const [exerciseDays, setExerciseDays] = useState<number[]>([]);
  const [monthExerciseDays, setMonthExerciseDays] = useState<number[]>([]);
  const [monthExercises, setMonthExercises] = useState<Exercise[]>([]);
  const [weekExercises, setWeekExercises] = useState<Exercise[]>([]);
  
  // Referencias para el tracking
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const lastLocation = useRef<Location.LocationObject | null>(null);
  const totalDistance = useRef(0);

  // Días de la semana traducidos (Lunes a Domingo)
  const weekDays = t('common.weekDaysShort', { returnObjects: true }) as string[];
  
  // Función para calcular distancia entre dos coordenadas (fórmula de Haversine)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  };

  // Iniciar el tracking GPS
  const startGPSTracking = async () => {
    try {
      // Iniciar timer
      timerInterval.current = setInterval(() => {
        setTrackingTime((prev) => prev + 1);
      }, 1000);

      // Iniciar tracking de ubicación
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000, // Actualizar cada segundo
          distanceInterval: 5, // Actualizar cada 5 metros
        },
        (location) => {
          console.log('📍 Nueva ubicación:', location.coords);
          
          // Calcular distancia si tenemos una ubicación previa
          if (lastLocation.current) {
            const dist = calculateDistance(
              lastLocation.current.coords.latitude,
              lastLocation.current.coords.longitude,
              location.coords.latitude,
              location.coords.longitude
            );
            
            // Acumular distancia
            totalDistance.current += dist;
            setDistance(totalDistance.current);
            
            console.log(`📏 Distancia recorrida: ${totalDistance.current.toFixed(2)} km`);
          }
          
          // Actualizar velocidad (en km/h)
          if (location.coords.speed !== null && location.coords.speed >= 0) {
            const speedKmh = location.coords.speed * 3.6; // convertir m/s a km/h
            setCurrentSpeed(speedKmh);
          }
          
          // Guardar ubicación actual
          lastLocation.current = location;
        }
      );
      
      console.log('✅ Tracking GPS iniciado');
    } catch (error) {
      console.error('❌ Error al iniciar tracking GPS:', error);
      Alert.alert(t('common.error'), t('exerciseDetail.couldNotStartGPS'));
    }
  };

  // Detener el tracking GPS
  const stopGPSTracking = () => {
    // Detener timer
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    
    // Detener tracking de ubicación
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    
    console.log('🛑 Tracking GPS detenido');
  };

  // Cargar días con ejercicio del mes actual
  const loadExerciseDays = async () => {
    if (!user) return;
    
    if (viewMode === 'month') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const days = await getDaysWithExercise(user.id, year, month);
      setMonthExerciseDays(days);
      
      // Cargar los ejercicios del mes para mostrar detalles
      const lastDay = new Date(year, month + 1, 0).getDate();
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const exercises = await getExercisesByDateRange(user.id, startDate, endDate);
      setMonthExercises(exercises);
    } else {
      // Para vista semanal, calcular qué días de la semana tienen ejercicio
      // Calcular el inicio de la semana (Lunes)
      const currentDay = currentDate.getDay(); // 0 = domingo, 1 = lunes, etc.
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Cuántos días desde el lunes
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - daysFromMonday);
      weekStart.setHours(0, 0, 0, 0);
      
      // Calcular fin de semana (Domingo)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      // Cache para almacenar datos por mes
      const monthCache: { [key: string]: number[] } = {};
      const weekDaysWithExercise: number[] = [];

      // Iterar de Lunes (i=0) a Domingo (i=6)
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + i);

        const year = dayDate.getFullYear();
        const month = dayDate.getMonth();
        const day = dayDate.getDate();

        // Crear clave para el cache
        const cacheKey = `${year}-${month}`;

        // Obtener ejercicios para ese mes (usar cache si existe)
        if (!monthCache[cacheKey]) {
          monthCache[cacheKey] = await getDaysWithExercise(user.id, year, month);
        }

        // Verificar si ese día tiene ejercicio
        if (monthCache[cacheKey].includes(day)) {
          weekDaysWithExercise.push(i);
        }
      }

      setExerciseDays(weekDaysWithExercise);
      
      // Cargar los ejercicios de la semana para mostrar detalles
      const startDate = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
      const endDate = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
      const exercises = await getExercisesByDateRange(user.id, startDate, endDate);
      setWeekExercises(exercises);
    }
  };

  // Effect para cargar días con ejercicio al montar y cuando cambie la fecha
  useEffect(() => {
    loadExerciseDays();
  }, [currentDate, viewMode, user]);

  // Recargar datos cuando la pantalla obtiene el foco (volver de otra pantalla)
  useFocusEffect(
    useCallback(() => {
      loadExerciseDays();
    }, [currentDate, viewMode, user])
  );

  type UserProfileDaysRow = {
    available_days: number | null;
  };
  
  useEffect(() => {
    const loadTargetDays = async () => {
      if (!user) return;
  
      const { data, error } = await supabase
        .from('user_profiles')
        .select('available_days')
        .eq('user_id', user.id)
        .maybeSingle<UserProfileDaysRow>(); // 👈 importante
  
      if (error) {
        console.log('Error loading available_days:', error.message);
        return;
      }
  
      const days = Number(data?.available_days);
  
      // fallback seguro
      if (Number.isFinite(days) && days > 0) {
        setTargetDays(days);
      } else {
        setTargetDays(7); // default: 7 días por semana (consistente con progress.tsx)
      }
    };
  
    loadTargetDays();
  }, [user]);
  

  // Effect para limpiar el tracking al desmontar
  useEffect(() => {
    return () => {
      stopGPSTracking();
    };
  }, []);
  
  // Generar días del mes
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    return { daysInMonth, firstDayOfMonth };
  };

  const { daysInMonth, firstDayOfMonth } = getDaysInMonth(currentDate);
  
  // Calcular si estamos en el mes actual para marcar "hoy"
  const now = new Date();
  const isCurrentMonth = currentDate.getFullYear() === now.getFullYear() && 
                         currentDate.getMonth() === now.getMonth();
  const today = isCurrentMonth ? now.getDate() : -1;

  const goToPreviousPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNextPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const formatPeriod = () => {
    if (viewMode === 'week') {
      // Calcular el inicio y fin de la semana
      const currentDay = currentDate.getDay();
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDay);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Formatear las fechas
      const startDay = weekStart.getDate();
      const endDay = weekEnd.getDate();
      const startMonth = weekStart.toLocaleDateString('es-ES', { month: 'short' });
      const endMonth = weekEnd.toLocaleDateString('es-ES', { month: 'short' });
      
      // Si ambos están en el mismo mes
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${startDay} - ${endDay} ${startMonth}`;
      } else {
        // Si están en meses diferentes
        return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
      }
    } else {
      return currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    }
  };
  
  // Verificar si estamos en la semana/mes actual
  const isCurrentPeriod = () => {
    const now = new Date();
    
    if (viewMode === 'week') {
      // Calcular el inicio de la semana actual
      const nowDay = now.getDay();
      const nowWeekStart = new Date(now);
      nowWeekStart.setDate(now.getDate() - nowDay);
      nowWeekStart.setHours(0, 0, 0, 0);
      
      // Calcular el inicio de la semana de currentDate
      const currentDay = currentDate.getDay();
      const currentWeekStart = new Date(currentDate);
      currentWeekStart.setDate(currentDate.getDate() - currentDay);
      currentWeekStart.setHours(0, 0, 0, 0);
      
      return nowWeekStart.getTime() === currentWeekStart.getTime();
    } else {
      return currentDate.getFullYear() === now.getFullYear() && 
             currentDate.getMonth() === now.getMonth();
    }
  };

  // Calcular el número de días con ejercicio
  const getExerciseCount = () => {
    if (viewMode === 'week') {
      return exerciseDays.length;
    } else {
      return monthExerciseDays.length;
    }
  };

  // Obtener el número de días objetivo según la vista
  const getTargetDays = () => {
    if (viewMode === 'week') {
      return 7; // Siempre 7 días en una semana
    } else {
      return daysInMonth; // Días del mes actual
    }
  };

  // Obtener el texto descriptivo
  const getExerciseText = () => {
    const count = getExerciseCount();
    const target = getTargetDays();
  
    if (count === 0) {
      return t('exercises.noActivity');
    }
  
    if (count === 1) {
      return t('exercises.goodStart');
    }
  
    if (count < target) {
      return t('exercises.daysToGoal', {
        days: target - count,
      });
    }
  
    return t('exercises.goalAchieved') + ' 🎉';
  };
  
  

  const handleStartMonitoring = () => {
    setModalStep('selectMonitorActivity');
  };

  const handleRegisterActivity = () => {
    setModalStep('selectManualActivity');
  };

  const handleSelectMonitorActivity = async (activity: Activity) => {
    setSelectedActivity(activity);
    
    // Solicitar permisos de ubicación
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permiso de ubicación denegado',
        'Necesitamos acceso a tu ubicación para rastrear tu actividad.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Configuración', onPress: () => Location.requestForegroundPermissionsAsync() }
        ]
      );
      return;
    }
    
    // Cerrar modal y navegar a pantalla de tracking fullscreen
    setShowAddModal(false);
    
    // Navegar a la pantalla de tracking
    router.push({
      pathname: '/(tabs)/tracking-screen',
      params: {
        activityName: activity.name,
        activityType: activity.id,
      },
    });
  };

  const handleSelectManualActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    // Todas las actividades manuales usan el mismo flujo con tiempo e intensidad
    setModalStep('manualEntry');
  };

  const handleStopTracking = async () => {
    // Detener el tracking
    stopGPSTracking();
    setIsTracking(false);
    
    // Formatear el tiempo
    const minutes = Math.floor(trackingTime / 60);
    const seconds = trackingTime % 60;
    const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
    const avgSpeed = trackingTime > 0 ? ((distance / (trackingTime / 3600)) || 0) : 0;
    
    // Guardar en la base de datos
    if (user && selectedActivity) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      const result = await saveExercise({
        user_id: user.id,
        activity_type: selectedActivity.id,
        activity_name: selectedActivity.name,
        date: today,
        duration_minutes: Math.ceil(trackingTime / 60),
        distance_km: distance,
        has_gps: true,
        average_speed_kmh: avgSpeed,
      });
      
      if (result.success) {
        console.log('✅ Ejercicio GPS guardado correctamente');
        // Recargar los días con ejercicio
        await loadExerciseDays();
      } else {
        console.error('❌ Error al guardar ejercicio:', result.error);
      }
    }
    
    // Mostrar resumen
    Alert.alert(
      '¡Actividad completada! 🎉',
      `${selectedActivity?.name}\n\n` +
      `⏱️ Tiempo: ${timeStr}\n` +
      `📏 Distancia: ${displayDistance(distance).toFixed(2)} ${distanceLabel}\n` +
      `🚀 Velocidad promedio: ${displaySpeed(avgSpeed).toFixed(1)} ${speedLabel}\n\n` +
      `💾 Actividad guardada correctamente`,
      [{ text: 'OK', onPress: handleCloseModal }]
    );
  };

  const handleSaveManualActivity = async () => {
    if (!duration) {
      Alert.alert(t('common.error'), t('exerciseDetail.enterDuration'));
      return;
    }
    
    // Si es "otra actividad", validar que tenga nombre
    if (selectedActivity?.id === 'other' && !customActivityName.trim()) {
      Alert.alert(t('common.error'), 'Por favor ingresa el nombre de la actividad');
      return;
    }
    
    // Guardar en la base de datos
    if (user && selectedActivity) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Crear nota con la intensidad
      const intensityText = intensity === 'low' ? 'Poco intenso' : intensity === 'medium' ? 'Medio intenso' : 'Intenso';
      
      // Usar el nombre personalizado si es "otra actividad"
      const activityName = selectedActivity.id === 'other' ? customActivityName.trim() : selectedActivity.name;
      
      const result = await saveExercise({
        user_id: user.id,
        activity_type: selectedActivity.id === 'other' ? 'custom' : selectedActivity.id,
        activity_name: activityName,
        date: today,
        duration_minutes: parseInt(duration),
        notes: `Intensidad: ${intensityText}`,
        has_gps: false,
      });
      
      if (result.success) {
        console.log('✅ Ejercicio manual guardado correctamente');
        // Recargar los días con ejercicio
        await loadExerciseDays();
        
        Alert.alert(
          '¡Guardado! ✅',
          `Tu sesión de ${activityName.toLowerCase()} ha sido guardada correctamente`,
          [{ text: 'OK', onPress: handleCloseModal }]
        );
      } else {
        console.error('❌ Error al guardar ejercicio:', result.error);
        Alert.alert(
          'Error',
          'No se pudo guardar el ejercicio. Por favor intenta de nuevo.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleCloseModal = () => {
    // Detener tracking si está activo
    if (isTracking) {
      stopGPSTracking();
    }
    
    // Resetear estados
    setShowAddModal(false);
    setModalStep('initial');
    setSelectedActivity(null);
    setIsTracking(false);
    setDistance(0);
    setTrackingTime(0);
    setCurrentSpeed(0);
    setDuration('');
    setIntensity('medium'); // Resetear a valor por defecto
    setCustomActivityName(''); // Resetear nombre personalizado
    
    // Resetear referencias
    lastLocation.current = null;
    totalDistance.current = 0;
  };

  const renderWeekView = () => {
    // Calcular el inicio de la semana (Lunes) basado en currentDate
    const currentDay = currentDate.getDay();
    // Convertir: Domingo (0) -> 6, Lunes (1) -> 0, Martes (2) -> 1, etc.
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    
    // Fecha actual para comparar
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Función para obtener el icono de la actividad
    const getActivityIcon = (type: string) => {
      switch (type) {
        case 'running': return 'fitness';
        case 'walking': return 'walk';
        case 'cycling': return 'bicycle';
        case 'hiking': return 'trail-sign';
        case 'yoga': return 'heart-half-sharp';
        case 'calisthenics': return 'body';
        case 'soccer': return 'football';
        case 'custom': return 'star';
        default: return 'fitness';
      }
    };
    
    return (
      <View style={styles.weekContainer}>
        <View style={styles.weekDaysRow}>
          {weekDays.map((day, index) => {
            const hasExercise = exerciseDays.includes(index);
            
            // Calcular si este día es hoy
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + index);
            dayDate.setHours(0, 0, 0, 0);
            const isToday = dayDate.getTime() === today.getTime();
            
            return (
              <View key={index} style={styles.dayColumn}>
                <View style={[
                  styles.dayBar,
                  hasExercise && styles.dayBarCompleted,
                  isToday && styles.dayBarToday
                ]} />
                <Text style={styles.dayLabel}>{day}</Text>
              </View>
            );
          })}
        </View>
        
        {/* Lista de ejercicios de la semana */}
        <View style={styles.weekExercisesSection}>
          <Text style={styles.sectionTitle}>
            Ejercicios de la semana
          </Text>
          
          {weekExercises.length > 0 ? (
            <View style={styles.exercisesList}>
              {weekExercises.map((exercise, index) => {
                const exerciseDate = new Date(exercise.date + 'T00:00:00');
                const formattedDate = exerciseDate.toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'short' 
                });
                
                const handleCardPress = () => {
                  if (exercise.id) {
                    router.push({
                      pathname: '/(tabs)/exercise-activity-detail',
                      params: { exerciseId: exercise.id }
                    } as any);
                  }
                };
                
                return (
                  <TouchableOpacity 
                    key={exercise.id || index} 
                    style={styles.exerciseCard}
                    onPress={handleCardPress}
                    activeOpacity={0.7}
                  >
                    <View style={styles.exerciseCardHeader}>
                      <View style={styles.exerciseIconContainer}>
                        <Ionicons name={getActivityIcon(exercise.activity_type) as any} size={24} color="#ffb300" />
                      </View>
                      <View style={styles.exerciseCardInfo}>
                        <Text style={styles.exerciseCardTitle}>{exercise.activity_name}</Text>
                        <Text style={styles.exerciseCardDate}>{formattedDate}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#666" />
                    </View>
                    
                    <View style={styles.exerciseCardStats}>
                      <View style={styles.exerciseCardStat}>
                        <Ionicons name="time-outline" size={16} color="#888" />
                        <Text style={styles.exerciseCardStatText}>{exercise.duration_minutes} min</Text>
                      </View>
                      
                      {exercise.distance_km !== undefined && exercise.distance_km > 0 && (
                        <View style={styles.exerciseCardStat}>
                          <Ionicons name="navigate-outline" size={16} color="#888" />
                          <Text style={styles.exerciseCardStatText}>
                            {displayDistance(exercise.distance_km).toFixed(2)} {distanceLabel}
                          </Text>
                        </View>
                      )}
                      
                      {exercise.average_speed_kmh !== undefined && exercise.average_speed_kmh > 0 && (
                        <View style={styles.exerciseCardStat}>
                          <Ionicons name="speedometer-outline" size={16} color="#888" />
                          <Text style={styles.exerciseCardStatText}>
                            {displaySpeed(exercise.average_speed_kmh).toFixed(1)} {speedLabel}
                          </Text>
                        </View>
                      )}
                      
                      {exercise.elevation_gain !== undefined && exercise.elevation_gain > 0 && (
                        <View style={styles.exerciseCardStat}>
                          <Ionicons name="trending-up" size={16} color="#4CAF50" />
                          <Text style={[styles.exerciseCardStatText, { color: '#4CAF50' }]}>{exercise.elevation_gain}m ↑</Text>
                        </View>
                      )}
                      
                      {exercise.elevation_loss !== undefined && exercise.elevation_loss > 0 && (
                        <View style={styles.exerciseCardStat}>
                          <Ionicons name="trending-down" size={16} color="#f44336" />
                          <Text style={[styles.exerciseCardStatText, { color: '#f44336' }]}>{exercise.elevation_loss}m ↓</Text>
                        </View>
                      )}
                    </View>
                    
                    {exercise.notes && (
                      <Text style={styles.exerciseCardNotes}>{exercise.notes}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyExercises}>
              <Ionicons name="fitness-outline" size={48} color="#444" />
              <Text style={styles.emptyExercisesText}>No hay ejercicios registrados esta semana</Text>
              <Text style={styles.emptyExercisesSubtext}>Usa el botón de abajo para añadir uno</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderMonthView = () => {
    const days = [];
    
    // Espacios vacíos antes del primer día
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.calendarDay} />
      );
    }
    
    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const hasExercise = monthExerciseDays.includes(day);
      const isToday = day === today;
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            hasExercise && styles.calendarDayActive,
            isToday && styles.calendarDayToday
          ]}
        >
          <Text style={[
            styles.calendarDayText,
            hasExercise && styles.calendarDayTextActive,
            isToday && styles.calendarDayTextToday
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }
    
    // Días de la semana empezando por Domingo para el calendario mensual
    const calendarWeekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    
    return (
      <View style={styles.calendarGrid}>
        {/* Headers de días de la semana */}
        <View style={styles.calendarHeader}>
          {calendarWeekDays.map((day, index) => (
            <Text key={index} style={styles.calendarHeaderText}>{day}</Text>
          ))}
        </View>
        
        {/* Grid de días */}
        <View style={styles.calendarDaysContainer}>
          {days}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.replace('/(tabs)/progress' as any)}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ejercicio</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Tabs: Semana / Mes */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'week' && styles.tabActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.tabText, viewMode === 'week' && styles.tabTextActive]}>
              Semana
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'month' && styles.tabActive]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.tabText, viewMode === 'month' && styles.tabTextActive]}>
              Mes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Navegación de período */}
        <View style={styles.periodNav}>
          <TouchableOpacity onPress={goToPreviousPeriod}>
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.periodText}>{formatPeriod()}</Text>
          {!isCurrentPeriod() ? (
            <TouchableOpacity onPress={goToNextPeriod}>
              <Ionicons name="chevron-forward" size={24} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        {/* Estadística principal */}
        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>
          {getExerciseCount()} <Text style={styles.statsGoal}>de {getTargetDays()}</Text>
          </Text>
          <Text style={styles.statsLabel}>
            {t('stats.exerciseDays')}
          </Text>
          <Text style={styles.statsSubtext}>
            {getExerciseText()}
          </Text>
        </View>

        {/* Vista de calendario */}
        {viewMode === 'week' ? renderWeekView() : renderMonthView()}

        {/* Sección de ejercicios del mes */}
        {viewMode === 'month' && (
          <View style={styles.exercisesSection}>
            <Text style={styles.sectionTitle}>
              Días de Ejercicio de {currentDate.toLocaleDateString('es-ES', { month: 'long' }).charAt(0).toUpperCase() + currentDate.toLocaleDateString('es-ES', { month: 'long' }).slice(1)}
            </Text>
            
            {/* Lista de ejercicios del mes */}
            {monthExercises.length > 0 ? (
              <View style={styles.exercisesList}>
                {monthExercises.map((exercise, index) => {
                  const exerciseDate = new Date(exercise.date + 'T00:00:00');
                  const formattedDate = exerciseDate.toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'short' 
                  });
                  
                  // Determinar el icono según el tipo de actividad
                  const getActivityIcon = (type: string) => {
                    switch (type) {
                      case 'running': return 'fitness';
                      case 'walking': return 'walk';
                      case 'cycling': return 'bicycle';
                      case 'hiking': return 'trail-sign';
                      case 'yoga': return 'heart-half-sharp';
                      case 'calisthenics': return 'body';
                      case 'soccer': return 'football';
                      case 'custom': return 'star';
                      default: return 'fitness';
                    }
                  };
                  
                  const handleCardPress = () => {
                    if (exercise.id) {
                      router.push({
                        pathname: '/(tabs)/exercise-activity-detail',
                        params: { exerciseId: exercise.id }
                      } as any);
                    }
                  };
                  
                  return (
                    <TouchableOpacity 
                      key={exercise.id || index} 
                      style={styles.exerciseCard}
                      onPress={handleCardPress}
                      activeOpacity={0.7}
                    >
                      <View style={styles.exerciseCardHeader}>
                        <View style={styles.exerciseIconContainer}>
                          <Ionicons name={getActivityIcon(exercise.activity_type) as any} size={24} color="#ffb300" />
                        </View>
                        <View style={styles.exerciseCardInfo}>
                          <Text style={styles.exerciseCardTitle}>{exercise.activity_name}</Text>
                          <Text style={styles.exerciseCardDate}>{formattedDate}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#666" />
                      </View>
                      
                      <View style={styles.exerciseCardStats}>
                        <View style={styles.exerciseCardStat}>
                          <Ionicons name="time-outline" size={16} color="#888" />
                          <Text style={styles.exerciseCardStatText}>{exercise.duration_minutes} min</Text>
                        </View>
                        
                        {exercise.distance_km !== undefined && exercise.distance_km > 0 && (
                          <View style={styles.exerciseCardStat}>
                            <Ionicons name="navigate-outline" size={16} color="#888" />
                            <Text style={styles.exerciseCardStatText}>
                              {displayDistance(exercise.distance_km).toFixed(2)} {distanceLabel}
                            </Text>
                          </View>
                        )}
                        
                        {exercise.average_speed_kmh !== undefined && exercise.average_speed_kmh > 0 && (
                          <View style={styles.exerciseCardStat}>
                            <Ionicons name="speedometer-outline" size={16} color="#888" />
                            <Text style={styles.exerciseCardStatText}>
                              {displaySpeed(exercise.average_speed_kmh).toFixed(1)} {speedLabel}
                            </Text>
                          </View>
                        )}
                        
                        {exercise.elevation_gain !== undefined && exercise.elevation_gain > 0 && (
                          <View style={styles.exerciseCardStat}>
                            <Ionicons name="trending-up" size={16} color="#4CAF50" />
                            <Text style={[styles.exerciseCardStatText, { color: '#4CAF50' }]}>{exercise.elevation_gain}m ↑</Text>
                          </View>
                        )}
                        
                        {exercise.elevation_loss !== undefined && exercise.elevation_loss > 0 && (
                          <View style={styles.exerciseCardStat}>
                            <Ionicons name="trending-down" size={16} color="#f44336" />
                            <Text style={[styles.exerciseCardStatText, { color: '#f44336' }]}>{exercise.elevation_loss}m ↓</Text>
                          </View>
                        )}
                      </View>
                      
                      {exercise.notes && (
                        <Text style={styles.exerciseCardNotes}>{exercise.notes}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyExercises}>
                <Ionicons name="fitness-outline" size={48} color="#444" />
                <Text style={styles.emptyExercisesText}>No hay ejercicios registrados este mes</Text>
                <Text style={styles.emptyExercisesSubtext}>Usa el botón de abajo para añadir uno</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botón flotante Añadir ejercicio */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={24} color="#ffffff" />
        <Text style={styles.fabText}>  {t('actions.addExercise')}</Text>
      </TouchableOpacity>

      {/* Modal para añadir ejercicio */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal inicial */}
            {modalStep === 'initial' && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>  {t('actions.addExercise')}</Text>
                  <TouchableOpacity onPress={handleCloseModal}>
                    <Ionicons name="close" size={28} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalOptions}>
                  <TouchableOpacity 
                    style={styles.modalOption}
                    onPress={handleStartMonitoring}
                  >
                    <View style={styles.optionIconContainer}>
                      <Ionicons name="play-circle" size={40} color="#ffb300" />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>{t('tracking.startTracking')}</Text>
                      <Text style={styles.optionDescription}>{t('tracking.realTimeGps')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#666" />
                  </TouchableOpacity>

                  <View style={styles.optionDivider} />

                  <TouchableOpacity 
                    style={styles.modalOption}
                    onPress={handleRegisterActivity}
                  >
                    <View style={styles.optionIconContainer}>
                      <Ionicons name="create" size={40} color="#ffb300" />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>{t('activity.logActivity')}</Text>
                      <Text style={styles.optionDescription}>{t('activity.manualEntry')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Selector de actividad con monitoreo */}
            {modalStep === 'selectMonitorActivity' && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setModalStep('initial')}>
                    <Ionicons name="arrow-back" size={28} color="#ffffff" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>{t('activity.chooseActivity')}</Text>
                  <TouchableOpacity onPress={handleCloseModal}>
                    <Ionicons name="close" size={28} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.activitiesContainer}>
                  {MONITOR_ACTIVITIES.map((activity, index) => (
                    <TouchableOpacity
                      key={activity.id}
                      style={[
                        styles.activityCard,
                        index !== MONITOR_ACTIVITIES.length - 1 && styles.activityCardBorder
                      ]}
                      onPress={() => handleSelectMonitorActivity(activity)}
                    >
                      <View style={styles.activityIconContainer}>
                        <Ionicons name={activity.icon as any} size={32} color="#ffb300" />
                      </View>
                      <Text style={styles.activityName}>{activity.name}</Text>
                      <Ionicons name="chevron-forward" size={24} color="#666" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Selector de actividad manual */}
            {modalStep === 'selectManualActivity' && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setModalStep('initial')}>
                    <Ionicons name="arrow-back" size={28} color="#ffffff" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>{t('activity.chooseActivity')}</Text>
                  <TouchableOpacity onPress={handleCloseModal}>
                    <Ionicons name="close" size={28} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.activitiesContainer}>
                  {MANUAL_ACTIVITIES.map((activity, index) => (
                    <TouchableOpacity
                      key={activity.id}
                      style={[
                        styles.activityCard,
                        index !== MANUAL_ACTIVITIES.length - 1 && styles.activityCardBorder
                      ]}
                      onPress={() => handleSelectManualActivity(activity)}
                    >
                      <View style={styles.activityIconContainer}>
                        <Ionicons name={activity.icon as any} size={32} color="#ffb300" />
                      </View>
                      <Text style={styles.activityName}>{activity.name}</Text>
                      <Ionicons name="chevron-forward" size={24} color="#666" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Pantalla de tracking GPS */}
            {modalStep === 'tracking' && selectedActivity && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setModalStep('selectMonitorActivity')}>
                    <Ionicons name="arrow-back" size={28} color="#ffffff" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>{selectedActivity.name}</Text>
                  <TouchableOpacity onPress={handleCloseModal}>
                    <Ionicons name="close" size={28} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.trackingContainer}>
                  <View style={styles.mapPlaceholder}>
                    <Ionicons name="map" size={80} color="#ffb300" />
                    <Text style={styles.mapPlaceholderText}>{t('tracking.liveGpsMap')}</Text>
                  </View>

                  <View style={styles.trackingStats}>
                    <View style={styles.trackingStat}>
                      <Ionicons name="time" size={32} color="#ffb300" />
                      <Text style={styles.trackingStatValue}>
                        {Math.floor(trackingTime / 60)}:{String(trackingTime % 60).padStart(2, '0')}
                      </Text>
                      <Text style={styles.trackingStatLabel}>{t('tracking.time')}</Text>
                    </View>

                    <View style={styles.trackingStat}>
                      <Ionicons name="navigate" size={32} color="#ffb300" />
                      <Text style={styles.trackingStatValue}>
                        {displayDistance(distance).toFixed(2)} {distanceLabel}
                      </Text>
                      <Text style={styles.trackingStatLabel}>{t('tracking.distance')}</Text>
                    </View>

                    <View style={styles.trackingStat}>
                      <Ionicons name="speedometer" size={32} color="#ffb300" />
                      <Text style={styles.trackingStatValue}>
                        {displaySpeed(currentSpeed).toFixed(1)}
                      </Text>
                      <Text style={styles.trackingStatLabel}>{speedLabel}</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.stopButton}
                    onPress={handleStopTracking}
                  >
                    <Ionicons name="stop-circle" size={60} color="#ff4444" />
                    <Text style={styles.stopButtonText}>{t('actions.stopAndSave')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Entrada manual de actividad */}
            {modalStep === 'manualEntry' && selectedActivity && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setModalStep('selectManualActivity')}>
                    <Ionicons name="arrow-back" size={28} color="#ffffff" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>
                    {selectedActivity.id === 'other' ? 'Nueva actividad' : selectedActivity.name}
                  </Text>
                  <TouchableOpacity onPress={handleCloseModal}>
                    <Ionicons name="close" size={28} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.manualEntryContainer}>
                  {/* Campo de nombre para "Otra actividad" */}
                  {selectedActivity.id === 'other' && (
                    <View style={styles.formSection}>
                      <Text style={styles.formLabel}>Nombre de la actividad *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ej: Natación, Boxeo, Pilates..."
                        placeholderTextColor="#666"
                        value={customActivityName}
                        onChangeText={setCustomActivityName}
                        autoCapitalize="words"
                      />
                    </View>
                  )}
                  
                  <View style={styles.formSection}>
                    <Text style={styles.formLabel}>{t('form.durationMinutesRequired')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ej: 30"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                      value={duration}
                      onChangeText={setDuration}
                    />
                  </View>

                  <View style={styles.formSection}>
                    <Text style={styles.formLabel}>{t('form.intensity.label')} {t('form.required')}</Text>
                    <View style={styles.intensityContainer}>
                      <TouchableOpacity
                        style={[
                          styles.intensityButton,
                          intensity === 'low' && styles.intensityButtonActive
                        ]}
                        onPress={() => setIntensity('low')}
                      >
                     <Text style={[
  styles.intensityButtonText,
  intensity === 'low' && styles.intensityButtonTextActive
]}>
  {t('form.intensity.low')}
</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.intensityButton,
                          intensity === 'medium' && styles.intensityButtonActive
                        ]}
                        onPress={() => setIntensity('medium')}
                      >
                      <Text style={[
  styles.intensityButtonText,
  intensity === 'medium' && styles.intensityButtonTextActive
]}>
  {t('form.intensity.medium')}
</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.intensityButton,
                          intensity === 'high' && styles.intensityButtonActive
                        ]}
                        onPress={() => setIntensity('high')}
                      >
                    <Text style={[
  styles.intensityButtonText,
  intensity === 'high' && styles.intensityButtonTextActive
]}>
  {t('form.intensity.high')}
</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.saveButton}
                    onPress={handleSaveManualActivity}
                  >
                    <Text style={styles.saveButtonText}>  {t('actions.saveActivity')}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 20,
    marginBottom: 20,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#ffb300',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
  },
  tabTextActive: {
    color: '#ffb300',
    fontWeight: '600',
  },
  periodNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  periodText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  statsCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statsGoal: {
    fontSize: 36,
    fontWeight: 'normal',
    color: '#666',
  },
  statsLabel: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 8,
  },
  statsSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  weekContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekExercisesSection: {
    marginTop: 24,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 8,
  },
  dayBar: {
    width: 36,
    height: 80,
    backgroundColor: '#2a2a2a',
    borderRadius: 18,
  },
  dayBarCompleted: {
    backgroundColor: '#ffb300',
  },
  dayBarToday: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  dayLabel: {
    fontSize: 12,
    color: '#999',
  },
  calendarGrid: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  calendarHeaderText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    width: 40,
    textAlign: 'center',
  },
  calendarDaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: (width - 40) / 7,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  calendarDayActive: {
    backgroundColor: '#2a6d5e',
    borderRadius: 25,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 25,
  },
  calendarDayText: {
    fontSize: 16,
    color: '#ffffff',
  },
  calendarDayTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  calendarDayTextToday: {
    fontWeight: 'bold',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  filterTab: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#ffb300',
  },
  filterIcon: {
    marginRight: 4,
  },
  filterTabText: {
    fontSize: 14,
    color: '#ffffff',
  },
  filterTabTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  exercisesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  exercisesList: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseCardInfo: {
    flex: 1,
  },
  exerciseCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  exerciseCardDate: {
    fontSize: 13,
    color: '#888',
    textTransform: 'capitalize',
  },
  exerciseCardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  exerciseCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseCardStatText: {
    fontSize: 13,
    color: '#888',
  },
  exerciseCardNotes: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  emptyExercises: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyExercisesText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  emptyExercisesSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  weekButton: {
    backgroundColor: '#2a6d5e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  weekButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a6d5e',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    gap: 8,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '60%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalOptions: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  optionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 8,
  },
  activitiesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 16,
  },
  activityCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  activityIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  trackingContainer: {
    flex: 1,
    padding: 20,
  },
  mapPlaceholder: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  mapPlaceholderText: {
    fontSize: 18,
    color: '#999',
    marginTop: 12,
  },
  trackingStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
  },
  trackingStat: {
    alignItems: 'center',
    gap: 8,
  },
  trackingStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  trackingStatLabel: {
    fontSize: 14,
    color: '#999',
  },
  stopButton: {
    alignItems: 'center',
    gap: 12,
    marginTop: 'auto',
    paddingVertical: 20,
  },
  stopButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff4444',
  },
  manualEntryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  saveButton: {
    backgroundColor: '#2a6d5e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  intensityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#3a3a3a',
    alignItems: 'center',
  },
  intensityButtonActive: {
    backgroundColor: '#2a6d5e',
    borderColor: '#ffb300',
  },
  intensityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textAlign: 'center',
  },
  intensityButtonTextActive: {
    color: '#ffffff',
  },
});

