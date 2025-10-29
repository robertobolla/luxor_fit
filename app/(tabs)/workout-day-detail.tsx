import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
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
import PersonalRecordModal from '../../src/components/PersonalRecordModal';
import { smartNotificationService } from '../../src/services/smartNotifications';

export default function WorkoutDayDetailScreen() {
  const params = useLocalSearchParams();
  const { user } = useUser();
  
  // Parsear los datos del día
  const dayData = params.dayData ? JSON.parse(params.dayData as string) : null;
  const planName = params.planName as string || 'Plan de Entrenamiento';
  const planId = params.planId as string;
  const dayName = params.dayName as string; // ej: 'day_1'
  
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [duration, setDuration] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [notes, setNotes] = useState('');
  
  // Estados para el modal de records personales
  const [showPRModal, setShowPRModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState('');
  
  useEffect(() => {
    checkIfCompleted();
  }, [user, planId, dayName]);
  
  const checkIfCompleted = async () => {
    if (!user?.id || !planId || !dayName) return;
    
    setIsLoading(true);
    try {
      console.log('🔍 Verificando completado para:', { planId, dayName, user_id: user.id });
      
      const { data, error } = await supabase
        .from('workout_completions')
        .select('*')
        .eq('user_id', user.id)
        .eq('workout_plan_id', planId)
        .eq('day_name', dayName)
        .order('completed_at', { ascending: false })
        .limit(1);
      
      console.log('📊 Resultado verificación:', { data, error, isCompleted: data && data.length > 0 });
      
      if (data && data.length > 0 && !error) {
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

  const handleSaveCompletion = async () => {
    if (!user?.id || !planId || !dayName) return;
    
    setIsSaving(true);
    try {
      const completion = {
        user_id: user.id,
        workout_plan_id: planId,
        day_name: dayName,
        completed_at: new Date().toISOString(),
        exercises_completed: dayData.exercises || [],
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
      
      // Enviar notificación inmediata de entrenamiento completado
      await smartNotificationService.sendImmediateNotification(
        user.id,
        'workout_completed'
      );
      
      setIsCompleted(true);
      setShowCompletionModal(false);
      // Resetear campos
      setDuration('');
      setDifficulty(3);
      setNotes('');
      Alert.alert('¡Felicitaciones! 🎉', 'Entrenamiento completado. ¡Sigue así!');
    } catch (err: any) {
      console.error('❌ Error saving completion:', err);
      Alert.alert('Error', 'No se pudo guardar el entrenamiento.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPRModal = (exerciseName: string) => {
    setSelectedExercise(exerciseName);
    setShowPRModal(true);
  };

  if (!dayData) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent]}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF5722" />
          <Text style={styles.errorText}>No se encontraron datos del día</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // Tips generales basados en el enfoque del día
  const getTipsForFocus = (focus: string): string[] => {
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
              // Volver al detalle del plan usando el planId de los params
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
            <Ionicons name="fitness" size={28} color="#00D4AA" />
            <Text style={styles.focusText}>{dayData.focus}</Text>
          </View>
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={18} color="#00D4AA" />
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
              isSaving && styles.completionButtonDisabled
            ]}
            onPress={handleMarkAsCompleted}
            disabled={isSaving || isCompleted}
          >
            {isSaving ? (
              <ActivityIndicator color="#1a1a1a" />
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
            const exerciseTips = getExerciseTips(exerciseName);

            // Debug log
            console.log('Exercise:', { isOldFormat, exercise, sets, reps, rest });

            return (
              <View key={index} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseNumberBadge}>
                    <Text style={styles.exerciseNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.exerciseTitleContainer}>
                    <Text style={styles.exerciseName}>{exerciseName}</Text>
                  </View>
                  <View style={styles.exerciseActions}>
                    <TouchableOpacity 
                      style={styles.prButton}
                      onPress={() => handleOpenPRModal(exerciseName)}
                    >
                      <Ionicons name="trophy" size={18} color="#FFD700" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.videoButton}
                      onPress={() => {
                        // TODO: Abrir video del ejercicio
                        console.log('Ver video:', exerciseName);
                      }}
                    >
                      <Ionicons name="play-circle" size={20} color="#00D4AA" />
                    </TouchableOpacity>
                  </View>
                </View>

                {!isOldFormat && sets && reps && (
                  <View style={styles.exerciseStats}>
                    <View style={styles.statBadge}>
                      <Ionicons name="repeat" size={16} color="#00D4AA" />
                      <Text style={styles.statBadgeText}>{sets} series</Text>
                    </View>
                    <View style={styles.statBadge}>
                      <Ionicons name="fitness" size={16} color="#00D4AA" />
                      <Text style={styles.statBadgeText}>{reps} reps</Text>
                    </View>
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
            <Ionicons name="information-circle" size={24} color="#00D4AA" />
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
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#1a1a1a" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal de Records Personales */}
      <PersonalRecordModal
        visible={showPRModal}
        onClose={() => setShowPRModal(false)}
        exerciseName={selectedExercise}
        workoutPlanId={planId}
        dayName={dayName}
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
    backgroundColor: '#00D4AA',
    borderColor: '#00D4AA',
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
    backgroundColor: '#00D4AA',
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
    backgroundColor: '#00D4AA',
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
    borderColor: '#00D4AA',
  },
  focusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00D4AA',
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
    color: '#00D4AA',
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
    borderColor: '#00D4AA',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  exerciseNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00D4AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
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
  prButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFD70020',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  videoButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#00D4AA20',
  },
  exerciseStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  completionSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  completionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00D4AA',
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
    borderColor: '#00D4AA',
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
    color: '#00D4AA',
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
    backgroundColor: '#00D4AA',
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
    borderColor: '#00D4AA',
  },
  finalNotesContent: {
    flex: 1,
    marginLeft: 12,
  },
  finalNotesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00D4AA',
    marginBottom: 8,
  },
  finalNotesText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
  },
});

