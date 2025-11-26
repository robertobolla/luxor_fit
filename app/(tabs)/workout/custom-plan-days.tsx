import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../../../src/services/supabase';

interface DayData {
  dayNumber: number;
  name?: string;
  exercises: any[];
}

export default function CustomPlanDaysScreen() {
  const { user } = useUser();
  const router = useRouter();
  const params = useLocalSearchParams();
  const daysPerWeek = parseInt(params.daysPerWeek as string) || 0;
  const equipment = JSON.parse((params.equipment as string) || '[]');
  const editingPlanId = params.planId as string | undefined;

  const [days, setDays] = useState<DayData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [planName, setPlanName] = useState<string>('');
  const [isEditingPlanName, setIsEditingPlanName] = useState(false);

  useEffect(() => {
    // Inicializar días vacíos
    const initialDays: DayData[] = [];
    for (let i = 1; i <= daysPerWeek; i++) {
      initialDays.push({
        dayNumber: i,
        exercises: [],
      });
    }
    setDays(initialDays);
    
    // Cargar nombre del plan y planId desde AsyncStorage
    const loadPlanData = async () => {
      try {
        const savedPlanName = await AsyncStorage.getItem('custom_plan_name');
        if (savedPlanName) {
          setPlanName(savedPlanName);
        } else {
          setPlanName(`Plan Personalizado - ${new Date().toLocaleDateString()}`);
        }
        
        // Si hay un planId en AsyncStorage pero no en params, usarlo
        if (!editingPlanId) {
          const savedPlanId = await AsyncStorage.getItem('editing_plan_id');
          if (savedPlanId) {
            // El planId se manejará a través de AsyncStorage
          }
        }
      } catch (error) {
        console.error('Error loading plan data:', error);
        setPlanName(`Plan Personalizado - ${new Date().toLocaleDateString()}`);
      }
    };
    
    loadPlanData();
  }, [daysPerWeek]);

  // Recargar datos cuando se regresa de la pantalla de detalle del día
  useFocusEffect(
    useCallback(() => {
      const loadDayData = async () => {
        try {
          // Limpiar datos de días que no corresponden al plan actual (días > daysPerWeek)
          for (let i = daysPerWeek + 1; i <= 7; i++) {
            await AsyncStorage.removeItem(`day_${i}_data`);
          }
          
          const updatedDays: DayData[] = [];
          for (let i = 1; i <= daysPerWeek; i++) {
            const dayDataStr = await AsyncStorage.getItem(`day_${i}_data`);
            if (dayDataStr) {
              const dayData = JSON.parse(dayDataStr);
              // Verificar que el día corresponde al número correcto
              if (dayData.dayNumber === i) {
                updatedDays.push(dayData);
              } else {
                // Si no coincide, limpiar y crear día vacío
                await AsyncStorage.removeItem(`day_${i}_data`);
                updatedDays.push({
                  dayNumber: i,
                  exercises: [],
                });
              }
            } else {
              updatedDays.push({
                dayNumber: i,
                exercises: [],
              });
            }
          }
          setDays(updatedDays);
          
          // Cargar nombre del plan desde AsyncStorage
          const savedPlanName = await AsyncStorage.getItem('custom_plan_name');
          if (savedPlanName) {
            setPlanName(savedPlanName);
          }
        } catch (error) {
          console.error('Error loading day data:', error);
        }
      };
      
      loadDayData();
    }, [daysPerWeek])
  );

  const handleDayPress = (dayNumber: number) => {
    router.push({
      pathname: '/(tabs)/workout/custom-plan-day-detail',
      params: {
        dayNumber: dayNumber.toString(),
        daysPerWeek: daysPerWeek.toString(),
        equipment: JSON.stringify(equipment),
        dayData: JSON.stringify(days.find(d => d.dayNumber === dayNumber) || { dayNumber, exercises: [] }),
      },
    });
  };

  const handleSavePlan = () => {
    // Verificar que todos los días tengan al menos un ejercicio
    const hasEmptyDays = days.some(day => day.exercises.length === 0);
    if (hasEmptyDays) {
      Alert.alert(
        'Plan incompleto',
        'Todos los días deben tener al menos un ejercicio. Por favor completa todos los días antes de guardar.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Preguntar si quiere activar el plan
    Alert.alert(
      '¿Activar este plan?',
      '¿Quieres que este sea tu plan de entrenamiento activo?',
      [
        {
          text: 'No',
          style: 'cancel',
          onPress: () => savePlanToDatabase(false),
        },
        {
          text: 'Sí',
          onPress: () => savePlanToDatabase(true),
        },
      ]
    );
  };

  const savePlanToDatabase = async (isActive: boolean) => {
    if (!user) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    setIsSaving(true);
    try {
      // Cargar todos los días desde AsyncStorage
      const allDaysData: DayData[] = [];
      for (let i = 1; i <= daysPerWeek; i++) {
        const dayDataStr = await AsyncStorage.getItem(`day_${i}_data`);
        if (dayDataStr) {
          const dayData = JSON.parse(dayDataStr);
          if (dayData.dayNumber === i && dayData.exercises && dayData.exercises.length > 0) {
            allDaysData.push(dayData);
          }
        }
      }

      if (allDaysData.length === 0) {
        Alert.alert('Error', 'No hay días con ejercicios para guardar');
        setIsSaving(false);
        return;
      }

      // Formatear el plan en la estructura esperada (compatible con la estructura de planes generados por IA)
      const planData = {
        weekly_structure: allDaysData.map(day => ({
          day: day.name || `Día ${day.dayNumber}`,
          focus: day.name || `Día ${day.dayNumber}`,
          exercises: day.exercises.map((ex: any) => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            rest_seconds: 60, // Valor por defecto
          })),
          duration: 45, // Valor por defecto
        })),
        days_per_week: daysPerWeek,
        equipment: equipment,
        duration_weeks: Math.ceil(daysPerWeek / 7) || 1,
      };

      // Si se va a activar, desactivar otros planes primero
      if (isActive) {
        const { error: updateError } = await supabase
          .from('workout_plans')
          .update({ is_active: false })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error desactivando planes anteriores:', updateError);
        }
      }

      const finalPlanName = planName.trim() || `Plan Personalizado - ${new Date().toLocaleDateString()}`;
      
      // Obtener planId de params o AsyncStorage
      const planIdToUpdate = editingPlanId || await AsyncStorage.getItem('editing_plan_id');
      
      // Si estamos editando un plan existente, actualizar en lugar de insertar
      if (planIdToUpdate) {
        const { data, error } = await supabase
          .from('workout_plans')
          .update({
            plan_name: finalPlanName,
            description: `Plan personalizado de ${daysPerWeek} días por semana`,
            duration_weeks: planData.duration_weeks,
            plan_data: planData,
            is_active: isActive,
          })
          .eq('id', planIdToUpdate)
          .eq('user_id', user.id)
          .select('id')
          .single();

        if (error) {
          console.error('Error al actualizar plan:', error);
          Alert.alert('Error', 'No se pudo actualizar el plan. Intenta nuevamente.');
          setIsSaving(false);
          return;
        }

        // Limpiar AsyncStorage después de actualizar
        for (let i = 1; i <= daysPerWeek; i++) {
          await AsyncStorage.removeItem(`day_${i}_data`);
        }
        await AsyncStorage.removeItem('custom_plan_name');
        await AsyncStorage.removeItem('editing_plan_id');

        Alert.alert(
          'Éxito',
          isActive 
            ? 'Plan actualizado y activado exitosamente' 
            : 'Plan actualizado exitosamente. Puedes activarlo desde "Mis planes de entrenamiento"',
          [
            {
              text: 'OK',
              onPress: () => {
                router.push('/(tabs)/workout');
              },
            },
          ]
        );
        setIsSaving(false);
        return;
      }

      // Insertar el nuevo plan
      const { data, error } = await supabase
        .from('workout_plans')
        .insert({
          user_id: user.id,
          plan_name: finalPlanName,
          description: `Plan personalizado de ${daysPerWeek} días por semana`,
          duration_weeks: planData.duration_weeks,
          plan_data: planData,
          is_active: isActive,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error al guardar plan:', error);
        Alert.alert('Error', 'No se pudo guardar el plan. Intenta nuevamente.');
        setIsSaving(false);
        return;
      }

      // Limpiar AsyncStorage después de guardar
      for (let i = 1; i <= daysPerWeek; i++) {
        await AsyncStorage.removeItem(`day_${i}_data`);
      }
      await AsyncStorage.removeItem('custom_plan_name');
      await AsyncStorage.removeItem('editing_plan_id');

      Alert.alert(
        'Éxito',
        isActive 
          ? 'Plan guardado y activado exitosamente' 
          : 'Plan guardado exitosamente. Puedes activarlo desde "Mis planes de entrenamiento"',
        [
          {
            text: 'OK',
            onPress: () => {
              router.push('/(tabs)/workout');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error inesperado al guardar plan:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar el plan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            try {
              if (router.canGoBack && router.canGoBack()) {
                router.back();
              } else {
                throw new Error('Cannot go back');
              }
            } catch (error) {
              // Si no hay pantalla anterior, navegar a custom-plan-setup
              router.push({
                pathname: '/(tabs)/workout/custom-plan-setup',
              });
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Días del Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Nombre del plan editable */}
        <View style={styles.planNameContainer}>
          {isEditingPlanName ? (
            <View style={styles.planNameEditContainer}>
              <TextInput
                style={styles.planNameInput}
                value={planName}
                onChangeText={setPlanName}
                placeholder="Nombre del plan"
                placeholderTextColor="#666"
                autoFocus
                onBlur={async () => {
                  setIsEditingPlanName(false);
                  // Guardar el nombre en AsyncStorage
                  try {
                    await AsyncStorage.setItem('custom_plan_name', planName.trim() || `Plan Personalizado - ${new Date().toLocaleDateString()}`);
                  } catch (error) {
                    console.error('Error saving plan name:', error);
                  }
                }}
                onSubmitEditing={async () => {
                  setIsEditingPlanName(false);
                  // Guardar el nombre en AsyncStorage
                  try {
                    await AsyncStorage.setItem('custom_plan_name', planName.trim() || `Plan Personalizado - ${new Date().toLocaleDateString()}`);
                  } catch (error) {
                    console.error('Error saving plan name:', error);
                  }
                }}
              />
              <TouchableOpacity
                onPress={async () => {
                  setIsEditingPlanName(false);
                  // Guardar el nombre en AsyncStorage
                  try {
                    await AsyncStorage.setItem('custom_plan_name', planName.trim() || `Plan Personalizado - ${new Date().toLocaleDateString()}`);
                  } catch (error) {
                    console.error('Error saving plan name:', error);
                  }
                }}
                style={styles.planNameSaveButton}
              >
                <Ionicons name="checkmark" size={20} color="#ffb300" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.planNameDisplayContainer}
              onPress={() => setIsEditingPlanName(true)}
              activeOpacity={0.7}
            >
              <View style={styles.planNameDisplayContent}>
                <Ionicons name="fitness" size={20} color="#ffb300" />
                <Text style={styles.planNameDisplayText} numberOfLines={1}>
                  {planName || `Plan Personalizado - ${new Date().toLocaleDateString()}`}
                </Text>
              </View>
              <Ionicons name="create-outline" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.description}>
          Selecciona cada día para agregar ejercicios. Todos los días deben tener al menos un ejercicio antes de guardar.
        </Text>

        <View style={styles.daysList}>
          {days.map((day) => (
            <TouchableOpacity
              key={day.dayNumber}
              style={styles.dayCard}
              onPress={() => handleDayPress(day.dayNumber)}
            >
              <View style={styles.dayCardHeader}>
                <Text style={styles.dayCardTitle}>
                  {day.name || `Día ${day.dayNumber}`}
                </Text>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
              <View style={styles.dayCardContent}>
                {day.exercises.length > 0 ? (
                  <View>
                    <Text style={styles.exerciseCount}>
                      {day.exercises.length} {day.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
                    </Text>
                    <View style={styles.exercisePreview}>
                      {day.exercises.slice(0, 3).map((exercise, idx) => (
                        <Text key={idx} style={styles.exerciseName}>
                          • {exercise.name}
                        </Text>
                      ))}
                      {day.exercises.length > 3 && (
                        <Text style={styles.moreExercises}>
                          +{day.exercises.length - 3} más
                        </Text>
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyDay}>
                    <Ionicons name="add-circle-outline" size={32} color="#666" />
                    <Text style={styles.emptyDayText}>Agregar ejercicios</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSavePlan}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <ActivityIndicator size="small" color="#1a1a1a" />
              <Text style={styles.saveButtonText}>Guardando...</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#1a1a1a" />
              <Text style={styles.saveButtonText}>Guardar Plan</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
    lineHeight: 20,
  },
  daysList: {
    gap: 16,
  },
  dayCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  dayCardContent: {
    minHeight: 60,
  },
  exerciseCount: {
    fontSize: 14,
    color: '#ffb300',
    fontWeight: '600',
    marginBottom: 8,
  },
  exercisePreview: {
    gap: 4,
  },
  exerciseName: {
    fontSize: 14,
    color: '#ccc',
  },
  moreExercises: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyDay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyDayText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffb300',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 24,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  planNameContainer: {
    marginBottom: 24,
  },
  planNameDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  planNameDisplayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  planNameDisplayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  planNameEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffb300',
    gap: 12,
  },
  planNameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    padding: 0,
  },
  planNameSaveButton: {
    padding: 4,
  },
});

