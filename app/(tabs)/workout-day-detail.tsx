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
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../../src/services/supabase';
import { WorkoutCompletion } from '../../src/types';
import ExerciseVideoModal from '../../src/components/ExerciseVideoModal';
import { ExerciseSetTracker } from '../../src/components/ExerciseSetTracker';
import { smartNotificationService } from '../../src/services/smartNotifications';
import { getExerciseVideoUrl } from '../../src/services/exerciseVideoService';
import { LoadingOverlay } from '../../src/components/LoadingOverlay';
import { useRetry } from '../../src/hooks/useRetry';

export default function WorkoutDayDetailScreen() {
  const params = useLocalSearchParams();
  const { user } = useUser();
  
  // Parsear los datos del día con validación
  let dayData = null;
  try {
    if (params.dayData) {
      dayData = JSON.parse(params.dayData as string);
    }
  } catch (e) {
    console.error('Error parseando dayData:', e);
    dayData = null;
  }
  
  const planName = params.planName as string || 'Plan de Entrenamiento';
  const planId = params.planId as string;
  const dayName = params.dayName as string; // ej: 'day_1'
  
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
  
  useEffect(() => {
    checkIfCompleted();
  }, [user, planId, dayName]);
  
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
      Alert.alert('Ya completado', 'Ya marcaste este entrenamiento como completado hoy.');
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
      Alert.alert('¡Felicitaciones! 🎉', 'Entrenamiento completado. ¡Sigue así!');
    }
  };

  const toggleExercise = (exerciseName: string) => {
    setExpandedExercises(prev => ({
      ...prev,
      [exerciseName]: !prev[exerciseName],
    }));
  };

  const handleSetsChange = (exerciseName: string, sets: any[]) => {
    setExerciseSets(prev => ({
      ...prev,
      [exerciseName]: sets,
    }));
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <LoadingOverlay visible={true} message="Cargando entrenamiento..." fullScreen />
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
          <Text style={styles.errorText}>No se encontraron datos del día</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/workout' as any)}>
            <Text style={styles.backButtonText}>Volver a Entrenar</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Tips generales basados en el enfoque del día
  const getTipsForFocus = (focus: string | undefined): string[] => {
    if (!focus) {
      return [
        '🔥 Calienta bien antes de empezar (5-10 min)',
        '💪 Prioriza la técnica sobre el peso',
        '⏱️ Respeta los tiempos de descanso',
        '🎯 Mantén el core activado durante todos los ejercicios',
        '📈 Escucha a tu cuerpo y ajusta la intensidad según sea necesario',
      ];
    }
    
    const lowerFocus = focus.toLowerCase();
    
    if (lowerFocus.includes('fuerza') || lowerFocus.includes('push') || lowerFocus.includes('pull')) {
      return [
        '🔥 Calienta bien antes de empezar (5-10 min)',
        '💪 Prioriza la técnica sobre el peso',
        '⏱️ Respeta los tiempos de descanso para recuperación óptima',
        '🎯 Mantén el core activado durante todos los ejercicios',
        '📈 Aumenta el peso solo cuando puedas completar todas las series con buena forma',
      ];
    } else if (lowerFocus.includes('cardio') || lowerFocus.includes('hiit')) {
      return [
        '🔥 Calienta con 5 min de cardio ligero',
        '💧 Mantén una botella de agua cerca',
        '⏱️ Usa un cronómetro para controlar intervalos',
        '🎯 Enfócate en mantener la intensidad alta',
        '😮‍💨 Controla tu respiración durante los ejercicios',
      ];
    } else if (lowerFocus.includes('inferior')) {
      return [
        '🔥 Calienta con movilidad de cadera y rodillas',
        '💪 Mantén la espalda recta en todos los ejercicios',
        '⏱️ Descansos más largos para ejercicios pesados',
        '🎯 Empuja desde los talones en sentadillas',
        '📈 Progresa gradualmente para evitar lesiones',
      ];
    } else if (lowerFocus.includes('core') || lowerFocus.includes('accesorios')) {
      return [
        '🔥 Activa el core antes de cada ejercicio',
        '💪 Calidad sobre cantidad en cada repetición',
        '⏱️ Mantén la tensión constante',
        '🎯 Respira correctamente (exhala en el esfuerzo)',
        '📈 Aumenta tiempo bajo tensión antes que peso',
      ];
    } else {
      return [
        '🔥 Calienta adecuadamente antes de empezar',
        '💪 Mantén buena técnica en todos los ejercicios',
        '⏱️ Respeta los tiempos de descanso',
        '🎯 Escucha a tu cuerpo y ajusta si es necesario',
        '📈 Progresa gradualmente semana a semana',
      ];
    }
  };

  // Consejos específicos por ejercicio
  const getExerciseTips = (exerciseName: string): string[] => {
    const lowerName = exerciseName.toLowerCase();
    
    if (lowerName.includes('sentadilla') || lowerName.includes('squat')) {
      return [
        'Pies al ancho de hombros',
        'Rodillas alineadas con los pies',
        'Baja hasta que muslos estén paralelos al suelo',
        'Mantén el pecho arriba y mirada al frente',
      ];
    } else if (lowerName.includes('press') && lowerName.includes('banca')) {
      return [
        'Retrae los omóplatos',
        'Pies firmes en el suelo',
        'Barra a la altura del pecho medio',
        'Codos a 45° del cuerpo',
      ];
    } else if (lowerName.includes('peso muerto') || lowerName.includes('deadlift')) {
      return [
        'Espalda neutral en todo momento',
        'Barra cerca de las espinillas',
        'Empuja con las piernas primero',
        'Extiende caderas al final del movimiento',
      ];
    } else if (lowerName.includes('dominada') || lowerName.includes('pull')) {
      return [
        'Agarre firme, manos al ancho de hombros',
        'Retrae omóplatos antes de subir',
        'Barbilla sobre la barra',
        'Baja controladamente',
      ];
    } else if (lowerName.includes('press militar') || lowerName.includes('overhead')) {
      return [
        'Core activado para proteger espalda baja',
        'Barra frente a la cara al subir',
        'Codos ligeramente adelante',
        'Extensión completa arriba',
      ];
    } else if (lowerName.includes('remo')) {
      return [
        'Espalda plana durante todo el movimiento',
        'Lleva codos hacia atrás, no arriba',
        'Contrae omóplatos al final',
        'Controla el peso en la bajada',
      ];
    } else if (lowerName.includes('plancha') || lowerName.includes('plank')) {
      return [
        'Cuerpo en línea recta',
        'Core contraído todo el tiempo',
        'No dejes caer las caderas',
        'Respira normalmente',
      ];
    } else if (lowerName.includes('burpee')) {
      return [
        'Mantén el ritmo constante',
        'Flexión completa en el suelo',
        'Salto explosivo al final',
        'Aterriza suavemente',
      ];
    } else {
      return [
        'Mantén buena técnica',
        'Controla el movimiento',
        'Respira correctamente',
        'Concentración en el músculo objetivo',
      ];
    }
  };

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
            <Text style={styles.headerTitle}>{dayData.day}</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Day Info */}
        <View style={styles.dayInfo}>
          <View style={styles.focusContainer}>
            <Ionicons name="fitness" size={28} color="#ffb300" />
            <Text style={styles.focusText}>{dayData.focus}</Text>
          </View>
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={18} color="#ffb300" />
            <Text style={styles.durationText}>{dayData.duration} minutos</Text>
          </View>
        </View>

        {/* Tips Generales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Tips para esta sesión</Text>
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
              <Text style={styles.completionButtonText}>Guardando...</Text>
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
                  {isCompleted ? '✓ Entrenamiento Completado' : 'Marcar como Completado'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {isCompleted && (
            <Text style={styles.completionNote}>
              ¡Excelente trabajo! 💪 Sigue así.
            </Text>
          )}
        </View>

        {/* Ejercicios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏋️ Ejercicios ({dayData.exercises?.length || 0})</Text>
          {dayData.exercises?.map((exercise: any, index: number) => {
            const isOldFormat = typeof exercise === 'string';
            const exerciseName = isOldFormat ? exercise : exercise.name;
            const sets = isOldFormat ? null : exercise.sets;
            const reps = isOldFormat ? null : exercise.reps;
            const rest = isOldFormat ? null : exercise.rest;
            const setTypes = isOldFormat ? null : exercise.setTypes;
            const exerciseTips = getExerciseTips(exerciseName);

            // Debug log
            console.log('Exercise:', { isOldFormat, exercise, sets, reps, rest, setTypes });

            const isExpanded = expandedExercises[exerciseName] || false;

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
                      onPress={() => toggleExercise(exerciseName)}
                    >
                      <Ionicons 
                        name={isExpanded ? "chevron-up-circle" : "add-circle"} 
                        size={24} 
                        color="#ffb300" 
                      />
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
                          Alert.alert('Error', 'No se pudo cargar el video del ejercicio');
                        }
                      }}
                    >
                      <Ionicons name="play-circle" size={20} color="#ffb300" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Tracker de series */}
                {isExpanded && user?.id && (
                  <ExerciseSetTracker
                    userId={user.id}
                    exerciseId={exerciseName} // TODO: En el futuro usar el ID real del ejercicio
                    exerciseName={exerciseName}
                    defaultSets={sets || 3}
                    usesTime={false} // TODO: Detectar si el ejercicio usa tiempo
                    onSetsChange={(sets) => handleSetsChange(exerciseName, sets)}
                  />
                )}

                {!isExpanded && !isOldFormat && sets && reps && (
                  <View style={styles.seriesDetailContainer}>
                    {(() => {
                      // Convertir reps a array si no lo es
                      const repsArray = Array.isArray(reps) ? reps : Array(sets).fill(reps);
                      
                      // Generar array de series con sus tipos
                      const seriesData = [];
                      let normalSeriesCount = 0;
                      
                      for (let i = 0; i < sets; i++) {
                        const setType = setTypes?.[i]?.type || 'normal';
                        const setReps = repsArray[i] || reps;
                        
                        let label = '';
                        let color = '#ffb300';
                        let typeText = '';
                        
                        switch (setType) {
                          case 'warmup':
                            label = 'C';
                            color = '#4CAF50';
                            typeText = ' (Calentamiento)';
                            break;
                          case 'failure':
                            label = 'F';
                            color = '#F44336';
                            typeText = ' (Al Fallo)';
                            break;
                          case 'drop':
                            label = 'D';
                            color = '#9C27B0';
                            typeText = ' (Drop)';
                            break;
                          case 'normal':
                          default:
                            normalSeriesCount++;
                            label = normalSeriesCount.toString();
                            color = '#ffb300';
                            typeText = '';
                        }
                        
                        seriesData.push({
                          label,
                          reps: setReps,
                          color,
                          typeText,
                        });
                      }
                      
                      return seriesData.map((serie, idx) => (
                        <View key={idx} style={styles.serieDetailItem}>
                          <View style={[styles.serieLabel, { backgroundColor: serie.color }]}>
                            <Text style={styles.serieLabelText}>{serie.label}</Text>
                          </View>
                          <Text style={styles.serieDetailText}>
                            {serie.reps} {typeof serie.reps === 'string' && serie.reps.toLowerCase() === 'al fallo' ? '' : 'reps'}
                            <Text style={styles.serieTypeText}>{serie.typeText}</Text>
                          </Text>
                        </View>
                      ));
                    })()}
                  </View>
                )}

                <View style={styles.exerciseTips}>
                  <Text style={styles.exerciseTipsTitle}>📌 Puntos clave:</Text>
                  {exerciseTips.map((tip, idx) => (
                    <View key={idx} style={styles.exerciseTipItem}>
                      <View style={styles.bulletPoint} />
                      <Text style={styles.exerciseTipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {/* Notas Finales */}
        <View style={styles.section}>
          <View style={styles.finalNotesCard}>
            <Ionicons name="information-circle" size={24} color="#ffb300" />
            <View style={styles.finalNotesContent}>
              <Text style={styles.finalNotesTitle}>Recuerda</Text>
              <Text style={styles.finalNotesText}>
                • Hidrátate durante toda la sesión{'\n'}
                • Si sientes dolor (no molestia), detente{'\n'}
                • Estira al finalizar (5-10 min){'\n'}
                • Registra tus pesos/reps para seguir tu progreso
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
            <Text style={styles.modalTitle}>Completar Entrenamiento</Text>
            <Text style={styles.modalSubtitle}>Registra los detalles de tu sesión</Text>

            {/* Duración */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>⏱️ Duración (minutos)</Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                placeholder="45"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
              <Text style={styles.inputHint}>Opcional - Ayuda a mejorar el plan</Text>
            </View>

            {/* Dificultad */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>💪 Dificultad percibida</Text>
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
                1=Muy fácil, 5=Muy difícil
              </Text>
            </View>

            {/* Notas */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>📝 Notas (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="¿Cómo te sentiste? ¿Qué notaste?"
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
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleSaveCompletion}
                disabled={saveCompletionWithRetry.isRetrying}
              >
                {saveCompletionWithRetry.isRetrying ? (
                  <Text style={styles.modalButtonTextConfirm}>Guardando...</Text>
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Guardar</Text>
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
  videoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffb300',
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
  exerciseTips: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
  },
  exerciseTipsTitle: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
    marginBottom: 8,
  },
  exerciseTipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletPoint: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffb300',
    marginTop: 6,
    marginRight: 8,
  },
  exerciseTipText: {
    fontSize: 13,
    color: '#ccc',
    flex: 1,
    lineHeight: 18,
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
});

