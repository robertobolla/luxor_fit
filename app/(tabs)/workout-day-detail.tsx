import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useUser } from '@clerk/clerk-expo';
import { useAlert } from '../../src/contexts/AlertContext';
import { supabase } from '../../src/services/supabase';
import { WorkoutCompletion } from '../../src/types';
import ExerciseVideoModal from '../../src/components/ExerciseVideoModal';
import { ExerciseSetTracker } from '../../src/components/ExerciseSetTracker';
import { smartNotificationService } from '../../src/services/smartNotifications';
import { getExerciseVideoUrl } from '../../src/services/exerciseVideoService';
import { LoadingOverlay } from '../../src/components/LoadingOverlay';
import { useRetry } from '../../src/hooks/useRetry';
import Svg, { Circle } from 'react-native-svg';
import { Audio } from 'expo-av';
import { Vibration } from 'react-native';

// Determina si un ejercicio es de abdominales o peso corporal (sin RIR, más reps permitidas)
function isAbsOrBodyweightExercise(name: string): boolean {
  const absKeywords = [
    'abdominal', 'crunch', 'plancha', 'plank', 'sit-up', 'situp',
    'oblicuo', 'core', 'dead bug', 'dragon flag', 'leg raise',
    'elevacion de piernas', 'russian twist', 'giros rusos'
  ];
  const bodyweightKeywords = [
    'flexiones', 'push-up', 'pushup', 'push up',
    'dominadas', 'pull-up', 'pullup', 'pull up',
    'fondos', 'dips', 'burpees', 'jumping jack',
    'mountain climber', 'escalador'
  ];

  const lowerName = (name || '').toLowerCase();
  return absKeywords.some(k => lowerName.includes(k)) ||
    bodyweightKeywords.some(k => lowerName.includes(k));
}

// Función para enriquecer ejercicios de un día con progresión
function enrichDayExercises(dayData: any): any {
  if (!dayData || !dayData.exercises) return dayData;

  return {
    ...dayData,
    exercises: dayData.exercises.map((exercise: any, index: number) => {
      // Si ya tiene setTypes completos, no modificar
      if (exercise.setTypes && exercise.setTypes.length > 0 && exercise.setTypes[0]?.type) {
        return exercise;
      }

      const exerciseName = exercise.name || '';
      const isAbsOrBodyweight = isAbsOrBodyweightExercise(exerciseName);

      // Parsear el formato de reps: "8-10 @ RIR 2" o "10" o "8-10"
      const repsString = String(exercise.reps || '10');
      let { minReps, maxReps } = parseRepsString(repsString);

      // Aplicar límites de repeticiones para ejercicios normales (no abs/bodyweight)
      if (!isAbsOrBodyweight) {
        // Máximo 12 reps para empezar
        maxReps = Math.min(maxReps, 12);
        // Mínimo terminar por debajo de 10
        minReps = Math.min(minReps, 8);
        // Asegurar que maxReps >= minReps
        if (maxReps < minReps) {
          maxReps = minReps + 2;
        }
      }

      const numWorkingSets = exercise.sets || 4;
      const restSeconds = parseRestToSeconds(exercise.rest);

      // Agregar calentamiento SOLO al primer ejercicio del día (no para abs/bodyweight)
      const isFirstExercise = index === 0;
      const warmupCount = (isFirstExercise && !isAbsOrBodyweight) ? 2 : 0;

      const setTypes: any[] = [];
      const repsArray: number[] = [];

      // Series de calentamiento
      for (let i = 0; i < warmupCount; i++) {
        setTypes.push({ type: 'warmup', reps: null, rir: null });
        repsArray.push(0);
      }

      // Series de trabajo con progresión
      for (let i = 0; i < numWorkingSets; i++) {
        const progress = i / Math.max(numWorkingSets - 1, 1);
        const currentReps = Math.round(maxReps - ((maxReps - minReps) * progress));

        // Para ejercicios de abs/bodyweight: sin RIR
        if (isAbsOrBodyweight) {
          setTypes.push({
            type: 'normal',
            reps: currentReps,
            rir: null,
          });
        } else {
          const currentRir = Math.round(4 - (3 * progress)); // RIR 4 -> 1
          const isLastSet = i === numWorkingSets - 1;
          const isFailure = isLastSet && currentRir <= 1;

          setTypes.push({
            type: isFailure ? 'failure' : 'normal',
            reps: currentReps,
            rir: isFailure ? 0 : currentRir,
          });
        }
        repsArray.push(currentReps);
      }

      return {
        ...exercise,
        sets: warmupCount + numWorkingSets,
        reps: repsArray,
        setTypes,
        rest_seconds: restSeconds,
      };
    }),
  };
}

// Funciones auxiliares para enriquecer ejercicios
function parseRepsString(repsString: string): { minReps: number; maxReps: number; baseRir: number | null } {
  const rirMatch = repsString.match(/@\s*RIR\s*(\d+)/i);
  const baseRir = rirMatch ? parseInt(rirMatch[1]) : null;

  const repsOnlyString = repsString.replace(/@.*$/, '').trim();
  const rangeMatch = repsOnlyString.match(/(\d+)\s*[-–]\s*(\d+)/);

  if (rangeMatch) {
    return { minReps: parseInt(rangeMatch[1]), maxReps: parseInt(rangeMatch[2]), baseRir };
  }

  const singleMatch = repsOnlyString.match(/(\d+)/);
  const reps = singleMatch ? parseInt(singleMatch[1]) : 10;
  return { minReps: Math.max(reps - 2, 4), maxReps: reps, baseRir };
}

function parseRestToSeconds(rest: string | number | undefined): number {
  if (typeof rest === 'number') return rest;
  if (!rest) return 90;
  const match = String(rest).match(/(\d+)/);
  if (match) {
    const value = parseInt(match[0]);
    if (value > 300) return value;
    if (String(rest).toLowerCase().includes('min')) return value * 60;
    return value;
  }
  return 90;
}

function isCompoundExercise(name: string): boolean {
  const compounds = ['press', 'sentadilla', 'squat', 'peso muerto', 'deadlift', 'dominadas', 'pull-up', 'remo', 'row', 'hip thrust', 'zancadas', 'lunges', 'fondos', 'dips'];
  return compounds.some(k => (name || '').toLowerCase().includes(k));
}

export default function WorkoutDayDetailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const { showAlert } = useAlert();
  const { user } = useUser();

  // Parsear los datos del día con validación y enriquecimiento
  const parseDayData = (dataString: string | undefined) => {
    try {
      if (dataString) {
        const parsed = JSON.parse(dataString as string);
        // Enriquecer con progresión de series
        return enrichDayExercises(parsed);
      }
    } catch (e) {
      console.error('Error parseando dayData:', e);
    }
    return null;
  };

  const planName = params.planName as string || 'Plan de Entrenamiento';
  const planId = params.planId as string;
  const dayName = params.dayName as string; // ej: 'day_1'
  const isCustomPlan = params.isCustomPlan === 'true'; // Si es plan personalizado

  const [dayData, setDayData] = useState(parseDayData(params.dayData as string));
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [duration, setDuration] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [notes, setNotes] = useState('');

  // Estados para las series de ejercicios
  const [exerciseSets, setExerciseSets] = useState<{ [exerciseName: string]: any[] }>({});
  const [expandedExercises, setExpandedExercises] = useState<{ [exerciseName: string]: boolean }>({});

  // Estados para el modal de video
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoExerciseName, setVideoExerciseName] = useState('');

  // Estados para el temporizador de descanso
  const [showRestTimerModal, setShowRestTimerModal] = useState(false);
  const [selectedRestTime, setSelectedRestTime] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    checkIfCompleted();
  }, [user, planId, dayName]);

  // Limpiar timer cuando el modal se cierre
  useEffect(() => {
    if (!showRestTimerModal) {
      // Cuando el modal se cierra, asegurar que el timer se detiene
      setIsTimerRunning(false);
      setTimerSeconds(0);
      console.log('🧹 Modal cerrado: timer limpiado');
    }
  }, [showRestTimerModal]);

  // Recargar datos del plan cuando la pantalla gana foco
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Pantalla ganó foco, recargando datos del plan...');
      loadPlanData();
    }, [planId, dayName, user])
  );

  const loadPlanData = async () => {
    if (!planId || !dayName || !user?.id) {
      console.log('⚠️ Faltan datos para cargar el plan');
      return;
    }

    try {
      console.log('📥 Cargando plan desde Supabase...', { planId, dayName });

      const { data: planData, error } = await supabase
        .from('workout_plans')
        .select('plan_data')
        .eq('id', planId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('❌ Error cargando plan:', error);
        return;
      }

      if (planData?.plan_data) {
        const fullPlan = planData.plan_data as Record<string, any>;
        console.log('📦 Plan completo cargado, buscando día:', dayName);

        let dayDataFromDB = null;

        // Método 1: Buscar directamente por dayName (estructura plana)
        if (fullPlan[dayName]) {
          dayDataFromDB = fullPlan[dayName];
          console.log('✅ Día encontrado en estructura plana');
        }

        // Método 2: Buscar en multi_week_structure
        if (!dayDataFromDB && fullPlan.multi_week_structure && Array.isArray(fullPlan.multi_week_structure)) {
          // dayName puede ser "week_X_day_Y" o "Día X"
          const weekMatch = dayName.match(/week_(\d+)_day_(\d+)/i);

          for (const week of fullPlan.multi_week_structure) {
            if (week.days && Array.isArray(week.days)) {
              for (let i = 0; i < week.days.length; i++) {
                const day = week.days[i];
                // Buscar por coincidencia de dayKey o por índice
                if (day.day === dayName ||
                  (weekMatch && week.week_number === parseInt(weekMatch[1]) && i === parseInt(weekMatch[2]) - 1)) {
                  dayDataFromDB = day;
                  console.log('✅ Día encontrado en multi_week_structure');
                  break;
                }
              }
            }
            if (dayDataFromDB) break;
          }
        }

        // Método 3: Buscar en weekly_structure
        if (!dayDataFromDB && fullPlan.weekly_structure && Array.isArray(fullPlan.weekly_structure)) {
          const dayMatch = dayName.match(/day_(\d+)/i);
          const dayIndex = dayMatch ? parseInt(dayMatch[1]) - 1 : -1;

          for (let i = 0; i < fullPlan.weekly_structure.length; i++) {
            const day = fullPlan.weekly_structure[i];
            if (day.day === dayName || i === dayIndex) {
              dayDataFromDB = day;
              console.log('✅ Día encontrado en weekly_structure');
              break;
            }
          }
        }

        if (dayDataFromDB) {
          console.log('✅ Datos del día encontrados:', JSON.stringify(dayDataFromDB, null, 2).substring(0, 500));

          // Enriquecer ejercicios con progresión si no tienen setTypes
          const enrichedDayData = enrichDayExercises(dayDataFromDB);
          console.log('🔧 Ejercicios enriquecidos con progresión');

          setDayData(enrichedDayData);
        } else {
          console.warn('⚠️ No se encontraron datos para', dayName, '- Manteniendo datos originales del parámetro');
          // No sobrescribir dayData si no encontramos nada en la DB
          // Los datos del parámetro ya están cargados
        }
      }
    } catch (error) {
      console.error('❌ Error recargando datos del plan:', error);
    }
  };

  const checkIfCompleted = async () => {
    if (!user?.id || !planId || !dayName) return;

    setIsLoading(true);
    try {
      console.log('🔍 Verificando completado para:', { planId, dayName, user_id: user.id });

      // Verificar si fue completado hoy
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('workout_completions')
        .select('*')
        .eq('user_id', user.id)
        .eq('workout_plan_id', planId)
        .eq('day_name', dayName)
        .gte('completed_at', `${today}T00:00:00`)
        .lte('completed_at', `${today}T23:59:59`)
        .order('completed_at', { ascending: false })
        .limit(1);

      console.log('📊 Resultado verificación:', { data, error, isCompleted: data && data.length > 0 });

      if (error) {
        console.error('Error checking completion:', error);
        setIsCompleted(false);
        return;
      }

      if (data && data.length > 0) {
        setIsCompleted(true);
      } else {
        setIsCompleted(false);
      }
    } catch (err) {
      console.error('Error checking completion:', err);
      setIsCompleted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsCompleted = async () => {
    if (!user?.id || !planId || !dayName) return;

    if (isCompleted) {
      Alert.alert(t('workoutDay.completed'), t('workoutDay.alreadyCompleted'));
      return;
    }

    // Abrir modal para ingresar datos adicionales
    setShowCompletionModal(true);
  };

  // Hook para retry en guardado de entrenamiento
  const saveCompletionWithRetry = useRetry(
    async () => {
      if (!user?.id || !planId || !dayName || !dayData) {
        throw new Error('Datos incompletos');
      }

      const completion = {
        user_id: user.id,
        workout_plan_id: planId,
        day_name: dayName,
        completed_at: new Date().toISOString(),
        exercises_completed: dayData?.exercises || [],
        duration_minutes: duration ? parseInt(duration) : null,
        difficulty_rating: difficulty,
        notes: notes || null,
      };

      console.log('💾 Guardando entrenamiento completado:', { planId, dayName, user_id: user.id });

      const { error, data } = await supabase
        .from('workout_completions')
        .insert(completion)
        .select();

      if (error) {
        throw error;
      }

      console.log('✅ Entrenamiento guardado correctamente:', data);

      // Guardar entrenamiento en Apple Health / Google Fit
      if (duration) {
        const durationMinutes = parseInt(duration);
        // Calcular calorías estimadas basadas en duración y dificultad
        // Estimación: 5-8 calorías por minuto según dificultad
        const baseCaloriesPerMin = 6;
        const difficultyMultiplier = difficulty ? (difficulty / 3) : 1;
        const estimatedCalories = Math.round(durationMinutes * baseCaloriesPerMin * difficultyMultiplier);

        // Determinar tipo de entrenamiento basado en el plan
        const workoutType = dayData.focus?.toLowerCase().includes('cardio') ? 'Cardio' :
          dayData.focus?.toLowerCase().includes('hiit') ? 'HIIT' :
            dayData.focus?.toLowerCase().includes('yoga') ? 'Yoga' :
              'Traditional Strength Training';

        try {
          const { saveWorkoutToAppleHealth, saveWorkoutToGoogleFit } = await import('../../src/services/healthService');
          const Platform = require('react-native').Platform;

          if (Platform.OS === 'ios') {
            await saveWorkoutToAppleHealth(
              durationMinutes,
              estimatedCalories,
              undefined, // distancia (opcional)
              workoutType
            );
          } else if (Platform.OS === 'android') {
            await saveWorkoutToGoogleFit(
              durationMinutes,
              estimatedCalories,
              undefined, // distancia (opcional)
              workoutType
            );
          }
        } catch (error) {
          console.error('⚠️ Error guardando entrenamiento en app de salud:', error);
          // No fallar el guardado si hay error con la app de salud
        }
      }

      // Enviar notificación inmediata de entrenamiento completado
      await smartNotificationService.sendImmediateNotification(
        user.id,
        'workout_completed'
      );

      return data;
    },
    {
      maxRetries: 2,
      retryDelay: 2000,
      showAlert: true,
    }
  );

  const handleSaveCompletion = async () => {
    if (!user?.id || !planId || !dayName || !dayData) return;

    const result = await saveCompletionWithRetry.executeWithRetry();

    if (result) {
      setIsCompleted(true);
      setShowCompletionModal(false);
      // Resetear campos
      setDuration('');
      setDifficulty(3);
      setNotes('');
      showAlert(
        '¡Felicitaciones!',
        'Entrenamiento completado. ¡Sigue así!',
        [{ text: 'Entendido', style: 'default' }],
        { icon: 'trophy', iconColor: '#ffb300' }
      );
    }
  };

  const toggleExercise = (exerciseKey: string) => {
    setExpandedExercises(prev => ({
      ...prev,
      [exerciseKey]: !prev[exerciseKey],
    }));
  };

  const handleSetsChange = (exerciseName: string, sets: any[]) => {
    setExerciseSets(prev => ({
      ...prev,
      [exerciseName]: sets,
    }));
  };

  const formatRestTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOpenRestTimer = (restSeconds: number) => {
    setSelectedRestTime(restSeconds);
    setShowRestTimerModal(true);
  };

  const handleStartRestTimer = () => {
    if (!isTimerRunning) {
      // Primera vez o reiniciar - iniciar el temporizador
      setTimerSeconds(selectedRestTime);
      setIsTimerRunning(true);
    } else {
      // Ya está corriendo - reiniciar
      setTimerSeconds(selectedRestTime);
    }
  };

  // Función para reproducir sonido de finalización
  const playTimerSound = async () => {
    if (!soundEnabled) return;

    try {
      // Vibración de triple pulso
      Vibration.vibrate([0, 200, 100, 200, 100, 200]);

      // Reproducir sonido de notificación
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
        { shouldPlay: true, volume: 1.0 }
      );

      // Liberar el sonido después de reproducirlo
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Error reproduciendo sonido:', error);
      // Si falla el sonido, al menos vibrar
      Vibration.vibrate([0, 200, 100, 200, 100, 200]);
    }
  };

  // Effect para el countdown del temporizador
  useEffect(() => {
    // Si el timer no está corriendo, no hacer nada
    if (!isTimerRunning) {
      return;
    }

    // Si llegó a 0, detener y reproducir sonido
    if (timerSeconds === 0) {
      setIsTimerRunning(false);
      playTimerSound();
      return;
    }

    // Timer está corriendo y tiene tiempo restante
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          // Llegó a 0, el próximo useEffect se encargará del sonido
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // ✅ Cleanup: siempre limpiar el interval cuando el componente se desmonte
    // o cuando cambien las dependencias
    return () => {
      console.log('🧹 Limpiando timer interval');
      clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <LoadingOverlay visible={true} message={t('workoutDay.loadingWorkout')} fullScreen />
        </View>
      </>
    );
  }

  if (!dayData) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent]}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF5722" />
          <Text style={styles.errorText}>{t('workoutDay.noDataFound')}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/workout' as any)}>
            <Text style={styles.backButtonText}>{t('workoutDay.backToWorkout')}</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Tips generales basados en el enfoque del día
  const getTipsForFocus = (focus: string | undefined): string[] => {
    if (!focus) {
      return [
        t('workout.tips.general.0'),
        t('workout.tips.general.1'),
        t('workout.tips.general.2'),
        t('workout.tips.general.3'),
        t('workout.tips.general.4'),
      ];
    }

    const lowerFocus = focus.toLowerCase();

    if (lowerFocus.includes('fuerza') || lowerFocus.includes('push') || lowerFocus.includes('pull') || lowerFocus.includes('strength')) {
      return [
        t('workout.tips.strength.0'),
        t('workout.tips.strength.1'),
        t('workout.tips.strength.2'),
        t('workout.tips.strength.3'),
        t('workout.tips.strength.4'),
      ];
    } else if (lowerFocus.includes('cardio') || lowerFocus.includes('hiit')) {
      return [
        t('workout.tips.cardio.0'),
        t('workout.tips.cardio.1'),
        t('workout.tips.cardio.2'),
        t('workout.tips.cardio.3'),
        t('workout.tips.cardio.4'),
      ];
    } else if (lowerFocus.includes('inferior') || lowerFocus.includes('legs') || lowerFocus.includes('pierna')) {
      return [
        t('workout.tips.legs.0'),
        t('workout.tips.legs.1'),
        t('workout.tips.legs.2'),
        t('workout.tips.legs.3'),
        t('workout.tips.legs.4'),
      ];
    } else if (lowerFocus.includes('core') || lowerFocus.includes('accesorios') || lowerFocus.includes('abs')) {
      return [
        t('workout.tips.core.0'),
        t('workout.tips.core.1'),
        t('workout.tips.core.2'),
        t('workout.tips.core.3'),
        t('workout.tips.core.4'),
      ];
    } else {
      return [
        t('workout.tips.general.0'),
        t('workout.tips.general.1'),
        t('workout.tips.general.2'),
        t('workout.tips.general.3'),
        t('workout.tips.general.4'),
      ];
    }
  };

  // Consejos específicos por ejercicio
  const generalTips = getTipsForFocus(dayData.focus);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              // Volver al plan o a la pestaña de entrenar
              const planId = params.planId;
              if (planId) {
                router.push(`/(tabs)/workout-plan-detail?planId=${planId}` as any);
              } else {
                router.push('/(tabs)/workout' as any);
              }
            }}
            style={styles.backIconButton}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>{planName}</Text>
            <Text style={styles.headerTitle}>
              {(() => {
                const dayMatch = dayData.day.match(/(?:Day|Día)\s*(\d+)/i);
                if (dayMatch) {
                  return t('workout.dayName', { day: dayMatch[1] });
                }
                return dayData.day;
              })()}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              // Serializar datos para compartir
              const dayDataToShare = JSON.stringify({
                name: dayData.day,
                exercises: dayData.exercises,
                planName: planName
              });

              router.push({
                pathname: '/(tabs)/share-workout',
                params: {
                  planId: planId,
                  dayDataSource: dayDataToShare
                }
              } as any);
            }}
            style={styles.backIconButton}
          >
            <Ionicons name="share-social-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Day Info */}
        <View style={styles.dayInfo}>
          <View style={styles.focusContainer}>
            <Ionicons name="fitness" size={28} color="#ffb300" />
            <Text style={styles.focusText}>{dayData.focus}</Text>
          </View>
          {/* Solo mostrar duración en planes de IA (no en personalizados) */}
          {!isCustomPlan && dayData.duration && (
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={18} color="#ffb300" />
              <Text style={styles.durationText}>
                {t('time.minutes', { count: dayData.duration })}
              </Text>
            </View>
          )}
        </View>

        {/* Tips Generales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('workoutDay.tipsForSession')}</Text>
          <View style={styles.tipsContainer}>
            {generalTips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Botón Marcar como Completado */}
        <View style={styles.completionSection}>
          <TouchableOpacity
            style={[
              styles.completionButton,
              isCompleted && styles.completionButtonCompleted,
              saveCompletionWithRetry.isRetrying && styles.completionButtonDisabled
            ]}
            onPress={handleMarkAsCompleted}
            disabled={saveCompletionWithRetry.isRetrying || isCompleted}
          >
            {saveCompletionWithRetry.isRetrying ? (
              <Text style={styles.completionButtonText}>{t('workoutDay.saving')}</Text>
            ) : (
              <>
                <Ionicons
                  name={isCompleted ? "checkmark-circle" : "checkmark-circle-outline"}
                  size={24}
                  color={isCompleted ? "#4CAF50" : "#1a1a1a"}
                />
                <Text style={[
                  styles.completionButtonText,
                  isCompleted && styles.completionButtonTextCompleted
                ]}>
                  {isCompleted
                    ? t('workout.markCompleted.done')
                    : t('workout.markCompleted.pending')}
                </Text>

              </>
            )}
          </TouchableOpacity>
          {isCompleted && (
            <Text style={styles.completionNote}>
              {t('workout.completionNote')}
            </Text>

          )}
        </View>

        {/* Ejercicios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('workout.exercisesTitle', {
              count: dayData.exercises?.length || 0,
            })}
          </Text>
          {dayData.exercises?.map((exercise: any, index: number) => {
            const isOldFormat = typeof exercise === 'string';
            const isSuperset = !isOldFormat && exercise.type === 'superset';
            const exerciseName = isOldFormat ? exercise : (isSuperset ? 'SUPERSERIE' : exercise.name);
            const sets = isOldFormat ? null : exercise.sets;
            const reps = isOldFormat ? null : exercise.reps;
            const rest = isOldFormat ? null : exercise.rest;
            const setTypes = isOldFormat ? null : exercise.setTypes;
            const supersetExercises = isSuperset ? (exercise.exercises || []) : [];

            // Debug log
            console.log('Exercise:', {
              isOldFormat,
              isSuperset,
              exercise,
              sets,
              reps,
              rest,
              setTypes
            });

            const isExpanded = expandedExercises[exerciseName + '_' + index] || false;

            // Renderizado especial para superseries
            if (isSuperset) {
              const supersetSets = sets || 1;

              return (
                <View key={index} style={[styles.exerciseCard, styles.supersetCard]}>
                  <View style={styles.exerciseHeader}>
                    <View style={[styles.exerciseNumberBadge, styles.supersetBadge]}>
                      <Text style={styles.exerciseNumber}>#{index + 1}</Text>
                    </View>
                    <View style={styles.exerciseTitleContainer}>
                      <Text style={[styles.exerciseName, styles.supersetTitle]}>SUPERSERIE</Text>
                      <Text style={styles.supersetSubtitle}>
                        {supersetExercises.length} ejercicios • {supersetSets} {supersetSets === 1 ? 'serie' : 'series'}
                      </Text>
                    </View>
                  </View>

                  {/* Temporizador de descanso para superserie - igual que ejercicios normales */}
                  {exercise.rest_seconds && (
                    <TouchableOpacity
                      style={styles.restTimerContainer}
                      onPress={() => handleOpenRestTimer(exercise.rest_seconds || 90)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="timer-outline" size={18} color="#ffb300" />
                      <Text style={styles.restTimerLabel}>{t('workoutDay.restTimerLabel')}</Text>
                      <Text style={styles.restTimerValue}>
                        {formatRestTime(exercise.rest_seconds || 90)}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#666" />
                    </TouchableOpacity>
                  )}

                  {/* Lista de ejercicios de la superserie */}
                  <View style={styles.supersetExercisesList}>
                    {supersetExercises.map((ssEx: any, ssIdx: number) => {
                      // Calcular las reps a mostrar según las series de la superserie
                      let repsDisplay = '';
                      if (ssEx.reps) {
                        if (Array.isArray(ssEx.reps)) {
                          // Tomar solo las reps correspondientes al número de series
                          const repsToShow = ssEx.reps.slice(0, supersetSets);
                          repsDisplay = repsToShow.length === 1
                            ? `${repsToShow[0]} reps`
                            : `${repsToShow.join('/')} reps`;
                        } else {
                          repsDisplay = `${ssEx.reps} reps`;
                        }
                      }

                      return (
                        <View key={ssIdx} style={styles.supersetExerciseItem}>
                          <View style={styles.supersetExerciseBullet}>
                            <Text style={styles.supersetExerciseBulletText}>{ssIdx + 1}</Text>
                          </View>
                          <Text style={styles.supersetExerciseName}>{ssEx.name}</Text>
                          {repsDisplay && (
                            <Text style={styles.supersetExerciseReps}>{repsDisplay}</Text>
                          )}
                          <TouchableOpacity
                            style={styles.supersetVideoButton}
                            onPress={async () => {
                              try {
                                const url = await getExerciseVideoUrl(ssEx.name);
                                if (url) {
                                  setVideoUrl(url);
                                  setVideoExerciseName(ssEx.name);
                                  setShowVideoModal(true);
                                } else {
                                  Alert.alert(
                                    'Video no disponible',
                                    `No hay video asignado para "${ssEx.name}".`,
                                    [{ text: 'OK' }]
                                  );
                                }
                              } catch (error) {
                                console.error('Error al obtener video:', error);
                                Alert.alert(t('workoutDay.videoError'), t('workoutDay.couldNotLoadVideo'));
                              }
                            }}
                          >
                            <Ionicons name="play-circle" size={22} color="#ffb300" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            }

            return (
              <View key={index} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseNumberBadge}>
                    <Text style={styles.exerciseNumber}>#{index + 1}</Text>
                  </View>
                  <View style={styles.exerciseTitleContainer}>
                    <Text style={styles.exerciseName}>{exerciseName}</Text>
                  </View>
                  <View style={styles.exerciseActions}>
                    <TouchableOpacity
                      style={styles.registerButton}
                      onPress={() => toggleExercise(exerciseName + '_' + index)}
                    >
                      <Ionicons
                        name={isExpanded ? "chevron-up-circle" : "add-circle"}
                        size={24}
                        color="#ffb300"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.statsButton}
                      onPress={() => {
                        router.push({
                          pathname: '/exercise-progress-stats',
                          params: {
                            exerciseName: exerciseName,
                            exerciseId: exerciseName, // TODO: En el futuro usar ID real
                          },
                        } as any);
                      }}
                    >
                      <Ionicons name="stats-chart" size={20} color="#ffb300" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.videoButton}
                      onPress={async () => {
                        try {
                          console.log(`🎯 [workout-day-detail] Botón de video presionado para: "${exerciseName}"`);
                          const url = await getExerciseVideoUrl(exerciseName);

                          if (url) {
                            console.log(`📹 [workout-day-detail] Video URL obtenida: ${url}`);
                            setVideoUrl(url);
                            setVideoExerciseName(exerciseName);
                            setShowVideoModal(true);
                          } else {
                            console.log(`⚠️ [workout-day-detail] No hay video para: "${exerciseName}"`);
                            Alert.alert(
                              'Video no disponible',
                              `No hay video asignado para "${exerciseName}". Puedes agregar uno desde la configuración de ejercicios.`,
                              [{ text: 'OK' }]
                            );
                          }
                        } catch (error) {
                          console.error('❌ [workout-day-detail] Error al obtener video:', error);
                          Alert.alert(t('workoutDay.videoError'), t('workoutDay.couldNotLoadVideo'));
                        }
                      }}
                    >
                      <Ionicons name="play-circle" size={20} color="#ffb300" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Temporizador de Descanso */}
                {!isOldFormat && exercise.rest_seconds && (
                  <TouchableOpacity
                    style={styles.restTimerContainer}
                    onPress={() => handleOpenRestTimer(exercise.rest_seconds || 120)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="timer-outline" size={18} color="#ffb300" />
                    <Text style={styles.restTimerLabel}>{t('workoutDay.restTimerLabel')}</Text>
                    <Text style={styles.restTimerValue}>
                      {formatRestTime(exercise.rest_seconds || 120)}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#666" />
                  </TouchableOpacity>
                )}

                {/* Tracker de series */}
                {isExpanded && user?.id && (
                  <ExerciseSetTracker
                    userId={user.id}
                    exerciseId={exerciseName} // TODO: En el futuro usar el ID real del ejercicio
                    exerciseName={exerciseName}
                    defaultSets={sets || 3}
                    usesTime={false} // TODO: Detectar si el ejercicio usa tiempo
                    setTypes={setTypes || []} // Pasar tipos de series para excluir calentamiento
                    onSetsChange={(sets) => handleSetsChange(exerciseName + '_' + index, sets)}
                    planId={planId} // Identificar por plan
                    dayName={dayName} // Identificar por día de rutina
                  />
                )}

                {!isExpanded && !isOldFormat && sets && reps && (
                  <View style={styles.setsGrid}>
                    {(() => {
                      // Convertir reps a array si no lo es
                      const repsArray = Array.isArray(reps) ? reps : Array(sets).fill(reps);

                      // Generar array de series con sus tipos
                      const seriesData = [];
                      let seriesCount = 0; // Contador para series normales y al fallo

                      for (let i = 0; i < sets; i++) {
                        const setType = setTypes?.[i]?.type || 'normal';
                        const setReps = repsArray[i] || reps;
                        const setRir = setTypes?.[i]?.rir;

                        let label = '';
                        let badgeStyle = 'normal';

                        switch (setType) {
                          case 'warmup':
                            label = 'C';
                            badgeStyle = 'warmup';
                            break;
                          case 'failure':
                            seriesCount++;
                            label = `${seriesCount} F`;
                            badgeStyle = 'failure';
                            break;
                          case 'drop':
                            label = 'D';
                            badgeStyle = 'drop';
                            break;
                          case 'normal':
                          default:
                            seriesCount++;
                            label = seriesCount.toString();
                            badgeStyle = 'normal';
                        }

                        seriesData.push({
                          label,
                          reps: setReps,
                          type: setType,
                          rir: setRir,
                          badgeStyle,
                        });
                      }

                      return seriesData.map((serie, idx) => (
                        <View key={idx} style={styles.setBadge}>
                          <View style={[
                            styles.setBadgeNumber,
                            serie.badgeStyle === 'warmup' && styles.setBadgeWarmup,
                            serie.badgeStyle === 'normal' && styles.setBadgeNormal,
                            serie.badgeStyle === 'failure' && styles.setBadgeFailure,
                            serie.badgeStyle === 'drop' && styles.setBadgeDrop,
                          ]}>
                            <Text style={styles.setBadgeNumberText}>{serie.label}</Text>
                          </View>
                          <View style={styles.setBadgeContent}>
                            {serie.type === 'warmup' ? (
                              <Text style={styles.setBadgeReps}>{t('workoutDay.warmup')}</Text>
                            ) : serie.type === 'failure' ? (
                              <View style={styles.setBadgeInfo}>
                                <Text style={styles.setBadgeReps}>
                                  {serie.reps} reps
                                </Text>
                                <Text style={styles.setBadgeFailureText}>{t('workoutDay.toFailure')}</Text>
                              </View>
                            ) : (
                              <View style={styles.setBadgeInfo}>
                                <Text style={styles.setBadgeReps}>
                                  {serie.reps} reps
                                </Text>
                                {serie.rir !== null && serie.rir !== undefined && (
                                  <Text style={styles.setBadgeRir}>RIR {serie.rir}</Text>
                                )}
                              </View>
                            )}
                          </View>
                        </View>
                      ));
                    })()}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Notas Finales */}
        <View style={styles.section}>
          <View style={styles.finalNotesCard}>
            <Ionicons name="information-circle" size={24} color="#ffb300" />
            <View style={styles.finalNotesContent}>
              <Text style={styles.finalNotesTitle}>{t('workoutDay.remember')}</Text>
              <Text style={styles.finalNotesText}>
                {t('workout.finalNotes')}
              </Text>

            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de completar entrenamiento */}
      <Modal
        visible={showCompletionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <View style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>{t('workoutDay.completeWorkout')}</Text>
              <Text style={styles.modalSubtitle}>{t('workoutDay.registerDetails')}</Text>

              {/* Duración */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('workoutDay.durationLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="45"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                />
                <Text style={styles.inputHint}>
                  {t('workout.inputHint')}
                </Text>
              </View>

              {/* Dificultad */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t('workout.perceivedDifficulty')}
                </Text>
                <View style={styles.difficultyContainer}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.difficultyButton,
                        difficulty === level && styles.difficultyButtonActive
                      ]}
                      onPress={() => setDifficulty(level)}
                    >
                      <Text style={[
                        styles.difficultyText,
                        difficulty === level && styles.difficultyTextActive
                      ]}>
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.inputHint}>
                  {t('workout.difficultyScaleHint')}
                </Text>

              </View>

              {/* Notas */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t('workout.notesOptional')}
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('workout.notesPlaceholder')}
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Botones */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setShowCompletionModal(false);
                    setDuration('');
                    setDifficulty(3);
                    setNotes('');
                  }}
                >
                  <Text style={styles.modalButtonTextCancel}>  {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={handleSaveCompletion}
                  disabled={saveCompletionWithRetry.isRetrying}
                >
                  {saveCompletionWithRetry.isRetrying ? (
                    <Text style={styles.modalButtonTextConfirm}>  {t('common.saving')}
                    </Text>
                  ) : (
                    <Text style={styles.modalButtonTextConfirm}>  {t('common.save')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal de video del ejercicio */}
      <ExerciseVideoModal
        visible={showVideoModal}
        videoUrl={videoUrl}
        exerciseName={videoExerciseName}
        onClose={() => setShowVideoModal(false)}
      />

      {/* Modal de Temporizador de Descanso */}
      <Modal
        visible={showRestTimerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRestTimerModal(false)}
      >
        <View style={styles.timerModalOverlay}>
          <View style={styles.timerModalContent}>
            <View style={styles.timerModalHeader}>
              <Ionicons name="timer" size={24} color="#ffb300" />
              <Text style={styles.timerModalTitle}>  {t('timer.restTimerTitle')}
              </Text>
            </View>

            <View style={styles.timePickerContainer}>
              <View style={styles.timeDisplay}>
                {/* Círculo progresivo SVG */}
                <Svg width="200" height="200" style={{ position: 'absolute' }}>
                  {/* Círculo de fondo (gris) */}
                  <Circle
                    cx="100"
                    cy="100"
                    r="92"
                    stroke="#333"
                    strokeWidth="8"
                    fill="none"
                  />
                  {/* Círculo de progreso (amarillo) */}
                  <Circle
                    cx="100"
                    cy="100"
                    r="92"
                    stroke="#ffb300"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 92}`}
                    strokeDashoffset={
                      isTimerRunning
                        ? (2 * Math.PI * 92) * (timerSeconds / selectedRestTime)
                        : 0
                    }
                    strokeLinecap="round"
                    rotation="-90"
                    origin="100, 100"
                  />
                </Svg>

                <Text style={styles.timeDisplayText}>
                  {isTimerRunning ? formatRestTime(timerSeconds) : formatRestTime(selectedRestTime)}
                </Text>
              </View>

              {!isTimerRunning && (
                <View style={styles.timeAdjustButtons}>
                  <TouchableOpacity
                    style={styles.timeAdjustButton}
                    onPress={() => setSelectedRestTime(Math.max(15, selectedRestTime - 15))}
                  >
                    <Text style={styles.timeAdjustButtonText}>-15s</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.timeAdjustButton}
                    onPress={() => setSelectedRestTime(selectedRestTime + 15)}
                  >
                    <Text style={styles.timeAdjustButtonText}>+15s</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Botón de control de sonido */}
            <TouchableOpacity
              onPress={() => setSoundEnabled(!soundEnabled)}
              style={styles.soundButton}
            >
              <Ionicons
                name={soundEnabled ? "volume-high" : "volume-mute"}
                size={26}
                color={soundEnabled ? "#ffb300" : "#666"}
              />
            </TouchableOpacity>

            <View style={styles.timerModalActions}>
              <TouchableOpacity
                style={styles.timerCancelButton}
                onPress={() => {
                  // Detener el timer y limpiar estado
                  setIsTimerRunning(false);
                  setTimerSeconds(0);
                  // Cerrar modal después de limpiar el estado
                  setShowRestTimerModal(false);
                  console.log('🛑 Timer detenido y modal cerrado');
                }}
              >
                <Text style={styles.timerCancelButtonText}>  {t('common.close')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timerStartButton}
                onPress={handleStartRestTimer}
              >
                <Ionicons name={isTimerRunning ? "refresh" : "play"} size={20} color="#1a1a1a" />
                <Text style={styles.timerStartButtonText}>
                  {isTimerRunning
                    ? t('timer.restart')
                    : t('timer.start')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333',
  },
  textArea: {
    minHeight: 80,
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  difficultyButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  difficultyButtonActive: {
    backgroundColor: '#ffb300',
    borderColor: '#ffb300',
  },
  difficultyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
  },
  difficultyTextActive: {
    color: '#1a1a1a',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#2a2a2a',
  },
  modalButtonConfirm: {
    backgroundColor: '#ffb300',
  },
  modalButtonTextCancel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  backIconButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  dayInfo: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  focusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  focusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffb300',
    marginLeft: 12,
    flex: 1,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  durationText: {
    fontSize: 14,
    color: '#ffb300',
    fontWeight: '600',
    marginLeft: 6,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  tipsContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  tipItem: {
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
  },
  exerciseCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  exerciseNumberBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#ffb300',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffb300',
  },
  exerciseTitleContainer: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  registerButton: {
    padding: 4,
  },
  videoButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffb30020',
  },
  exerciseStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  seriesDetailContainer: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  // Nuevos estilos de badges (igual que en edición)
  setsGrid: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  setBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#333',
    gap: 10,
  },
  setBadgeNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setBadgeWarmup: {
    backgroundColor: '#4CAF50',
  },
  setBadgeNormal: {
    backgroundColor: '#ffb300',
  },
  setBadgeFailure: {
    backgroundColor: '#F44336',
  },
  setBadgeDrop: {
    backgroundColor: '#9C27B0',
  },
  setBadgeNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  setBadgeContent: {
    flexDirection: 'column',
  },
  setBadgeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setBadgeReps: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  setBadgeRir: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffb300',
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  setBadgeFailureText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  // Estilos anteriores (mantener compatibilidad)
  serieDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serieLabel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serieLabelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  serieDetailText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  serieTypeText: {
    fontSize: 12,
    color: '#999',
    fontWeight: 'normal',
    fontStyle: 'italic',
  },
  serieRirText: {
    fontSize: 13,
    color: '#ffb300',
    fontWeight: '600',
  },
  completionSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  completionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffb300',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
  },
  completionButtonCompleted: {
    backgroundColor: '#2a2a2a',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  completionButtonDisabled: {
    opacity: 0.6,
  },
  completionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  completionButtonTextCompleted: {
    color: '#4CAF50',
  },
  completionNote: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
  statsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffb300',
    marginLeft: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statBadgeText: {
    fontSize: 13,
    color: '#ffb300',
    fontWeight: '600',
    marginLeft: 6,
  },
  finalNotesCard: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  finalNotesContent: {
    flex: 1,
    marginLeft: 12,
  },
  finalNotesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffb300',
    marginBottom: 8,
  },
  finalNotesText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
  },
  // Estilos para el temporizador de descanso
  restTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 14,
    gap: 8,
  },
  restTimerLabel: {
    fontSize: 15,
    color: '#ffb300',
    fontWeight: '500',
  },
  restTimerValue: {
    fontSize: 15,
    color: '#ffb300',
    fontWeight: '600',
    marginRight: 4,
  },
  timerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerModalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  timerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  soundButton: {
    padding: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  timerModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  timePickerContainer: {
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
  },
  timeDisplay: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timeDisplayText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  timeAdjustButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  timeAdjustButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  timeAdjustButtonText: {
    color: '#ffb300',
    fontSize: 16,
    fontWeight: '600',
  },
  timerModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  timerCancelButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  timerCancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  timerStartButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ffb300',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timerStartButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Estilos para superseries
  supersetCard: {
    borderColor: '#9C27B0',
    borderWidth: 2,
  },
  supersetBadge: {
    borderColor: '#9C27B0',
  },
  supersetTitle: {
    color: '#9C27B0',
  },
  supersetSubtitle: {
    fontSize: 13,
    color: '#ffffff',
    marginTop: 2,
  },
  supersetExercisesList: {
    marginTop: 8,
    marginBottom: 12,
    paddingLeft: 4,
    gap: 8,
  },
  supersetExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 10,
  },
  supersetExerciseBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#9C27B0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supersetExerciseBulletText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  supersetExerciseName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  supersetExerciseReps: {
    fontSize: 13,
    color: '#9C27B0',
    fontWeight: '600',
  },
  supersetVideoButton: {
    padding: 4,
    marginLeft: 8,
  },
  supersetTrackerContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  supersetTrackerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C27B0',
    marginBottom: 12,
  },
  supersetTrackerExercise: {
    marginBottom: 16,
  },
  supersetTrackerExerciseName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    paddingLeft: 4,
  },
});

