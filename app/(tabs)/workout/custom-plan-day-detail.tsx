import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../src/services/supabase';

type SetType = 'warmup' | 'normal' | 'failure' | 'drop' | 'rir';

interface SetInfo {
  type: SetType;
  reps: number | null; // null para series al fallo
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number[]; // Mantener para compatibilidad
  setTypes?: SetInfo[]; // Nuevo campo para tipos de series
}

export default function CustomPlanDayDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Parsear parámetros con validación
  const parseDayNumber = (value: string | undefined): number => {
    if (!value) return 1;
    const parsed = parseInt(value);
    return isNaN(parsed) ? 1 : parsed;
  };

  const parseSafeJSON = (value: string | undefined, defaultValue: any): any => {
    if (!value) return defaultValue;
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error('Error parseando JSON:', e);
      return defaultValue;
    }
  };

  const weekNumber = parseDayNumber(params.weekNumber as string);
  const dayNumber = parseDayNumber(params.dayNumber as string);
  const equipment = parseSafeJSON(params.equipment as string, []);
  const dayData = parseSafeJSON(params.dayData as string, { exercises: [] });

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [dayName, setDayName] = useState<string>(`Día ${dayNumber}`);
  const [isEditingDayName, setIsEditingDayName] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState<string[]>([]);
  const [setTypes, setSetTypes] = useState<SetInfo[]>([]);
  
  // Estados para el modal de cambio de tipo de serie
  const [showSetTypeModal, setShowSetTypeModal] = useState(false);
  const [selectedSetIndex, setSelectedSetIndex] = useState<number>(-1);

  // Debug: Verificar estado del modal en cada render
  useEffect(() => {
    console.log('🔍 Estado modal cambió:', { showSetTypeModal, selectedSetIndex });
  }, [showSetTypeModal, selectedSetIndex]);

  // Resetear estado cuando cambia el dayNumber
  useEffect(() => {
    setExercises([]);
    setDayName(`Día ${dayNumber}`);
    setIsEditingDayName(false);
    setEditingExercise(null);
    setSets('');
    setReps([]);
  }, [dayNumber]);

  useEffect(() => {
    if (editingExercise) {
      // Resetear modal de tipos al abrir configuración
      setShowSetTypeModal(false);
      setSelectedSetIndex(-1);
      
      // Si no hay series configuradas, crear 3 por defecto
      const hasReps = editingExercise.reps && editingExercise.reps.length > 0;
      const initialReps = hasReps ? editingExercise.reps.map(r => r.toString()) : ['', '', ''];
      const initialSets = hasReps ? editingExercise.sets : 3;
      
      setSets(initialSets.toString());
      setReps(initialReps);
      
      // Cargar tipos de series o crear por defecto
      if (editingExercise.setTypes && editingExercise.setTypes.length > 0) {
        setSetTypes(editingExercise.setTypes);
      } else {
        // Crear tipos de series por defecto (todas normales)
        const defaultSetTypes: SetInfo[] = initialReps.map((rep) => ({
          type: 'normal',
          reps: parseInt(rep) || null,
        }));
        setSetTypes(defaultSetTypes);
      }
    } else {
      // Cuando se cierra el modal principal, resetear todo
      setSetTypes([]);
      setShowSetTypeModal(false);
      setSelectedSetIndex(-1);
    }
  }, [editingExercise]);

  const handleAddExercise = () => {
    router.push({
      pathname: '/(tabs)/workout/custom-plan-select-exercise',
      params: {
        equipment: JSON.stringify(equipment),
        dayNumber: dayNumber.toString(),
        daysPerWeek: params.daysPerWeek as string || '',
        dayData: JSON.stringify({ dayNumber, exercises }),
      },
    });
  };

  const handleAddSet = () => {
    const newReps = [...reps, ''];
    const newSetTypes = [...setTypes, { type: 'normal', reps: null }];
    
    setReps(newReps);
    setSetTypes(newSetTypes);
    setSets(newSetTypes.length.toString());
    
    console.log('➕ Serie agregada, total:', newSetTypes.length);
  };

  const handleRemoveSet = (index: number) => {
    if (setTypes.length <= 1) {
      Alert.alert('Error', 'Debe haber al menos 1 serie');
      return;
    }
    
    const newReps = reps.filter((_, i) => i !== index);
    const newSetTypes = setTypes.filter((_, i) => i !== index);
    
    setReps(newReps);
    setSetTypes(newSetTypes);
    setSets(newSetTypes.length.toString());
    
    console.log('➖ Serie eliminada, total:', newSetTypes.length);
  };

  const handleRepsChange = (index: number, text: string) => {
    const newReps = [...reps];
    newReps[index] = text;
    setReps(newReps);
    
    // Actualizar también el tipo de serie
    const newSetTypes = [...setTypes];
    if (newSetTypes[index]) {
      newSetTypes[index] = {
        ...newSetTypes[index],
        reps: parseInt(text) || null,
      };
      setSetTypes(newSetTypes);
    }
  };

  const getSetLabel = (setType: SetInfo, index: number): string => {
    // Si no es normal, devolver la letra directamente
    if (setType.type === 'warmup') return 'C';
    if (setType.type === 'failure') return 'F';
    if (setType.type === 'drop') return 'D';
    if (setType.type === 'rir') return 'R';
    
    // Solo para series normales: contar cuántas hay antes
    let normalCount = 0;
    for (let i = 0; i <= index; i++) {
      const type = setTypes[i]?.type || 'normal';
      if (type === 'normal') {
        normalCount++;
      }
    }
    return `${normalCount}`;
  };

  const getSetButtonColor = (setType: SetInfo): string => {
    switch (setType.type) {
      case 'warmup':
        return '#4CAF50'; // Verde
      case 'failure':
        return '#ff4444'; // Rojo
      case 'drop':
        return '#9C27B0'; // Morado
      case 'rir':
        return '#2196F3'; // Azul
      case 'normal':
      default:
        return '#ffb300'; // Amarillo
    }
  };

  const handleChangeSetType = (newType: SetType) => {
    console.log('🔄 Cambiando tipo de serie:', { selectedSetIndex, newType });
    
    if (selectedSetIndex === -1) {
      console.error('❌ Índice de serie inválido');
      setShowSetTypeModal(false);
      return;
    }
    
    const newSetTypes = [...setTypes];
    const currentReps = newSetTypes[selectedSetIndex]?.reps || null;
    
    newSetTypes[selectedSetIndex] = {
      type: newType,
      reps: newType === 'failure' ? null : currentReps,
    };
    
    console.log('✅ Nuevo array de setTypes:', newSetTypes);
    setSetTypes(newSetTypes);
    
    // Si es al fallo, limpiar las reps en el input
    if (newType === 'failure') {
      const newReps = [...reps];
      newReps[selectedSetIndex] = '';
      setReps(newReps);
    }
    
    // Cerrar modal
    setShowSetTypeModal(false);
    setSelectedSetIndex(-1);
  };

  const handleSaveExercise = () => {
    if (!editingExercise) return;
    
    // Cerrar modal de tipos si está abierto
    setShowSetTypeModal(false);
    setSelectedSetIndex(-1);
    
    const numSets = setTypes.length;
    if (numSets === 0) {
      Alert.alert('Error', 'Debes agregar al menos 1 serie');
      return;
    }

    // Validar que todas las series tengan reps (excepto las de fallo)
    for (let i = 0; i < setTypes.length; i++) {
      const setType = setTypes[i];
      if (setType.type !== 'failure') {
        const repsValue = parseInt(reps[i]);
        if (!repsValue || repsValue === 0) {
          Alert.alert('Error', `Debes ingresar repeticiones para la serie ${i + 1}`);
          return;
        }
      }
    }

    // Actualizar setTypes con las reps finales
    const finalSetTypes = setTypes.map((st, idx) => ({
      type: st.type,
      reps: st.type === 'failure' ? null : (parseInt(reps[idx]) || 0),
    }));

    // Mantener compatibilidad con repsArray
    const repsArray = finalSetTypes.map(st => st.reps || 0);

    const updatedExercises = exercises.map(ex =>
      ex.id === editingExercise.id
        ? { ...ex, sets: numSets, reps: repsArray, setTypes: finalSetTypes }
        : ex
    );
    setExercises(updatedExercises);
    setEditingExercise(null);
    setSets('');
    setReps([]);
    setSetTypes([]);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    Alert.alert(
      'Eliminar ejercicio',
      '¿Estás seguro de que quieres eliminar este ejercicio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setExercises(exercises.filter(ex => ex.id !== exerciseId));
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    // Guardar los ejercicios del día en AsyncStorage para que la pantalla de días los pueda leer
    try {
      const dayDataToSave = {
        dayNumber,
        name: dayName,
        exercises,
      };
      await AsyncStorage.setItem(`week_${weekNumber}_day_${dayNumber}_data`, JSON.stringify(dayDataToSave));
      
      // Navegar de vuelta a la pantalla de días
      router.push({
        pathname: '/(tabs)/workout/custom-plan-days',
        params: {
          daysPerWeek: params.daysPerWeek as string || '',
          equipment: JSON.stringify(equipment),
        },
      });
    } catch (error) {
      console.error('Error saving day data:', error);
      // En caso de error, intentar navegar de todas formas
      router.push({
        pathname: '/(tabs)/workout/custom-plan-days',
        params: {
          daysPerWeek: params.daysPerWeek as string || '',
          equipment: JSON.stringify(equipment),
        },
      });
    }
  };

  // Cargar datos del día y detectar cuando se selecciona un ejercicio
  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      
      const loadDayData = async () => {
        try {
          // Primero verificar si hay datos pasados por parámetros
          const paramDayData = parseSafeJSON(params.dayData as string, {});
          if (paramDayData.dayNumber === dayNumber && paramDayData.exercises) {
            if (isMounted) {
              setExercises(paramDayData.exercises || []);
              if (paramDayData.name) {
                setDayName(paramDayData.name);
              }
            }
          }
          
          // Luego cargar desde AsyncStorage (sobrescribe si existe)
          const dayDataStr = await AsyncStorage.getItem(`week_${weekNumber}_day_${dayNumber}_data`);
          if (dayDataStr) {
            const savedDayData = parseSafeJSON(dayDataStr, {});
            // Verificar que los datos guardados correspondan al día correcto
            if (savedDayData.dayNumber === dayNumber && isMounted) {
              if (savedDayData.name) {
                setDayName(savedDayData.name);
              } else {
                setDayName(`Día ${dayNumber}`);
              }
              if (savedDayData.exercises) {
                setExercises(savedDayData.exercises);
              } else {
                setExercises([]);
              }
            }
          } else if (isMounted) {
            // Si no hay datos guardados, usar los valores por defecto
            setDayName(`Día ${dayNumber}`);
            setExercises([]);
          }
        } catch (error) {
          console.error('Error loading day data:', error);
          // En caso de error, usar valores por defecto
          if (isMounted) {
            setDayName(`Día ${dayNumber}`);
            setExercises([]);
          }
        }
      };

      const checkSelectedExercise = async (currentExercises: Exercise[]) => {
        try {
          const selectedExerciseData = await AsyncStorage.getItem('selectedExercise');
          if (selectedExerciseData && isMounted) {
            const selectedExercise = parseSafeJSON(selectedExerciseData, null);
            if (!selectedExercise) return;
            // Agregar el ejercicio a la lista con valores por defecto
            const newExercise: Exercise = {
              id: selectedExercise.id || `${Date.now()}_${Math.random()}`,
              name: selectedExercise.name,
              sets: selectedExercise.sets || 3,
              reps: selectedExercise.reps || [10, 10, 10],
            };
            
            // Verificar que no esté ya agregado usando los ejercicios actuales
            const exerciseExists = currentExercises.find(ex => ex.id === newExercise.id && ex.name === newExercise.name);
            if (!exerciseExists) {
              const updatedExercises = [...currentExercises, newExercise];
              
              // Actualizar el estado
              if (isMounted) {
                setExercises(updatedExercises);
              }
              
              // Guardar inmediatamente en AsyncStorage para evitar pérdida de datos
              try {
                const currentDayName = dayName || `Día ${dayNumber}`;
                const dayDataToSave = {
                  dayNumber,
                  name: currentDayName,
                  exercises: updatedExercises,
                };
                await AsyncStorage.setItem(`week_${weekNumber}_day_${dayNumber}_data`, JSON.stringify(dayDataToSave));
              } catch (error) {
                console.error('Error saving updated day data:', error);
              }
              
              // Abrir modal de edición inmediatamente para configurar series y repeticiones
              setTimeout(() => {
                if (isMounted) {
                  setEditingExercise(newExercise);
                }
              }, 100);
            }
            
            // Limpiar el storage después de usarlo
            await AsyncStorage.removeItem('selectedExercise');
          }
        } catch (error) {
          console.error('Error loading selected exercise:', error);
        }
      };
      
      // Primero cargar datos, luego verificar si hay un ejercicio seleccionado
      const initialize = async () => {
        let loadedExercises: Exercise[] = [];
        
        // Cargar datos primero
        try {
          // Primero verificar si hay datos pasados por parámetros
          const paramDayData = parseSafeJSON(params.dayData as string, {});
          if (paramDayData.dayNumber === dayNumber && paramDayData.exercises) {
            loadedExercises = paramDayData.exercises || [];
            if (isMounted && paramDayData.name) {
              setDayName(paramDayData.name);
            }
          }
          
          // Luego cargar desde AsyncStorage (sobrescribe si existe)
          const dayDataStr = await AsyncStorage.getItem(`week_${weekNumber}_day_${dayNumber}_data`);
          if (dayDataStr) {
            const savedDayData = parseSafeJSON(dayDataStr, {});
            // Verificar que los datos guardados correspondan al día correcto
            if (savedDayData.dayNumber === dayNumber) {
              loadedExercises = savedDayData.exercises || [];
              if (isMounted) {
                if (savedDayData.name) {
                  setDayName(savedDayData.name);
                } else {
                  setDayName(`Día ${dayNumber}`);
                }
                setExercises(loadedExercises);
              }
            }
          } else if (isMounted && loadedExercises.length === 0) {
            // Si no hay datos guardados, usar los valores por defecto
            setDayName(`Día ${dayNumber}`);
            setExercises([]);
          } else if (isMounted) {
            setExercises(loadedExercises);
          }
        } catch (error) {
          console.error('Error loading day data:', error);
          // En caso de error, usar valores por defecto
          if (isMounted) {
            setDayName(`Día ${dayNumber}`);
            setExercises([]);
            loadedExercises = [];
          }
        }
        
        // Ahora verificar si hay un ejercicio seleccionado usando los ejercicios cargados
        await checkSelectedExercise(loadedExercises);
      };
      
      initialize();
      
      return () => {
        isMounted = false;
      };
    }, [dayNumber, params.dayData])
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            // Intentar volver atrás, si falla navegar a custom-plan-days
            try {
              if (router.canGoBack && router.canGoBack()) {
                router.back();
              } else {
                throw new Error('Cannot go back');
              }
            } catch (error) {
              // Si no hay pantalla anterior, navegar a custom-plan-days
              router.push({
                pathname: '/(tabs)/workout/custom-plan-days',
                params: {
                  daysPerWeek: params.daysPerWeek as string || '',
                  equipment: JSON.stringify(equipment),
                },
              });
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        {isEditingDayName ? (
          <TextInput
            style={styles.dayNameInput}
            value={dayName}
            onChangeText={setDayName}
            onBlur={async () => {
              setIsEditingDayName(false);
              // Guardar el nombre del día en AsyncStorage cuando se sale del campo
              try {
                const dayDataStr = await AsyncStorage.getItem(`week_${weekNumber}_day_${dayNumber}_data`);
                if (dayDataStr) {
                  const dayData = parseSafeJSON(dayDataStr, { dayNumber, exercises: [] });
                  dayData.name = dayName.trim() || `Día ${dayNumber}`;
                  await AsyncStorage.setItem(`day_${dayNumber}_data`, JSON.stringify(dayData));
                } else {
                  // Si no hay datos guardados, crear un nuevo objeto
                  const dayDataToSave = {
                    dayNumber,
                    name: dayName.trim() || `Día ${dayNumber}`,
                    exercises: exercises,
                  };
                  await AsyncStorage.setItem(`week_${weekNumber}_day_${dayNumber}_data`, JSON.stringify(dayDataToSave));
                }
              } catch (error) {
                console.error('Error saving day name:', error);
              }
            }}
            onSubmitEditing={async () => {
              setIsEditingDayName(false);
              // Guardar el nombre del día en AsyncStorage cuando se presiona Enter
              try {
                const dayDataStr = await AsyncStorage.getItem(`week_${weekNumber}_day_${dayNumber}_data`);
                if (dayDataStr) {
                  const dayData = parseSafeJSON(dayDataStr, { dayNumber, exercises: [] });
                  dayData.name = dayName.trim() || `Día ${dayNumber}`;
                  await AsyncStorage.setItem(`day_${dayNumber}_data`, JSON.stringify(dayData));
                } else {
                  // Si no hay datos guardados, crear un nuevo objeto
                  const dayDataToSave = {
                    dayNumber,
                    name: dayName.trim() || `Día ${dayNumber}`,
                    exercises: exercises,
                  };
                  await AsyncStorage.setItem(`week_${weekNumber}_day_${dayNumber}_data`, JSON.stringify(dayDataToSave));
                }
              } catch (error) {
                console.error('Error saving day name:', error);
              }
            }}
            autoFocus
            placeholder={`Día ${dayNumber}`}
            placeholderTextColor="#999"
          />
        ) : (
          <TouchableOpacity
            style={styles.dayNameContainer}
            onPress={() => setIsEditingDayName(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.headerTitle}>{dayName}</Text>
            <Ionicons name="create-outline" size={16} color="#ffb300" style={styles.editIcon} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color="#666" />
            <Text style={styles.emptyStateText}>No hay ejercicios agregados</Text>
            <Text style={styles.emptyStateSubtext}>
              Agrega ejercicios para este día
            </Text>
          </View>
        ) : (
          <View style={styles.exercisesList}>
            {exercises.map((exercise) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <View style={styles.exerciseActions}>
                    <TouchableOpacity
                      onPress={() => setEditingExercise(exercise)}
                      style={styles.editButton}
                    >
                      <Ionicons name="create-outline" size={20} color="#ffb300" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteExercise(exercise.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.exerciseDetails}>
                  <Text style={styles.exerciseDetailText}>
                    {exercise.sets} series
                  </Text>
                  <View style={styles.repsContainer}>
                    {(exercise.setTypes || []).map((setInfo, idx) => {
                      const label = (() => {
                        switch (setInfo.type) {
                          case 'warmup': return 'C';
                          case 'failure': return 'F';
                          case 'drop': return 'D';
                          case 'rir': return 'R';
                          case 'normal':
                          default:
                            // Contar cuántas series normales hay antes de esta
                            let normalCount = 0;
                            for (let i = 0; i <= idx; i++) {
                              const type = (exercise.setTypes || [])[i]?.type || 'normal';
                              if (type === 'normal') {
                                normalCount++;
                              }
                            }
                            return `${normalCount}`;
                        }
                      })();
                      
                      const repsText = setInfo.type === 'failure' 
                        ? 'al fallo' 
                        : setInfo.type === 'rir'
                        ? `${setInfo.reps || 0} RIR`
                        : `${setInfo.reps || 0} reps`;
                      
                      return (
                        <Text key={idx} style={styles.repText}>
                          {label}: {repsText}
                        </Text>
                      );
                    })}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddExercise}
        >
          <Ionicons name="add-circle" size={24} color="#ffb300" />
          <Text style={styles.addButtonText}>Agregar Ejercicio</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal para editar series y repeticiones */}
      <Modal
        visible={editingExercise !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingExercise(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditingExercise(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContent}
            >
              <ScrollView
                keyboardShouldPersistTaps="always"
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                <Text style={styles.modalTitle}>
                  Configurar {editingExercise?.name}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Series</Text>
                  
                  {setTypes.length > 0 ? (
                    setTypes.map((setType, idx) => {
                      const isFailure = setType.type === 'failure';
                      const setLabel = getSetLabel(setType, idx);
                      const buttonColor = getSetButtonColor(setType);
                      
                      return (
                        <View key={idx} style={styles.repInputRow}>
                          <Pressable
                            style={[styles.setTypeButton, { backgroundColor: buttonColor }]}
                            onPress={() => {
                              console.log('✅ PRESS detectado para serie', idx);
                              setSelectedSetIndex(idx);
                              setShowSetTypeModal(true);
                            }}
                            onPressIn={() => console.log('👆 PRESS IN detectado')}
                            onPressOut={() => console.log('👆 PRESS OUT detectado')}
                          >
                            {({ pressed }) => (
                              <Text style={[styles.setTypeButtonText, pressed && { opacity: 0.7 }]}>
                                {setLabel}
                              </Text>
                            )}
                          </Pressable>
                          <TextInput
                            style={[styles.repInput, isFailure && styles.repInputDisabled]}
                            value={isFailure ? 'Al fallo' : (reps[idx] || '')}
                            onChangeText={(text) => handleRepsChange(idx, text)}
                            keyboardType="number-pad"
                            placeholder="0"
                            editable={!isFailure}
                          />
                          <Text style={styles.repLabel}>
                            {setType.type === 'rir' ? 'RIR' : 'reps'}
                          </Text>
                          <TouchableOpacity
                            style={styles.removeSetButton}
                            onPress={() => handleRemoveSet(idx)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="trash-outline" size={20} color="#ff4444" />
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptySeriesText}>
                      Agrega series para este ejercicio
                    </Text>
                  )}
                  
                  {/* Botón Agregar Serie abajo */}
                  <TouchableOpacity
                    style={styles.addSetButtonBottom}
                    onPress={handleAddSet}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add-circle" size={22} color="#ffb300" />
                    <Text style={styles.addSetButtonText}>Agregar Serie</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => {
                      setEditingExercise(null);
                      setSets('');
                      setReps([]);
                    }}
                  >
                    <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSave]}
                    onPress={handleSaveExercise}
                  >
                    <Text style={styles.modalButtonSaveText}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>

        {/* Modal ANIDADO para seleccionar tipo de serie */}
        <Modal
          key={`setTypeModal-${selectedSetIndex}`}
          visible={showSetTypeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            console.log('⛔ Cerrando modal de tipo de serie');
            setShowSetTypeModal(false);
            setSelectedSetIndex(-1);
          }}
          onShow={() => {
            console.log('✅ Modal de tipo de serie MOSTRADO');
            console.log('📊 selectedSetIndex:', selectedSetIndex);
          }}
        >
        <Pressable
          style={styles.setTypeModalOverlay}
          onPress={() => {
            console.log('🚪 Click en overlay - cerrando modal');
            setShowSetTypeModal(false);
            setSelectedSetIndex(-1);
          }}
        >
          <Pressable
            style={styles.setTypeModalContent}
            onPress={(e) => {
              e.stopPropagation();
              console.log('🛑 Click dentro del contenido - no cerrar');
            }}
          >
            <Text style={styles.setTypeModalTitle}>Seleccionar Tipo de Serie</Text>
            
            <View style={styles.setTypeOptionsContainer}>
              <TouchableOpacity
                style={styles.setTypeOption}
                onPress={() => {
                  console.log('🟡 Seleccionado: Calentamiento');
                  handleChangeSetType('warmup');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.setTypeIconLarge, styles.setTypeIconWarmup]}>
                  <Text style={styles.setTypeIconTextLarge}>C</Text>
                </View>
                <View style={styles.setTypeInfo}>
                  <Text style={styles.setTypeOptionText}>Calentamiento</Text>
                  <Text style={styles.setTypeOptionDesc}>Peso ligero para activar músculos</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.setTypeOption}
                onPress={() => {
                  console.log('🟢 Seleccionado: Normal');
                  handleChangeSetType('normal');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.setTypeIconLarge, styles.setTypeIconNormal]}>
                  <Text style={styles.setTypeIconTextLarge}>1</Text>
                </View>
                <View style={styles.setTypeInfo}>
                  <Text style={styles.setTypeOptionText}>Normal</Text>
                  <Text style={styles.setTypeOptionDesc}>Serie estándar con repeticiones</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.setTypeOption}
                onPress={() => {
                  console.log('🔴 Seleccionado: Al Fallo');
                  handleChangeSetType('failure');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.setTypeIconLarge, styles.setTypeIconFailure]}>
                  <Text style={styles.setTypeIconTextLarge}>F</Text>
                </View>
                <View style={styles.setTypeInfo}>
                  <Text style={styles.setTypeOptionText}>Al Fallo</Text>
                  <Text style={styles.setTypeOptionDesc}>Hasta no poder más</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.setTypeOption}
                onPress={() => {
                  console.log('🟣 Seleccionado: Drop');
                  handleChangeSetType('drop');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.setTypeIconLarge, styles.setTypeIconDrop]}>
                  <Text style={styles.setTypeIconTextLarge}>D</Text>
                </View>
                <View style={styles.setTypeInfo}>
                  <Text style={styles.setTypeOptionText}>Drop</Text>
                  <Text style={styles.setTypeOptionDesc}>Reducir peso y continuar</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.setTypeOption}
                onPress={() => {
                  console.log('🔵 Seleccionado: RIR');
                  handleChangeSetType('rir');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.setTypeIconLarge, styles.setTypeIconRIR]}>
                  <Text style={styles.setTypeIconTextLarge}>R</Text>
                </View>
                <View style={styles.setTypeInfo}>
                  <Text style={styles.setTypeOptionText}>RIR (Reps In Reserve)</Text>
                  <Text style={styles.setTypeOptionDesc}>Reps que faltan para el fallo</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.setTypeModalCloseButton}
              onPress={() => {
                console.log('❌ Cancelar presionado');
                setShowSetTypeModal(false);
                setSelectedSetIndex(-1);
              }}
            >
              <Text style={styles.setTypeModalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
        </Modal>
      </Modal>

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
  dayNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dayNameInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  editIcon: {
    marginLeft: 4,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffb300',
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  exercisesList: {
    gap: 16,
  },
  exerciseCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  exerciseDetails: {
    gap: 8,
  },
  exerciseDetailText: {
    fontSize: 14,
    color: '#ffb300',
    fontWeight: '600',
  },
  repsContainer: {
    gap: 4,
    marginTop: 4,
  },
  repText: {
    fontSize: 14,
    color: '#ccc',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#ffb300',
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffb300',
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
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalScrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333',
  },
  repInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  addSetButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffb300',
    marginTop: 8,
  },
  addSetButtonText: {
    color: '#ffb300',
    fontSize: 14,
    fontWeight: '600',
  },
  removeSetButton: {
    padding: 4,
  },
  emptySeriesText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  repLabel: {
    fontSize: 14,
    color: '#ccc',
    minWidth: 70,
  },
  repInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#444',
  },
  modalButtonSave: {
    backgroundColor: '#ffb300',
  },
  modalButtonCancelText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSaveText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
  },
  setTypeButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setTypeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  repInputDisabled: {
    backgroundColor: '#333',
    color: '#888',
  },
  setTypeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  setTypeModalContent: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  setTypeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 24,
    textAlign: 'center',
  },
  setTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  setTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setTypeIconWarmup: {
    backgroundColor: '#4CAF50',
  },
  setTypeIconNormal: {
    backgroundColor: '#ffb300',
  },
  setTypeIconFailure: {
    backgroundColor: '#ff4444',
  },
  setTypeIconDrop: {
    backgroundColor: '#9C27B0',
  },
  setTypeIconRIR: {
    backgroundColor: '#2196F3',
  },
  setTypeIconText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  setTypeInfo: {
    flex: 1,
  },
  setTypeOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  setTypeOptionDesc: {
    fontSize: 12,
    color: '#888',
  },
  setTypeOptionDelete: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff4444',
    justifyContent: 'center',
    gap: 8,
  },
  setTypeOptionTextDelete: {
    color: '#ff4444',
    flex: 0,
  },
  // Estilos para modal de tipo de serie (compacto)
  setTypeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Más oscuro para destacar
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  setTypeModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400, // Más compacto
    borderWidth: 2,
    borderColor: '#ffb300',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  setTypeModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffb300',
    marginBottom: 16,
    textAlign: 'center',
  },
  setTypeOptionsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  setTypeIconLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setTypeIconTextLarge: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  setTypeModalCloseButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  setTypeModalCloseText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

